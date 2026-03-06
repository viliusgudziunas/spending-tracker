import uuid

from pydantic import BaseModel

from app.api.schemas.rule_group_schemas import CreateRuleGroupInput, RuleGroupResponse


class CreateFilterInput(BaseModel):
    name: str
    position: int | None = None
    category_id: uuid.UUID
    rule_groups: list[CreateRuleGroupInput]


class FilterResponse(BaseModel):
    id: uuid.UUID
    name: str
    position: int
    category_id: uuid.UUID
    rule_groups: list[RuleGroupResponse]
