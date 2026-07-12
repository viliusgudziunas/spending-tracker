import uuid  # noqa: TC003
from typing import Annotated

from pydantic import BaseModel, Field, StrictBool, StringConstraints, model_validator

PlanSectionName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
PlanSectionPosition = Annotated[int, Field(ge=1)]


class CreatePlanSectionInput(BaseModel):
    name: PlanSectionName
    is_income: StrictBool = False


class UpdatePlanSectionInput(BaseModel):
    name: PlanSectionName | None = None
    position: PlanSectionPosition | None = None
    is_income: StrictBool | None = None

    @model_validator(mode="after")
    def at_least_one_field_set(self) -> UpdatePlanSectionInput:
        if self.name is None and self.position is None and self.is_income is None:
            msg = "At least one of 'name', 'position', or 'is_income' must be provided"
            raise ValueError(msg)
        return self


class PlanSectionResponse(BaseModel):
    id: uuid.UUID
    name: str
    position: int
    is_income: bool
