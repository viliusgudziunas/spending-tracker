import uuid
from collections.abc import Callable

import pytest
from sqlalchemy import Sequence, select
from sqlalchemy.orm import Session

from app.db.rules.models import Category, Filter, RuleGroup
from app.schemas.spapi.categories_schemas import SpapiCategory
from app.schemas.spapi.filters_schemas import SpapiFilter
from app.schemas.spapi.rule_groups_schemas import SpapiRuleGroup

type GetCategory = Callable[[uuid.UUID], Category | None]


@pytest.fixture
def get_category(db_session: Session) -> GetCategory:
    def _get_category(id_: uuid.UUID) -> Category | None:
        return db_session.scalar(select(Category).where(Category.id == id_))

    return _get_category


type InsertCategory = Callable[[SpapiCategory], Category]


@pytest.fixture
def insert_category(db_session: Session) -> InsertCategory:
    def _insert_category(spapi_category: SpapiCategory) -> Category:
        category = Category(name=spapi_category.name)
        db_session.add(category)
        db_session.flush()
        return category

    return _insert_category


type GetFilter = Callable[[uuid.UUID], Filter | None]


@pytest.fixture
def get_filter(db_session: Session) -> GetFilter:
    def _get_filter(id_: uuid.UUID) -> Filter | None:
        return db_session.scalar(select(Filter).where(Filter.id == id_))

    return _get_filter


type InsertFilter = Callable[[SpapiFilter, uuid.UUID], Filter]


@pytest.fixture
def insert_filter(db_session: Session) -> InsertFilter:
    def _insert_filter(spapi_filter: SpapiFilter, category_id: uuid.UUID) -> Filter:
        filter_ = Filter(name=spapi_filter.name, position=spapi_filter.position, category_id=category_id)
        db_session.add(filter_)
        db_session.flush()
        return filter_

    return _insert_filter


type InsertRuleGroup = Callable[[SpapiRuleGroup, uuid.UUID], RuleGroup]


@pytest.fixture
def insert_rule_group(db_session: Session) -> InsertRuleGroup:
    def _insert_rule_group(spapi_rule_group: SpapiRuleGroup, filter_id: uuid.UUID) -> RuleGroup:
        rule_group = RuleGroup(operator=spapi_rule_group.operator, filter_id=filter_id)
        db_session.add(rule_group)
        db_session.flush()
        return rule_group

    return _insert_rule_group


type GetAllRuleGroups = Callable[[], Sequence[RuleGroup]]


@pytest.fixture
def get_all_rule_groups(db_session: Session) -> GetAllRuleGroups:
    def _get_all_rule_groups() -> Sequence[RuleGroup]:
        return db_session.scalars(select(RuleGroup)).all()

    return _get_all_rule_groups
