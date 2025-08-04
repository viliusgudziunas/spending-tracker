import pytest
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.schemas.spapi.categories_schemas import SpapiCategory
from tests.fixtures.rules import GetCategory, InsertCategory


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
