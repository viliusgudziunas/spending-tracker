import uuid
from typing import TYPE_CHECKING

import pytest

from app.db.rules.models import Category

if TYPE_CHECKING:
    from fastapi.testclient import TestClient
    from sqlalchemy.orm import Session

    from tests.integration.api.conftest import CategoryFactory


@pytest.mark.integration
class TestCreateCategoryEndpoint:
    def test_creates_category(self, client: TestClient) -> None:
        response = client.post("/categories", json={"name": "Groceries"})

        assert response.status_code == 201
        payload = response.json()
        assert payload["name"] == "Groceries"
        assert payload["position"] == 1
        assert "id" in payload
        assert payload["filters"] == []

    def test_auto_assigns_incrementing_positions(self, client: TestClient) -> None:
        first = client.post("/categories", json={"name": "Groceries"})
        second = client.post("/categories", json={"name": "Transport"})

        assert first.json()["position"] == 1
        assert second.json()["position"] == 2

    def test_persists_category_to_database(self, client: TestClient, db: Session) -> None:
        response = client.post("/categories", json={"name": "Transport"})

        assert response.status_code == 201
        category_id = response.json()["id"]

        persisted = db.get(Category, category_id)
        assert persisted is not None
        assert persisted.name == "Transport"
        assert persisted.position == 1

    def test_rejects_duplicate_name(
        self,
        client: TestClient,
        category_factory: CategoryFactory,
    ) -> None:
        category = category_factory(name="Groceries")

        response = client.post("/categories", json={"name": category.name})

        assert response.status_code == 400
        assert response.json()["detail"] == "Category already exists"

    def test_rejects_missing_name(self, client: TestClient) -> None:
        response = client.post("/categories", json={})

        assert response.status_code == 422


@pytest.mark.integration
class TestGetCategoriesEndpoint:
    def test_returns_empty_list_when_no_categories(self, client: TestClient) -> None:
        response = client.get("/categories")

        assert response.status_code == 200
        assert response.json() == []

    def test_returns_all_categories(
        self,
        client: TestClient,
        category_factory: CategoryFactory,
    ) -> None:
        groceries = category_factory(name="Groceries")
        transport = category_factory(name="Transport")

        response = client.get("/categories")

        assert response.status_code == 200
        payload = response.json()
        assert len(payload) == 2
        returned_names = {item["name"] for item in payload}
        assert returned_names == {groceries.name, transport.name}

    def test_returns_categories_ordered_by_position(
        self,
        client: TestClient,
        category_factory: CategoryFactory,
    ) -> None:
        category_factory(name="Zebra")
        category_factory(name="Alpha")

        response = client.get("/categories")

        payload = response.json()
        assert payload[0]["name"] == "Zebra"
        assert payload[0]["position"] == 1
        assert payload[1]["name"] == "Alpha"
        assert payload[1]["position"] == 2


@pytest.mark.integration
class TestUpdateCategoryEndpoint:
    def test_updates_name(self, client: TestClient, category_factory: CategoryFactory) -> None:
        category = category_factory(name="Groceries")

        response = client.patch(f"/categories/{category.id}", json={"name": "Food"})

        assert response.status_code == 200
        assert response.json()["name"] == "Food"
        assert response.json()["position"] == 1

    def test_moves_category_down(self, client: TestClient, category_factory: CategoryFactory) -> None:
        category_factory(name="A")
        b = category_factory(name="B")
        category_factory(name="C")

        response = client.patch(f"/categories/{b.id}", json={"position": 3})

        assert response.status_code == 200
        assert response.json()["position"] == 3

        categories = client.get("/categories").json()
        assert [c["name"] for c in categories] == ["A", "C", "B"]
        assert [c["position"] for c in categories] == [1, 2, 3]

    def test_moves_category_up(self, client: TestClient, category_factory: CategoryFactory) -> None:
        category_factory(name="A")
        category_factory(name="B")
        c = category_factory(name="C")

        response = client.patch(f"/categories/{c.id}", json={"position": 1})

        assert response.status_code == 200
        assert response.json()["position"] == 1

        categories = client.get("/categories").json()
        assert [c["name"] for c in categories] == ["C", "A", "B"]
        assert [c["position"] for c in categories] == [1, 2, 3]

    def test_no_op_when_position_unchanged(self, client: TestClient, category_factory: CategoryFactory) -> None:
        a = category_factory(name="A")
        category_factory(name="B")

        response = client.patch(f"/categories/{a.id}", json={"position": 1})

        assert response.status_code == 200
        categories = client.get("/categories").json()
        assert [c["name"] for c in categories] == ["A", "B"]
        assert [c["position"] for c in categories] == [1, 2]

    def test_updates_name_and_position_together(
        self,
        client: TestClient,
        category_factory: CategoryFactory,
    ) -> None:
        a = category_factory(name="A")
        category_factory(name="B")
        category_factory(name="C")

        response = client.patch(f"/categories/{a.id}", json={"name": "Z", "position": 3})

        assert response.status_code == 200
        assert response.json()["name"] == "Z"
        assert response.json()["position"] == 3

        categories = client.get("/categories").json()
        assert [c["name"] for c in categories] == ["B", "C", "Z"]

    def test_rejects_duplicate_name(self, client: TestClient, category_factory: CategoryFactory) -> None:
        category_factory(name="Groceries")
        transport = category_factory(name="Transport")

        response = client.patch(f"/categories/{transport.id}", json={"name": "Groceries"})

        assert response.status_code == 400
        assert response.json()["detail"] == "Category already exists"

    def test_rejects_empty_update(self, client: TestClient, category_factory: CategoryFactory) -> None:
        category = category_factory(name="Groceries")

        response = client.patch(f"/categories/{category.id}", json={})

        assert response.status_code == 422

    def test_returns_404_for_nonexistent_category(self, client: TestClient) -> None:
        response = client.patch(f"/categories/{uuid.uuid4()}", json={"name": "New"})

        assert response.status_code == 404
        assert response.json()["detail"] == "Category not found"

    def test_persists_position_change(
        self,
        client: TestClient,
        db: Session,
        category_factory: CategoryFactory,
    ) -> None:
        a = category_factory(name="A")
        b = category_factory(name="B")
        c = category_factory(name="C")

        client.patch(f"/categories/{c.id}", json={"position": 1})

        db.expire_all()
        assert db.get(Category, c.id).position == 1  # ty:ignore[unresolved-attribute]
        assert db.get(Category, a.id).position == 2  # ty:ignore[unresolved-attribute]
        assert db.get(Category, b.id).position == 3  # ty:ignore[unresolved-attribute]
