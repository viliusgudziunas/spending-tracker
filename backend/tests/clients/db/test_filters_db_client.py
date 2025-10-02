import uuid

import pytest
from sqlalchemy.orm import Session

from app.clients.db.exceptions import FilterNotFoundError
from app.clients.db.filters_db_client import (
    get_all_filters,
    get_category_filters_max_position,
    get_filter_by_id,
    insert_new_filter,
    update_filter,
)
from app.schemas.spapi.categories_schemas import SpapiCategory
from app.schemas.spapi.filters_schemas import SpapiFilter
from tests.fixtures.rules import InsertCategory, InsertFilter


class TestInsertNewFilter:
    def test_insert_new_filter(self, db_session: Session, insert_category: InsertCategory) -> None:
        with db_session.begin():
            category = insert_category(SpapiCategory(name="Test Category"))

            filter_ = insert_new_filter(
                db_session,
                SpapiFilter(
                    name="Test Filter",
                    position=1,
                    rule_groups=[],
                ),
                category.id,
            )

        assert filter_.id is not None
        assert filter_.name == "Test Filter"
        assert filter_.position == 1
        assert filter_.category_id == category.id


class TestGetCategoryFiltersMaxPosition:
    db_session: Session
    insert_category: InsertCategory
    insert_filter: InsertFilter

    @pytest.fixture(autouse=True)
    def _setup(self, db_session: Session, insert_category: InsertCategory, insert_filter: InsertFilter) -> None:
        self.db_session = db_session
        self.insert_category = insert_category
        self.insert_filter = insert_filter

    def test_returns_max_position_from_category_filters(self) -> None:
        with self.db_session.begin():
            category = self.insert_category(SpapiCategory(name="Test Category"))

            self.insert_filter(SpapiFilter(name="Test Filter", position=1, rule_groups=[]), category.id)
            self.insert_filter(SpapiFilter(name="Test Filter 2", position=20, rule_groups=[]), category.id)

        expected_max_position = 20
        assert get_category_filters_max_position(self.db_session, category.id) == expected_max_position

    def test_ignores_filters_from_other_categories(self) -> None:
        with self.db_session.begin():
            category = self.insert_category(SpapiCategory(name="Test Category"))
            category2 = self.insert_category(SpapiCategory(name="Test Category 2"))

            self.insert_filter(SpapiFilter(name="Test Filter", position=1, rule_groups=[]), category.id)
            self.insert_filter(SpapiFilter(name="Test Filter 2", position=20, rule_groups=[]), category2.id)

        assert get_category_filters_max_position(self.db_session, category.id) == 1

    def test_returns_none_if_category_has_no_filters(self) -> None:
        with self.db_session.begin():
            category = self.insert_category(SpapiCategory(name="Test Category"))

        assert get_category_filters_max_position(self.db_session, category.id) is None

    def test_returns_correctly_for_negative_numbers(self) -> None:
        with self.db_session.begin():
            category = self.insert_category(SpapiCategory(name="Test Category"))

            self.insert_filter(SpapiFilter(name="Test Filter", position=-5, rule_groups=[]), category.id)
            self.insert_filter(SpapiFilter(name="Test Filter 2", position=-4, rule_groups=[]), category.id)

        expected_max_position = -4
        assert get_category_filters_max_position(self.db_session, category.id) == expected_max_position


class TestGetAllFilters:
    db_session: Session
    insert_category: InsertCategory
    insert_filter: InsertFilter

    @pytest.fixture(autouse=True)
    def _setup(self, db_session: Session, insert_category: InsertCategory, insert_filter: InsertFilter) -> None:
        self.db_session = db_session
        self.insert_category = insert_category
        self.insert_filter = insert_filter

    def test_gets_multiple_filters(self) -> None:
        with self.db_session.begin():
            category = self.insert_category(SpapiCategory(name="Test Category"))
            filter1 = self.insert_filter(SpapiFilter(name="Test Filter", position=1, rule_groups=[]), category.id)
            filter2 = self.insert_filter(SpapiFilter(name="Test Filter 2", position=2, rule_groups=[]), category.id)

            filters = get_all_filters(self.db_session)

        assert filters == [filter1, filter2]

    def test_gets_a_single_filter(self) -> None:
        with self.db_session.begin():
            category = self.insert_category(SpapiCategory(name="Test Category"))
            filter_ = self.insert_filter(SpapiFilter(name="Test Filter", position=1, rule_groups=[]), category.id)

            filters = get_all_filters(self.db_session)

        assert filters == [filter_]

    def test_gets_no_filters(self) -> None:
        with self.db_session.begin():
            filters = get_all_filters(self.db_session)

        assert filters == []


class TestGetFilterByID:
    db_session: Session
    insert_category: InsertCategory
    insert_filter: InsertFilter

    @pytest.fixture(autouse=True)
    def _setup(self, db_session: Session, insert_category: InsertCategory, insert_filter: InsertFilter) -> None:
        self.db_session = db_session
        self.insert_category = insert_category
        self.insert_filter = insert_filter

    def test_returns_filter(self) -> None:
        with self.db_session.begin():
            category = self.insert_category(SpapiCategory(name="Test Category"))
            filter_ = self.insert_filter(SpapiFilter(name="Test Filter", position=1, rule_groups=[]), category.id)

            filter__ = get_filter_by_id(self.db_session, filter_.id)

        assert filter__.id == filter_.id
        assert filter__.name == "Test Filter"
        assert filter__.position == 1
        assert filter__.category_id == category.id

    def test_raises_error_if_filter_not_found(self) -> None:
        with self.db_session.begin(), pytest.raises(FilterNotFoundError):
            get_filter_by_id(self.db_session, uuid.uuid4())


class TestUpdateFilter:
    db_session: Session
    insert_category: InsertCategory
    insert_filter: InsertFilter

    @pytest.fixture(autouse=True)
    def _setup(self, db_session: Session, insert_category: InsertCategory, insert_filter: InsertFilter) -> None:
        self.db_session = db_session
        self.insert_category = insert_category
        self.insert_filter = insert_filter

    def test_updates_filter(self) -> None:
        with self.db_session.begin():
            category = self.insert_category(SpapiCategory(name="Test Category"))
            filter_ = self.insert_filter(SpapiFilter(name="Test Filter", position=1, rule_groups=[]), category.id)

        assert filter_.name == "Test Filter"
        assert filter_.position == 1

        update_filter(
            self.db_session,
            filter_,
            SpapiFilter(name="Updated Filter", position=2, rule_groups=[]),
            category.id,
        )

        assert filter_.name == "Updated Filter"
        assert filter_.position == 2  # noqa: PLR2004

    def test_updates_filter_category(self) -> None:
        with self.db_session.begin():
            category1 = self.insert_category(SpapiCategory(name="Test Category 1"))
            category2 = self.insert_category(SpapiCategory(name="Test Category 2"))
            filter_ = self.insert_filter(SpapiFilter(name="Test Filter", position=1, rule_groups=[]), category1.id)

        assert filter_.category_id == category1.id

        update_filter(
            self.db_session,
            filter_,
            SpapiFilter(name="Test Filter", position=1, rule_groups=[]),
            category2.id,
        )

        assert filter_.category_id == category2.id
