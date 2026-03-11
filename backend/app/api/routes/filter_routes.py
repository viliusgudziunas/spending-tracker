from collections.abc import Sequence
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session  # noqa: TC002

from app.api.dependencies import get_db
from app.api.schemas.filter_schemas import CreateFilterInput, FilterResponse
from app.db.rules.models import Filter
from app.repositories.exceptions import FilterNotFoundError
from app.services import filter_service

router = APIRouter()


@router.get("/filters", response_model=list[FilterResponse])
def get_filters(db: Annotated[Session, Depends(get_db)]) -> Sequence[Filter]:
    return filter_service.get_filters(db=db)


@router.post("/filters", response_model=FilterResponse, status_code=status.HTTP_201_CREATED)
def create_filter(form_data: CreateFilterInput, db: Annotated[Session, Depends(get_db)]) -> Filter:
    return filter_service.create_filter(db=db, form_data=form_data)


@router.get("/filters/{filter_id}", response_model=FilterResponse)
def get_filter(filter_id: UUID, db: Annotated[Session, Depends(get_db)]) -> Filter:
    try:
        return filter_service.get_filter(db=db, filter_id=filter_id)
    except FilterNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Filter not found") from exc
