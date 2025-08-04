import uuid
from collections.abc import Callable

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.rules.models import Category

type GetCategory = Callable[[uuid.UUID], Category | None]


@pytest.fixture
def get_category(db_session: Session) -> GetCategory:
    def _get_category(id_: uuid.UUID) -> Category | None:
        return db_session.scalar(select(Category).where(Category.id == id_))

    return _get_category
