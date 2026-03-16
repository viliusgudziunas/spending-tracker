import uuid

from pydantic import BaseModel, Field, model_validator

from app.api.schemas.rule_group_schemas import CreateRuleGroupInput, PutRuleGroupInput, RuleGroupResponse


class CreateFilterInput(BaseModel):
    name: str
    position: int | None = None
    category_id: uuid.UUID
    rule_groups: list[CreateRuleGroupInput] = Field(min_length=1)


class UpdateFilterInput(BaseModel):
    name: str | None = None
    position: int | None = None

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
