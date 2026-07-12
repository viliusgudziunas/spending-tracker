from typing import TYPE_CHECKING

from app.repositories import plan_section_repository
from app.repositories.exceptions import InvalidPlanSectionPositionError

if TYPE_CHECKING:
    import uuid
    from collections.abc import Sequence

    from sqlalchemy.orm import Session

    from app.db.models import PlanSection


def get_plan_sections(db: Session) -> Sequence[PlanSection]:
    return plan_section_repository.get_plan_sections(db=db)


def create_plan_section(*, db: Session, name: str, is_income: bool) -> PlanSection:
    return plan_section_repository.create_plan_section(db=db, name=name, is_income=is_income)


def update_plan_section(
    *,
    db: Session,
    section_id: uuid.UUID,
    name: str | None,
    position: int | None,
    is_income: bool | None,
) -> PlanSection:
    section = plan_section_repository.get_plan_section(db=db, section_id=section_id)
    if position is not None and position > plan_section_repository.get_plan_section_count(db=db):
        raise InvalidPlanSectionPositionError

    return plan_section_repository.update_plan_section(
        db=db,
        section=section,
        name=name,
        position=position,
        is_income=is_income,
    )


def delete_plan_section(db: Session, section_id: uuid.UUID) -> None:
    plan_section_repository.delete_plan_section(db=db, section_id=section_id)
