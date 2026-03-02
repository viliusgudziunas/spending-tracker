import uuid
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db.reports.repository import get_report


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

        assert descriptions == {"Coffee", "Savings"}
        assert amounts == {4.5, 100.0}
