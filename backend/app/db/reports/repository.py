import uuid
from typing import TYPE_CHECKING, TypedDict

from pydantic import BaseModel
from sqlalchemy import update

from app.db.reports.models import Filter, Override, Report, Transaction, TransactionSource

if TYPE_CHECKING:
    from sqlalchemy.orm import Session


class CreateReportTransactionDto(BaseModel):
    description: str
    amount: float
    fee: float
    started_date: str
    completed_date: str
    type: str | None = None
    product: str | None = None
    currency: str | None = None
    state: str | None = None
    balance: float | None = None
    raw_data: dict | None = None


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
            type=transaction_dto.type,
            product=transaction_dto.product,
            currency=transaction_dto.currency,
            state=transaction_dto.state,
            balance=transaction_dto.balance,
            raw_data=transaction_dto.raw_data,
            report=report,
        )
        db.add(transaction)

    db.commit()
    db.refresh(report)

    return report


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
