import enum
import uuid  # noqa: TC003

from pydantic import BaseModel, Field

from app.api.schemas.rule_schemas import CreateRuleInput, PutRuleInput, RuleResponse  # noqa: TC001


class CreateRuleGroupInput(BaseModel):
    operator: RuleGroupOperator
    rules: list[CreateRuleInput] = Field(min_length=1)


class PutRuleGroupInput(BaseModel):
    id: uuid.UUID | None = None
    operator: RuleGroupOperator
    rules: list[PutRuleInput] = Field(min_length=1)


class RuleGroupResponse(BaseModel):
    id: uuid.UUID
    operator: RuleGroupOperator
    filter_id: uuid.UUID
    rules: list[RuleResponse]


class RuleGroupOperator(enum.StrEnum):
    AND = "AND"
    OR = "OR"
