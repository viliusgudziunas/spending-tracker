from typing import TYPE_CHECKING

from app.repositories import plan_line_repository, plan_section_repository
from app.repositories.exceptions import InvalidPlanLinePositionError, InvalidPlanSectionPositionError

if TYPE_CHECKING:
    import uuid
    from collections.abc import Sequence

    from sqlalchemy.orm import Session

    from app.db.models import PlanLine, PlanSection


def get_plan_sections(db: Session) -> Sequence[PlanSection]:
    return plan_section_repository.get_plan_sections(db=db)


def create_plan_section(*, db: Session, name: str, is_income: bool) -> PlanSection:
    return plan_section_repository.create_plan_section(db=db, name=name, is_income=is_income)


def create_plan_line(*, db: Session, section_id: uuid.UUID, name: str) -> PlanLine:
    section = plan_section_repository.get_plan_section(db=db, section_id=section_id)
    return plan_line_repository.create_plan_line(db=db, section_id=section.id, name=name)


def update_plan_line(*, db: Session, line_id: uuid.UUID, name: str | None, position: int | None) -> PlanLine:
    line = plan_line_repository.get_plan_line(db=db, line_id=line_id)
    resolved_position = line.position if position is None else position
    if resolved_position != line.position and resolved_position > plan_line_repository.get_plan_line_count(
        db=db, section_id=line.section_id
    ):
        raise InvalidPlanLinePositionError
    return plan_line_repository.update_plan_line(
        db=db,
        line=line,
        name=line.name if name is None else name,
        position=resolved_position,
    )


def delete_plan_line(db: Session, line_id: uuid.UUID) -> None:
    line = plan_line_repository.get_plan_line(db=db, line_id=line_id)
    plan_line_repository.delete_plan_line(db=db, line=line)


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
