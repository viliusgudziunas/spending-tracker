import uuid
from collections.abc import Iterable
from typing import Annotated

from fastapi import APIRouter, Body, Depends, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.api.reports.models import OverrideInput, OverrideResponse, ReportFullResponse, ReportResponse
from app.bank_statement_parser import parse_statement, parse_upload_file
from app.db.reports.models import Override, Report
from app.db.reports.repository import (
    CreateOverrideDto,
    CreateReportDto,
    CreateReportTransactionDto,
    GenerateReportDto,
    LinkTransactionToFilterDto,
    apply_overrides,
    create_override,
    create_report,
    delete_override,
    generate_report,
    get_filter,
    get_report,
    get_reports,
    get_transaction,
    link_transaction_to_filter,
    reset_report,
)
from app.db.rules.repository import get_categories

router = APIRouter()


class ReportInput(BaseModel):
    name: str


@router.post("/reports", response_model=ReportResponse)
async def create_report_(
    file: UploadFile,
    name: Annotated[str, Body(...)],
    db: Annotated[Session, Depends(get_db)],
) -> Report:
    statement = await parse_upload_file(file=file)
    records = parse_statement(statement=statement)

    return create_report(
        db=db,
        report_dto=CreateReportDto(
            name=name,
            transactions=[
                CreateReportTransactionDto(
                    description=r["description"],
                    amount=r["amount"],
                    fee=r["fee"],
                    started_date=r["started_date"],
                    completed_date=r["completed_date"],
                )
                for r in records
            ],
        ),
    )


@router.get("/reports", response_model=list[ReportResponse], status_code=status.HTTP_200_OK)
async def get_reports_(db: Annotated[Session, Depends(get_db)]) -> Iterable[Report]:
    return get_reports(db=db)


@router.get("/reports/{report_id}", response_model=ReportFullResponse)
async def get_report_(report_id: uuid.UUID, db: Annotated[Session, Depends(get_db)]) -> Report:
    return get_report(db=db, report_id=report_id)


@router.post("/reports/{report_id}/generate", response_model=ReportFullResponse)
async def generate_report_(report_id: uuid.UUID, db: Annotated[Session, Depends(get_db)]) -> Report:
    report = get_report(db=db, report_id=report_id)
    reset_report(db=db, report=report)

    rule_categories = get_categories(db=db)
    generate_report(db=db, generate_report_dto=GenerateReportDto(report=report, rule_categories=rule_categories))
    apply_overrides(db=db, report=report)

    return report


@router.post("/overrides", response_model=OverrideResponse)
async def create_override_(form_data: OverrideInput, db: Annotated[Session, Depends(get_db)]) -> Override:
    filter_ = get_filter(db=db, filter_id=form_data.filter_id)
    override = create_override(
        db=db,
        override_dto=CreateOverrideDto(
            category_name=filter_.category.name,
            filter_name=filter_.name,
            transaction_id=form_data.transaction_id,
            report_id=filter_.category.report_id,
        ),
    )
    link_transaction_to_filter(
        db=db,
        link_dto=LinkTransactionToFilterDto(filter_id=filter_.id, transaction_id=form_data.transaction_id),
    )

    return override


@router.delete("/overrides/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_override_(transaction_id: uuid.UUID, db: Annotated[Session, Depends(get_db)]) -> None:
    transaction = get_transaction(db=db, transaction_id=transaction_id)
    delete_override(db=db, transaction=transaction)
