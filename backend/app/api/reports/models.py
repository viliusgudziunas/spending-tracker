import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class ReportResponse(BaseModel):
    id: uuid.UUID
    name: str


class TransactionResponse(BaseModel):
    id: uuid.UUID
    description: str
    amount: float
    started_date: datetime
    completed_date: datetime
    source: str | None


class ReportFilterFullResponse(BaseModel):
    id: uuid.UUID
    name: str
    position: int
    amount: Decimal
    transactions: list[TransactionResponse]


class ReportCategoryFullResponse(BaseModel):
    id: uuid.UUID
    name: str
    filters: list[ReportFilterFullResponse]


class ReportFullResponse(BaseModel):
    id: uuid.UUID
    name: str
    categories: list[ReportCategoryFullResponse]
    unidentified_transactions: list[TransactionResponse]


class OverrideInput(BaseModel):
    transaction_id: uuid.UUID
    filter_id: uuid.UUID


class OverrideResponse(BaseModel):
    id: uuid.UUID
    category_name: str
    filter_name: str
    transaction_id: uuid.UUID
