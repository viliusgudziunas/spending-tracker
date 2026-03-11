import uuid
from dataclasses import dataclass
from typing import TYPE_CHECKING

from pydantic import BaseModel

from app.db.rules.models import Filter, Rule, RuleGroup
from app.repositories.dtos import CreateRuleDto

if TYPE_CHECKING:
    from sqlalchemy.orm import Session


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


def delete_filter(db: Session, filter_id: uuid.UUID) -> None:
    filter_ = get_filter(db=db, filter_id=filter_id)

    db.delete(filter_)
    db.commit()


@dataclass(frozen=True, kw_only=True)
class CreateSingleRuleDTO(CreateRuleDto):
    filter_id: uuid.UUID


def create_rule(db: Session, rule_dto: CreateSingleRuleDTO) -> Rule:
    rule = Rule(type=rule_dto.type, operator=rule_dto.operator, value=rule_dto.value, filter_id=rule_dto.filter_id)

    db.add(rule)
    db.commit()
    db.refresh(rule)

    return rule
