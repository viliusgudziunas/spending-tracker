import uuid
from typing import TYPE_CHECKING

import pytest
from sqlalchemy import text

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


@pytest.mark.integration
class TestCreatePlanLineEndpoint:
    def test_creates_and_persists_line(
        self,
        client: TestClient,
        db: Session,
        plan_section_factory: PlanSectionFactory,
    ) -> None:
        section = plan_section_factory(name="Home")
        section_id = str(section.id)

        response = client.post(f"/plan/sections/{section_id}/lines", json={"name": "  Mortgage  "})

        assert response.status_code == 201
        line = response.json()
        assert uuid.UUID(line["id"])
        assert line["name"] == "Mortgage"
        assert line["position"] == 1
        db.expire_all()
        sections = client.get("/plan/sections")
        assert sections.status_code == 200
        assert sections.json()[0]["id"] == section_id
        assert sections.json()[0]["lines"] == [line]

    def test_appends_lines_within_each_section(
        self,
        client: TestClient,
        plan_section_factory: PlanSectionFactory,
    ) -> None:
        home = plan_section_factory(name="Home")
        savings = plan_section_factory(name="Savings")

        for section_id, name, position in [
            (home.id, "Mortgage", 1),
            (savings.id, "Reserve", 1),
            (home.id, "Utilities", 2),
        ]:
            response = client.post(f"/plan/sections/{section_id}/lines", json={"name": name})

            assert response.status_code == 201
            assert response.json()["name"] == name
            assert response.json()["position"] == position

        sections = client.get("/plan/sections")
        assert sections.status_code == 200
        assert [line["name"] for line in sections.json()[0]["lines"]] == ["Mortgage", "Utilities"]
        assert [line["name"] for line in sections.json()[1]["lines"]] == ["Reserve"]

    @pytest.mark.parametrize("payload", [{}, {"name": ""}, {"name": "   "}, {"name": None}])
    def test_rejects_invalid_line_payload(
        self,
        client: TestClient,
        plan_section_factory: PlanSectionFactory,
        payload: dict[str, object],
    ) -> None:
        section = plan_section_factory()

        response = client.post(f"/plan/sections/{section.id}/lines", json=payload)

        assert response.status_code == 422
        sections = client.get("/plan/sections")
        assert sections.status_code == 200
        assert sections.json()[0]["lines"] == []

    def test_returns_404_for_unknown_parent(self, client: TestClient) -> None:
        response = client.post(f"/plan/sections/{uuid.uuid4()}/lines", json={"name": "Mortgage"})

        assert response.status_code == 404
        assert response.json()["detail"] == "Plan section not found"
        sections = client.get("/plan/sections")
        assert sections.status_code == 200
        assert sections.json() == []


@pytest.mark.integration
class TestGetPlanSectionLinesEndpoint:
    def test_returns_empty_lines_for_existing_section(
        self,
        client: TestClient,
        plan_section_factory: PlanSectionFactory,
    ) -> None:
        section = plan_section_factory()

        response = client.get("/plan/sections")

        assert response.status_code == 200
        assert response.json() == [
            {
                "id": str(section.id),
                "name": "Home",
                "position": 1,
                "is_income": False,
                "lines": [],
            },
        ]

    def test_returns_sections_with_ordered_lines(
        self,
        client: TestClient,
        db: Session,
        plan_section_factory: PlanSectionFactory,
    ) -> None:
        section = plan_section_factory()
        names = ["Utilities", "Mortgage", "Insurance"]
        for name in names:
            created = client.post(f"/plan/sections/{section.id}/lines", json={"name": name})
            assert created.status_code == 201

        db.expire_all()
        response = client.get("/plan/sections")

        assert response.status_code == 200
        lines = response.json()[0]["lines"]
        assert [line["name"] for line in lines] == names
        assert [line["position"] for line in lines] == [1, 2, 3]


@pytest.mark.integration
class TestUpdatePlanLineEndpoint:
    def test_renames_line(self, client: TestClient, db: Session, plan_section_factory: PlanSectionFactory) -> None:
        section = plan_section_factory()
        created = client.post(f"/plan/sections/{section.id}/lines", json={"name": "Mortgage"})
        assert created.status_code == 201
        line = created.json()

        response = client.patch(f"/plan/lines/{line['id']}", json={"name": "  Housing  "})

        assert response.status_code == 200
        expected = {**line, "name": "Housing"}
        assert response.json() == expected
        db.expire_all()
        sections = client.get("/plan/sections")
        assert sections.status_code == 200
        assert sections.json()[0]["id"] == str(section.id)
        assert sections.json()[0]["lines"] == [expected]

    @pytest.mark.parametrize(
        ("move", "expected_names"),
        [
            ((2, 1), ["Insurance", "Mortgage", "Utilities"]),
            ((0, 3), ["Utilities", "Insurance", "Mortgage"]),
            ((1, 2), ["Mortgage", "Utilities", "Insurance"]),
        ],
    )
    def test_reorders_lines_within_section(
        self,
        client: TestClient,
        db: Session,
        plan_section_factory: PlanSectionFactory,
        move: tuple[int, int],
        expected_names: list[str],
    ) -> None:
        line_index, position = move
        home = plan_section_factory(name="Home")
        savings = plan_section_factory(name="Savings")
        for name in ["Mortgage", "Utilities", "Insurance"]:
            created = client.post(f"/plan/sections/{home.id}/lines", json={"name": name})
            assert created.status_code == 201
        reserve = client.post(f"/plan/sections/{savings.id}/lines", json={"name": "Reserve"})
        assert reserve.status_code == 201
        before = client.get("/plan/sections").json()
        line_id = before[0]["lines"][line_index]["id"]

        response = client.patch(f"/plan/lines/{line_id}", json={"position": position})

        assert response.status_code == 200
        assert response.json()["id"] == line_id
        assert response.json()["position"] == position
        db.expire_all()
        sections = client.get("/plan/sections")
        assert sections.status_code == 200
        lines = sections.json()[0]["lines"]
        assert [line["name"] for line in lines] == expected_names
        assert [line["position"] for line in lines] == [1, 2, 3]
        assert sections.json()[1] == before[1]

    @pytest.mark.parametrize(
        ("payload", "expected_status"),
        [
            ({}, 422),
            ({"name": ""}, 422),
            ({"name": "   "}, 422),
            ({"name": None}, 422),
            ({"position": 0}, 422),
            ({"position": -1}, 422),
            ({"name": "Must not persist", "position": 2}, 400),
        ],
    )
    def test_rejects_invalid_line_payload(
        self,
        client: TestClient,
        db: Session,
        plan_section_factory: PlanSectionFactory,
        payload: dict[str, object],
        expected_status: int,
    ) -> None:
        section = plan_section_factory()
        created = client.post(f"/plan/sections/{section.id}/lines", json={"name": "Mortgage"})
        assert created.status_code == 201
        line = created.json()

        response = client.patch(f"/plan/lines/{line['id']}", json=payload)

        assert response.status_code == expected_status
        db.expire_all()
        sections = client.get("/plan/sections")
        assert sections.status_code == 200
        assert sections.json()[0]["lines"] == [line]

    def test_returns_404_for_unknown_line(self, client: TestClient) -> None:
        response = client.patch(f"/plan/lines/{uuid.uuid4()}", json={"name": "Missing"})

        assert response.status_code == 404
        assert response.json()["detail"] == "Plan line not found"


@pytest.mark.integration
class TestDeletePlanLineEndpoint:
    def test_deletes_line_and_compacts_positions(
        self, client: TestClient, db: Session, plan_section_factory: PlanSectionFactory
    ) -> None:
        home = plan_section_factory(name="Home")
        savings = plan_section_factory(name="Savings")
        for name in ["Mortgage", "Utilities", "Insurance"]:
            created = client.post(f"/plan/sections/{home.id}/lines", json={"name": name})
            assert created.status_code == 201
        reserve = client.post(f"/plan/sections/{savings.id}/lines", json={"name": "Reserve"})
        assert reserve.status_code == 201
        before = client.get("/plan/sections").json()
        deleted_id = before[0]["lines"][1]["id"]

        response = client.delete(f"/plan/lines/{deleted_id}")

        assert response.status_code == 204
        db.expire_all()
        sections = client.get("/plan/sections")
        assert sections.status_code == 200
        lines = sections.json()[0]["lines"]
        assert [line["id"] for line in lines] == [
            before[0]["lines"][0]["id"],
            before[0]["lines"][2]["id"],
        ]
        assert [line["position"] for line in lines] == [1, 2]
        assert sections.json()[1] == before[1]
        assert db.scalar(text("SELECT count(*) FROM plan_line WHERE id = :id"), {"id": deleted_id}) == 0

    def test_deleting_section_removes_its_lines(
        self, client: TestClient, db: Session, plan_section_factory: PlanSectionFactory
    ) -> None:
        home = plan_section_factory(name="Home")
        savings = plan_section_factory(name="Savings")
        home_id = str(home.id)
        for name in ["Mortgage", "Utilities"]:
            created = client.post(f"/plan/sections/{home_id}/lines", json={"name": name})
            assert created.status_code == 201
        reserve = client.post(f"/plan/sections/{savings.id}/lines", json={"name": "Reserve"})
        assert reserve.status_code == 201

        response = client.delete(f"/plan/sections/{home_id}")

        assert response.status_code == 204
        db.expire_all()
        sections = client.get("/plan/sections")
        assert sections.status_code == 200
        assert len(sections.json()) == 1
        assert sections.json()[0]["id"] == str(savings.id)
        assert sections.json()[0]["lines"] == [reserve.json()]
        assert db.scalar(text("SELECT count(*) FROM plan_line WHERE section_id = :id"), {"id": home_id}) == 0

    def test_returns_404_for_unknown_line(self, client: TestClient) -> None:
        response = client.delete(f"/plan/lines/{uuid.uuid4()}")

        assert response.status_code == 404
        assert response.json()["detail"] == "Plan line not found"
