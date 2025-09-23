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
