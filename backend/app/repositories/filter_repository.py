import uuid
from collections.abc import Sequence
from typing import TYPE_CHECKING

from psycopg2.errors import UniqueViolation
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError

from app.db.rules.models import Filter, Rule, RuleGroup
from app.repositories.dtos import CreateFilterDto
from app.repositories.exceptions import DuplicateFilterError, FilterNotFoundError

if TYPE_CHECKING:
    from sqlalchemy.orm import Session


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
        rule_group = RuleGroup(operator=rule_group_dto.operator)
        db.add(rule_group)

        for rule_dto in rule_group_dto.rules:
            rule = Rule(type=rule_dto.type, operator=rule_dto.operator, value=rule_dto.value)
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
