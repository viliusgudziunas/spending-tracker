from typing import TYPE_CHECKING

from sqlalchemy import func, select, update
from sqlalchemy.exc import SQLAlchemyError

from app.db.models import PlanSection
from app.repositories.exceptions import PlanSectionNotFoundError

if TYPE_CHECKING:
    import uuid
    from collections.abc import Sequence

    from sqlalchemy.orm import Session


def get_plan_sections(db: Session) -> Sequence[PlanSection]:
    return db.scalars(select(PlanSection).order_by(PlanSection.position)).all()


def create_plan_section(*, db: Session, name: str, is_income: bool) -> PlanSection:
    max_position: int | None = db.scalar(select(func.max(PlanSection.position)))
    section = PlanSection(name=name, position=(max_position or 0) + 1, is_income=is_income)
    db.add(section)
    try:
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise
    db.refresh(section)
    return section


def get_plan_section(db: Session, section_id: uuid.UUID) -> PlanSection:
    section = db.get(PlanSection, section_id)
    if section is None:
        raise PlanSectionNotFoundError
    return section


def get_plan_section_count(db: Session) -> int:
    return db.scalar(select(func.count(PlanSection.id))) or 0


def update_plan_section(
    *,
    db: Session,
    section: PlanSection,
    name: str | None,
    position: int | None,
    is_income: bool | None,
) -> PlanSection:
    try:
        if name is not None:
            section.name = name
        if is_income is not None:
            section.is_income = is_income
        if position is not None and position != section.position:
            _shift_positions(db=db, section_id=section.id, old_position=section.position, new_position=position)
            section.position = position

        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise
    db.refresh(section)
    return section


def _shift_positions(
    db: Session,
    section_id: uuid.UUID,
    old_position: int,
    new_position: int,
) -> None:
    if old_position < new_position:
        db.execute(
            update(PlanSection)
            .where(
                PlanSection.id != section_id,
                PlanSection.position > old_position,
                PlanSection.position <= new_position,
            )
            .values(position=PlanSection.position - 1),
        )
    else:
        db.execute(
            update(PlanSection)
            .where(
                PlanSection.id != section_id,
                PlanSection.position >= new_position,
                PlanSection.position < old_position,
            )
            .values(position=PlanSection.position + 1),
        )


def delete_plan_section(db: Session, section_id: uuid.UUID) -> None:
    section = get_plan_section(db=db, section_id=section_id)
    deleted_position = section.position
    try:
        db.delete(section)
        db.flush()
        db.execute(
            update(PlanSection)
            .where(PlanSection.position > deleted_position)
            .values(position=PlanSection.position - 1),
        )
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise
