import enum
import uuid

from pydantic import BaseModel


class CreateRuleInput(BaseModel):
    type: RuleType
    operator: RuleOperator
    value: str


class PutRuleInput(BaseModel):
    id: uuid.UUID | None = None
    type: RuleType
    operator: RuleOperator
    value: str


class RuleResponse(BaseModel):
    id: uuid.UUID
    type: RuleType
    operator: RuleOperator
    value: str
    group_id: uuid.UUID


class RuleType(enum.StrEnum):
    DESCRIPTION = "DESCRIPTION"
    AMOUNT = "AMOUNT"
    PRODUCT = "PRODUCT"


class RuleOperator(enum.StrEnum):
    EQUAL = "EQUAL"
    NOT_EQUAL = "NOT_EQUAL"
    GREATER_THAN = "GREATER_THAN"
    LESS_THAN = "LESS_THAN"
    GREATER_THAN_EQUAL = "GREATER_THAN_EQUAL"
    LESS_THAN_EQUAL = "LESS_THAN_EQUAL"
