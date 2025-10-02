import uuid
from collections.abc import Iterable

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.clients.db.exceptions import FilterNotFoundError
from app.db.rules.models import Filter
from app.schemas.spapi.filters_schemas import SpapiFilter


def insert_new_filter(db: Session, spapi_filter: SpapiFilter, category_id: uuid.UUID) -> Filter:
    filter_ = Filter(
        name=spapi_filter.name,
        position=spapi_filter.position,
        category_id=category_id,
    )
    db.add(filter_)
    db.flush()
    db.refresh(filter_)
    return filter_


def get_category_filters_max_position(db: Session, category_id: uuid.UUID) -> int | None:
    return db.scalar(select(func.max(Filter.position)).where(Filter.category_id == category_id))


def get_all_filters(db: Session) -> Iterable[Filter]:
    return db.scalars(select(Filter)).all()


def get_filter_by_id(db: Session, filter_id: uuid.UUID) -> Filter:
    filter_ = db.get(Filter, filter_id)

    if filter_ is None:
        raise FilterNotFoundError

    return filter_


def update_filter(db: Session, filter_: Filter, spapi_filter: SpapiFilter, category_id: uuid.UUID) -> Filter:
    filter_.name = spapi_filter.name
    filter_.position = spapi_filter.position
    filter_.category_id = category_id
    db.add(filter_)
    db.flush()
    db.refresh(filter_)
    return filter_
