from typing import TYPE_CHECKING, Protocol

import pytest

from app.db.reports.models import Report
from app.db.reports.repository import CreateReportDto, CreateReportTransactionDto, create_report
from app.db.rules.models import Category
from app.repositories.category_repository import create_category

if TYPE_CHECKING:
    from sqlalchemy.orm import Session


class CategoryFactory(Protocol):
    def __call__(self, name: str = ...) -> Category: ...


@pytest.fixture
def category_factory(db: Session) -> CategoryFactory:
    def _create(name: str = "Groceries") -> Category:
        return create_category(db=db, name=name)

    return _create


class ReportFactory(Protocol):
    def __call__(self, name: str = ...) -> Report: ...


@pytest.fixture
def report_factory(db: Session) -> ReportFactory:
    def _create(name: str = "January 2025") -> Report:
        return create_report(
            db=db,
            report_dto=CreateReportDto(
                name=name,
                transactions=[
                    CreateReportTransactionDto(
                        description="Sample transaction",
                        amount=10.0,
                        fee=0.0,
                        started_date="2025-01-01 10:00:00",
                        completed_date="2025-01-01 10:00:00",
                        type="Card Payment",
                        product="Current",
                        currency="EUR",
                        state="COMPLETED",
                        balance=100.0,
                        raw_data={"Description": "Sample transaction"},
                    ),
                ],
            ),
        )

    return _create
