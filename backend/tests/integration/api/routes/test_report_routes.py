from typing import TYPE_CHECKING

import pytest

if TYPE_CHECKING:
    from fastapi.testclient import TestClient

    from tests.integration.api.routes.conftest import ReportFactory


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
