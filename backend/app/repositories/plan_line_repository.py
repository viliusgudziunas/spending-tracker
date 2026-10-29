from typing import TYPE_CHECKING

from sqlalchemy import func, select, update
from sqlalchemy.exc import SQLAlchemyError

from app.db.models import PlanLine
from app.repositories.exceptions import PlanLineNotFoundError

if TYPE_CHECKING:
    import uuid

    from sqlalchemy.orm import Session


def create_plan_line(*, db: Session, section_id: uuid.UUID, name: str) -> PlanLine:
    max_position = db.scalar(select(func.max(PlanLine.position)).where(PlanLine.section_id == section_id))
    line = PlanLine(section_id=section_id, name=name, position=(max_position or 0) + 1)
    db.add(line)
    try:
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise
    db.refresh(line)
    return line


def get_plan_line(db: Session, line_id: uuid.UUID) -> PlanLine:
    line = db.get(PlanLine, line_id)
    if line is None:
        raise PlanLineNotFoundError
    return line


def get_plan_line_count(db: Session, section_id: uuid.UUID) -> int:
    return db.scalar(select(func.count(PlanLine.id)).where(PlanLine.section_id == section_id)) or 0


def update_plan_line(*, db: Session, line: PlanLine, name: str, position: int) -> PlanLine:
    try:
        if position != line.position:
            shift = -1 if line.position < position else 1
            db.execute(
                update(PlanLine)
                .where(
                    PlanLine.section_id == line.section_id,
                    PlanLine.id != line.id,
                    PlanLine.position.between(min(line.position, position), max(line.position, position)),
                )
                .values(position=PlanLine.position + shift),
            )
            line.position = position
        line.name = name
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise
    db.refresh(line)
    return line


def delete_plan_line(db: Session, line: PlanLine) -> None:
    try:
        db.delete(line)
        db.flush()
        db.execute(
            update(PlanLine)
            .where(PlanLine.section_id == line.section_id, PlanLine.position > line.position)
            .values(position=PlanLine.position - 1),
        )
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise
