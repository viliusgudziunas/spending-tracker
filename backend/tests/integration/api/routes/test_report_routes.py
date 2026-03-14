import uuid
from pathlib import Path
from typing import TYPE_CHECKING

import pytest

if TYPE_CHECKING:
    from fastapi.testclient import TestClient
    from sqlalchemy.orm import Session

    from tests.integration.api.routes.conftest import CategoryFactory, FilterFactory, ReportFactory, ReportFetcher

FIXTURES_DIR = Path(__file__).parents[2] / "fixtures"


def _csv_bytes(filename: str = "report_upload.csv") -> bytes:
    return (FIXTURES_DIR / filename).read_bytes()


def _create_report(client: TestClient, filename: str = "report_upload.csv") -> str:
    response = client.post(
        "/reports",
        files={"upload_file": ("statement.csv", _csv_bytes(filename), "text/csv")},
        data={"name": "Test report"},
    )
    assert response.status_code == 201
    return response.json()["id"]


@pytest.mark.integration
class TestCreateReportEndpoint:
    def test_creates_report_and_returns_201(self, client: TestClient) -> None:
        response = client.post(
            "/reports",
            data={"name": "January 2025"},
            files={"upload_file": ("statement.csv", _csv_bytes(), "text/csv")},
        )

        assert response.status_code == 201
        payload = response.json()
        assert payload["name"] == "January 2025"
        assert "id" in payload
        assert "schema_version" in payload

    def test_created_report_appears_in_list(self, client: TestClient) -> None:
        client.post(
            "/reports",
            data={"name": "February 2025"},
            files={"upload_file": ("statement.csv", _csv_bytes(), "text/csv")},
        )

        response = client.get("/reports")

        assert response.status_code == 200
        names = {r["name"] for r in response.json()}
        assert "February 2025" in names

    def test_created_report_has_parsed_transactions(self, client: TestClient) -> None:
        create_response = client.post(
            "/reports",
            data={"name": "March 2025"},
            files={"upload_file": ("statement.csv", _csv_bytes(), "text/csv")},
        )
        report_id = create_response.json()["id"]

        response = client.get(f"/reports/{report_id}")

        assert response.status_code == 200
        payload = response.json()
        assert len(payload["unidentified_transactions"]) == 2
        descriptions = {tx["description"] for tx in payload["unidentified_transactions"]}
        assert descriptions == {"Dummy grocery store", "Dummy transfer description"}

    def test_persists_all_transaction_fields(self, client: TestClient) -> None:
        create_response = client.post(
            "/reports",
            data={"name": "April 2025"},
            files={"upload_file": ("statement.csv", _csv_bytes(), "text/csv")},
        )
        report_id = create_response.json()["id"]

        response = client.get(f"/reports/{report_id}")

        txs = response.json()["unidentified_transactions"]
        amounts = {tx["amount"] for tx in txs}
        types = {tx["type"] for tx in txs}
        products = {tx["product"] for tx in txs}
        currencies = {tx["currency"] for tx in txs}
        states = {tx["state"] for tx in txs}
        balances = {tx["balance"] for tx in txs}
        assert amounts == {-36.73, 118.13}
        assert types == {"Card Payment", "Transfer"}
        assert products == {"Current", "Savings"}
        assert currencies == {"EUR"}
        assert states == {"COMPLETED"}
        assert balances == {2062.7, 7564.76}
        assert all("raw_data" not in tx for tx in txs)

    def test_returns_422_when_name_is_missing(self, client: TestClient) -> None:
        response = client.post(
            "/reports",
            files={"upload_file": ("statement.csv", _csv_bytes(), "text/csv")},
        )

        assert response.status_code == 422


@pytest.mark.integration
class TestUpdateReportEndpoint:
    def test_updates_report_name_and_returns_200(
        self,
        client: TestClient,
        report_factory: ReportFactory,
    ) -> None:
        report = report_factory(name="Old report name")

        response = client.patch(
            f"/reports/{report.id}",
            json={"name": "Updated report name"},
        )

        assert response.status_code == 200
        payload = response.json()
        assert payload["id"] == str(report.id)
        assert payload["name"] == "Updated report name"
        assert "schema_version" in payload

    def test_returns_404_for_nonexistent_report(self, client: TestClient) -> None:
        response = client.patch(
            f"/reports/{uuid.uuid4()}",
            json={"name": "Updated report name"},
        )

        assert response.status_code == 404
        assert response.json()["detail"] == "Report not found"


@pytest.mark.integration
class TestListReportsEndpoint:
    def test_returns_empty_list_when_no_reports(self, client: TestClient) -> None:
        response = client.get("/reports")

        assert response.status_code == 200
        assert response.json() == []

    def test_returns_all_reports(self, client: TestClient, report_factory: ReportFactory) -> None:
        report_factory(name="January 2025")
        report_factory(name="February 2025")

        response = client.get("/reports")

        assert response.status_code == 200
        payload = response.json()
        assert len(payload) == 2
        returned_names = {item["name"] for item in payload}
        assert returned_names == {"January 2025", "February 2025"}

    def test_returns_report_fields(self, client: TestClient, report_factory: ReportFactory) -> None:
        report = report_factory(name="March 2025")

        response = client.get("/reports")

        assert response.status_code == 200
        payload = response.json()
        assert len(payload) == 1
        assert payload[0]["id"] == str(report.id)
        assert payload[0]["name"] == "March 2025"
        assert payload[0]["schema_version"] == report.schema_version

    def test_returns_reports_ordered_by_created_at_descending(
        self,
        client: TestClient,
        report_factory: ReportFactory,
    ) -> None:
        report_factory(name="First")
        report_factory(name="Second")

        response = client.get("/reports")

        payload = response.json()
        assert payload[0]["name"] == "Second"
        assert payload[1]["name"] == "First"


@pytest.mark.integration
class TestGetReportEndpoint:
    def test_returns_report_by_id(self, client: TestClient, report_factory: ReportFactory) -> None:
        report = report_factory(name="January 2025")

        response = client.get(f"/reports/{report.id}")

        assert response.status_code == 200
        payload = response.json()
        assert payload["id"] == str(report.id)
        assert payload["name"] == "January 2025"
        assert payload["schema_version"] == report.schema_version

    def test_returns_empty_categories_for_ungenerated_report(
        self,
        client: TestClient,
        report_factory: ReportFactory,
    ) -> None:
        report = report_factory()

        response = client.get(f"/reports/{report.id}")

        assert response.status_code == 200
        payload = response.json()
        assert payload["categories"] == []

    def test_returns_unidentified_transactions_for_ungenerated_report(
        self,
        client: TestClient,
        report_factory: ReportFactory,
    ) -> None:
        report = report_factory()

        response = client.get(f"/reports/{report.id}")

        assert response.status_code == 200
        payload = response.json()
        assert len(payload["unidentified_transactions"]) == 1
        assert payload["unidentified_transactions"][0]["description"] == "Sample transaction"

    def test_returns_404_for_nonexistent_report(self, client: TestClient) -> None:
        response = client.get(f"/reports/{uuid.uuid4()}")

        assert response.status_code == 404
        assert response.json()["detail"] == "Report not found"

    def test_returns_422_for_invalid_report_id(self, client: TestClient) -> None:
        response = client.get("/reports/not-a-uuid")

        assert response.status_code == 422

    def test_returns_all_v2_transaction_fields(
        self,
        client: TestClient,
        report_factory: ReportFactory,
    ) -> None:
        report = report_factory()

        response = client.get(f"/reports/{report.id}")

        assert response.status_code == 200
        tx = response.json()["unidentified_transactions"][0]
        assert tx["schema_version"] == 2
        assert tx["type"] == "Card Payment"
        assert tx["product"] == "Current"
        assert tx["currency"] == "EUR"
        assert tx["state"] == "COMPLETED"
        assert tx["balance"] == 100.0
        assert "raw_data" not in tx
        assert tx["source"] == "generated"

    def test_returns_generated_report_with_categories(
        self,
        client: TestClient,
        db: Session,
        report_factory: ReportFactory,
    ) -> None:
        report = report_factory()
        tx_id = str(report.transactions[0].id)
        report.data = {
            "categories": [
                {
                    "id": str(uuid.uuid4()),
                    "name": "Food",
                    "filters": [
                        {
                            "id": str(uuid.uuid4()),
                            "name": "Groceries",
                            "position": 0,
                            "transaction_ids": [tx_id],
                        },
                    ],
                },
            ],
        }
        db.add(report)
        db.commit()

        response = client.get(f"/reports/{report.id}")

        assert response.status_code == 200
        payload = response.json()
        assert len(payload["categories"]) == 1
        category = payload["categories"][0]
        assert category["name"] == "Food"
        assert len(category["filters"]) == 1
        assert category["filters"][0]["name"] == "Groceries"
        assert category["filters"][0]["position"] == 0
        assert category["filters"][0]["is_manual"] is True
        assert category["filters"][0]["rule_filter_id"] is None
        assert float(category["filters"][0]["amount"]) == 10.0
        assert len(category["filters"][0]["transactions"]) == 1
        assert payload["unidentified_transactions"] == []

    def test_does_not_include_other_reports_transactions(
        self,
        client: TestClient,
        report_factory: ReportFactory,
    ) -> None:
        report_factory(name="Other Report")
        report = report_factory(name="Target Report")

        response = client.get(f"/reports/{report.id}")

        assert response.status_code == 200
        payload = response.json()
        assert payload["name"] == "Target Report"
        assert len(payload["unidentified_transactions"]) == 1

    def test_ignores_missing_transaction_ids_in_report_data(
        self,
        client: TestClient,
        db: Session,
        report_factory: ReportFactory,
    ) -> None:
        report = report_factory()
        report.data = {
            "categories": [
                {
                    "id": str(uuid.uuid4()),
                    "name": "Food",
                    "filters": [
                        {
                            "id": str(uuid.uuid4()),
                            "name": "Groceries",
                            "position": 0,
                            "transaction_ids": [str(uuid.uuid4())],
                        },
                    ],
                },
            ],
        }
        db.add(report)
        db.commit()

        response = client.get(f"/reports/{report.id}")

        assert response.status_code == 200
        payload = response.json()
        assert payload["categories"][0]["filters"][0]["transactions"] == []
        assert float(payload["categories"][0]["filters"][0]["amount"]) == 0
        assert len(payload["unidentified_transactions"]) == 1


@pytest.mark.integration
class TestCreateReportManualFilterEndpoint:
    def test_creates_manual_filter_for_report(
        self,
        client: TestClient,
        category_factory: CategoryFactory,
        report_factory: ReportFactory,
        report_fetcher: ReportFetcher,
    ) -> None:
        report = report_factory()
        category = category_factory(name="Transfers")

        response = client.post(
            f"/reports/{report.id}/manual-filters",
            json={"name": "One-off transfer", "category_id": str(category.id)},
        )

        assert response.status_code == 201
        payload = response.json()
        assert payload["name"] == "One-off transfer"
        assert payload["category_id"] == str(category.id)
        assert payload["position"] == 1
        assert "id" in payload

        refreshed_report = report_fetcher(report_id=report.id)
        assert refreshed_report.data is not None
        assert "manual_filters" in refreshed_report.data
        assert len(refreshed_report.data["manual_filters"]) == 1
        assert refreshed_report.data["manual_filters"][0]["id"] == payload["id"]

    def test_returns_404_when_report_not_found(self, client: TestClient) -> None:
        response = client.post(
            f"/reports/{uuid.uuid4()}/manual-filters",
            json={"name": "One-off transfer", "category_id": str(uuid.uuid4())},
        )

        assert response.status_code == 404
        assert response.json()["detail"] == "Report not found"

    def test_returns_404_when_category_not_found(
        self,
        client: TestClient,
        report_factory: ReportFactory,
    ) -> None:
        report = report_factory()
        response = client.post(
            f"/reports/{report.id}/manual-filters",
            json={"name": "One-off transfer", "category_id": str(uuid.uuid4())},
        )

        assert response.status_code == 404
        assert response.json()["detail"] == "Category not found"


@pytest.mark.integration
class TestPutReportAssignmentEndpoint:
    def test_sets_manual_assignment_for_report_transaction(
        self,
        client: TestClient,
        report_factory: ReportFactory,
        category_factory: CategoryFactory,
        filter_factory: FilterFactory,
        report_fetcher: ReportFetcher,
    ) -> None:
        report = report_factory()
        transaction_id = report.transactions[0].id
        category = category_factory(name="Transfers")
        filter_ = filter_factory(category_id=category.id, name="To Simona", description="Transfer to SIMONA BAGUZYTE")

        response = client.put(
            f"/reports/{report.id}/transactions/{transaction_id}/assignment",
            json={"target_rule_filter_id": str(filter_.id)},
        )

        assert response.status_code == 200
        payload = response.json()
        assert payload["id"] == str(report.id)
        assert "categories" in payload
        assert "unidentified_transactions" in payload

        refreshed_report = report_fetcher(report_id=report.id)
        assert refreshed_report.data is not None
        assert refreshed_report.data["manual_assignments"][str(transaction_id)]["target_rule_filter_id"] == str(
            filter_.id,
        )
        assert len(refreshed_report.data["categories"]) == 1
        assert refreshed_report.data["categories"][0]["name"] == "Transfers"

    def test_replaces_existing_assignment_for_same_transaction(
        self,
        client: TestClient,
        report_factory: ReportFactory,
        category_factory: CategoryFactory,
        filter_factory: FilterFactory,
        report_fetcher: ReportFetcher,
    ) -> None:
        report = report_factory()
        transaction_id = report.transactions[0].id
        category = category_factory(name="Transfers")
        first_filter = filter_factory(category_id=category.id, name="First", description="Sample transaction")
        second_filter = filter_factory(category_id=category.id, name="Second", description="Sample transaction 2")

        report.data = {
            "categories": [],
            "manual_assignments": {
                str(transaction_id): {"target_rule_filter_id": str(first_filter.id)},
            },
        }

        response = client.put(
            f"/reports/{report.id}/transactions/{transaction_id}/assignment",
            json={"target_rule_filter_id": str(second_filter.id)},
        )

        assert response.status_code == 200
        payload = response.json()
        assert payload["id"] == str(report.id)
        refreshed_report = report_fetcher(report_id=report.id)
        assert refreshed_report.data is not None
        assert refreshed_report.data["manual_assignments"][str(transaction_id)]["target_rule_filter_id"] == str(
            second_filter.id,
        )

    def test_returns_404_when_report_not_found(
        self,
        client: TestClient,
        report_factory: ReportFactory,
        category_factory: CategoryFactory,
        filter_factory: FilterFactory,
    ) -> None:
        report = report_factory()
        category = category_factory(name="Transfers")
        filter_ = filter_factory(category_id=category.id, name="To Simona", description="Transfer to SIMONA BAGUZYTE")
        transaction_id = report.transactions[0].id

        response = client.put(
            f"/reports/{uuid.uuid4()}/transactions/{transaction_id}/assignment",
            json={"target_rule_filter_id": str(filter_.id)},
        )

        assert response.status_code == 404
        assert response.json()["detail"] == "Report not found"

    def test_returns_404_when_transaction_is_not_in_report(
        self,
        client: TestClient,
        report_factory: ReportFactory,
        category_factory: CategoryFactory,
        filter_factory: FilterFactory,
    ) -> None:
        report = report_factory(name="First report")
        other_report = report_factory(name="Second report")
        transaction_id = other_report.transactions[0].id
        category = category_factory(name="Transfers")
        filter_ = filter_factory(category_id=category.id, name="To Simona", description="Transfer to SIMONA BAGUZYTE")

        response = client.put(
            f"/reports/{report.id}/transactions/{transaction_id}/assignment",
            json={"target_rule_filter_id": str(filter_.id)},
        )

        assert response.status_code == 404
        assert response.json()["detail"] == "Transaction not found"

    def test_returns_404_when_filter_not_found(
        self,
        client: TestClient,
        report_factory: ReportFactory,
    ) -> None:
        report = report_factory()
        transaction_id = report.transactions[0].id

        response = client.put(
            f"/reports/{report.id}/transactions/{transaction_id}/assignment",
            json={"target_rule_filter_id": str(uuid.uuid4())},
        )

        assert response.status_code == 404
        assert response.json()["detail"] == "Filter not found"

    def test_manual_assignment_is_reflected_in_regenerated_report(
        self,
        client: TestClient,
        report_factory: ReportFactory,
        category_factory: CategoryFactory,
        filter_factory: FilterFactory,
    ) -> None:
        report = report_factory()
        transaction_id = str(report.transactions[0].id)
        category_name = f"Manual Assignment {uuid.uuid4()}"
        filter_name = f"Target Filter {uuid.uuid4()}"
        category = category_factory(name=category_name)
        filter_ = filter_factory(
            category_id=category.id,
            name=filter_name,
            description="does-not-match-auto-generated-transaction",
        )

        response = client.put(
            f"/reports/{report.id}/transactions/{transaction_id}/assignment",
            json={"target_rule_filter_id": str(filter_.id)},
        )

        assert response.status_code == 200
        payload = response.json()

        category_payload = next(category for category in payload["categories"] if category["name"] == category_name)
        filter_payload = next(filter_ for filter_ in category_payload["filters"] if filter_["name"] == filter_name)

        assert len(filter_payload["transactions"]) == 1
        assert filter_payload["transactions"][0]["id"] == transaction_id
        assert float(filter_payload["amount"]) == 10.0
        assert all(tx["id"] != transaction_id for tx in payload["unidentified_transactions"])

    def test_sets_manual_assignment_for_report_manual_filter(
        self,
        client: TestClient,
        category_factory: CategoryFactory,
        report_factory: ReportFactory,
    ) -> None:
        report = report_factory()
        category = category_factory(name="Transfers")
        transaction_id = str(report.transactions[0].id)
        create_filter_response = client.post(
            f"/reports/{report.id}/manual-filters",
            json={"name": "Ambiguous transfer", "category_id": str(category.id)},
        )
        report_filter_id = create_filter_response.json()["id"]

        response = client.put(
            f"/reports/{report.id}/transactions/{transaction_id}/assignment",
            json={"target_report_filter_id": report_filter_id},
        )

        assert response.status_code == 200
        payload = response.json()
        category_payload = next(category for category in payload["categories"] if category["name"] == "Transfers")
        filter_payload = next(filter_ for filter_ in category_payload["filters"] if filter_["id"] == report_filter_id)

        assert len(filter_payload["transactions"]) == 1
        assert filter_payload["transactions"][0]["id"] == transaction_id
        assert filter_payload["is_manual"] is True
        assert filter_payload["rule_filter_id"] is None
        assert all(tx["id"] != transaction_id for tx in payload["unidentified_transactions"])

    def test_sets_manual_assignment_for_rule_filter_includes_filter_metadata(
        self,
        client: TestClient,
        report_factory: ReportFactory,
        category_factory: CategoryFactory,
        filter_factory: FilterFactory,
    ) -> None:
        report = report_factory()
        category_name = f"Rule Assignment {uuid.uuid4()}"
        filter_name = f"Rule Target {uuid.uuid4()}"
        category = category_factory(name=category_name)
        filter_ = filter_factory(
            category_id=category.id,
            name=filter_name,
            description="does-not-match-auto-generated-transaction",
        )
        transaction_id = str(report.transactions[0].id)

        response = client.put(
            f"/reports/{report.id}/transactions/{transaction_id}/assignment",
            json={"target_rule_filter_id": str(filter_.id)},
        )

        assert response.status_code == 200
        payload = response.json()
        category_payload = next(category for category in payload["categories"] if category["name"] == category_name)
        filter_payload = next(
            filter_payload
            for filter_payload in category_payload["filters"]
            if filter_payload["rule_filter_id"] == str(filter_.id)
        )

        assert len(filter_payload["transactions"]) == 1
        assert filter_payload["transactions"][0]["id"] == transaction_id
        assert filter_payload["is_manual"] is False
        assert filter_payload["rule_filter_id"] == str(filter_.id)

    def test_returns_404_when_report_manual_filter_not_found(
        self,
        client: TestClient,
        report_factory: ReportFactory,
    ) -> None:
        report = report_factory()
        transaction_id = report.transactions[0].id

        response = client.put(
            f"/reports/{report.id}/transactions/{transaction_id}/assignment",
            json={"target_report_filter_id": str(uuid.uuid4())},
        )

        assert response.status_code == 404
        assert response.json()["detail"] == "Report filter not found"


@pytest.mark.integration
class TestGenerateReportEndpoint:
    def test_returns_all_unidentified_when_no_rules(self, client: TestClient) -> None:
        report_id = _create_report(client)

        response = client.post(f"/reports/{report_id}/generate")

        assert response.status_code == 200
        payload = response.json()
        assert payload["categories"] == []
        assert len(payload["unidentified_transactions"]) == 2

    def test_matches_transaction_by_description_rule(
        self,
        client: TestClient,
        category_factory: CategoryFactory,
        filter_factory: FilterFactory,
    ) -> None:
        report_id = _create_report(client)
        category = category_factory(name="Groceries")
        filter_factory(category_id=category.id, name="Grocery store", position=1, description="Dummy grocery store")

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

    def test_persists_data_to_report(
        self,
        client: TestClient,
        category_factory: CategoryFactory,
        filter_factory: FilterFactory,
        report_fetcher: ReportFetcher,
    ) -> None:
        report_id = _create_report(client)
        category = category_factory(name="Transfers")
        filter_factory(
            category_id=category.id,
            name="Transfer filter",
            position=1,
            description="Dummy transfer description",
        )

        client.post(f"/reports/{report_id}/generate")

        report = report_fetcher(report_id=uuid.UUID(report_id))
        assert report.data is not None
        assert len(report.data["categories"]) == 1
        assert report.data["categories"][0]["name"] == "Transfers"
        assert len(report.data["categories"][0]["filters"][0]["transaction_ids"]) == 1

    def test_regeneration_replaces_previous_data(
        self,
        client: TestClient,
        category_factory: CategoryFactory,
        filter_factory: FilterFactory,
    ) -> None:
        report_id = _create_report(client)
        client.post(f"/reports/{report_id}/generate")

        category = category_factory(name="Groceries")
        filter_factory(category_id=category.id, name="Grocery store", position=1, description="Dummy grocery store")

        response = client.post(f"/reports/{report_id}/generate")

        assert response.status_code == 200
        payload = response.json()
        assert len(payload["categories"]) == 1
        assert payload["categories"][0]["name"] == "Groceries"
        assert len(payload["categories"][0]["filters"][0]["transactions"]) == 1

    def test_returns_404_for_nonexistent_report(self, client: TestClient) -> None:
        response = client.post(f"/reports/{uuid.uuid4()}/generate")

        assert response.status_code == 404
        assert response.json()["detail"] == "Report not found"

    def test_multiple_categories_with_multiple_filters_and_transactions(
        self,
        client: TestClient,
        category_factory: CategoryFactory,
        filter_factory: FilterFactory,
    ) -> None:
        report_id = _create_report(client, filename="report_multi_category.csv")

        food = category_factory(name="Food")
        filter_factory(category_id=food.id, name="Supermarkets", position=1, description="Supermarket A")
        filter_factory(category_id=food.id, name="Restaurants", position=2, description="Restaurant X")

        housing = category_factory(name="Housing")
        filter_factory(category_id=housing.id, name="Rent", position=1, description="Monthly rent")
        filter_factory(category_id=housing.id, name="Utilities", position=2, description="Electric bill")

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

    def test_get_report_returns_generated_data(
        self,
        client: TestClient,
        category_factory: CategoryFactory,
        filter_factory: FilterFactory,
    ) -> None:
        report_id = _create_report(client)
        category = category_factory(name="Groceries")
        filter_factory(category_id=category.id, name="Grocery store", position=1, description="Dummy grocery store")
        client.post(f"/reports/{report_id}/generate")

        response = client.get(f"/reports/{report_id}")

        assert response.status_code == 200
        payload = response.json()
        assert len(payload["categories"]) == 1
        assert payload["categories"][0]["name"] == "Groceries"
        assert len(payload["unidentified_transactions"]) == 1


@pytest.mark.integration
class TestDeleteReportEndpoint:
    def test_deletes_report_and_returns_204(self, client: TestClient) -> None:
        report_id = _create_report(client)

        delete_response = client.delete(f"/reports/{report_id}")

        assert delete_response.status_code == 204

        get_response = client.get(f"/reports/{report_id}")
        assert get_response.status_code == 404
        assert get_response.json()["detail"] == "Report not found"

    def test_returns_404_for_nonexistent_report(self, client: TestClient) -> None:
        response = client.delete(f"/reports/{uuid.uuid4()}")

        assert response.status_code == 404
        assert response.json()["detail"] == "Report not found"
