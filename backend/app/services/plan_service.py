from decimal import Decimal
from typing import TYPE_CHECKING

from app.api.schemas.plan_schemas import PlanGridLineResponse, PlanGridResponse, PlanGridSectionResponse
from app.repositories import plan_line_repository, plan_section_repository
from app.repositories.exceptions import InvalidPlanLinePositionError, InvalidPlanSectionPositionError

if TYPE_CHECKING:
    import uuid
    from collections.abc import Sequence

    from sqlalchemy.orm import Session

    from app.db.models import PlanLine, PlanSection
    from app.repositories.dtos import UpdatePlanLineDto


def get_plan_sections(db: Session) -> Sequence[PlanSection]:
    return plan_section_repository.get_plan_sections(db=db)


def get_plan_grid(*, db: Session, months: list[str]) -> PlanGridResponse:
    sections = plan_section_repository.get_plan_sections(db=db)
    grid_sections = []
    for section in sections:
        total = sum((line.fixed_amount for line in section.lines if line.fixed_amount is not None), Decimal(0))
        grid_sections.append(
            PlanGridSectionResponse(
                id=section.id,
                name=section.name,
                position=section.position,
                is_income=section.is_income,
                lines=[
                    PlanGridLineResponse(
                        id=line.id,
                        name=line.name,
                        position=line.position,
                        fixed_amount=line.fixed_amount,
                        amounts=dict.fromkeys(months, line.fixed_amount),
                    )
                    for line in section.lines
                ],
                totals=dict.fromkeys(months, total),
            ),
        )
    return PlanGridResponse(months=months, sections=grid_sections)


def create_plan_section(*, db: Session, name: str, is_income: bool) -> PlanSection:
    return plan_section_repository.create_plan_section(db=db, name=name, is_income=is_income)


def create_plan_line(*, db: Session, section_id: uuid.UUID, name: str) -> PlanLine:
    section = plan_section_repository.get_plan_section(db=db, section_id=section_id)
    return plan_line_repository.create_plan_line(db=db, section_id=section.id, name=name)


def update_plan_line(*, db: Session, line_id: uuid.UUID, updates: UpdatePlanLineDto) -> PlanLine:
    line = plan_line_repository.get_plan_line(db=db, line_id=line_id)
    resolved_position = updates.get("position", line.position)
    if resolved_position != line.position and resolved_position > plan_line_repository.get_plan_line_count(
        db=db, section_id=line.section_id
    ):
        raise InvalidPlanLinePositionError
    return plan_line_repository.update_plan_line(db=db, line=line, updates=updates)


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
