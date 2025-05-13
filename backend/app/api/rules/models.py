import uuid

from pydantic import BaseModel

from app.db.rules.models import RuleGroupOperator, RuleOperator, RuleType


class CategoryInput(BaseModel):
    name: str


class RuleInput(BaseModel):
    type: RuleType
    operator: RuleOperator
    value: str


class RuleGroupInput(BaseModel):
    operator: RuleGroupOperator
    rules: list[RuleInput]


class FilterInput(BaseModel):
    name: str
    position: int | None = None
    category_id: uuid.UUID
    rule_groups: list[RuleGroupInput]


class RuleResponse(BaseModel):
    id: uuid.UUID
    type: RuleType
    operator: RuleOperator
    value: str
    filter_id: uuid.UUID


class RuleFullResponse(BaseModel):
    id: uuid.UUID
    type: RuleType
    operator: RuleOperator
    value: str
    group_id: uuid.UUID


class RuleGroupFullResponse(BaseModel):
    id: uuid.UUID
    operator: RuleGroupOperator
    filter_id: uuid.UUID
    rules: list[RuleFullResponse]


class FilterFullResponse(BaseModel):
    id: uuid.UUID
    name: str
    position: int
    category_id: uuid.UUID
    rule_groups: list[RuleGroupFullResponse]


class CategoryFullResponse(BaseModel):
    id: uuid.UUID
    name: str
    filters: list[FilterFullResponse]
