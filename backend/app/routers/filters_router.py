import uuid
from collections.abc import Iterable
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.adapter.db import get_db
from app.schemas.api.filters_schemas import FilterCreate, FilterRead
from app.use_cases.filters_use_cases import add_new_filter, get_filter, get_filters

router = APIRouter()


@router.post("/filters", response_model=FilterRead, status_code=status.HTTP_201_CREATED)
def create_filter(input_filter: FilterCreate, db: Annotated[Session, Depends(get_db)]) -> FilterRead:
    return add_new_filter(db, input_filter)


@router.get("/filters", response_model=list[FilterRead], status_code=status.HTTP_200_OK)
def read_filters(db: Annotated[Session, Depends(get_db)]) -> Iterable[FilterRead]:
    return get_filters(db=db)


@router.get("/filters/{filter_id}/v2", response_model=FilterRead, status_code=status.HTTP_200_OK)
def read_filter(filter_id: uuid.UUID, db: Annotated[Session, Depends(get_db)]) -> FilterRead:
    return get_filter(db=db, filter_id=filter_id)
