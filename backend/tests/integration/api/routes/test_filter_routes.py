import uuid
from typing import TYPE_CHECKING, Any

import pytest

from app.db.models import Filter, Rule, RuleGroup

if TYPE_CHECKING:
    from fastapi.testclient import TestClient
    from sqlalchemy.orm import Session

    from tests.integration.api.routes.conftest import CategoryFactory, FilterFactory


def _valid_filter_payload(category_id: str, name: str | None = None) -> dict[str, Any]:
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

    def test_creates_filter_with_product_rule(
        self,
        client: TestClient,
        category_factory: CategoryFactory,
    ) -> None:
        category = category_factory()
        payload = {
            "name": "Current product filter",
            "category_id": str(category.id),
            "rule_groups": [
                {
                    "operator": "AND",
                    "rules": [{"type": "PRODUCT", "operator": "EQUAL", "value": "Current"}],
                },
            ],
        }

        response = client.post("/filters", json=payload)

        assert response.status_code == 201
        body = response.json()
        assert len(body["rule_groups"]) == 1
        assert len(body["rule_groups"][0]["rules"]) == 1
        assert body["rule_groups"][0]["rules"][0]["type"] == "PRODUCT"
        assert body["rule_groups"][0]["rules"][0]["value"] == "Current"

    def test_rejects_missing_required_fields(self, client: TestClient) -> None:
        response = client.post("/filters", json={})

        assert response.status_code == 422

    def test_trims_name(self, client: TestClient, category_factory: CategoryFactory) -> None:
        category = category_factory()
        payload = _valid_filter_payload(str(category.id), name="  Rent  ")

        response = client.post("/filters", json=payload)

        assert response.status_code == 201
        assert response.json()["name"] == "Rent"

    @pytest.mark.parametrize("name", ["", "   "])
    def test_rejects_blank_name(
        self,
        client: TestClient,
        category_factory: CategoryFactory,
        name: str,
    ) -> None:
        category = category_factory()
        payload = _valid_filter_payload(str(category.id))
        payload["name"] = name

        response = client.post("/filters", json=payload)

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


@pytest.mark.integration
class TestGetFilterEndpoint:
    def test_returns_filter_by_id(
        self,
        client: TestClient,
        category_factory: CategoryFactory,
        filter_factory: FilterFactory,
    ) -> None:
        category = category_factory()
        filter_ = filter_factory(category_id=category.id, name=f"Single-{uuid.uuid4()}")

        response = client.get(f"/filters/{filter_.id}")

        assert response.status_code == 200
        body = response.json()
        assert body["id"] == str(filter_.id)
        assert body["name"] == filter_.name
        assert body["category_id"] == str(category.id)
        assert isinstance(body["rule_groups"], list)
        assert len(body["rule_groups"]) == 1

    def test_returns_not_found_for_unknown_id(self, client: TestClient) -> None:
        response = client.get(f"/filters/{uuid.uuid4()}")

        assert response.status_code == 404
        assert response.json() == {"detail": "Filter not found"}


@pytest.mark.integration
class TestUpdateFilterEndpoint:
    def test_updates_name(
        self,
        client: TestClient,
        category_factory: CategoryFactory,
        filter_factory: FilterFactory,
    ) -> None:
        category = category_factory()
        filter_ = filter_factory(category_id=category.id, name=f"Old-{uuid.uuid4()}")

        response = client.patch(f"/filters/{filter_.id}", json={"name": "New name"})

        assert response.status_code == 200
        assert response.json()["name"] == "New name"
        assert response.json()["position"] == 1

    def test_moves_filter_position_within_category(
        self,
        client: TestClient,
        category_factory: CategoryFactory,
        filter_factory: FilterFactory,
    ) -> None:
        category = category_factory()
        first = filter_factory(category_id=category.id, name=f"A-{uuid.uuid4()}")
        second = filter_factory(category_id=category.id, name=f"B-{uuid.uuid4()}")
        third = filter_factory(category_id=category.id, name=f"C-{uuid.uuid4()}")

        response = client.patch(f"/filters/{third.id}", json={"position": 1})

        assert response.status_code == 200
        assert response.json()["position"] == 1

        first_after = client.get(f"/filters/{first.id}").json()
        second_after = client.get(f"/filters/{second.id}").json()
        third_after = client.get(f"/filters/{third.id}").json()
        assert [third_after["position"], first_after["position"], second_after["position"]] == [1, 2, 3]

    def test_rejects_duplicate_name(
        self,
        client: TestClient,
        category_factory: CategoryFactory,
        filter_factory: FilterFactory,
    ) -> None:
        category = category_factory()
        duplicate_name = f"Duplicate-{uuid.uuid4()}"
        filter_factory(category_id=category.id, name=duplicate_name)
        filter_to_update = filter_factory(category_id=category.id, name=f"Other-{uuid.uuid4()}")

        response = client.patch(f"/filters/{filter_to_update.id}", json={"name": duplicate_name})

        assert response.status_code == 400
        assert response.json()["detail"] == "Filter already exists"

    def test_rejects_empty_update(
        self,
        client: TestClient,
        category_factory: CategoryFactory,
        filter_factory: FilterFactory,
    ) -> None:
        category = category_factory()
        filter_ = filter_factory(category_id=category.id, name=f"To-update-{uuid.uuid4()}")

        response = client.patch(f"/filters/{filter_.id}", json={})

        assert response.status_code == 422

    def test_trims_name(
        self,
        client: TestClient,
        category_factory: CategoryFactory,
        filter_factory: FilterFactory,
    ) -> None:
        category = category_factory()
        filter_ = filter_factory(category_id=category.id, name=f"Old-{uuid.uuid4()}")

        response = client.patch(f"/filters/{filter_.id}", json={"name": "  New name  "})

        assert response.status_code == 200
        assert response.json()["name"] == "New name"

    @pytest.mark.parametrize("name", ["", "   "])
    def test_rejects_blank_name(
        self,
        client: TestClient,
        category_factory: CategoryFactory,
        filter_factory: FilterFactory,
        name: str,
    ) -> None:
        category = category_factory()
        filter_ = filter_factory(category_id=category.id, name=f"Old-{uuid.uuid4()}")

        response = client.patch(f"/filters/{filter_.id}", json={"name": name})

        assert response.status_code == 422

    def test_rejects_position_below_one(
        self,
        client: TestClient,
        category_factory: CategoryFactory,
        filter_factory: FilterFactory,
    ) -> None:
        category = category_factory()
        filter_ = filter_factory(category_id=category.id, name=f"Filter-{uuid.uuid4()}")

        response = client.patch(f"/filters/{filter_.id}", json={"position": 0})

        assert response.status_code == 422

    def test_rejects_position_above_filter_count_in_category(
        self,
        client: TestClient,
        category_factory: CategoryFactory,
        filter_factory: FilterFactory,
    ) -> None:
        category = category_factory(name="Housing")
        filter_ = filter_factory(category_id=category.id, name=f"Rent-{uuid.uuid4()}")
        other_category = category_factory(name="Transport")
        filter_factory(category_id=other_category.id, name=f"Fuel-{uuid.uuid4()}")

        response = client.patch(f"/filters/{filter_.id}", json={"position": 2})

        assert response.status_code == 400
        assert response.json()["detail"] == "Invalid filter position"

    def test_returns_404_for_unknown_filter(self, client: TestClient) -> None:
        response = client.patch(f"/filters/{uuid.uuid4()}", json={"name": "New name"})

        assert response.status_code == 404
        assert response.json()["detail"] == "Filter not found"


@pytest.mark.integration
class TestPutFilterRuleGroupsEndpoint:
    def test_put_syncs_filter_rule_groups(
        self,
        client: TestClient,
        category_factory: CategoryFactory,
    ) -> None:
        category = category_factory()
        create_payload = {
            "name": f"Sync-{uuid.uuid4()}",
            "category_id": str(category.id),
            "rule_groups": [
                {
                    "operator": "AND",
                    "rules": [{"type": "DESCRIPTION", "operator": "EQUAL", "value": "rent"}],
                },
                {
                    "operator": "OR",
                    "rules": [{"type": "AMOUNT", "operator": "GREATER_THAN", "value": "100"}],
                },
            ],
        }
        created = client.post("/filters", json=create_payload)
        created_body = created.json()
        first_group = created_body["rule_groups"][0]
        first_rule = first_group["rules"][0]

        put_payload = {
            "rule_groups": [
                {
                    "id": first_group["id"],
                    "operator": "OR",
                    "rules": [
                        {
                            "id": first_rule["id"],
                            "type": "DESCRIPTION",
                            "operator": "NOT_EQUAL",
                            "value": "utilities",
                        },
                        {
                            "type": "PRODUCT",
                            "operator": "EQUAL",
                            "value": "Current",
                        },
                    ],
                },
                {
                    "operator": "AND",
                    "rules": [{"type": "AMOUNT", "operator": "LESS_THAN", "value": "50"}],
                },
            ],
        }

        response = client.put(f"/filters/{created_body['id']}/rule-groups", json=put_payload)

        assert response.status_code == 200
        body = response.json()
        assert len(body["rule_groups"]) == 2

        updated_group = next(group for group in body["rule_groups"] if group["id"] == first_group["id"])
        assert updated_group["operator"] == "OR"
        assert len(updated_group["rules"]) == 2
        updated_rule = next(rule for rule in updated_group["rules"] if rule["id"] == first_rule["id"])
        assert updated_rule["operator"] == "NOT_EQUAL"
        assert updated_rule["value"] == "utilities"

    def test_put_returns_404_for_unknown_filter(self, client: TestClient) -> None:
        response = client.put(
            f"/filters/{uuid.uuid4()}/rule-groups",
            json={
                "rule_groups": [
                    {
                        "operator": "AND",
                        "rules": [{"type": "DESCRIPTION", "operator": "EQUAL", "value": "rent"}],
                    },
                ],
            },
        )

        assert response.status_code == 404
        assert response.json()["detail"] == "Filter not found"

    def test_put_rejects_foreign_rule_group_id(
        self,
        client: TestClient,
        category_factory: CategoryFactory,
    ) -> None:
        category = category_factory()
        first = client.post(
            "/filters",
            json=_valid_filter_payload(str(category.id), name=f"First-{uuid.uuid4()}"),
        ).json()
        second = client.post(
            "/filters",
            json=_valid_filter_payload(str(category.id), name=f"Second-{uuid.uuid4()}"),
        ).json()
        foreign_group_id = second["rule_groups"][0]["id"]

        response = client.put(
            f"/filters/{first['id']}/rule-groups",
            json={
                "rule_groups": [
                    {
                        "id": foreign_group_id,
                        "operator": "AND",
                        "rules": [
                            {
                                "type": "DESCRIPTION",
                                "operator": "EQUAL",
                                "value": "updated",
                            },
                        ],
                    },
                ],
            },
        )

        assert response.status_code == 400
        assert response.json()["detail"] == "Rule group id does not belong to filter"


@pytest.mark.integration
class TestDeleteFilterEndpoint:
    def test_deletes_filter(
        self,
        client: TestClient,
        db: Session,
        category_factory: CategoryFactory,
        filter_factory: FilterFactory,
    ) -> None:
        category = category_factory()
        filter_ = filter_factory(category_id=category.id, name=f"To-delete-{uuid.uuid4()}")

        response = client.delete(f"/filters/{filter_.id}")

        assert response.status_code == 204
        assert db.get(Filter, filter_.id) is None

    def test_returns_404_for_unknown_filter(self, client: TestClient) -> None:
        response = client.delete(f"/filters/{uuid.uuid4()}")

        assert response.status_code == 404
        assert response.json()["detail"] == "Filter not found"

    def test_cascades_and_deletes_rule_groups_and_rules(
        self,
        client: TestClient,
        db: Session,
        category_factory: CategoryFactory,
        filter_factory: FilterFactory,
    ) -> None:
        category = category_factory()
        filter_ = filter_factory(category_id=category.id, name=f"Cascade-{uuid.uuid4()}")
        rule_group_id = filter_.rule_groups[0].id
        rule_id = filter_.rule_groups[0].rules[0].id

        response = client.delete(f"/filters/{filter_.id}")

        assert response.status_code == 204
        assert db.get(Filter, filter_.id) is None
        assert db.get(RuleGroup, rule_group_id) is None
        assert db.get(Rule, rule_id) is None

    def test_shifts_positions_after_delete(
        self,
        client: TestClient,
        category_factory: CategoryFactory,
        filter_factory: FilterFactory,
    ) -> None:
        category = category_factory()
        first = filter_factory(category_id=category.id, name=f"One-{uuid.uuid4()}")
        second = filter_factory(category_id=category.id, name=f"Two-{uuid.uuid4()}")
        third = filter_factory(category_id=category.id, name=f"Three-{uuid.uuid4()}")

        delete_response = client.delete(f"/filters/{second.id}")

        assert delete_response.status_code == 204
        first_after = client.get(f"/filters/{first.id}").json()
        third_after = client.get(f"/filters/{third.id}").json()
        assert [first_after["position"], third_after["position"]] == [1, 2]
