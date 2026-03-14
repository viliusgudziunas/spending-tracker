import uuid
from collections.abc import Sequence
from typing import TYPE_CHECKING

from psycopg2.errors import UniqueViolation
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError

from app.db.rules.models import Category
from app.repositories.exceptions import CategoryNotFoundError, DuplicateCategoryError

if TYPE_CHECKING:
    from sqlalchemy.orm import Session


def get_categories(db: Session) -> Sequence[Category]:
    return db.scalars(select(Category).order_by(Category.position)).all()


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


def get_category(db: Session, category_id: uuid.UUID) -> Category:
    category = db.get(Category, category_id)

    if category is None:
        raise CategoryNotFoundError

    return category


def update_category(
    db: Session,
    category_id: uuid.UUID,
    name: str | None,
    position: int | None,
) -> Category:
    category = get_category(db=db, category_id=category_id)

    if name is not None:
        category.name = name

    if position is not None and position != category.position:
        _shift_positions(db=db, category_id=category_id, old_position=category.position, new_position=position)
        category.position = position

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        if isinstance(exc.orig, UniqueViolation):
            raise DuplicateCategoryError from exc

        raise

    db.refresh(category)
    return category


def _shift_positions(
    db: Session,
    category_id: uuid.UUID,
    old_position: int,
    new_position: int,
) -> None:
    if old_position < new_position:
        db.execute(
            update(Category)
            .where(
                Category.id != category_id,
                Category.position > old_position,
                Category.position <= new_position,
            )
            .values(position=Category.position - 1),
        )
    else:
        db.execute(
            update(Category)
            .where(
                Category.id != category_id,
                Category.position >= new_position,
                Category.position < old_position,
            )
            .values(position=Category.position + 1),
        )
