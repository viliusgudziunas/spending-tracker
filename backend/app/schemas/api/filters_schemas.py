import uuid

from pydantic import BaseModel

from app.schemas.api.rule_groups_schemas import RuleGroupCreate


class FilterCreate(BaseModel):
    name: str
    position: int | None = None
    category_id: uuid.UUID
    rule_groups: list[RuleGroupCreate]
