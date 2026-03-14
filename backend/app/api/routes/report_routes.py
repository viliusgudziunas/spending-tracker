import uuid
from collections.abc import Sequence
from typing import Annotated

from fastapi import APIRouter, Body, Depends, HTTPException, UploadFile, status
from sqlalchemy.orm import Session  # noqa: TC002

from app.api.dependencies import get_db
from app.api.schemas.report_schemas import (
    CreateReportManualFilterInput,
    PutReportAssignmentInput,
    ReportDetailResponse,
    ReportManualFilterResponse,
    ReportResponse,
)
from app.db.reports.models import Report
from app.repositories.exceptions import (
    CategoryNotFoundError,
    FilterNotFoundError,
    ReportManualFilterNotFoundError,
    ReportNotFoundError,
    TransactionNotFoundError,
)
from app.services import report_service

router = APIRouter()


@router.get("/reports", response_model=list[ReportResponse])
def list_reports(db: Annotated[Session, Depends(get_db)]) -> Sequence[Report]:
    return report_service.list_reports(db=db)


@router.post("/reports", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
def create_report(
    upload_file: UploadFile,
    name: Annotated[str, Body(...)],
    db: Annotated[Session, Depends(get_db)],
) -> Report:
    file_content = upload_file.file.read()
    return report_service.create_report(db=db, name=name, file_content=file_content)


@router.get("/reports/{report_id}", response_model=ReportDetailResponse)
def get_report(report_id: uuid.UUID, db: Annotated[Session, Depends(get_db)]) -> ReportDetailResponse:
    try:
        return report_service.get_report_detail(db=db, report_id=report_id)
    except ReportNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found") from exc


@router.post("/reports/{report_id}/generate", response_model=ReportDetailResponse)
def generate_report(report_id: uuid.UUID, db: Annotated[Session, Depends(get_db)]) -> ReportDetailResponse:
    try:
        return report_service.generate_report_detail(db=db, report_id=report_id)
    except ReportNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found") from exc


@router.put("/reports/{report_id}/transactions/{transaction_id}/assignment", response_model=ReportDetailResponse)
def upsert_transaction_assignment(
    report_id: uuid.UUID,
    transaction_id: uuid.UUID,
    form_data: PutReportAssignmentInput,
    db: Annotated[Session, Depends(get_db)],
) -> ReportDetailResponse:
    try:
        return report_service.upsert_transaction_assignment(
            db=db,
            report_id=report_id,
            transaction_id=transaction_id,
            target_rule_filter_id=form_data.target_rule_filter_id,
            target_report_filter_id=form_data.target_report_filter_id,
        )
    except ReportNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found") from exc
    except TransactionNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found") from exc
    except FilterNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Filter not found") from exc
    except ReportManualFilterNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report filter not found") from exc


@router.post(
    "/reports/{report_id}/manual-filters",
    response_model=ReportManualFilterResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_report_manual_filter(
    report_id: uuid.UUID,
    form_data: CreateReportManualFilterInput,
    db: Annotated[Session, Depends(get_db)],
) -> ReportManualFilterResponse:
    try:
        return report_service.create_report_manual_filter(
            db=db,
            report_id=report_id,
            name=form_data.name,
            category_id=form_data.category_id,
            position=form_data.position,
        )
    except ReportNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found") from exc
    except CategoryNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found") from exc
