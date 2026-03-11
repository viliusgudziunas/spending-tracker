import uuid
from collections.abc import Sequence
from typing import TYPE_CHECKING, Any

from sqlalchemy.sql import select

from app.db.reports.models import Override, Report, Transaction
from app.repositories.dtos import CreateTransactionDto
from app.repositories.exceptions import ReportNotFoundError, TransactionNotFoundError

if TYPE_CHECKING:
    from sqlalchemy.orm import Session


def get_reports(db: Session) -> Sequence[Report]:
    return db.scalars(select(Report).order_by(Report.created_at.desc())).all()


def create_report(db: Session, name: str, transactions: list[CreateTransactionDto]) -> Report:
    report = Report(name=name)
    db.add(report)

    for tx_dto in transactions:
        transaction = Transaction(
            description=tx_dto.description,
            amount=tx_dto.amount,
            fee=tx_dto.fee,
            started_date=tx_dto.started_date,
            completed_date=tx_dto.completed_date,
            type=tx_dto.type,
            product=tx_dto.product,
            currency=tx_dto.currency,
            state=tx_dto.state,
            balance=tx_dto.balance,
            raw_data=tx_dto.raw_data,
            report=report,
        )
        db.add(transaction)

    db.commit()
    db.refresh(report)
    return report


def get_report(db: Session, report_id: uuid.UUID) -> Report:
    report = db.get(Report, report_id)

    if report is None:
        raise ReportNotFoundError

    return report


def get_report_transaction(db: Session, report_id: uuid.UUID, transaction_id: uuid.UUID) -> Transaction:
    transaction = db.scalar(
        select(Transaction).where(Transaction.id == transaction_id).where(Transaction.report_id == report_id),
    )

    if transaction is None:
        raise TransactionNotFoundError

    return transaction


def save_manual_assignment(
    db: Session,
    report: Report,
    transaction_id: uuid.UUID,
    target_rule_filter_id: uuid.UUID,
) -> None:
    report_data = dict(report.data) if isinstance(report.data, dict) else {}

    categories = report_data.get("categories")
    if not isinstance(categories, list):
        report_data["categories"] = []

    current_manual_assignments = report_data.get("manual_assignments")
    manual_assignments = dict(current_manual_assignments) if isinstance(current_manual_assignments, dict) else {}
    report_data["manual_assignments"] = manual_assignments

    manual_assignments[str(transaction_id)] = {"target_rule_filter_id": str(target_rule_filter_id)}

    report.data = report_data
    db.add(report)
    db.commit()


def reset_report(db: Session, report: Report) -> None:
    for category in report.categories:
        for filter_ in category.filters:
            for transaction in filter_.transactions:
                transaction.reset()
                db.add(transaction)
            db.delete(filter_)
        db.delete(category)
    report.data = None
    db.add(report)
    db.commit()


def save_report_data(db: Session, report: Report, data: dict[str, Any]) -> None:
    report.data = data
    db.add(report)
    db.commit()


def delete_override(db: Session, override: Override) -> None:
    db.delete(override)
    db.commit()
