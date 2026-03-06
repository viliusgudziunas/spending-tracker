import uuid

from pydantic import BaseModel

from app.api.schemas.rule_group_schemas import RuleGroupResponse


class FilterResponse(BaseModel):
    id: uuid.UUID
    name: str
    position: int
    category_id: uuid.UUID
    rule_groups: list[RuleGroupResponse]
