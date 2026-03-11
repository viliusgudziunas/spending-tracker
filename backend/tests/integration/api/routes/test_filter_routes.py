import uuid
from typing import TYPE_CHECKING

import pytest

from app.db.rules.models import Filter

if TYPE_CHECKING:
    from fastapi.testclient import TestClient
    from sqlalchemy.orm import Session

    from tests.integration.api.routes.conftest import CategoryFactory, FilterFactory


def _valid_filter_payload(category_id: str, name: str | None = None) -> dict:
    return {
        "name": name or f"Rent-{uuid.uuid4()}",
        "category_id": category_id,
        "rule_groups": [
            {
                "operator": "AND",
                "rules": [
                    {"type": "DESCRIPTION", "operator": "EQUAL", "value": "Monthly rent"},
                ],
            },
        ],
    }


@pytest.mark.integration
class TestCreateFilterEndpoint:
    def test_creates_filter(self, client: TestClient, category_factory: CategoryFactory) -> None:
        category = category_factory()
        payload = _valid_filter_payload(str(category.id))

        response = client.post("/filters", json=payload)

        assert response.status_code == 201
        body = response.json()
        assert body["name"] == payload["name"]
        assert body["category_id"] == str(category.id)
        assert body["position"] == 1
        assert "id" in body

    def test_returns_rule_groups_and_rules(self, client: TestClient, category_factory: CategoryFactory) -> None:
        category = category_factory()
        payload = _valid_filter_payload(str(category.id))

        response = client.post("/filters", json=payload)

        body = response.json()
        assert len(body["rule_groups"]) == 1
        group = body["rule_groups"][0]
        assert group["operator"] == "AND"
        assert "id" in group
        assert len(group["rules"]) == 1
        rule = group["rules"][0]
        assert rule["type"] == "DESCRIPTION"
        assert rule["operator"] == "EQUAL"
        assert rule["value"] == "Monthly rent"
        assert "id" in rule

    def test_persists_filter_to_database(
        self,
        client: TestClient,
        db: Session,
        category_factory: CategoryFactory,
    ) -> None:
        category = category_factory()
        payload = _valid_filter_payload(str(category.id))

        response = client.post("/filters", json=payload)

        filter_id = response.json()["id"]
        persisted = db.get(Filter, filter_id)
        assert persisted is not None
        assert persisted.name == payload["name"]
        assert len(persisted.rule_groups) == 1
        assert len(persisted.rule_groups[0].rules) == 1

    def test_auto_assigns_position_when_omitted(
        self,
        client: TestClient,
        category_factory: CategoryFactory,
    ) -> None:
        category = category_factory()
        category_id = str(category.id)

        first = client.post("/filters", json=_valid_filter_payload(category_id, name=f"Rent-{uuid.uuid4()}"))
        second_payload = _valid_filter_payload(category_id)
        second_payload["name"] = f"Utilities-{uuid.uuid4()}"
        second = client.post("/filters", json=second_payload)

        assert first.json()["position"] == 1
        assert second.json()["position"] == 2

    def test_uses_explicit_position(self, client: TestClient, category_factory: CategoryFactory) -> None:
        category = category_factory()
        payload = _valid_filter_payload(str(category.id))
        payload["position"] = 5

        response = client.post("/filters", json=payload)

        assert response.json()["position"] == 5

    def test_creates_filter_with_multiple_rule_groups(
        self,
        client: TestClient,
        category_factory: CategoryFactory,
    ) -> None:
        category = category_factory()
        payload = {
            "name": "Complex filter",
            "category_id": str(category.id),
            "rule_groups": [
                {
                    "operator": "AND",
                    "rules": [{"type": "DESCRIPTION", "operator": "EQUAL", "value": "rent"}],
                },
                {
                    "operator": "OR",
                    "rules": [
                        {"type": "AMOUNT", "operator": "GREATER_THAN", "value": "100"},
                        {"type": "AMOUNT", "operator": "LESS_THAN", "value": "500"},
                    ],
                },
            ],
        }

        response = client.post("/filters", json=payload)

        assert response.status_code == 201
        body = response.json()
        assert len(body["rule_groups"]) == 2
        assert len(body["rule_groups"][0]["rules"]) == 1
        assert len(body["rule_groups"][1]["rules"]) == 2

    def test_rejects_missing_required_fields(self, client: TestClient) -> None:
        response = client.post("/filters", json={})

        assert response.status_code == 422

    def test_rejects_empty_rule_groups(self, client: TestClient, category_factory: CategoryFactory) -> None:
        category = category_factory()
        payload = {
            "name": "Empty groups",
            "category_id": str(category.id),
            "rule_groups": [],
        }

        response = client.post("/filters", json=payload)

        assert response.status_code == 422

    def test_rejects_rule_group_with_empty_rules(self, client: TestClient, category_factory: CategoryFactory) -> None:
        category = category_factory()
        payload = {
            "name": "Empty rules",
            "category_id": str(category.id),
            "rule_groups": [{"operator": "AND", "rules": []}],
        }

        response = client.post("/filters", json=payload)

        assert response.status_code == 422


@pytest.mark.integration
class TestGetFiltersEndpoint:
    def test_returns_all_filters(
        self,
        client: TestClient,
        category_factory: CategoryFactory,
        filter_factory: FilterFactory,
    ) -> None:
        first_category = category_factory(name="Housing")
        second_category = category_factory(name="Bills")
        first_filter = filter_factory(category_id=first_category.id, name=f"Rent-{uuid.uuid4()}")
        second_filter = filter_factory(category_id=second_category.id, name=f"Utilities-{uuid.uuid4()}")

        response = client.get("/filters")

        assert response.status_code == 200
        body = response.json()
        returned_ids = {item["id"] for item in body}
        assert str(first_filter.id) in returned_ids
        assert str(second_filter.id) in returned_ids

    def test_returns_list_response(self, client: TestClient) -> None:
        response = client.get("/filters")

        assert response.status_code == 200
        assert isinstance(response.json(), list)
