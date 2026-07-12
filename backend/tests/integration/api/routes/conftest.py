from typing import TYPE_CHECKING, Protocol

import pytest

from app.repositories.category_repository import create_category
from app.repositories.dtos import CreateFilterDto, CreateRuleDto, CreateRuleGroupDto, CreateTransactionDto
from app.repositories.filter_repository import create_filter
from app.repositories.plan_section_repository import create_plan_section
from app.repositories.report_repository import create_report, get_report

if TYPE_CHECKING:
    import uuid

    from sqlalchemy.orm import Session

    from app.db.models import Category, Filter, PlanSection, Report


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


class PlanSectionFactory(Protocol):
    def __call__(self, *, name: str = ..., is_income: bool = ...) -> PlanSection: ...


@pytest.fixture
def plan_section_factory(db: Session) -> PlanSectionFactory:
    def _create(*, name: str = "Home", is_income: bool = False) -> PlanSection:
        return create_plan_section(db=db, name=name, is_income=is_income)

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
            name=name,
            transactions=[
                CreateTransactionDto(
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
        )

    return _create
