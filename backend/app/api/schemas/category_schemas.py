import uuid

from pydantic import BaseModel

from app.api.schemas.filter_schemas import FilterResponse


class CreateCategoryInput(BaseModel):
    name: str


class CategoryResponse(BaseModel):
    id: uuid.UUID
    name: str
    position: int
    filters: list[FilterResponse]
