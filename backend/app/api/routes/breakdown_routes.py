from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session  # noqa: TC002

from app.api.dependencies import get_db
from app.api.schemas.breakdown_schemas import BreakdownResponse
from app.services import breakdown_service

router = APIRouter()


@router.get("/breakdown", response_model=BreakdownResponse)
def get_breakdown(db: Annotated[Session, Depends(get_db)]) -> BreakdownResponse:
    return breakdown_service.get_breakdown(db=db)
