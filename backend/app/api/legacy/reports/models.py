import uuid

from pydantic import BaseModel


class OverrideInput(BaseModel):
    transaction_id: uuid.UUID
    filter_id: uuid.UUID


class OverrideResponse(BaseModel):
    id: uuid.UUID
    category_name: str
    filter_name: str
    transaction_id: uuid.UUID
