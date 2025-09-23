import uuid

import pytest
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db.rules.models import RuleGroupOperator, RuleOperator, RuleType
from app.schemas.spapi.categories_schemas import SpapiCategory
from tests.fixtures.rules import GetCategory, GetFilter, InsertCategory


class TestCreateCategory:
    endpoint = "/categories"

    client: TestClient

    @pytest.fixture(autouse=True)
    def _setup(self, client: TestClient) -> None:
        self.client = client

    def test_returns_422_when_category_name_is_not_provided(self) -> None:
        response = self.client.post(self.endpoint, json={})
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        assert response.json() == {
            "detail": [
                {
                    "input": {},
                    "loc": ["body", "name"],
                    "msg": "Field required",
                    "type": "missing",
                },
            ],
        }

    def test_returns_422_when_category_name_is_empty(self) -> None:
        response = self.client.post(self.endpoint, json={"name": ""})

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        assert response.json() == {
            "detail": [
                {
                    "ctx": {"min_length": 1},
                    "input": "",
                    "loc": ["body", "name"],
                    "msg": "String should have at least 1 character",
                    "type": "string_too_short",
                },
            ],
        }

    def test_returns_201_when_category_is_created(self) -> None:
        response = self.client.post(self.endpoint, json={"name": "Test Category"})

        assert response.status_code == status.HTTP_201_CREATED

    def test_returns_category_data(self) -> None:
        response = self.client.post(self.endpoint, json={"name": "Test Category"})

        assert response.json()["id"] is not None
        assert response.json() == {
            "id": response.json()["id"],
            "name": "Test Category",
        }

    def test_creates_category_in_db(self, get_category: GetCategory) -> None:
        response = self.client.post(self.endpoint, json={"name": "Test Category"})

        category_id = response.json()["id"]
        category = get_category(category_id)

        assert category is not None
        assert category.name == "Test Category"


class TestReadCategories:
    endpoint = "/categories"

    client: TestClient

    @pytest.fixture(autouse=True)
    def _setup(self, client: TestClient) -> None:
        self.client = client

    def test_returns_200(self) -> None:
        response = self.client.get(self.endpoint)

        assert response.status_code == status.HTTP_200_OK

    def test_returns_categories(self, db_session: Session, insert_category: InsertCategory) -> None:
        with db_session.begin():
            category = insert_category(SpapiCategory(name="Test Category"))
            category2 = insert_category(SpapiCategory(name="Test Category 2"))

        response = self.client.get(self.endpoint)

        assert response.json() == [
            {
                "id": str(category.id),
                "name": "Test Category",
            },
            {
                "id": str(category2.id),
                "name": "Test Category 2",
            },
        ]


class TestCreateFilter:
    endpoint = "/filters/v2"

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

        filter_id = uuid.UUID(str(response.json()))
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
                "position": 1,
                "category_id": str(category.id),
                "rule_groups": [],
            },
        )

        assert response.status_code == status.HTTP_201_CREATED

    def test_inserts_filter_with_position_into_database(self) -> None:
        with self.db_session.begin():
            category = self.insert_category(SpapiCategory(name="Test Category"))

        response = self.client.post(
            self.endpoint,
            json={
                "name": "Test Filter",
                "position": 1,
                "category_id": str(category.id),
                "rule_groups": [],
            },
        )

        filter_id = uuid.UUID(str(response.json()))
        filter_ = self.get_filter(filter_id)
        assert filter_ is not None
        assert filter_.position == 1

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

        filter_id = uuid.UUID(str(response.json()))
        filter_ = self.get_filter(filter_id)
        assert filter_ is not None
        assert len(filter_.rule_groups) == 1
        assert filter_.rule_groups[0].operator == RuleGroupOperator.OR
        assert len(filter_.rule_groups[0].rules) == 1
        assert filter_.rule_groups[0].rules[0].type == RuleType.DESCRIPTION
        assert filter_.rule_groups[0].rules[0].operator == RuleOperator.EQUAL
        assert filter_.rule_groups[0].rules[0].value == "Test Rule"
