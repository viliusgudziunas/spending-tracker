import uuid
from decimal import Decimal
from pathlib import Path
from typing import TYPE_CHECKING, Any

import pytest
from sqlalchemy.orm.attributes import flag_modified

from app.db.models import Report

if TYPE_CHECKING:
    from fastapi.testclient import TestClient
    from sqlalchemy.orm import Session

    from tests.integration.api.routes.conftest import CategoryFactory, FilterFactory

FIXTURES_DIR = Path(__file__).parents[2] / "fixtures"


def _csv_bytes(filename: str = "report_upload.csv") -> bytes:
    return (FIXTURES_DIR / filename).read_bytes()


def _create_report(
    client: TestClient,
    *,
    name: str,
    month: str,
    filename: str = "report_upload.csv",
) -> str:
    response = client.post(
        "/reports",
        files={"upload_file": ("statement.csv", _csv_bytes(filename), "text/csv")},
        data={"name": name, "month": month},
    )
    assert response.status_code == 201
    return response.json()["id"]


def _generate_report(client: TestClient, report_id: str) -> dict[str, Any]:
    response = client.post(f"/reports/{report_id}/generate")
    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, dict)
    return payload


def _get_breakdown(client: TestClient) -> dict[str, Any]:
    response = client.get("/breakdown")
    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, dict)
    return payload


def _category_filter_total(detail: dict[str, Any], category_name: str) -> str:
    category = next(item for item in detail["categories"] if item["name"] == category_name)
    total = sum((Decimal(filter_["amount"]) for filter_ in category["filters"]), Decimal(0))
    return str(total.quantize(Decimal("0.01")))


def _unidentified_total(detail: dict[str, Any]) -> str:
    total = sum(
        (Decimal(str(transaction["amount"])) for transaction in detail["unidentified_transactions"]),
        Decimal(0),
    )
    return str(total.quantize(Decimal("0.01")))


def _mark_report_filters_as_legacy(db: Session, report_id: str) -> None:
    report = db.get(Report, uuid.UUID(report_id))
    assert report is not None
    assert isinstance(report.data, dict)
    categories = report.data["categories"]
    assert isinstance(categories, list)
    for category in categories:
        assert isinstance(category, dict)
        filters = category["filters"]
        assert isinstance(filters, list)
        for filter_row in filters:
            assert isinstance(filter_row, dict)
            snapshot_id = filter_row["id"]
            assert isinstance(snapshot_id, str)
            filter_row["rule_filter_id"] = snapshot_id
    flag_modified(report, "data")
    db.add(report)
    db.commit()


def _assign_manual_filter(
    client: TestClient,
    report_id: str,
    category_id: str,
    name: str,
    description: str,
) -> None:
    detail = client.get(f"/reports/{report_id}")
    assert detail.status_code == 200
    transaction_id = next(
        transaction["id"]
        for transaction in detail.json()["unidentified_transactions"]
        if transaction["description"] == description
    )
    created = client.post(
        f"/reports/{report_id}/manual-filters",
        json={"name": name, "category_id": category_id},
    )
    assert created.status_code == 201
    assigned = client.put(
        f"/reports/{report_id}/transactions/{transaction_id}/assignment",
        json={"target_report_filter_id": created.json()["id"]},
    )
    assert assigned.status_code == 200


@pytest.mark.integration
class TestGetBreakdownEndpoint:
    def test_returns_empty_breakdown_when_no_generated_months(self, client: TestClient) -> None:
        _create_report(client, name="Ungenerated", month="2025-10")

        payload = _get_breakdown(client)

        assert payload == {"months": [], "categories": [], "unidentified": {"amounts": {}}}

    def test_merges_rule_filters_by_id_across_a_rename(
        self,
        client: TestClient,
        category_factory: CategoryFactory,
        filter_factory: FilterFactory,
    ) -> None:
        category = category_factory(name="Groceries")
        rule_filter = filter_factory(
            category_id=category.id,
            name="Grocery store",
            description="Dummy grocery store",
        )
        october = _create_report(client, name="October", month="2025-10")
        _generate_report(client, october)

        renamed = client.patch(f"/filters/{rule_filter.id}", json={"name": "Supermarket"})
        assert renamed.status_code == 200

        november = _create_report(client, name="November", month="2025-11")
        _generate_report(client, november)

        payload = _get_breakdown(client)

        assert payload["months"] == ["2025-10", "2025-11"]
        assert len(payload["categories"]) == 1
        category_row = payload["categories"][0]
        assert category_row["id"] == str(category.id)
        assert category_row["name"] == "Groceries"
        assert len(category_row["filters"]) == 1
        filter_row = category_row["filters"][0]
        assert filter_row["key"] == f"rule:{rule_filter.id}"
        assert filter_row["name"] == "Supermarket"
        assert filter_row["amounts"] == {"2025-10": "-36.73", "2025-11": "-36.73"}
        assert category_row["amounts"] == {"2025-10": "-36.73", "2025-11": "-36.73"}
        assert payload["unidentified"]["amounts"] == {"2025-10": "118.13", "2025-11": "118.13"}

    def test_keeps_deleted_filter_under_one_live_category(
        self,
        client: TestClient,
        category_factory: CategoryFactory,
        filter_factory: FilterFactory,
    ) -> None:
        category = category_factory(name="Home")
        mortgage = filter_factory(
            category_id=category.id,
            name="Mortgage",
            description="Dummy grocery store",
        )
        utilities = filter_factory(
            category_id=category.id,
            name="Utilities",
            description="Dummy transfer description",
        )
        october = _create_report(client, name="October", month="2025-10")
        october_detail = _generate_report(client, october)
        october_total = _category_filter_total(october_detail, "Home")

        deleted = client.delete(f"/filters/{mortgage.id}")
        assert deleted.status_code == 204

        november = _create_report(client, name="November", month="2025-11")
        november_detail = _generate_report(client, november)

        payload = _get_breakdown(client)

        assert len(payload["categories"]) == 1
        category_row = payload["categories"][0]
        assert category_row["id"] == str(category.id)
        assert category_row["name"] == "Home"
        filters_by_key = {filter_row["key"]: filter_row for filter_row in category_row["filters"]}
        assert set(filters_by_key) == {f"rule:{mortgage.id}", f"rule:{utilities.id}"}
        assert filters_by_key[f"rule:{mortgage.id}"]["name"] == "Mortgage"
        assert filters_by_key[f"rule:{mortgage.id}"]["amounts"] == {"2025-10": "-36.73", "2025-11": "0.00"}
        assert filters_by_key[f"rule:{utilities.id}"]["amounts"] == {"2025-10": "118.13", "2025-11": "118.13"}
        assert category_row["amounts"]["2025-10"] == october_total
        assert category_row["amounts"]["2025-11"] == _category_filter_total(november_detail, "Home")
        assert payload["unidentified"]["amounts"]["2025-11"] == _unidentified_total(november_detail)

    def test_keeps_manual_filter_under_renamed_live_category(
        self,
        client: TestClient,
        category_factory: CategoryFactory,
    ) -> None:
        category = category_factory(name="Transfers")
        october = _create_report(client, name="October", month="2025-10")
        _generate_report(client, october)
        _assign_manual_filter(
            client,
            october,
            str(category.id),
            "One-off",
            "Dummy transfer description",
        )

        november = _create_report(client, name="November", month="2025-11")
        _generate_report(client, november)
        _assign_manual_filter(
            client,
            november,
            str(category.id),
            "One-off",
            "Dummy transfer description",
        )

        renamed = client.patch(f"/categories/{category.id}", json={"name": "Money out"})
        assert renamed.status_code == 200

        payload = _get_breakdown(client)

        assert len(payload["categories"]) == 1
        category_row = payload["categories"][0]
        assert category_row["id"] == str(category.id)
        assert category_row["name"] == "Money out"
        assert len(category_row["filters"]) == 1
        filter_row = category_row["filters"][0]
        assert filter_row["key"] == f"manual:{category.id}:One-off"
        assert filter_row["name"] == "One-off"
        assert filter_row["amounts"] == {"2025-10": "118.13", "2025-11": "118.13"}
        october_snapshot = client.get(f"/reports/{october}")
        assert october_snapshot.status_code == 200
        assert october_snapshot.json()["categories"][0]["name"] == "Transfers"

    def test_keeps_same_named_rule_and_manual_filters_distinct(
        self,
        client: TestClient,
        category_factory: CategoryFactory,
        filter_factory: FilterFactory,
    ) -> None:
        category = category_factory(name="Food")
        rule_filter = filter_factory(
            category_id=category.id,
            name="Groceries",
            description="Dummy grocery store",
        )
        report_id = _create_report(client, name="October", month="2025-10")
        _generate_report(client, report_id)
        _assign_manual_filter(
            client,
            report_id,
            str(category.id),
            "Groceries",
            "Dummy transfer description",
        )

        payload = _get_breakdown(client)

        assert payload["months"] == ["2025-10"]
        category_row = payload["categories"][0]
        keys = {filter_row["key"] for filter_row in category_row["filters"]}
        assert keys == {f"rule:{rule_filter.id}", f"manual:{category.id}:Groceries"}
        filters_by_key = {filter_row["key"]: filter_row for filter_row in category_row["filters"]}
        assert filters_by_key[f"rule:{rule_filter.id}"]["amounts"] == {"2025-10": "-36.73"}
        assert filters_by_key[f"manual:{category.id}:Groceries"]["amounts"] == {"2025-10": "118.13"}
        assert category_row["amounts"] == {"2025-10": "81.40"}
        assert payload["unidentified"]["amounts"] == {"2025-10": "0.00"}

    def test_merges_legacy_snapshot_ids_into_the_live_filter_by_name(
        self,
        client: TestClient,
        db: Session,
        category_factory: CategoryFactory,
        filter_factory: FilterFactory,
    ) -> None:
        category = category_factory(name="Investments")
        rule_filter = filter_factory(
            category_id=category.id,
            name="Crypto",
            description="Dummy grocery store",
        )
        october = _create_report(client, name="October", month="2025-10")
        _generate_report(client, october)
        _mark_report_filters_as_legacy(db, october)

        november = _create_report(client, name="November", month="2025-11")
        _generate_report(client, november)

        payload = _get_breakdown(client)

        assert payload["months"] == ["2025-10", "2025-11"]
        assert len(payload["categories"]) == 1
        category_row = payload["categories"][0]
        assert category_row["id"] == str(category.id)
        assert len(category_row["filters"]) == 1
        filter_row = category_row["filters"][0]
        assert filter_row["key"] == f"rule:{rule_filter.id}"
        assert filter_row["name"] == "Crypto"
        assert filter_row["amounts"] == {"2025-10": "-36.73", "2025-11": "-36.73"}

    def test_places_legacy_name_match_on_the_live_filters_category(
        self,
        client: TestClient,
        db: Session,
        category_factory: CategoryFactory,
        filter_factory: FilterFactory,
    ) -> None:
        investments = category_factory(name="Investments")
        savings = category_factory(name="Savings")
        old_reserve = filter_factory(
            category_id=investments.id,
            name="Reserve",
            description="Dummy grocery store",
        )
        october = _create_report(client, name="October", month="2025-10")
        _generate_report(client, october)
        _mark_report_filters_as_legacy(db, october)

        deleted = client.delete(f"/filters/{old_reserve.id}")
        assert deleted.status_code == 204
        live_reserve = filter_factory(
            category_id=savings.id,
            name="Reserve",
            description="Dummy grocery store",
        )
        november = _create_report(client, name="November", month="2025-11")
        _generate_report(client, november)

        payload = _get_breakdown(client)

        assert payload["months"] == ["2025-10", "2025-11"]
        assert len(payload["categories"]) == 1
        category_row = payload["categories"][0]
        assert category_row["id"] == str(savings.id)
        assert category_row["name"] == "Savings"
        assert len(category_row["filters"]) == 1
        filter_row = category_row["filters"][0]
        assert filter_row["key"] == f"rule:{live_reserve.id}"
        assert filter_row["name"] == "Reserve"
        assert filter_row["amounts"] == {"2025-10": "-36.73", "2025-11": "-36.73"}

    def test_keeps_a_recreated_filter_off_the_previous_months_row(
        self,
        client: TestClient,
        category_factory: CategoryFactory,
        filter_factory: FilterFactory,
    ) -> None:
        category = category_factory(name="Home")
        mortgage = filter_factory(
            category_id=category.id,
            name="Mortgage",
            description="Dummy grocery store",
        )
        october = _create_report(client, name="October", month="2025-10")
        _generate_report(client, october)

        deleted = client.delete(f"/filters/{mortgage.id}")
        assert deleted.status_code == 204
        recreated = filter_factory(
            category_id=category.id,
            name="Mortgage",
            description="Dummy grocery store",
        )
        november = _create_report(client, name="November", month="2025-11")
        _generate_report(client, november)

        payload = _get_breakdown(client)

        assert len(payload["categories"]) == 1
        filters_by_key = {filter_row["key"]: filter_row for filter_row in payload["categories"][0]["filters"]}
        assert set(filters_by_key) == {f"rule:{mortgage.id}", f"rule:{recreated.id}"}
        assert filters_by_key[f"rule:{mortgage.id}"]["amounts"] == {"2025-10": "-36.73", "2025-11": "0.00"}
        assert filters_by_key[f"rule:{recreated.id}"]["amounts"] == {"2025-10": "0.00", "2025-11": "-36.73"}

    def test_collapses_legacy_snapshot_ids_for_a_deleted_filter_name(
        self,
        client: TestClient,
        db: Session,
        category_factory: CategoryFactory,
        filter_factory: FilterFactory,
    ) -> None:
        category = category_factory(name="Investments")
        savings = filter_factory(
            category_id=category.id,
            name="Savings",
            description="Dummy grocery store",
        )
        october = _create_report(client, name="October", month="2025-10")
        november = _create_report(client, name="November", month="2025-11")
        _generate_report(client, october)
        _generate_report(client, november)
        _mark_report_filters_as_legacy(db, october)
        _mark_report_filters_as_legacy(db, november)

        deleted = client.delete(f"/filters/{savings.id}")
        assert deleted.status_code == 204

        payload = _get_breakdown(client)

        assert len(payload["categories"]) == 1
        category_row = payload["categories"][0]
        assert category_row["id"] == str(category.id)
        assert len(category_row["filters"]) == 1
        filter_row = category_row["filters"][0]
        assert filter_row["key"] == f"legacy:{category.id}:Savings"
        assert filter_row["name"] == "Savings"
        assert filter_row["amounts"] == {"2025-10": "-36.73", "2025-11": "-36.73"}
