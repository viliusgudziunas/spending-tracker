import uuid
from collections.abc import Iterable

from sqlalchemy.orm import Session

from app.clients.db.filters_db_client import (
    get_all_filters,
    get_category_filters_max_position,
    get_filter_by_id,
    insert_new_filter,
)
from app.clients.db.rule_groups_db_client import insert_new_rule_group
from app.clients.db.rules_db_client import insert_new_rule
from app.parsers.filters_parser import parse_create_filter_input_to_spapi
from app.schemas.api.filters_schemas import FilterCreate, FilterOverwrite, FilterRead


def add_new_filter(db: Session, input_filter: FilterCreate) -> FilterRead:
    with db.begin():
        next_position = input_filter.position
        if next_position is None:
            max_position = get_category_filters_max_position(db, input_filter.category_id) or 0
            next_position = max_position + 1

        spapi_filter = parse_create_filter_input_to_spapi(input_filter, next_position)

        filter_ = insert_new_filter(db, spapi_filter, input_filter.category_id)

        for rg in spapi_filter.rule_groups:
            rule_group = insert_new_rule_group(db, rg, filter_.id)

            for r in rg.rules:
                insert_new_rule(db, r, rule_group.id)

    return FilterRead.model_validate(filter_)


def get_filters(db: Session) -> Iterable[FilterRead]:
    with db.begin():
        filters = get_all_filters(db)

    return [FilterRead.model_validate(f) for f in filters]


def get_filter(db: Session, filter_id: uuid.UUID) -> FilterRead:
    with db.begin():
        filter_ = get_filter_by_id(db, filter_id)

    return FilterRead.model_validate(filter_)


def overwrite_existing_filter(db: Session, filter_id: uuid.UUID, _input_filter: FilterOverwrite) -> FilterRead:
    with db.begin():
        filter_ = get_filter_by_id(db, filter_id)

    return FilterRead.model_validate(filter_)
