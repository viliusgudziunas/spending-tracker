import enum
import uuid

from pydantic import BaseModel, Field

from app.api.schemas.rule_schemas import CreateRuleInput, RuleResponse


class CreateRuleGroupInput(BaseModel):
    operator: RuleGroupOperator
    rules: list[CreateRuleInput] = Field(min_length=1)


class RuleGroupResponse(BaseModel):
    id: uuid.UUID
    operator: RuleGroupOperator
    filter_id: uuid.UUID
    rules: list[RuleResponse]


class RuleGroupOperator(enum.StrEnum):
    AND = "AND"
    OR = "OR"
