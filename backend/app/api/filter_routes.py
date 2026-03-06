from typing import TYPE_CHECKING, Annotated

from fastapi import APIRouter, Depends, status

from app.api.dependencies import get_db
from app.api.schemas.filter_schemas import CreateFilterInput, FilterResponse
from app.db.rules.models import Filter
from app.services import filter_service

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

router = APIRouter()


@router.post("/filters", response_model=FilterResponse, status_code=status.HTTP_201_CREATED)
def create_filter(form_data: CreateFilterInput, db: Annotated[Session, Depends(get_db)]) -> Filter:
    return filter_service.create_filter(db=db, form_data=form_data)
