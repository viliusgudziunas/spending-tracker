from typing import TYPE_CHECKING

from psycopg2.errors import UniqueViolation
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError

from app.db.models import Filter, Rule, RuleGroup, RuleGroupOperator, RuleOperator, RuleType
from app.repositories.exceptions import (
    DuplicateFilterError,
    FilterNotFoundError,
    InvalidFilterRulesPayloadError,
)

if TYPE_CHECKING:
    import uuid
    from collections.abc import Sequence

    from sqlalchemy.orm import Session

    from app.repositories.dtos import CreateFilterDto, PutRuleDto, PutRuleGroupDto


def get_filters(db: Session) -> Sequence[Filter]:
    return db.scalars(select(Filter).order_by(Filter.position)).all()


def create_filter(db: Session, filter_dto: CreateFilterDto) -> Filter:
    position = (
        filter_dto.position
        if filter_dto.position is not None
        else _get_max_position(db=db, category_id=filter_dto.category_id) + 1
    )

    filter_ = Filter(name=filter_dto.name, category_id=filter_dto.category_id, position=position)
    db.add(filter_)

    for rule_group_dto in filter_dto.rule_groups:
        rule_group = RuleGroup(operator=RuleGroupOperator(rule_group_dto.operator))
        db.add(rule_group)

        for rule_dto in rule_group_dto.rules:
            rule = Rule(
                type=RuleType(rule_dto.type),
                operator=RuleOperator(rule_dto.operator),
                value=rule_dto.value,
            )
            db.add(rule)
            rule_group.rules.append(rule)

        filter_.rule_groups.append(rule_group)

    db.commit()
    db.refresh(filter_)

    return filter_


def _get_max_position(db: Session, category_id: uuid.UUID) -> int:
    return db.scalar(select(func.max(Filter.position)).where(Filter.category_id == category_id)) or 0


def get_filter(db: Session, filter_id: uuid.UUID) -> Filter:
    filter_ = db.get(Filter, filter_id)

    if filter_ is None:
        raise FilterNotFoundError

    return filter_


def update_filter(
    db: Session,
    filter_id: uuid.UUID,
    name: str | None,
    position: int | None,
) -> Filter:
    filter_ = get_filter(db=db, filter_id=filter_id)

    if name is not None:
        filter_.name = name

    if position is not None and position != filter_.position:
        _shift_positions(
            db=db,
            filter_id=filter_id,
            category_id=filter_.category_id,
            old_position=filter_.position,
            new_position=position,
        )
        filter_.position = position

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        if isinstance(exc.orig, UniqueViolation):
            raise DuplicateFilterError from exc

        raise

    db.refresh(filter_)
    return filter_


def _shift_positions(
    db: Session,
    filter_id: uuid.UUID,
    category_id: uuid.UUID,
    old_position: int,
    new_position: int,
) -> None:
    if old_position < new_position:
        db.execute(
            update(Filter)
            .where(
                Filter.id != filter_id,
                Filter.category_id == category_id,
                Filter.position > old_position,
                Filter.position <= new_position,
            )
            .values(position=Filter.position - 1),
        )
    else:
        db.execute(
            update(Filter)
            .where(
                Filter.id != filter_id,
                Filter.category_id == category_id,
                Filter.position >= new_position,
                Filter.position < old_position,
            )
            .values(position=Filter.position + 1),
        )


def delete_filter(db: Session, filter_id: uuid.UUID) -> None:
    filter_ = get_filter(db=db, filter_id=filter_id)
    deleted_position = filter_.position
    deleted_category_id = filter_.category_id

    db.delete(filter_)
    db.flush()
    db.execute(
        update(Filter)
        .where(
            Filter.category_id == deleted_category_id,
            Filter.position > deleted_position,
        )
        .values(position=Filter.position - 1),
    )
    db.commit()


def put_filter_rule_groups(db: Session, filter_id: uuid.UUID, rule_groups: list[PutRuleGroupDto]) -> Filter:
    filter_ = get_filter(db=db, filter_id=filter_id)
    existing_groups_by_id = {group.id: group for group in filter_.rule_groups}
    seen_group_ids: set[uuid.UUID] = set()
    synced_rule_groups = [
        _sync_rule_group(
            group_dto=group_dto,
            existing_groups_by_id=existing_groups_by_id,
            seen_group_ids=seen_group_ids,
        )
        for group_dto in rule_groups
    ]

    filter_.rule_groups = synced_rule_groups
    db.commit()
    db.refresh(filter_)
    return filter_


def _sync_rule_group(
    group_dto: PutRuleGroupDto,
    existing_groups_by_id: dict[uuid.UUID, RuleGroup],
    seen_group_ids: set[uuid.UUID],
) -> RuleGroup:
    if group_dto.id is None:
        synced_group = RuleGroup(operator=RuleGroupOperator(group_dto.operator))
    else:
        synced_group = _get_existing_group_for_sync(
            group_id=group_dto.id,
            existing_groups_by_id=existing_groups_by_id,
            seen_group_ids=seen_group_ids,
        )
        synced_group.operator = RuleGroupOperator(group_dto.operator)

    _sync_group_rules(group=synced_group, rule_dtos=group_dto.rules)
    return synced_group


def _get_existing_group_for_sync(
    group_id: uuid.UUID,
    existing_groups_by_id: dict[uuid.UUID, RuleGroup],
    seen_group_ids: set[uuid.UUID],
) -> RuleGroup:
    if group_id in seen_group_ids:
        msg = "Duplicate rule group id in payload"
        raise InvalidFilterRulesPayloadError(msg)
    seen_group_ids.add(group_id)
    if group_id not in existing_groups_by_id:
        msg = "Rule group id does not belong to filter"
        raise InvalidFilterRulesPayloadError(msg)
    return existing_groups_by_id[group_id]


def _sync_group_rules(group: RuleGroup, rule_dtos: list[PutRuleDto]) -> None:
    existing_rules_by_id = {rule.id: rule for rule in group.rules}
    seen_rule_ids: set[uuid.UUID] = set()
    group.rules = [
        _sync_rule(
            rule_dto=rule_dto,
            existing_rules_by_id=existing_rules_by_id,
            seen_rule_ids=seen_rule_ids,
        )
        for rule_dto in rule_dtos
    ]


def _sync_rule(
    rule_dto: PutRuleDto,
    existing_rules_by_id: dict[uuid.UUID, Rule],
    seen_rule_ids: set[uuid.UUID],
) -> Rule:
    if rule_dto.id is None:
        return Rule(
            type=RuleType(rule_dto.type),
            operator=RuleOperator(rule_dto.operator),
            value=rule_dto.value,
        )

    if rule_dto.id in seen_rule_ids:
        msg = "Duplicate rule id in payload"
        raise InvalidFilterRulesPayloadError(msg)
    seen_rule_ids.add(rule_dto.id)
    if rule_dto.id not in existing_rules_by_id:
        msg = "Rule id does not belong to rule group"
        raise InvalidFilterRulesPayloadError(msg)

    synced_rule = existing_rules_by_id[rule_dto.id]
    synced_rule.type = RuleType(rule_dto.type)
    synced_rule.operator = RuleOperator(rule_dto.operator)
    synced_rule.value = rule_dto.value
    return synced_rule
