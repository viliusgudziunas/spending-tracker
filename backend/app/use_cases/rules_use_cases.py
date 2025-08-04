from sqlalchemy.orm import Session

from app.clients.db.rules_db_client import insert_new_category
from app.parsers.spapi_rules_parser import parse_category_input_to_spapi
from app.schemas.rules_schema import CategoryCreate, CategoryRead


def add_new_category(db: Session, input_category: CategoryCreate) -> CategoryRead:
    spapi_category = parse_category_input_to_spapi(input_category)

    with db.begin():
        category = insert_new_category(db, spapi_category)

    return CategoryRead.model_validate(category)
