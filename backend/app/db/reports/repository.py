import uuid
from collections.abc import Iterable, Sequence
from typing import TypedDict

from pydantic import BaseModel
from sqlalchemy import update
from sqlalchemy.orm import Session
from sqlalchemy.sql import select

from app.db.reports.models import Category, Filter, Override, Report, Transaction, TransactionSource
from app.db.rules.models import Category as RuleCategory
from app.transactions_service import get_transactions_matching_rule


class CreateReportTransactionDto(BaseModel):
    description: str
    amount: float
    fee: float
    started_date: str
    completed_date: str


class CreateReportDto(BaseModel):
    name: str
    transactions: list[CreateReportTransactionDto]


def create_report(db: Session, report_dto: CreateReportDto) -> Report:
    report = Report(name=report_dto.name)
    db.add(report)

    for transaction_dto in report_dto.transactions:
        transaction = Transaction(
            description=transaction_dto.description,
            amount=transaction_dto.amount,
            fee=transaction_dto.fee,
            started_date=transaction_dto.started_date,
            completed_date=transaction_dto.completed_date,
            report=report,
        )
        db.add(transaction)

    db.commit()
    db.refresh(report)

    return report


def get_reports(db: Session) -> Sequence[Report]:
    return db.scalars(select(Report).order_by(Report.created_at.desc())).all()


class ReportNotFoundError(Exception):
    pass


def get_report(db: Session, report_id: uuid.UUID) -> Report:
    report = db.get(Report, report_id)

    if report is None:
        raise ReportNotFoundError

    return report


def reset_report(db: Session, report: Report) -> None:
    for category in report.categories:
        for filter_ in category.filters:
            for transaction in filter_.transactions:
                transaction.reset()
                db.add(transaction)

            db.delete(filter_)
        db.delete(category)
    db.commit()


class GenerateReportDto(TypedDict):
    report: Report
    rule_categories: Iterable[RuleCategory]


def generate_report(db: Session, generate_report_dto: GenerateReportDto) -> None:
    transactions = list(generate_report_dto["report"].transactions)

    for rule_category in generate_report_dto["rule_categories"]:
        report_category = Category(name=rule_category.name, report=generate_report_dto["report"])

        for rule_filter in rule_category.filters:
            report_filter = Filter(name=rule_filter.name, category=report_category, position=rule_filter.position)

            for group in rule_filter.rule_groups:
                matching_group = set(transactions)

                for rule in group.rules:
                    matching_rule = get_transactions_matching_rule(rule=rule, transactions=transactions)
                    matching_group = matching_group & matching_rule

                for transaction in matching_group:
                    transactions.remove(transaction)
                    report_filter.transactions.append(transaction)

            db.add(report_filter)
        db.add(report_category)
    db.commit()


def apply_overrides(db: Session, report: Report) -> None:
    for override in report.overrides:
        try:
            filter_ = find_override_filter(db=db, override=override)
        except FilterNotFoundError:
            db.delete(override)
            db.commit()
            continue

        link_transaction_to_filter(
            db=db,
            link_dto=LinkTransactionToFilterDto(
                filter_id=filter_.id,
                transaction_id=override.transaction_id,
            ),
        )


class LinkTransactionToFilterDto(TypedDict):
    filter_id: uuid.UUID
    transaction_id: uuid.UUID


def link_transaction_to_filter(db: Session, link_dto: LinkTransactionToFilterDto) -> None:
    statement = (
        update(Transaction)
        .where(Transaction.id == link_dto["transaction_id"])
        .values(filter_id=link_dto["filter_id"], source=TransactionSource.override)
    )

    db.execute(statement)
    db.commit()


class FilterNotFoundError(Exception):
    pass


def get_filter(db: Session, filter_id: uuid.UUID) -> Filter:
    filter_ = db.get(Filter, filter_id)

    if filter_ is None:
        raise FilterNotFoundError

    return filter_


def find_override_filter(db: Session, override: Override) -> Filter:
    statement = (
        select(Filter)
        .join(Filter.category)
        .join(Category.report)
        .where(Report.id == override.report_id)
        .where(Category.name == override.category_name)
        .where(Filter.name == override.filter_name)
    )

    filter_ = db.scalar(statement)
    if filter_ is None:
        raise FilterNotFoundError

    return filter_


class CreateOverrideDto(BaseModel):
    category_name: str
    filter_name: str
    transaction_id: uuid.UUID
    report_id: uuid.UUID


def create_override(db: Session, override_dto: CreateOverrideDto) -> Override:
    override = Override(
        category_name=override_dto.category_name,
        filter_name=override_dto.filter_name,
        transaction_id=override_dto.transaction_id,
        report_id=override_dto.report_id,
    )

    db.add(override)
    db.commit()

    return override


class TransactionNotFoundError(Exception):
    pass


def get_transaction(db: Session, transaction_id: uuid.UUID) -> Transaction:
    transaction = db.get(Transaction, transaction_id)

    if transaction is None:
        raise TransactionNotFoundError

    return transaction


def delete_override(db: Session, transaction: Transaction) -> None:
    transaction.reset()
    db.add(transaction)
    db.delete(transaction.override)

    db.commit()
