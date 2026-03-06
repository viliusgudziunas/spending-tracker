from typing import TYPE_CHECKING

from psycopg2.errors import UniqueViolation
from sqlalchemy.exc import IntegrityError

from app.db.rules.models import Category
from app.repositories.exceptions import DuplicateCategoryError

if TYPE_CHECKING:
    from sqlalchemy.orm import Session


def create_category(db: Session, name: str) -> Category:
    category = Category(name=name)
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
