import uuid

from sqlalchemy.orm import Session

from app.clients.db.filters_db_client import insert_new_filter
from app.clients.db.rule_groups_db_client import insert_new_rule_group
from app.clients.db.rules_db_client import insert_new_rule
from app.parsers.filters_parser import parse_filter_input_to_spapi
from app.schemas.api.filters_schemas import FilterCreate


def add_new_filter(db: Session, input_filter: FilterCreate) -> uuid.UUID:
    next_position = input_filter.position or 0
    spapi_filter = parse_filter_input_to_spapi(input_filter, next_position)

    with db.begin():
        filter_ = insert_new_filter(db, spapi_filter, input_filter.category_id)

        for rg in spapi_filter.rule_groups:
            rule_group = insert_new_rule_group(db, rg, filter_.id)

            for r in rg.rules:
                insert_new_rule(db, r, rule_group.id)

    return filter_.id
