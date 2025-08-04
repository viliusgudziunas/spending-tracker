import pytest
from fastapi import status
from fastapi.testclient import TestClient


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
