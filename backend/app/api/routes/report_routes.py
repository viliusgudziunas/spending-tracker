import uuid
from collections.abc import Sequence
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session  # noqa: TC002

from app.api.dependencies import get_db
from app.api.schemas.report_schemas import ReportDetailResponse, ReportResponse
from app.db.reports.models import Report
from app.repositories.exceptions import ReportNotFoundError
from app.services import report_service

router = APIRouter()


@router.get("/reports", response_model=list[ReportResponse], status_code=status.HTTP_200_OK)
def list_reports(db: Annotated[Session, Depends(get_db)]) -> Sequence[Report]:
    return report_service.list_reports(db=db)


@router.get("/reports/{report_id}", response_model=ReportDetailResponse, status_code=status.HTTP_200_OK)
def get_report(report_id: uuid.UUID, db: Annotated[Session, Depends(get_db)]) -> ReportDetailResponse:
    try:
        return report_service.get_report_detail(db=db, report_id=report_id)
    except ReportNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found") from exc
