import uuid  # noqa: TC003

from pydantic import BaseModel, model_validator

from app.api.schemas.filter_schemas import FilterResponse  # noqa: TC001


class CreateCategoryInput(BaseModel):
    name: str


class UpdateCategoryInput(BaseModel):
    name: str | None = None
    position: int | None = None

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
