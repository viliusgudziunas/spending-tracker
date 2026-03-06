from typing import TYPE_CHECKING

import pytest

from app.db.rules.models import Category

if TYPE_CHECKING:
    from fastapi.testclient import TestClient
    from sqlalchemy.orm import Session


@pytest.mark.integration
class TestCreateCategoryEndpoint:
    def test_creates_category(self, client: TestClient) -> None:
        response = client.post("/categories", json={"name": "Groceries"})

        assert response.status_code == 201
        payload = response.json()
        assert payload["name"] == "Groceries"
        assert "id" in payload
        assert payload["filters"] == []

    def test_persists_category_to_database(self, client: TestClient, db: Session) -> None:
        response = client.post("/categories", json={"name": "Transport"})

        assert response.status_code == 201
        category_id = response.json()["id"]

        persisted = db.get(Category, category_id)
        assert persisted is not None
        assert persisted.name == "Transport"

    def test_rejects_duplicate_name(self, client: TestClient, category: Category) -> None:
        response = client.post("/categories", json={"name": category.name})

        assert response.status_code == 400
        assert response.json()["detail"] == "Category already exists"

    def test_rejects_missing_name(self, client: TestClient) -> None:
        response = client.post("/categories", json={})

        assert response.status_code == 422
