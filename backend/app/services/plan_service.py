from decimal import Decimal
from typing import TYPE_CHECKING

from app.api.schemas.plan_schemas import (
    PlanGridCellResponse,
    PlanGridLineResponse,
    PlanGridResponse,
    PlanGridSectionResponse,
)
from app.repositories import plan_line_repository, plan_section_repository, plan_value_repository
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
    values = plan_value_repository.get_plan_values(db=db, months=months)
    overrides = {(value.line_id, value.month): value.amount for value in values}
    return PlanGridResponse(
        months=months,
        sections=[_build_plan_grid_section(section, months, overrides) for section in sections],
    )


def _build_plan_grid_section(
    section: PlanSection, months: list[str], overrides: dict[tuple[uuid.UUID, str], Decimal]
) -> PlanGridSectionResponse:
    lines = [_build_plan_grid_line(line, months, overrides) for line in section.lines]
    totals = dict.fromkeys(months, Decimal(0))
    for line in lines:
        for month, cell in line.amounts.items():
            if cell.amount is not None:
                totals[month] += cell.amount

    return PlanGridSectionResponse(
        id=section.id,
        name=section.name,
        position=section.position,
        is_income=section.is_income,
        lines=lines,
        totals=totals,
    )


def _build_plan_grid_line(
    line: PlanLine, months: list[str], overrides: dict[tuple[uuid.UUID, str], Decimal]
) -> PlanGridLineResponse:
    return PlanGridLineResponse(
        id=line.id,
        name=line.name,
        position=line.position,
        fixed_amount=line.fixed_amount,
        amounts={
            month: PlanGridCellResponse(
                amount=overrides.get((line.id, month), line.fixed_amount),
                is_override=(line.id, month) in overrides,
            )
            for month in months
        },
    )


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


def set_plan_value(*, db: Session, line_id: uuid.UUID, month: str, amount: Decimal) -> None:
    line = plan_line_repository.get_plan_line(db=db, line_id=line_id)
    plan_value_repository.upsert_plan_value(db=db, line_id=line.id, month=month, amount=amount)


def delete_plan_value(*, db: Session, line_id: uuid.UUID, month: str) -> None:
    line = plan_line_repository.get_plan_line(db=db, line_id=line_id)
    plan_value_repository.delete_plan_value(db=db, line_id=line.id, month=month)


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
