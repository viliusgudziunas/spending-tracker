import uuid
from collections.abc import Callable

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.rules.models import Category
from app.schemas.spapi.spapi_category_schema import SpapiCategory

type GetCategory = Callable[[uuid.UUID], Category | None]


@pytest.fixture
def get_category(db_session: Session) -> GetCategory:
    def _get_category(id_: uuid.UUID) -> Category | None:
        return db_session.scalar(select(Category).where(Category.id == id_))

    return _get_category


type InsertCategory = Callable[[SpapiCategory], Category]


@pytest.fixture
def insert_category(db_session: Session) -> InsertCategory:
    def _insert_category(spapi_category: SpapiCategory) -> Category:
        category = Category(name=spapi_category.name)
        db_session.add(category)
        db_session.flush()
        return category

    return _insert_category
