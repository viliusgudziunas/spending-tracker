import uuid  # noqa: TC003
from typing import TYPE_CHECKING, Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session  # noqa: TC002

from app.api.dependencies import get_db
from app.api.schemas.plan_schemas import CreatePlanSectionInput, PlanSectionResponse, UpdatePlanSectionInput
from app.repositories.exceptions import InvalidPlanSectionPositionError, PlanSectionNotFoundError
from app.services import plan_service

if TYPE_CHECKING:
    from collections.abc import Sequence

    from app.db.models import PlanSection

router = APIRouter(prefix="/plan")


@router.get("/sections", response_model=list[PlanSectionResponse], status_code=status.HTTP_200_OK)
def get_plan_sections(db: Annotated[Session, Depends(get_db)]) -> Sequence[PlanSection]:
    return plan_service.get_plan_sections(db=db)


@router.post("/sections", response_model=PlanSectionResponse, status_code=status.HTTP_201_CREATED)
def create_plan_section(
    form_data: CreatePlanSectionInput,
    db: Annotated[Session, Depends(get_db)],
) -> PlanSection:
    return plan_service.create_plan_section(db=db, name=form_data.name, is_income=form_data.is_income)


@router.patch(
    "/sections/{section_id}",
    response_model=PlanSectionResponse,
    status_code=status.HTTP_200_OK,
)
def update_plan_section(
    section_id: uuid.UUID,
    form_data: UpdatePlanSectionInput,
    db: Annotated[Session, Depends(get_db)],
) -> PlanSection:
    try:
        return plan_service.update_plan_section(
            db=db,
            section_id=section_id,
            name=form_data.name,
            position=form_data.position,
            is_income=form_data.is_income,
        )
    except PlanSectionNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan section not found") from exc
    except InvalidPlanSectionPositionError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid plan section position") from exc


@router.delete("/sections/{section_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_plan_section(section_id: uuid.UUID, db: Annotated[Session, Depends(get_db)]) -> None:
    try:
        plan_service.delete_plan_section(db=db, section_id=section_id)
    except PlanSectionNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan section not found") from exc
