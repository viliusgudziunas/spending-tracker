from sqlalchemy.orm import Session

from app.clients.db.filters_db_client import insert_new_filter
from app.schemas.spapi.categories_schemas import SpapiCategory
from app.schemas.spapi.filters_schemas import SpapiFilter
from tests.fixtures.rules import InsertCategory


class TestInsertNewFilter:
    def test_insert_new_filter(self, db_session: Session, insert_category: InsertCategory) -> None:
        with db_session.begin():
            category = insert_category(SpapiCategory(name="Test Category"))

            filter_ = insert_new_filter(db_session, SpapiFilter(name="Test Filter", position=1), category.id)

        assert filter_.id is not None
        assert filter_.name == "Test Filter"
        assert filter_.position == 1
        assert filter_.category_id == category.id
