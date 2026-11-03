import uuid
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, Field, StrictBool, StringConstraints, field_serializer, model_validator

from app.repositories.dtos import UpdatePlanLineDto

PlanSectionName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
PlanSectionPosition = Annotated[int, Field(ge=1)]
PlanLineName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
PlanLinePosition = Annotated[int, Field(ge=1)]
PlanFixedAmount = Annotated[str, StringConstraints(strict=True, pattern=r"^[0-9]{1,10}(?:\.[0-9]{1,2})?$")]


class CreatePlanLineInput(BaseModel):
    name: PlanLineName


class UpdatePlanLineInput(BaseModel):
    name: PlanLineName | None = None
    position: PlanLinePosition | None = None
    fixed_amount: PlanFixedAmount | None = None

    def to_updates(self) -> UpdatePlanLineDto:
        updates = self.model_dump(exclude_unset=True, exclude_none=True)
        if "fixed_amount" in self.model_fields_set:
            updates["fixed_amount"] = Decimal(self.fixed_amount) if self.fixed_amount is not None else None
        return UpdatePlanLineDto(**updates)

    @model_validator(mode="after")
    def at_least_one_field_set(self) -> UpdatePlanLineInput:
        if self.name is None and self.position is None and "fixed_amount" not in self.model_fields_set:
            msg = "At least one of 'name', 'position', or 'fixed_amount' must be provided"
            raise ValueError(msg)
        return self


class PlanLineResponse(BaseModel):
    id: uuid.UUID
    name: str
    position: int
    fixed_amount: Decimal | None

    @field_serializer("fixed_amount")
    def serialize_fixed_amount(self, value: Decimal | None) -> str | None:
        return None if value is None else format(value, ".2f")


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
    lines: list[PlanLineResponse]
