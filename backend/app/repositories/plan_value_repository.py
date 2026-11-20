from typing import TYPE_CHECKING

from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import SQLAlchemyError

from app.db.models import PlanValue

if TYPE_CHECKING:
    import uuid
    from collections.abc import Sequence
    from decimal import Decimal

    from sqlalchemy.orm import Session


def get_plan_values(*, db: Session, months: list[str]) -> Sequence[PlanValue]:
    return db.scalars(select(PlanValue).where(PlanValue.month.in_(months))).all()


def upsert_plan_value(*, db: Session, line_id: uuid.UUID, month: str, amount: Decimal) -> None:
    statement = (
        insert(PlanValue)
        .values(line_id=line_id, month=month, amount=amount)
        .on_conflict_do_update(index_elements=[PlanValue.line_id, PlanValue.month], set_={"amount": amount})
    )
    try:
        db.execute(statement)
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise


def delete_plan_value(*, db: Session, line_id: uuid.UUID, month: str) -> None:
    try:
        db.execute(delete(PlanValue).where(PlanValue.line_id == line_id, PlanValue.month == month))
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise
