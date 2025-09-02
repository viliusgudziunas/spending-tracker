import uuid
from collections.abc import Callable

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.rules.models import Category, Filter
from app.schemas.spapi.categories_schemas import SpapiCategory
from app.schemas.spapi.filters_schemas import SpapiFilter

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


type InsertFilter = Callable[[SpapiFilter, uuid.UUID], Filter]


@pytest.fixture
def insert_filter(db_session: Session) -> InsertFilter:
    def _insert_filter(spapi_filter: SpapiFilter, category_id: uuid.UUID) -> Filter:
        filter_ = Filter(name=spapi_filter.name, position=spapi_filter.position, category_id=category_id)
        db_session.add(filter_)
        db_session.flush()
        return filter_

    return _insert_filter
