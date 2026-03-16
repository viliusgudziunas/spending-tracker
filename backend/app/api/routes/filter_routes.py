from collections.abc import Sequence
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session  # noqa: TC002

from app.api.dependencies import get_db
from app.api.schemas.filter_schemas import (
    CreateFilterInput,
    FilterResponse,
    PutFilterRuleGroupsInput,
    UpdateFilterInput,
)
from app.db.models import Filter
from app.repositories.exceptions import (
    DuplicateFilterError,
    FilterNotFoundError,
    InvalidFilterRulesPayloadError,
)
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


@router.patch("/filters/{filter_id}", response_model=FilterResponse)
def update_filter(
    filter_id: UUID,
    form_data: UpdateFilterInput,
    db: Annotated[Session, Depends(get_db)],
) -> Filter:
    try:
        return filter_service.update_filter(
            db=db,
            filter_id=filter_id,
            name=form_data.name,
            position=form_data.position,
        )
    except FilterNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Filter not found") from exc
    except DuplicateFilterError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Filter already exists") from exc


@router.delete("/filters/{filter_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_filter(filter_id: UUID, db: Annotated[Session, Depends(get_db)]) -> None:
    try:
        filter_service.delete_filter(db=db, filter_id=filter_id)
    except FilterNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Filter not found") from exc


@router.put("/filters/{filter_id}/rule-groups", response_model=FilterResponse)
def put_filter_rule_groups(
    filter_id: UUID,
    form_data: PutFilterRuleGroupsInput,
    db: Annotated[Session, Depends(get_db)],
) -> Filter:
    try:
        return filter_service.put_filter_rule_groups(
            db=db,
            filter_id=filter_id,
            form_data=form_data,
        )
    except FilterNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Filter not found") from exc
    except InvalidFilterRulesPayloadError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
