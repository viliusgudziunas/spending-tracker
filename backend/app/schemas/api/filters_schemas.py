import uuid

from pydantic import BaseModel, ConfigDict

from app.schemas.api.rule_groups_schemas import RuleGroupCreate, RuleGroupOverwrite


class FilterRead(BaseModel):
    id: uuid.UUID
    name: str
    position: int
    category_id: uuid.UUID

    model_config = ConfigDict(from_attributes=True)


class FilterCreate(BaseModel):
    name: str
    position: int | None = None
    category_id: uuid.UUID
    rule_groups: list[RuleGroupCreate]


class FilterOverwrite(BaseModel):
    name: str
    position: int | None = None
    category_id: uuid.UUID
    rule_groups: list[RuleGroupOverwrite]
