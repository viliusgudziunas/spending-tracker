import uuid
from collections.abc import Sequence

from psycopg2.errors import UniqueViolation
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.rules.models import Category, Filter, Rule, RuleGroup


class DuplicateCategoryError(Exception):
    pass


def create_category(db: Session, name: str) -> Category:
    category = Category(name=name)
    db.add(category)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        if isinstance(exc.orig, UniqueViolation):
            raise DuplicateCategoryError from exc

        raise

    db.refresh(category)
    return category


def get_categories(db: Session) -> Sequence[Category]:
    return db.scalars(select(Category)).all()


class CreateRuleDTO(BaseModel):
    type: str
    operator: str
    value: str


class CreateRuleGroupDTO(BaseModel):
    operator: str
    rules: list[CreateRuleDTO]


class CreateFilterDTO(BaseModel):
    name: str
    position: int | None
    category_id: uuid.UUID
    rule_groups: list[CreateRuleGroupDTO]


def create_filter(db: Session, filter_dto: CreateFilterDTO) -> Filter:
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


def get_filters(db: Session) -> Sequence[Filter]:
    return db.scalars(select(Filter)).all()


class FilterNotFoundError(Exception):
    pass


def get_filter(db: Session, filter_id: uuid.UUID) -> Filter:
    filter_ = db.get(Filter, filter_id)

    if filter_ is None:
        raise FilterNotFoundError

    return filter_


class UpdateRuleDTO(BaseModel):
    type: str
    operator: str
    value: str


class UpdateRuleGroupDTO(BaseModel):
    operator: str
    rules: list[UpdateRuleDTO]


class UpdateFilterDTO(BaseModel):
    name: str
    position: int | None
    category_id: uuid.UUID
    rule_groups: list[UpdateRuleGroupDTO]


def update_filter(db: Session, filter_: Filter, filter_dto: UpdateFilterDTO) -> Filter:
    filter_.name = filter_dto.name
    filter_.category_id = filter_dto.category_id
    if filter_dto.position is not None:
        filter_.position = filter_dto.position

    for rule_group in filter_.rule_groups:
        for rule in rule_group.rules:
            db.delete(rule)

        db.delete(rule_group)

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


class CreateSingleRuleDTO(CreateRuleDTO):
    filter_id: uuid.UUID


def create_rule(db: Session, rule_dto: CreateSingleRuleDTO) -> Rule:
    rule = Rule(type=rule_dto.type, operator=rule_dto.operator, value=rule_dto.value, filter_id=rule_dto.filter_id)

    db.add(rule)
    db.commit()
    db.refresh(rule)

    return rule
