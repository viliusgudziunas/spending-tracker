import uuid
from pathlib import Path
from typing import TYPE_CHECKING

import pytest

from app.db.reports.repository import ReportNotFoundError, get_report
from app.db.rules.repository import (
    CreateFilterDTO,
    CreateRuleDTO,
    CreateRuleGroupDTO,
    create_filter,
)
from app.repositories.category_repository import create_category

if TYPE_CHECKING:
    from fastapi.testclient import TestClient
    from sqlalchemy.orm import Session


def _csv_bytes(filename: str = "report_upload.csv") -> bytes:
    fixture_path = Path(__file__).parent / "fixtures" / filename
    return fixture_path.read_bytes()


def _create_report(client: TestClient, filename: str = "report_upload.csv") -> str:
    response = client.post(
        "/reports",
        files={"file": ("statement.csv", _csv_bytes(filename), "text/csv")},
        data={"name": "Test report"},
    )
    assert response.status_code == 200
    return response.json()["id"]


@pytest.mark.integration
class TestCreateReportEndpoint:
    def test_creates_report_from_uploaded_csv(self, client: TestClient, db: Session) -> None:
        response = client.post(
            "/reports",
            files={"file": ("statement.csv", _csv_bytes(), "text/csv")},
            data={"name": "January report"},
        )

        assert response.status_code == 200
        payload = response.json()
        assert payload["name"] == "January report"
        assert payload["schema_version"] == 2
        assert "id" in payload

        report_id = uuid.UUID(payload["id"])
        report = get_report(db=db, report_id=report_id)
        assert report.name == "January report"
        assert len(report.transactions) == 2

    def test_persists_transaction_rows_and_values(self, client: TestClient, db: Session) -> None:
        response = client.post(
            "/reports",
            files={"file": ("statement.csv", _csv_bytes(), "text/csv")},
            data={"name": "Uploaded report"},
        )

        assert response.status_code == 200
        report_id = uuid.UUID(response.json()["id"])
        report = get_report(db=db, report_id=report_id)
        descriptions = {t.description for t in report.transactions}
        amounts = {t.amount for t in report.transactions}
        products = {t.product for t in report.transactions}
        types = {t.type for t in report.transactions}
        currencies = {t.currency for t in report.transactions}
        states = {t.state for t in report.transactions}
        balances = {t.balance for t in report.transactions}
        raw_data_keys = {tuple(sorted(t.raw_data.keys())) for t in report.transactions if t.raw_data is not None}

        assert descriptions == {"Dummy grocery store", "Dummy transfer description"}
        assert amounts == {-36.73, 118.13}
        assert products == {"Current", "Savings"}
        assert types == {"Card Payment", "Transfer"}
        assert currencies == {"EUR"}
        assert states == {"COMPLETED"}
        assert balances == {2062.7, 7564.76}
        assert raw_data_keys == {
            (
                "Amount",
                "Balance",
                "Completed Date",
                "Currency",
                "Description",
                "Fee",
                "Product",
                "Started Date",
                "State",
                "Type",
            ),
        }


@pytest.mark.integration
class TestGenerateReportEndpoint:
    def test_returns_all_unidentified_when_no_rules(self, client: TestClient) -> None:
        report_id = _create_report(client)

        response = client.post(f"/reports/{report_id}/generate")

        assert response.status_code == 200
        payload = response.json()
        assert payload["categories"] == []
        assert len(payload["unidentified_transactions"]) == 2

    def test_matches_transaction_by_description_rule(self, client: TestClient, db: Session) -> None:
        report_id = _create_report(client)
        category = create_category(db=db, name="Groceries")
        create_filter(
            db=db,
            filter_dto=CreateFilterDTO(
                name="Grocery store",
                position=1,
                category_id=category.id,
                rule_groups=[
                    CreateRuleGroupDTO(
                        operator="AND",
                        rules=[CreateRuleDTO(type="DESCRIPTION", operator="EQUAL", value="Dummy grocery store")],
                    ),
                ],
            ),
        )

        response = client.post(f"/reports/{report_id}/generate")

        assert response.status_code == 200
        payload = response.json()
        assert len(payload["categories"]) == 1
        assert payload["categories"][0]["name"] == "Groceries"

        matched_filter = payload["categories"][0]["filters"][0]
        assert matched_filter["name"] == "Grocery store"
        assert len(matched_filter["transactions"]) == 1
        assert matched_filter["transactions"][0]["description"] == "Dummy grocery store"
        assert matched_filter["amount"] == "-36.73"

        assert len(payload["unidentified_transactions"]) == 1
        assert payload["unidentified_transactions"][0]["description"] == "Dummy transfer description"

    def test_persists_data_to_report(self, client: TestClient, db: Session) -> None:
        report_id = _create_report(client)
        category = create_category(db=db, name="Transfers")
        create_filter(
            db=db,
            filter_dto=CreateFilterDTO(
                name="Transfer filter",
                position=1,
                category_id=category.id,
                rule_groups=[
                    CreateRuleGroupDTO(
                        operator="AND",
                        rules=[
                            CreateRuleDTO(type="DESCRIPTION", operator="EQUAL", value="Dummy transfer description"),
                        ],
                    ),
                ],
            ),
        )

        client.post(f"/reports/{report_id}/generate")

        report = get_report(db=db, report_id=uuid.UUID(report_id))
        assert report.data is not None
        assert len(report.data["categories"]) == 1
        assert report.data["categories"][0]["name"] == "Transfers"
        assert len(report.data["categories"][0]["filters"][0]["transaction_ids"]) == 1

    def test_regeneration_replaces_previous_data(self, client: TestClient, db: Session) -> None:
        report_id = _create_report(client)
        client.post(f"/reports/{report_id}/generate")

        category = create_category(db=db, name="Groceries")
        create_filter(
            db=db,
            filter_dto=CreateFilterDTO(
                name="Grocery store",
                position=1,
                category_id=category.id,
                rule_groups=[
                    CreateRuleGroupDTO(
                        operator="AND",
                        rules=[CreateRuleDTO(type="DESCRIPTION", operator="EQUAL", value="Dummy grocery store")],
                    ),
                ],
            ),
        )

        response = client.post(f"/reports/{report_id}/generate")

        assert response.status_code == 200
        payload = response.json()
        assert len(payload["categories"]) == 1
        assert payload["categories"][0]["name"] == "Groceries"
        assert len(payload["categories"][0]["filters"][0]["transactions"]) == 1

    def test_raises_for_nonexistent_report(self, client: TestClient) -> None:
        with pytest.raises(ReportNotFoundError):
            client.post(f"/reports/{uuid.uuid4()}/generate")

    def test_multiple_categories_with_multiple_filters_and_transactions(
        self,
        client: TestClient,
        db: Session,
    ) -> None:
        report_id = _create_report(client, filename="report_multi_category.csv")

        food = create_category(db=db, name="Food")
        create_filter(
            db=db,
            filter_dto=CreateFilterDTO(
                name="Supermarkets",
                position=1,
                category_id=food.id,
                rule_groups=[
                    CreateRuleGroupDTO(
                        operator="AND",
                        rules=[CreateRuleDTO(type="DESCRIPTION", operator="EQUAL", value="Supermarket A")],
                    ),
                ],
            ),
        )
        create_filter(
            db=db,
            filter_dto=CreateFilterDTO(
                name="Restaurants",
                position=2,
                category_id=food.id,
                rule_groups=[
                    CreateRuleGroupDTO(
                        operator="AND",
                        rules=[CreateRuleDTO(type="DESCRIPTION", operator="EQUAL", value="Restaurant X")],
                    ),
                ],
            ),
        )

        housing = create_category(db=db, name="Housing")
        create_filter(
            db=db,
            filter_dto=CreateFilterDTO(
                name="Rent",
                position=1,
                category_id=housing.id,
                rule_groups=[
                    CreateRuleGroupDTO(
                        operator="AND",
                        rules=[CreateRuleDTO(type="DESCRIPTION", operator="EQUAL", value="Monthly rent")],
                    ),
                ],
            ),
        )
        create_filter(
            db=db,
            filter_dto=CreateFilterDTO(
                name="Utilities",
                position=2,
                category_id=housing.id,
                rule_groups=[
                    CreateRuleGroupDTO(
                        operator="AND",
                        rules=[CreateRuleDTO(type="DESCRIPTION", operator="EQUAL", value="Electric bill")],
                    ),
                ],
            ),
        )

        response = client.post(f"/reports/{report_id}/generate")

        assert response.status_code == 200
        payload = response.json()

        assert len(payload["categories"]) == 2
        categories_by_name = {c["name"]: c for c in payload["categories"]}

        food_cat = categories_by_name["Food"]
        assert len(food_cat["filters"]) == 2
        filters_by_name = {f["name"]: f for f in food_cat["filters"]}

        supermarkets = filters_by_name["Supermarkets"]
        assert len(supermarkets["transactions"]) == 2
        assert all(t["description"] == "Supermarket A" for t in supermarkets["transactions"])
        assert float(supermarkets["amount"]) == -43.8

        restaurants = filters_by_name["Restaurants"]
        assert len(restaurants["transactions"]) == 2
        assert all(t["description"] == "Restaurant X" for t in restaurants["transactions"])
        assert float(restaurants["amount"]) == -77.0

        housing_cat = categories_by_name["Housing"]
        assert len(housing_cat["filters"]) == 2
        filters_by_name = {f["name"]: f for f in housing_cat["filters"]}

        rent = filters_by_name["Rent"]
        assert len(rent["transactions"]) == 2
        assert all(t["description"] == "Monthly rent" for t in rent["transactions"])
        assert float(rent["amount"]) == -1600.0

        utilities = filters_by_name["Utilities"]
        assert len(utilities["transactions"]) == 2
        assert all(t["description"] == "Electric bill" for t in utilities["transactions"])
        assert float(utilities["amount"]) == -190.0

        assert len(payload["unidentified_transactions"]) == 1
        assert payload["unidentified_transactions"][0]["description"] == "Unknown purchase"

    def test_get_report_returns_generated_data(self, client: TestClient, db: Session) -> None:
        report_id = _create_report(client)
        category = create_category(db=db, name="Groceries")
        create_filter(
            db=db,
            filter_dto=CreateFilterDTO(
                name="Grocery store",
                position=1,
                category_id=category.id,
                rule_groups=[
                    CreateRuleGroupDTO(
                        operator="AND",
                        rules=[CreateRuleDTO(type="DESCRIPTION", operator="EQUAL", value="Dummy grocery store")],
                    ),
                ],
            ),
        )
        client.post(f"/reports/{report_id}/generate")

        response = client.get(f"/reports/{report_id}")

        assert response.status_code == 200
        payload = response.json()
        assert len(payload["categories"]) == 1
        assert payload["categories"][0]["name"] == "Groceries"
        assert len(payload["unidentified_transactions"]) == 1
