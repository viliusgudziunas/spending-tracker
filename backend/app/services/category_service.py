from collections.abc import Sequence
from typing import TYPE_CHECKING

from app.db.rules.models import Category
from app.repositories import category_repository

if TYPE_CHECKING:
    from sqlalchemy.orm import Session


def create_category(db: Session, name: str) -> Category:
    return category_repository.create_category(db=db, name=name)


def get_categories(db: Session) -> Sequence[Category]:
    return category_repository.get_categories(db=db)
