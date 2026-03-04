import uuid
from pathlib import Path
from typing import TYPE_CHECKING

import pytest

from app.db.reports.repository import get_report

if TYPE_CHECKING:
    from fastapi.testclient import TestClient
    from sqlalchemy.orm import Session


def _csv_bytes() -> bytes:
    fixture_path = Path(__file__).parent / "fixtures" / "report_upload.csv"
    return fixture_path.read_bytes()


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
