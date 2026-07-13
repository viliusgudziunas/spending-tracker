import uuid  # noqa: TC003
from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints, model_validator

from app.api.schemas.rule_group_schemas import CreateRuleGroupInput, PutRuleGroupInput, RuleGroupResponse  # noqa: TC001

FilterName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
FilterPosition = Annotated[int, Field(ge=1)]


class CreateFilterInput(BaseModel):
    name: FilterName
    category_id: uuid.UUID
    rule_groups: list[CreateRuleGroupInput] = Field(min_length=1)


class UpdateFilterInput(BaseModel):
    name: FilterName | None = None
    position: FilterPosition | None = None

    @model_validator(mode="after")
    def at_least_one_field_set(self) -> UpdateFilterInput:
        if self.name is None and self.position is None:
            msg = "At least one of 'name' or 'position' must be provided"
            raise ValueError(msg)
        return self


class PutFilterRuleGroupsInput(BaseModel):
    rule_groups: list[PutRuleGroupInput] = Field(min_length=1)


class FilterResponse(BaseModel):
    id: uuid.UUID
    name: str
    position: int
    category_id: uuid.UUID
    rule_groups: list[RuleGroupResponse]
