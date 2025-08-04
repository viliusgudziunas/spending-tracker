from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.adapter.db import get_db
from app.schemas.rules_schema import CategoryCreate, CategoryRead
from app.use_cases.rules_use_cases import add_new_category

router = APIRouter()


@router.post("/categories", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
def create_category(input_category: CategoryCreate, db: Annotated[Session, Depends(get_db)]) -> CategoryRead:
    return add_new_category(db, input_category)
