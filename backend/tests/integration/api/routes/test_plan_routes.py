import uuid
from typing import TYPE_CHECKING

import pytest

from app.db.models import PlanSection

if TYPE_CHECKING:
    from fastapi.testclient import TestClient
    from sqlalchemy.orm import Session

    from tests.integration.api.routes.conftest import PlanSectionFactory


@pytest.mark.integration
class TestCreatePlanSectionEndpoint:
    def test_creates_and_persists_section(self, client: TestClient, db: Session) -> None:
        response = client.post("/plan/sections", json={"name": "  Profit  ", "is_income": True})

        assert response.status_code == 201
        assert response.json()["name"] == "Profit"
        assert response.json()["position"] == 1
        assert response.json()["is_income"] is True

        persisted = db.get(PlanSection, uuid.UUID(response.json()["id"]))
        assert persisted is not None
        assert persisted.name == "Profit"
        assert persisted.is_income is True

    def test_appends_positions(self, client: TestClient) -> None:
        first = client.post("/plan/sections", json={"name": "Profit"})
        second = client.post("/plan/sections", json={"name": "Savings"})

        assert first.status_code == 201
        assert second.status_code == 201
        assert first.json()["position"] == 1
        assert second.json()["position"] == 2
        assert first.json()["is_income"] is False
        assert second.json()["is_income"] is False

    @pytest.mark.parametrize(
        "payload",
        [{}, {"name": ""}, {"name": "   "}, {"name": "Profit", "is_income": "true"}],
    )
    def test_rejects_invalid_payload(self, client: TestClient, payload: dict[str, object]) -> None:
        assert client.post("/plan/sections", json=payload).status_code == 422


@pytest.mark.integration
class TestGetPlanSectionsEndpoint:
    def test_returns_empty_list(self, client: TestClient) -> None:
        response = client.get("/plan/sections")

        assert response.status_code == 200
        assert response.json() == []

    def test_returns_sections_ordered_by_position(
        self,
        client: TestClient,
        plan_section_factory: PlanSectionFactory,
    ) -> None:
        plan_section_factory(name="Profit")
        plan_section_factory(name="Savings")

        response = client.get("/plan/sections")

        assert response.status_code == 200
        assert [section["name"] for section in response.json()] == ["Profit", "Savings"]
        assert [section["position"] for section in response.json()] == [1, 2]


@pytest.mark.integration
class TestUpdatePlanSectionEndpoint:
    def test_updates_name(self, client: TestClient, plan_section_factory: PlanSectionFactory) -> None:
        section = plan_section_factory(name="Home")

        response = client.patch(f"/plan/sections/{section.id}", json={"name": "  Housing  "})

        assert response.status_code == 200
        assert response.json()["name"] == "Housing"

    def test_updates_income_flag(self, client: TestClient, plan_section_factory: PlanSectionFactory) -> None:
        section = plan_section_factory(name="Profit")

        response = client.patch(f"/plan/sections/{section.id}", json={"is_income": True})

        assert response.status_code == 200
        assert response.json()["is_income"] is True

    def test_rejects_non_boolean_income_flag(
        self,
        client: TestClient,
        plan_section_factory: PlanSectionFactory,
    ) -> None:
        section = plan_section_factory(name="Profit")

        response = client.patch(f"/plan/sections/{section.id}", json={"is_income": "true"})

        assert response.status_code == 422

    def test_reorders_and_persists_positions(
        self,
        client: TestClient,
        db: Session,
        plan_section_factory: PlanSectionFactory,
    ) -> None:
        first = plan_section_factory(name="Profit")
        second = plan_section_factory(name="Savings")
        third = plan_section_factory(name="Home")

        response = client.patch(f"/plan/sections/{third.id}", json={"position": 1})

        assert response.status_code == 200
        assert [section["name"] for section in client.get("/plan/sections").json()] == [
            "Home",
            "Profit",
            "Savings",
        ]
        db.expire_all()
        assert db.get(PlanSection, third.id).position == 1  # ty:ignore[unresolved-attribute]
        assert db.get(PlanSection, first.id).position == 2  # ty:ignore[unresolved-attribute]
        assert db.get(PlanSection, second.id).position == 3  # ty:ignore[unresolved-attribute]

    def test_moves_section_down(
        self,
        client: TestClient,
        plan_section_factory: PlanSectionFactory,
    ) -> None:
        first = plan_section_factory(name="Profit")
        plan_section_factory(name="Savings")
        plan_section_factory(name="Home")

        response = client.patch(f"/plan/sections/{first.id}", json={"position": 3})

        assert response.status_code == 200
        assert [section["name"] for section in client.get("/plan/sections").json()] == [
            "Savings",
            "Home",
            "Profit",
        ]

    def test_updates_name_and_position_together(
        self,
        client: TestClient,
        plan_section_factory: PlanSectionFactory,
    ) -> None:
        first = plan_section_factory(name="Home")
        plan_section_factory(name="Savings")

        response = client.patch(
            f"/plan/sections/{first.id}",
            json={"name": "Housing", "position": 2},
        )

        assert response.status_code == 200
        assert response.json()["name"] == "Housing"
        assert response.json()["position"] == 2
        assert [section["name"] for section in client.get("/plan/sections").json()] == [
            "Savings",
            "Housing",
        ]

    def test_accepts_unchanged_position(
        self,
        client: TestClient,
        plan_section_factory: PlanSectionFactory,
    ) -> None:
        section = plan_section_factory()

        response = client.patch(f"/plan/sections/{section.id}", json={"position": 1})

        assert response.status_code == 200
        assert response.json()["position"] == 1

    @pytest.mark.parametrize(
        ("position", "expected_status"),
        [(0, 422), (-1, 422), (2, 400)],
    )
    def test_rejects_invalid_position(
        self,
        client: TestClient,
        plan_section_factory: PlanSectionFactory,
        position: int,
        expected_status: int,
    ) -> None:
        section = plan_section_factory()

        response = client.patch(f"/plan/sections/{section.id}", json={"position": position})

        assert response.status_code == expected_status

    def test_rejects_empty_payload(self, client: TestClient, plan_section_factory: PlanSectionFactory) -> None:
        section = plan_section_factory()

        assert client.patch(f"/plan/sections/{section.id}", json={}).status_code == 422

    def test_returns_404_for_unknown_section(self, client: TestClient) -> None:
        response = client.patch(f"/plan/sections/{uuid.uuid4()}", json={"name": "Missing"})

        assert response.status_code == 404
        assert response.json()["detail"] == "Plan section not found"


@pytest.mark.integration
class TestDeletePlanSectionEndpoint:
    def test_deletes_section_and_compacts_positions(
        self,
        client: TestClient,
        db: Session,
        plan_section_factory: PlanSectionFactory,
    ) -> None:
        first = plan_section_factory(name="Profit")
        deleted = plan_section_factory(name="Savings")
        last = plan_section_factory(name="Home")

        response = client.delete(f"/plan/sections/{deleted.id}")

        assert response.status_code == 204
        db.expire_all()
        assert db.get(PlanSection, deleted.id) is None
        assert db.get(PlanSection, first.id).position == 1  # ty:ignore[unresolved-attribute]
        assert db.get(PlanSection, last.id).position == 2  # ty:ignore[unresolved-attribute]

    def test_returns_404_for_unknown_section(self, client: TestClient) -> None:
        response = client.delete(f"/plan/sections/{uuid.uuid4()}")

        assert response.status_code == 404
        assert response.json()["detail"] == "Plan section not found"
