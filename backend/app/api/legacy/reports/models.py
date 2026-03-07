import uuid
from datetime import datetime
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, Field


class TransactionV1Response(BaseModel):
    schema_version: Literal[1] = 1
    id: uuid.UUID
    started_date: datetime
    completed_date: datetime | None
    description: str
    amount: float
    fee: float
    source: str | None


class TransactionV2Response(BaseModel):
    schema_version: Literal[2] = 2
    id: uuid.UUID
    type: str
    product: str
    started_date: datetime
    completed_date: datetime | None
    description: str
    amount: float
    fee: float
    currency: str
    state: str
    balance: float
    source: str | None
    raw_data: dict


TransactionResponse = Annotated[
    TransactionV1Response | TransactionV2Response,
    Field(discriminator="schema_version"),
]


class ReportFilterFullResponse(BaseModel):
    id: uuid.UUID
    name: str
    position: int
    amount: Decimal
    transactions: list[TransactionV1Response | TransactionV2Response]


class ReportCategoryFullResponse(BaseModel):
    id: uuid.UUID
    name: str
    filters: list[ReportFilterFullResponse]


class ReportFullResponse(BaseModel):
    id: uuid.UUID
    name: str
    schema_version: int
    categories: list[ReportCategoryFullResponse]
    unidentified_transactions: list[TransactionV1Response | TransactionV2Response]


class OverrideInput(BaseModel):
    transaction_id: uuid.UUID
    filter_id: uuid.UUID


class OverrideResponse(BaseModel):
    id: uuid.UUID
    category_name: str
    filter_name: str
    transaction_id: uuid.UUID
