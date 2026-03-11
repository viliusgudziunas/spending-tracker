import uuid
from typing import TYPE_CHECKING, Protocol

import pytest

from app.db.reports.models import Report
from app.db.reports.repository import CreateReportDto, CreateReportTransactionDto, create_report
from app.db.rules.models import Category, Filter
from app.repositories.category_repository import create_category
from app.repositories.dtos import CreateFilterDto, CreateRuleDto, CreateRuleGroupDto
from app.repositories.filter_repository import create_filter
from app.repositories.report_repository import get_report

if TYPE_CHECKING:
    from sqlalchemy.orm import Session


class CategoryFactory(Protocol):
    def __call__(self, name: str = ...) -> Category: ...


@pytest.fixture
def category_factory(db: Session) -> CategoryFactory:
    def _create(name: str = "Groceries") -> Category:
        return create_category(db=db, name=name)

    return _create


class FilterFactory(Protocol):
    def __call__(
        self,
        category_id: uuid.UUID,
        name: str = ...,
        description: str = ...,
        position: int | None = ...,
    ) -> Filter: ...


@pytest.fixture
def filter_factory(db: Session) -> FilterFactory:
    def _create(
        category_id: uuid.UUID,
        name: str = "Default Filter",
        description: str = "default",
        position: int | None = None,
    ) -> Filter:
        return create_filter(
            db=db,
            filter_dto=CreateFilterDto(
                name=name,
                position=position,
                category_id=category_id,
                rule_groups=[
                    CreateRuleGroupDto(
                        operator="AND",
                        rules=[CreateRuleDto(type="DESCRIPTION", operator="EQUAL", value=description)],
                    ),
                ],
            ),
        )

    return _create


class ReportFetcher(Protocol):
    def __call__(self, report_id: uuid.UUID) -> Report: ...


@pytest.fixture
def report_fetcher(db: Session) -> ReportFetcher:
    def _fetch(report_id: uuid.UUID) -> Report:
        return get_report(db=db, report_id=report_id)

    return _fetch


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
