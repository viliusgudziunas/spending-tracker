import uuid

import pytest
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db.rules.models import RuleGroupOperator, RuleOperator, RuleType
from app.schemas.spapi.categories_schemas import SpapiCategory
from app.schemas.spapi.filters_schemas import SpapiFilter
from tests.fixtures.rules import GetFilter, InsertCategory, InsertFilter


class TestCreateFilter:
    endpoint = "/filters"

    client: TestClient
    db_session: Session
    insert_category: InsertCategory
    get_filter: GetFilter

    @pytest.fixture(autouse=True)
    def _setup(
        self,
        client: TestClient,
        db_session: Session,
        insert_category: InsertCategory,
        get_filter: GetFilter,
    ) -> None:
        self.client = client
        self.db_session = db_session
        self.insert_category = insert_category
        self.get_filter = get_filter

    def test_accepts_simple_filter(self) -> None:
        with self.db_session.begin():
            category = self.insert_category(SpapiCategory(name="Test Category"))

        response = self.client.post(
            self.endpoint,
            json={
                "name": "Test Filter",
                "category_id": str(category.id),
                "rule_groups": [],
            },
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert response.json() == {
            "id": response.json()["id"],
            "name": "Test Filter",
            "position": 1,
            "category_id": str(category.id),
        }

    def test_inserts_filter_into_database(self) -> None:
        with self.db_session.begin():
            category = self.insert_category(SpapiCategory(name="Test Category"))

        response = self.client.post(
            self.endpoint,
            json={
                "name": "Test Filter",
                "category_id": str(category.id),
                "rule_groups": [],
            },
        )

        filter_id = uuid.UUID(response.json()["id"])
        filter_ = self.get_filter(filter_id)
        assert filter_ is not None
        assert filter_.name == "Test Filter"
        assert filter_.category_id == category.id

    def test_accepts_filter_with_position(self) -> None:
        with self.db_session.begin():
            category = self.insert_category(SpapiCategory(name="Test Category"))

        response = self.client.post(
            self.endpoint,
            json={
                "name": "Test Filter",
                "position": 10,
                "category_id": str(category.id),
                "rule_groups": [],
            },
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert response.json() == {
            "id": response.json()["id"],
            "name": "Test Filter",
            "position": 10,
            "category_id": str(category.id),
        }

    def test_inserts_filter_with_position_into_database(self) -> None:
        with self.db_session.begin():
            category = self.insert_category(SpapiCategory(name="Test Category"))

        response = self.client.post(
            self.endpoint,
            json={
                "name": "Test Filter",
                "position": 10,
                "category_id": str(category.id),
                "rule_groups": [],
            },
        )

        filter_id = uuid.UUID(response.json()["id"])
        filter_ = self.get_filter(filter_id)
        assert filter_ is not None
        expected_position = 10
        assert filter_.position == expected_position

    def test_inserts_filter_with_position_increment_when_other_filters_are_already_present(
        self,
        insert_filter: InsertFilter,
    ) -> None:
        with self.db_session.begin():
            category = self.insert_category(SpapiCategory(name="Test Category"))

            insert_filter(SpapiFilter(name="Previous Filter", position=0, rule_groups=[]), category.id)
            insert_filter(SpapiFilter(name="Previous Filter2", position=5, rule_groups=[]), category.id)

        response = self.client.post(
            self.endpoint,
            json={
                "name": "Test Filter",
                "category_id": str(category.id),
                "rule_groups": [],
            },
        )

        filter_id = uuid.UUID(response.json()["id"])
        filter_ = self.get_filter(filter_id)
        assert filter_ is not None
        expected_position = 6
        assert filter_.position == expected_position

    def test_accepts_filter_with_rule_groups(self) -> None:
        with self.db_session.begin():
            category = self.insert_category(SpapiCategory(name="Test Category"))

        response = self.client.post(
            self.endpoint,
            json={
                "name": "Test Filter",
                "category_id": str(category.id),
                "rule_groups": [
                    {
                        "operator": RuleGroupOperator.OR,
                        "rules": [
                            {
                                "type": RuleType.DESCRIPTION,
                                "operator": RuleOperator.EQUAL,
                                "value": "Test Rule",
                            },
                        ],
                    },
                ],
            },
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert response.json() == {
            "id": response.json()["id"],
            "name": "Test Filter",
            "position": 1,
            "category_id": str(category.id),
        }

    def test_inserts_filter_with_rule_groups_into_database(self) -> None:
        with self.db_session.begin():
            category = self.insert_category(SpapiCategory(name="Test Category"))

        response = self.client.post(
            self.endpoint,
            json={
                "name": "Test Filter",
                "category_id": str(category.id),
                "rule_groups": [
                    {
                        "operator": RuleGroupOperator.OR,
                        "rules": [
                            {
                                "type": RuleType.DESCRIPTION,
                                "operator": RuleOperator.EQUAL,
                                "value": "Test Rule",
                            },
                        ],
                    },
                ],
            },
        )

        filter_id = uuid.UUID(response.json()["id"])
        filter_ = self.get_filter(filter_id)
        assert filter_ is not None
        assert len(filter_.rule_groups) == 1
        assert filter_.rule_groups[0].operator == RuleGroupOperator.OR
        assert len(filter_.rule_groups[0].rules) == 1
        assert filter_.rule_groups[0].rules[0].type == RuleType.DESCRIPTION
        assert filter_.rule_groups[0].rules[0].operator == RuleOperator.EQUAL
        assert filter_.rule_groups[0].rules[0].value == "Test Rule"


class TestReadFilters:
    endpoint = "/filters"

    client: TestClient
    db_session: Session
    insert_category: InsertCategory
    insert_filter: InsertFilter

    @pytest.fixture(autouse=True)
    def _setup(
        self,
        client: TestClient,
        db_session: Session,
        insert_category: InsertCategory,
        insert_filter: InsertFilter,
    ) -> None:
        self.client = client
        self.db_session = db_session
        self.insert_category = insert_category
        self.insert_filter = insert_filter

    def test_returns_200(self) -> None:
        response = self.client.get(self.endpoint)

        assert response.status_code == status.HTTP_200_OK

    def test_returns_filters(self) -> None:
        with self.db_session.begin():
            category = self.insert_category(SpapiCategory(name="Test Category"))
            filter1 = self.insert_filter(SpapiFilter(name="Test Filter", position=1, rule_groups=[]), category.id)
            filter2 = self.insert_filter(SpapiFilter(name="Test Filter 2", position=2, rule_groups=[]), category.id)

        response = self.client.get(self.endpoint)

        assert response.json() == [
            {
                "id": str(filter1.id),
                "name": "Test Filter",
                "position": 1,
                "category_id": str(category.id),
            },
            {
                "id": str(filter2.id),
                "name": "Test Filter 2",
                "position": 2,
                "category_id": str(category.id),
            },
        ]

    def test_returns_filters_from_different_categories(self) -> None:
        with self.db_session.begin():
            category1 = self.insert_category(SpapiCategory(name="Test Category"))
            category2 = self.insert_category(SpapiCategory(name="Test Category 2"))
            filter1 = self.insert_filter(SpapiFilter(name="Test Filter", position=1, rule_groups=[]), category1.id)
            filter2 = self.insert_filter(SpapiFilter(name="Test Filter 2", position=2, rule_groups=[]), category2.id)

        response = self.client.get(self.endpoint)

        assert response.json() == [
            {
                "id": str(filter1.id),
                "name": "Test Filter",
                "position": 1,
                "category_id": str(category1.id),
            },
            {
                "id": str(filter2.id),
                "name": "Test Filter 2",
                "position": 2,
                "category_id": str(category2.id),
            },
        ]


class TestReadFilter:
    endpoint = "/filters/{filter_id}"

    client: TestClient
    db_session: Session
    insert_category: InsertCategory
    insert_filter: InsertFilter

    @pytest.fixture(autouse=True)
    def _setup(
        self,
        client: TestClient,
        db_session: Session,
        insert_category: InsertCategory,
        insert_filter: InsertFilter,
    ) -> None:
        self.db_session = db_session
        self.insert_category = insert_category
        self.insert_filter = insert_filter
        self.client = client

    def test_returns_200(self) -> None:
        with self.db_session.begin():
            category = self.insert_category(SpapiCategory(name="Test Category"))
            filter_ = self.insert_filter(SpapiFilter(name="Test Filter", position=1, rule_groups=[]), category.id)

        response = self.client.get(self.endpoint.format(filter_id=filter_.id))

        assert response.status_code == status.HTTP_200_OK

    def test_returns_filter(self) -> None:
        with self.db_session.begin():
            category = self.insert_category(SpapiCategory(name="Test Category"))
            filter_ = self.insert_filter(SpapiFilter(name="Test Filter", position=1, rule_groups=[]), category.id)

        response = self.client.get(self.endpoint.format(filter_id=filter_.id))

        assert response.json() == {
            "id": str(filter_.id),
            "name": "Test Filter",
            "position": 1,
            "category_id": str(category.id),
        }

    def test_rejects_request_when_non_existent_filter_id_is_provided(self) -> None:
        response = self.client.get(self.endpoint.format(filter_id=uuid.uuid4()))

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.json() == {"detail": "Not Found"}


class TestOverwriteFilter:
    endpoint = "/filters/{filter_id}/v2"

    client: TestClient
    db_session: Session
    insert_category: InsertCategory
    insert_filter: InsertFilter

    @pytest.fixture(autouse=True)
    def _setup(
        self,
        client: TestClient,
        db_session: Session,
        insert_category: InsertCategory,
        insert_filter: InsertFilter,
    ) -> None:
        self.client = client
        self.db_session = db_session
        self.insert_category = insert_category
        self.insert_filter = insert_filter

    def test_returns_200(self) -> None:
        with self.db_session.begin():
            category = self.insert_category(SpapiCategory(name="Test Category"))
            filter_ = self.insert_filter(SpapiFilter(name="Test Filter", position=1, rule_groups=[]), category.id)

        response = self.client.put(
            self.endpoint.format(filter_id=filter_.id),
            json={
                "name": "Updated Filter",
                "position": 2,
                "category_id": str(category.id),
                "rule_groups": [
                    {
                        "id": str(uuid.uuid4()),
                        "operator": RuleGroupOperator.AND,
                    },
                    {
                        "operator": RuleGroupOperator.OR,
                    },
                ],
            },
        )

        assert response.status_code == status.HTTP_200_OK

    def test_returns_overwritten_filter(self) -> None:
        with self.db_session.begin():
            category1 = self.insert_category(SpapiCategory(name="Test Category 1"))
            category2 = self.insert_category(SpapiCategory(name="Test Category 2"))
            filter_ = self.insert_filter(SpapiFilter(name="Test Filter", position=1, rule_groups=[]), category1.id)

        response = self.client.put(
            self.endpoint.format(filter_id=filter_.id),
            json={
                "name": "Updated Filter",
                "position": 2,
                "category_id": str(category2.id),
                "rule_groups": [
                    {
                        "id": str(uuid.uuid4()),
                        "operator": RuleGroupOperator.AND,
                    },
                    {
                        "operator": RuleGroupOperator.OR,
                    },
                ],
            },
        )

        assert response.json() == {
            "id": str(filter_.id),
            "name": "Updated Filter",
            "position": 2,
            "category_id": str(category2.id),
        }

    def test_inserts_filter_data_into_database(self, get_filter: GetFilter) -> None:
        with self.db_session.begin():
            category1 = self.insert_category(SpapiCategory(name="Test Category 1"))
            category2 = self.insert_category(SpapiCategory(name="Test Category 2"))
            filter_ = self.insert_filter(SpapiFilter(name="Test Filter", position=1, rule_groups=[]), category1.id)
            filter_id = filter_.id
            category_id = category2.id

        self.client.put(
            self.endpoint.format(filter_id=filter_id),
            json={
                "name": "Updated Filter",
                "position": 2,
                "category_id": str(category_id),
                "rule_groups": [],
            },
        )

        with self.db_session.begin():
            db_filter = get_filter(filter_.id)
            assert db_filter is not None
            assert db_filter.name == "Updated Filter"
            assert db_filter.position == 2  # noqa: PLR2004
            assert db_filter.category_id == category2.id
            assert len(db_filter.rule_groups) == 0

    def test_rejects_request_when_non_existent_filter_id_is_provided(self) -> None:
        response = self.client.put(
            self.endpoint.format(filter_id=uuid.uuid4()),
            json={
                "name": "Updated Filter",
                "position": 2,
                "category_id": str(uuid.uuid4()),
                "rule_groups": [],
            },
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.json() == {"detail": "Not Found"}

    def test_inserts_new_rule_groups_into_database(self) -> None:
        with self.db_session.begin():
            category = self.insert_category(SpapiCategory(name="Test Category 1"))
            filter_ = self.insert_filter(SpapiFilter(name="Test Filter", position=1, rule_groups=[]), category.id)
            filter_id = filter_.id
            category_id = category.id

        self.client.put(
            self.endpoint.format(filter_id=filter_id),
            json={
                "name": "Test Filter",
                "position": 1,
                "category_id": str(category_id),
                "rule_groups": [
                    {
                        "operator": RuleGroupOperator.AND,
                    },
                    {
                        "operator": RuleGroupOperator.OR,
                    },
                ],
            },
        )

        with self.db_session.begin():
            db_filter = get_filter(filter_.id)
            assert db_filter is not None
            assert db_filter.name == "Updated Filter"
            assert db_filter.position == 2  # noqa: PLR2004
            assert db_filter.category_id == category2.id
            assert len(db_filter.rule_groups) == 0
