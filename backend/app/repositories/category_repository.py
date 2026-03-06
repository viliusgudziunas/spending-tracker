from collections.abc import Sequence
from typing import TYPE_CHECKING

from psycopg2.errors import UniqueViolation
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.db.rules.models import Category
from app.repositories.exceptions import DuplicateCategoryError

if TYPE_CHECKING:
    from sqlalchemy.orm import Session


def create_category(db: Session, name: str) -> Category:
    max_position: int | None = db.scalar(select(func.max(Category.position)))
    next_position = (max_position or 0) + 1

    category = Category(name=name, position=next_position)
    db.add(category)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        if isinstance(exc.orig, UniqueViolation):
            raise DuplicateCategoryError from exc

        raise

    db.refresh(category)
    return category


def get_categories(db: Session) -> Sequence[Category]:
    return db.scalars(select(Category).order_by(Category.position)).all()
