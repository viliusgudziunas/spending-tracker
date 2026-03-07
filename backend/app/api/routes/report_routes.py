from collections.abc import Sequence
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session  # noqa: TC002

from app.api.dependencies import get_db
from app.api.schemas.report_schemas import ReportResponse
from app.db.reports.models import Report
from app.services import report_service

router = APIRouter()


@router.get("/reports", response_model=list[ReportResponse], status_code=status.HTTP_200_OK)
def list_reports(db: Annotated[Session, Depends(get_db)]) -> Sequence[Report]:
    return report_service.list_reports(db=db)
