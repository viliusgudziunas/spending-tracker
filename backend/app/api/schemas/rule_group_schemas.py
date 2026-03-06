import enum
import uuid

from pydantic import BaseModel

from app.api.schemas.rule_schemas import RuleResponse


class RuleGroupResponse(BaseModel):
    id: uuid.UUID
    operator: RuleGroupOperator
    filter_id: uuid.UUID
    rules: list[RuleResponse]


class RuleGroupOperator(enum.StrEnum):
    AND = "AND"
    OR = "OR"
