import uuid  # noqa: TC003
from decimal import Decimal  # noqa: TC003

from pydantic import BaseModel


class BreakdownFilterResponse(BaseModel):
    key: str
    name: str
    position: int
    amounts: dict[str, Decimal]


class BreakdownCategoryResponse(BaseModel):
    id: uuid.UUID
    name: str
    position: int
    amounts: dict[str, Decimal]
    filters: list[BreakdownFilterResponse]


class BreakdownUnidentifiedResponse(BaseModel):
    amounts: dict[str, Decimal]


class BreakdownResponse(BaseModel):
    months: list[str]
    categories: list[BreakdownCategoryResponse]
    unidentified: BreakdownUnidentifiedResponse
