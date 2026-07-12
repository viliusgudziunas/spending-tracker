import uuid  # noqa: TC003
from typing import TYPE_CHECKING, Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session  # noqa: TC002

from app.api.dependencies import get_db
from app.api.schemas.category_schemas import CategoryResponse, CreateCategoryInput, UpdateCategoryInput
from app.repositories.exceptions import CategoryNotFoundError, DuplicateCategoryError
from app.services import category_service

if TYPE_CHECKING:
    from collections.abc import Sequence

    from app.db.models import Category

router = APIRouter()


@router.post("/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(form_data: CreateCategoryInput, db: Annotated[Session, Depends(get_db)]) -> Category:
    try:
        category = category_service.create_category(db=db, name=form_data.name)
    except DuplicateCategoryError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Category already exists") from exc

    return category


@router.get("/categories", response_model=list[CategoryResponse], status_code=status.HTTP_200_OK)
def get_categories(db: Annotated[Session, Depends(get_db)]) -> Sequence[Category]:
    return category_service.get_categories(db=db)


@router.patch("/categories/{category_id}", response_model=CategoryResponse, status_code=status.HTTP_200_OK)
def update_category(
    category_id: uuid.UUID,
    form_data: UpdateCategoryInput,
    db: Annotated[Session, Depends(get_db)],
) -> Category:
    try:
        category = category_service.update_category(
            db=db,
            category_id=category_id,
            name=form_data.name,
            position=form_data.position,
        )
    except CategoryNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found") from exc
    except DuplicateCategoryError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Category already exists") from exc

    return category
