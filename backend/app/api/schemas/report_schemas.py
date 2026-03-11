import uuid
from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel


class ReportResponse(BaseModel):
    id: uuid.UUID
    name: str
    schema_version: int


class ReportDetailResponse(BaseModel):
    id: uuid.UUID
    name: str
    schema_version: int
    categories: list[ReportDetailCategoryResponse]
    unidentified_transactions: list[ReportDetailTransactionResponse]


class ReportDetailCategoryResponse(BaseModel):
    id: uuid.UUID
    name: str
    filters: list[ReportDetailFilterResponse]


class ReportDetailFilterResponse(BaseModel):
    id: uuid.UUID
    name: str
    position: int
    amount: Decimal
    transactions: list[ReportDetailTransactionResponse]


type ReportDetailTransactionResponse = ReportDetailTransactionV1Response | ReportDetailTransactionV2Response


class ReportDetailTransactionV1Response(BaseModel):
    schema_version: Literal[1] = 1
    id: uuid.UUID
    started_date: datetime
    completed_date: datetime | None
    description: str
    amount: float
    fee: float
    source: str | None


class ReportDetailTransactionV2Response(BaseModel):
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
