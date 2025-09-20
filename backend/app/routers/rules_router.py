from collections.abc import Iterable
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.adapter.db import get_db
from app.schemas.api.categories_schemas import CategoryCreate, CategoryRead
from app.schemas.api.filters_schemas import FilterCreate
from app.use_cases.categories_use_cases import add_new_category, get_categories

router = APIRouter()


@router.post("/categories", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
def create_category(input_category: CategoryCreate, db: Annotated[Session, Depends(get_db)]) -> CategoryRead:
    return add_new_category(db, input_category)


@router.get("/categories", response_model=list[CategoryRead], status_code=status.HTTP_200_OK)
def read_categories(db: Annotated[Session, Depends(get_db)]) -> Iterable[CategoryRead]:
    return get_categories(db)


@router.post("/filters/v2", status_code=status.HTTP_201_CREATED)
def create_filter(input_filter: FilterCreate) -> None:
    pass
