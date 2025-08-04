from collections.abc import Iterable

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.rules.models import Category
from app.schemas.spapi.categories_schemas import SpapiCategory


def insert_new_category(db: Session, category: SpapiCategory) -> Category:
    category = Category(name=category.name)
    db.add(category)
    db.flush()
    db.refresh(category)
    return category


def get_all_categories(db: Session) -> Iterable[Category]:
    return db.scalars(select(Category)).all()
