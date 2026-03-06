from typing import TYPE_CHECKING, Protocol

import pytest

from app.db.rules.models import Category
from app.repositories.category_repository import create_category

if TYPE_CHECKING:
    from sqlalchemy.orm import Session


class CategoryFactory(Protocol):
    def __call__(self, name: str = ...) -> Category: ...


@pytest.fixture
def category_factory(db: Session) -> CategoryFactory:
    def _create(name: str = "Groceries") -> Category:
        return create_category(db=db, name=name)

    return _create
