import pytest
from sqlalchemy.orm import Session

from app.clients.db.categories_db_client import get_all_categories, insert_new_category
from app.schemas.spapi.categories_schemas import SpapiCategory
from tests.fixtures.rules import InsertCategory


class TestInsertNewCategory:
    def test_insert_new_category(self, db_session: Session) -> None:
        with db_session.begin():
            category = insert_new_category(db_session, SpapiCategory(name="Test Category"))

        assert category.id is not None
        assert category.name == "Test Category"


class TestGetAllCategories:
    db_session: Session
    insert_category: InsertCategory

    @pytest.fixture(autouse=True)
    def _setup(self, db_session: Session, insert_category: InsertCategory) -> None:
        self.db_session = db_session
        self.insert_category = insert_category

    def test_gets_multiple_categories(self) -> None:
        with self.db_session.begin():
            category = self.insert_category(SpapiCategory(name="Test Category"))
            category2 = self.insert_category(SpapiCategory(name="Test Category 2"))

            categories = get_all_categories(self.db_session)

        assert categories == [category, category2]

    def test_gets_a_single_category(self) -> None:
        with self.db_session.begin():
            category = self.insert_category(SpapiCategory(name="Test Category"))

            categories = get_all_categories(self.db_session)

        assert categories == [category]

    def test_gets_no_categories(self) -> None:
        with self.db_session.begin():
            categories = get_all_categories(self.db_session)

        assert categories == []
