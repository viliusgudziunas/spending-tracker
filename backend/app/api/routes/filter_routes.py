from collections.abc import Sequence
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session  # noqa: TC002

from app.api.dependencies import get_db
from app.api.schemas.filter_schemas import CreateFilterInput, FilterResponse
from app.db.rules.models import Filter
from app.services import filter_service

router = APIRouter()


@router.get("/filters", response_model=list[FilterResponse])
def get_filters(db: Annotated[Session, Depends(get_db)]) -> Sequence[Filter]:
    return filter_service.get_filters(db=db)


@router.post("/filters", response_model=FilterResponse, status_code=status.HTTP_201_CREATED)
def create_filter(form_data: CreateFilterInput, db: Annotated[Session, Depends(get_db)]) -> Filter:
    return filter_service.create_filter(db=db, form_data=form_data)
