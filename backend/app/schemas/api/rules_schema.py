import uuid

from pydantic import BaseModel, ConfigDict, Field


class CategoryRead(BaseModel):
    id: uuid.UUID
    name: str

    model_config = ConfigDict(from_attributes=True)


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1)
