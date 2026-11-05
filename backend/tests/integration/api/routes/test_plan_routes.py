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
class TestGetPlanGridEndpoint:
    @pytest.mark.parametrize(
        ("first", "last", "months"),
        [
            ("2026-11", "2026-11", ["2026-11"]),
            ("2026-11", "2027-02", ["2026-11", "2026-12", "2027-01", "2027-02"]),
            ("0000-12", "0001-01", ["0000-12", "0001-01"]),
            ("9999-12", "9999-12", ["9999-12"]),
            ("2020-01", "2029-12", [f"{year}-{month:02}" for year in range(2020, 2030) for month in range(1, 13)]),
        ],
    )
    def test_returns_inclusive_month_range(self, client: TestClient, first: str, last: str, months: list[str]) -> None:
        response = client.get("/plan", params={"from": first, "to": last})

        assert response.status_code == 200
        assert response.json() == {"months": months, "sections": []}

    @pytest.mark.parametrize(
        ("params", "expected_status"),
        [
            ({}, 422),
            ({"from": "2026-11"}, 422),
            ({"to": "2026-11"}, 422),
            ({"from": "", "to": "2026-11"}, 400),
            ({"from": "2026-1", "to": "2026-11"}, 400),
            ({"from": "2026-00", "to": "2026-11"}, 400),
            ({"from": "2026-11", "to": "2026-13"}, 400),
            ({"from": "2026-11-01", "to": "2026-12"}, 400),
            ({"from": "2026-11", "to": "bad"}, 400),
            ({"from": "2026-11", "to": "2026-12\n"}, 400),
            ({"from": "2027-01", "to": "2026-12"}, 400),
            ({"from": "2020-01", "to": "2030-01"}, 400),
        ],
    )
    def test_rejects_invalid_month_range(
        self, client: TestClient, params: dict[str, str], expected_status: int
    ) -> None:
        response = client.get("/plan", params=params)

        assert response.status_code == expected_status

    def test_returns_ordered_sections_and_lines(
        self, client: TestClient, db: Session, plan_section_factory: PlanSectionFactory
    ) -> None:
        home = plan_section_factory(name="Home")
        income = plan_section_factory(name="Income", is_income=True)
        mortgage = client.post(f"/plan/sections/{home.id}/lines", json={"name": "Mortgage"})
        utilities = client.post(f"/plan/sections/{home.id}/lines", json={"name": "Utilities"})
        assert mortgage.status_code == utilities.status_code == 201
        mortgage_id = mortgage.json()["id"]
        saved = client.patch(f"/plan/lines/{mortgage_id}", json={"fixed_amount": "1034.89"})
        moved_line = client.patch(f"/plan/lines/{mortgage_id}", json={"position": 2})
        moved_section = client.patch(f"/plan/sections/{income.id}", json={"position": 1})
        assert saved.status_code == moved_line.status_code == moved_section.status_code == 200
        home_id, income_id = str(home.id), str(income.id)
        db.expire_all()

        response = client.get("/plan", params={"from": "2026-11", "to": "2026-11"})

        assert response.status_code == 200
        assert response.json() == {
            "months": ["2026-11"],
            "sections": [
                {
                    "id": income_id,
                    "name": "Income",
                    "position": 1,
                    "is_income": True,
                    "lines": [],
                    "totals": {"2026-11": "0.00"},
                },
                {
                    "id": home_id,
                    "name": "Home",
                    "position": 2,
                    "is_income": False,
                    "lines": [
                        {**utilities.json(), "position": 1, "amounts": {"2026-11": None}},
                        {**moved_line.json(), "amounts": {"2026-11": "1034.89"}},
                    ],
                    "totals": {"2026-11": "1034.89"},
                },
            ],
        }

    def test_resolves_fixed_amounts_and_section_totals(
        self, client: TestClient, plan_section_factory: PlanSectionFactory
    ) -> None:
        mixed = plan_section_factory(name="Mixed")
        plan_section_factory(name="Empty")
        unset = plan_section_factory(name="Unset")
        separate = plan_section_factory(name="Separate", is_income=True)
        for section, amounts in [(mixed, ["0.10", "0.20", None, "0.00"]), (unset, [None]), (separate, ["5.00"])]:
            for index, amount in enumerate(amounts):
                created = client.post(f"/plan/sections/{section.id}/lines", json={"name": f"Row {index}"})
                assert created.status_code == 201
                if amount is not None:
                    saved = client.patch(f"/plan/lines/{created.json()['id']}", json={"fixed_amount": amount})
                    assert saved.status_code == 200

        response = client.get("/plan", params={"from": "2026-12", "to": "2027-01"})

        assert response.status_code == 200
        grid = response.json()
        assert grid["months"] == ["2026-12", "2027-01"]
        sections = grid["sections"]
        assert [section["name"] for section in sections] == ["Mixed", "Empty", "Unset", "Separate"]
        for section, expected in zip(sections, ["0.30", "0.00", "0.00", "5.00"], strict=True):
            assert section["totals"] == {"2026-12": expected, "2027-01": expected}
        for line, expected in zip(sections[0]["lines"], ["0.10", "0.20", None, "0.00"], strict=True):
            assert line["fixed_amount"] == expected
            assert line["amounts"] == {"2026-12": expected, "2027-01": expected}
        assert sections[1]["lines"] == []
        assert sections[2]["lines"][0]["amounts"] == {"2026-12": None, "2027-01": None}
        assert sections[3]["lines"][0]["amounts"] == {"2026-12": "5.00", "2027-01": "5.00"}

    def test_totals_can_exceed_one_line_amount_limit(
        self, client: TestClient, plan_section_factory: PlanSectionFactory
    ) -> None:
        section = plan_section_factory()
        for name in ["First", "Second"]:
            created = client.post(f"/plan/sections/{section.id}/lines", json={"name": name})
            assert created.status_code == 201
            saved = client.patch(f"/plan/lines/{created.json()['id']}", json={"fixed_amount": "9999999999.99"})
            assert saved.status_code == 200

        response = client.get("/plan", params={"from": "2026-11", "to": "2026-12"})

        assert response.status_code == 200
        assert response.json()["sections"][0]["totals"] == {
            "2026-11": "19999999999.98",
            "2026-12": "19999999999.98",
        }

    @pytest.mark.parametrize(
        "change",
        [
            (None, "700.00", "700.10"),
            ("1034.89", "700.00", "700.10"),
            ("700.00", None, "0.10"),
            ("700.00", "0.00", "0.10"),
            ("0.00", None, "0.10"),
        ],
    )
    def test_grid_reflects_saved_changes(
        self,
        client: TestClient,
        db: Session,
        plan_section_factory: PlanSectionFactory,
        change: tuple[str | None, str | None, str],
    ) -> None:
        initial_amount, replacement, expected_total = change
        home = plan_section_factory(name="Home")
        savings = plan_section_factory(name="Savings")
        created = client.post(f"/plan/sections/{home.id}/lines", json={"name": "Mortgage"})
        sibling = client.post(f"/plan/sections/{home.id}/lines", json={"name": "Utilities"})
        reserve = client.post(f"/plan/sections/{savings.id}/lines", json={"name": "Reserve"})
        assert created.status_code == sibling.status_code == reserve.status_code == 201
        line_id = created.json()["id"]
        for row_id, amount in [
            (line_id, initial_amount),
            (sibling.json()["id"], "0.10"),
            (reserve.json()["id"], "500.00"),
        ]:
            saved = client.patch(f"/plan/lines/{row_id}", json={"fixed_amount": amount})
            assert saved.status_code == 200

        ranges = [["2025-12", "2026-01"], ["2027-03", "2027-04"]]
        for months in ranges:
            before = client.get("/plan", params={"from": months[0], "to": months[-1]})
            assert before.status_code == 200
            assert before.json()["sections"][0]["lines"][0]["amounts"] == dict.fromkeys(months, initial_amount)

        updated = client.patch(f"/plan/lines/{line_id}", json={"fixed_amount": replacement})
        assert updated.status_code == 200
        assert updated.json()["fixed_amount"] == replacement
        db.expire_all()

        for months in ranges:
            response = client.get("/plan", params={"from": months[0], "to": months[-1]})
            assert response.status_code == 200
            grid = response.json()
            assert grid["months"] == months
            assert [section["name"] for section in grid["sections"]] == ["Home", "Savings"]
            home_section, savings_section = grid["sections"]
            assert home_section["lines"] == [
                {**updated.json(), "amounts": dict.fromkeys(months, replacement)},
                {**sibling.json(), "fixed_amount": "0.10", "amounts": dict.fromkeys(months, "0.10")},
            ]
            assert home_section["totals"] == dict.fromkeys(months, expected_total)
            assert savings_section["lines"] == [
                {**reserve.json(), "fixed_amount": "500.00", "amounts": dict.fromkeys(months, "500.00")},
            ]
            assert savings_section["totals"] == dict.fromkeys(months, "500.00")

    def test_grid_reflects_line_deletion_after_reload(
        self, client: TestClient, db: Session, plan_section_factory: PlanSectionFactory
    ) -> None:
        home = plan_section_factory(name="Home")
        deleted_row = client.post(f"/plan/sections/{home.id}/lines", json={"name": "Mortgage"})
        remaining_row = client.post(f"/plan/sections/{home.id}/lines", json={"name": "Utilities"})
        assert deleted_row.status_code == remaining_row.status_code == 201
        deleted_id = deleted_row.json()["id"]
        for row_id, amount in [(deleted_id, "700.00"), (remaining_row.json()["id"], "0.10")]:
            saved = client.patch(f"/plan/lines/{row_id}", json={"fixed_amount": amount})
            assert saved.status_code == 200

        ranges = [["2025-12", "2026-01"], ["2027-03", "2027-04"]]
        for months in ranges:
            before = client.get("/plan", params={"from": months[0], "to": months[-1]})
            assert before.status_code == 200
            assert before.json()["sections"][0]["totals"] == dict.fromkeys(months, "700.10")

        deleted = client.delete(f"/plan/lines/{deleted_id}")
        assert deleted.status_code == 204
        db.expire_all()

        for months in ranges:
            response = client.get("/plan", params={"from": months[0], "to": months[-1]})
            assert response.status_code == 200
            grid = response.json()
            assert grid["months"] == months
            assert len(grid["sections"]) == 1
            section = grid["sections"][0]
            assert section["lines"] == [
                {
                    **remaining_row.json(),
                    "position": 1,
                    "fixed_amount": "0.10",
                    "amounts": dict.fromkeys(months, "0.10"),
                },
            ]
            assert section["totals"] == dict.fromkeys(months, "0.10")


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
class TestPlanLineFixedAmount:
    def test_new_line_has_unset_fixed_amount(
        self, client: TestClient, db: Session, plan_section_factory: PlanSectionFactory
    ) -> None:
        section = plan_section_factory()
        created = client.post(f"/plan/sections/{section.id}/lines", json={"name": "Mortgage"})

        assert created.status_code == 201
        line = created.json()
        assert "fixed_amount" in line
        assert line["fixed_amount"] is None
        db.expire_all()
        sections = client.get("/plan/sections")
        assert sections.status_code == 200
        assert sections.json()[0]["lines"] == [line]

    @pytest.mark.parametrize("replacement", ["700.00", "0.00", "9999999999.99"])
    def test_sets_and_replaces_fixed_amount(
        self, client: TestClient, db: Session, plan_section_factory: PlanSectionFactory, replacement: str
    ) -> None:
        section = plan_section_factory()
        created = client.post(f"/plan/sections/{section.id}/lines", json={"name": "Mortgage"})
        assert created.status_code == 201
        line = created.json()

        for amount in ["1034.89", replacement]:
            response = client.patch(f"/plan/lines/{line['id']}", json={"fixed_amount": amount})

            assert response.status_code == 200
            expected = {**line, "fixed_amount": amount}
            assert response.json() == expected
            db.expire_all()
            sections = client.get("/plan/sections")
            assert sections.status_code == 200
            assert sections.json()[0]["lines"] == [expected]

    @pytest.mark.parametrize("initial_amount", ["1034.89", "0.00"])
    def test_clears_fixed_amount(
        self, client: TestClient, db: Session, plan_section_factory: PlanSectionFactory, initial_amount: str
    ) -> None:
        section = plan_section_factory()
        created = client.post(f"/plan/sections/{section.id}/lines", json={"name": "Mortgage"})
        assert created.status_code == 201
        line = created.json()
        saved = client.patch(f"/plan/lines/{line['id']}", json={"fixed_amount": initial_amount})
        assert saved.status_code == 200
        assert saved.json()["fixed_amount"] == initial_amount

        response = client.patch(f"/plan/lines/{line['id']}", json={"fixed_amount": None})

        assert response.status_code == 200
        expected = {**line, "fixed_amount": None}
        assert response.json() == expected
        db.expire_all()
        sections = client.get("/plan/sections")
        assert sections.status_code == 200
        assert sections.json()[0]["lines"] == [expected]

    def test_rename_and_reorder_preserve_fixed_amount(
        self, client: TestClient, db: Session, plan_section_factory: PlanSectionFactory
    ) -> None:
        section = plan_section_factory()
        created = client.post(f"/plan/sections/{section.id}/lines", json={"name": "Mortgage"})
        sibling = client.post(f"/plan/sections/{section.id}/lines", json={"name": "Utilities"})
        assert created.status_code == sibling.status_code == 201
        line = created.json()
        saved = client.patch(f"/plan/lines/{line['id']}", json={"fixed_amount": "1034.89"})
        assert saved.status_code == 200
        expected = {**line, "fixed_amount": "1034.89"}
        assert saved.json() == expected

        renamed = client.patch(f"/plan/lines/{line['id']}", json={"name": "Housing"})
        expected = {**expected, "name": "Housing"}
        assert renamed.status_code == 200
        assert renamed.json() == expected
        moved = client.patch(f"/plan/lines/{line['id']}", json={"position": 2})
        expected = {**expected, "position": 2}
        assert moved.status_code == 200
        assert moved.json() == expected
        db.expire_all()
        sections = client.get("/plan/sections")
        assert sections.status_code == 200
        assert sections.json()[0]["lines"] == [{**sibling.json(), "position": 1}, expected]

    @pytest.mark.parametrize("invalid_position", [False, True])
    def test_updates_name_and_fixed_amount_together(
        self, client: TestClient, db: Session, plan_section_factory: PlanSectionFactory, *, invalid_position: bool
    ) -> None:
        section = plan_section_factory()
        created = client.post(f"/plan/sections/{section.id}/lines", json={"name": "Mortgage"})
        assert created.status_code == 201
        line = created.json()
        saved = client.patch(f"/plan/lines/{line['id']}", json={"fixed_amount": "1034.89"})
        assert saved.status_code == 200
        assert saved.json() == {**line, "fixed_amount": "1034.89"}
        payload: dict[str, object] = {"name": "Housing", "fixed_amount": "700.00"}
        if invalid_position:
            payload["position"] = 2

        response = client.patch(f"/plan/lines/{line['id']}", json=payload)

        if invalid_position:
            assert response.status_code == 400
            expected = saved.json()
        else:
            assert response.status_code == 200
            expected = {**line, **payload}
            assert response.json() == expected
        db.expire_all()
        sections = client.get("/plan/sections")
        assert sections.status_code == 200
        assert sections.json()[0]["lines"] == [expected]

    @pytest.mark.parametrize(
        "amount",
        ["-0.01", "1.001", "1.230", "10000000000.00", "bad", "", "NaN", "Infinity", "1e2", "1,00", 700, 1.25, True],
    )
    def test_rejects_invalid_fixed_amount_without_changes(
        self, client: TestClient, db: Session, plan_section_factory: PlanSectionFactory, amount: object
    ) -> None:
        section = plan_section_factory()
        created = client.post(f"/plan/sections/{section.id}/lines", json={"name": "Mortgage"})
        assert created.status_code == 201
        line = created.json()

        response = client.patch(f"/plan/lines/{line['id']}", json={"name": "Must not persist", "fixed_amount": amount})

        assert response.status_code == 422
        db.expire_all()
        sections = client.get("/plan/sections")
        assert sections.status_code == 200
        assert sections.json()[0]["lines"] == [line]

    def test_amount_patch_returns_404_for_unknown_line(self, client: TestClient) -> None:
        response = client.patch(f"/plan/lines/{uuid.uuid4()}", json={"fixed_amount": "1034.89"})

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
