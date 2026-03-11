import uuid
from collections.abc import Sequence
from typing import Annotated

from fastapi import APIRouter, Body, Depends, HTTPException, UploadFile, status
from sqlalchemy.orm import Session  # noqa: TC002

from app.api.dependencies import get_db
from app.api.schemas.report_schemas import ReportDetailResponse, ReportResponse
from app.db.reports.models import Report
from app.repositories.exceptions import ReportNotFoundError
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
