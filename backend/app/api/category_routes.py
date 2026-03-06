from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session  # noqa: TC002

from app.api.dependencies import get_db
from app.api.schemas.category_schemas import CategoryResponse, CreateCategoryInput
from app.db.rules.models import Category
from app.repositories.exceptions import DuplicateCategoryError
from app.services import category_service

router = APIRouter()


@router.post("/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category_(form_data: CreateCategoryInput, db: Annotated[Session, Depends(get_db)]) -> Category:
    try:
        category = category_service.create_category(db=db, name=form_data.name)
    except DuplicateCategoryError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Category already exists") from exc

    return category
