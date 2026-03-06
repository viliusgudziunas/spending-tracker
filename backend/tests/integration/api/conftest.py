from typing import TYPE_CHECKING

import pytest

from app.db.rules.models import Category
from app.repositories.category_repository import create_category

if TYPE_CHECKING:
    from sqlalchemy.orm import Session


@pytest.fixture
def category(db: Session) -> Category:
    return create_category(db=db, name="Groceries")
