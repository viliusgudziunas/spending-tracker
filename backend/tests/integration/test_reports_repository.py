import uuid
from typing import TYPE_CHECKING

import pytest

from app.db.reports.repository import (
    CreateReportDto,
    CreateReportTransactionDto,
    create_report,
    get_reports,
)
from app.repositories.exceptions import ReportNotFoundError
from app.repositories.report_repository import get_report

if TYPE_CHECKING:
    from sqlalchemy.orm import Session


def _sample_transaction_dto() -> CreateReportTransactionDto:
    return CreateReportTransactionDto(
        description="Coffee",
        amount=4.50,
        fee=0.0,
        started_date="2025-01-01 10:00:00",
        completed_date="2025-01-01 10:00:00",
    )


@pytest.mark.integration
class TestCreateReport:
    def test_creates_report_with_name(self, db: Session) -> None:
        dto = CreateReportDto(name="January 2025", transactions=[_sample_transaction_dto()])

        report = create_report(db, dto)

        assert report.name == "January 2025"
        assert report.id is not None

    def test_creates_report_with_transactions(self, db: Session) -> None:
        dto = CreateReportDto(
            name="January 2025",
            transactions=[
                _sample_transaction_dto(),
                CreateReportTransactionDto(
                    description="Groceries",
                    amount=25.0,
                    fee=0.0,
                    started_date="2025-01-02 12:00:00",
                    completed_date="2025-01-02 12:00:00",
                ),
            ],
        )

        report = create_report(db, dto)

        assert len(report.transactions) == 2


@pytest.mark.integration
class TestGetReports:
    def test_returns_empty_when_no_reports(self, db: Session) -> None:
        reports = get_reports(db)

        assert len(reports) == 0

    def test_returns_created_reports(self, db: Session) -> None:
        dto = CreateReportDto(name="Report 1", transactions=[_sample_transaction_dto()])
        create_report(db, dto)

        reports = get_reports(db)

        assert len(reports) == 1
        assert reports[0].name == "Report 1"


@pytest.mark.integration
class TestGetReport:
    def test_returns_report_by_id(self, db: Session) -> None:
        dto = CreateReportDto(name="My Report", transactions=[_sample_transaction_dto()])
        created = create_report(db, dto)

        report = get_report(db, created.id)

        assert report.id == created.id
        assert report.name == "My Report"

    def test_raises_when_not_found(self, db: Session) -> None:
        with pytest.raises(ReportNotFoundError):
            get_report(db, uuid.uuid4())
