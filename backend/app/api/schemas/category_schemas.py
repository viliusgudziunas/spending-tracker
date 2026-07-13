import uuid  # noqa: TC003
from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints, model_validator

from app.api.schemas.filter_schemas import FilterResponse  # noqa: TC001

CategoryName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
CategoryPosition = Annotated[int, Field(ge=1)]


class CreateCategoryInput(BaseModel):
    name: CategoryName


class UpdateCategoryInput(BaseModel):
    name: CategoryName | None = None
    position: CategoryPosition | None = None

    @model_validator(mode="after")
    def at_least_one_field_set(self) -> UpdateCategoryInput:
        if self.name is None and self.position is None:
            msg = "At least one of 'name' or 'position' must be provided"
            raise ValueError(msg)
        return self


class CategoryResponse(BaseModel):
    id: uuid.UUID
    name: str
    position: int
    filters: list[FilterResponse]
