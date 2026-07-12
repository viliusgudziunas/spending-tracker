import uuid  # noqa: TC003
from datetime import datetime  # noqa: TC003
from decimal import Decimal  # noqa: TC003
from typing import Literal

from pydantic import BaseModel, model_validator


class PutReportAssignmentInput(BaseModel):
    target_rule_filter_id: uuid.UUID | None = None
    target_report_filter_id: uuid.UUID | None = None

    @model_validator(mode="after")
    def exactly_one_target(self) -> PutReportAssignmentInput:
        targets = [self.target_rule_filter_id, self.target_report_filter_id]
        provided_targets = [target for target in targets if target is not None]
        if len(provided_targets) != 1:
            msg = "Exactly one of 'target_rule_filter_id' or 'target_report_filter_id' must be provided"
            raise ValueError(msg)
        return self


class UpdateReportInput(BaseModel):
    name: str


class CreateReportManualFilterInput(BaseModel):
    name: str
    category_id: uuid.UUID
    position: int | None = None


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
    rule_filter_id: uuid.UUID | None = None
    is_manual: bool
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


class ReportManualFilterResponse(BaseModel):
    id: uuid.UUID
    name: str
    category_id: uuid.UUID
    position: int
