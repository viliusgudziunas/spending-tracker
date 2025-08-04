from sqlalchemy.orm import Session

from app.clients.db.rules_db_client import insert_new_category
from app.schemas.spapi_category_schema import SpapiCategory


class TestInsertNewCategory:
    def test_insert_new_category(self, db_session: Session) -> None:
        with db_session.begin():
            category = insert_new_category(db_session, SpapiCategory(name="Test Category"))

        assert category.id is not None
        assert category.name == "Test Category"
