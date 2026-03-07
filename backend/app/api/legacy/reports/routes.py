import uuid
from typing import Annotated

from fastapi import APIRouter, Body, Depends, UploadFile, status
from sqlalchemy.orm import Session  # noqa: TC002

from app.api.dependencies import get_db
from app.api.legacy.reports.models import OverrideInput, OverrideResponse, ReportFullResponse
from app.api.schemas.report_schemas import ReportResponse
from app.bank_statement_parser import parse_statement, parse_upload_file
from app.db.reports.models import CURRENT_REPORT_SCHEMA_VERSION, Override, Report
from app.db.reports.repository import (
    CreateOverrideDto,
    CreateReportDto,
    CreateReportTransactionDto,
    LinkTransactionToFilterDto,
    create_override,
    create_report,
    delete_override,
    get_filter,
    get_transaction,
    link_transaction_to_filter,
)
from app.repositories.report_repository import get_report
from app.services import report_service

router = APIRouter()


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
                    type=r.get("type"),
                    product=r.get("product"),
                    currency=r.get("currency"),
                    state=r.get("state"),
                    balance=r.get("balance"),
                    raw_data=r.get("raw_data"),
                )
                for r in records
            ],
        ),
    )


@router.get("/reports/{report_id}", response_model=ReportFullResponse)
async def get_report_(report_id: uuid.UUID, db: Annotated[Session, Depends(get_db)]) -> ReportFullResponse | Report:
    report = get_report(db=db, report_id=report_id)
    if report.schema_version < CURRENT_REPORT_SCHEMA_VERSION:
        return report
    return ReportFullResponse.model_validate(report_service.build_report_full_dict(report))


@router.post("/reports/{report_id}/generate", response_model=ReportFullResponse)
async def generate_report_(report_id: uuid.UUID, db: Annotated[Session, Depends(get_db)]) -> ReportFullResponse:
    report = report_service.generate_report(db=db, report_id=report_id)
    return ReportFullResponse.model_validate(report_service.build_report_full_dict(report))


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
