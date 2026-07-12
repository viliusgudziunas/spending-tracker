import uuid
from typing import TYPE_CHECKING, Any, TypedDict

from pydantic import BaseModel, ValidationError
from sqlalchemy.sql import select

from app.db.models import Report, Transaction
from app.repositories.exceptions import (
    ReportManualAssignmentNotFoundError,
    ReportManualFilterNotFoundError,
    ReportNotFoundError,
    TransactionNotFoundError,
)

if TYPE_CHECKING:
    from collections.abc import Sequence

    from sqlalchemy.orm import Session

    from app.repositories.dtos import CreateTransactionDto


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


def update_report(db: Session, report_id: uuid.UUID, name: str) -> Report:
    report = get_report(db=db, report_id=report_id)
    report.name = name
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


def get_report(db: Session, report_id: uuid.UUID) -> Report:
    report = db.get(Report, report_id)

    if report is None:
        raise ReportNotFoundError

    return report


def delete_report(db: Session, report_id: uuid.UUID) -> None:
    report = get_report(db=db, report_id=report_id)
    db.delete(report)
    db.commit()


def get_report_transaction(db: Session, report_id: uuid.UUID, transaction_id: uuid.UUID) -> Transaction:
    transaction = db.scalar(
        select(Transaction).where(Transaction.id == transaction_id).where(Transaction.report_id == report_id),
    )

    if transaction is None:
        raise TransactionNotFoundError

    return transaction


class ManualAssignmentData(TypedDict, total=False):
    target_rule_filter_id: str
    target_report_filter_id: str


def save_manual_assignment(
    db: Session,
    report: Report,
    transaction_id: uuid.UUID,
    target_rule_filter_id: uuid.UUID | None = None,
    target_report_filter_id: uuid.UUID | None = None,
) -> None:
    report_data = dict(report.data) if isinstance(report.data, dict) else {}

    categories = report_data.get("categories")
    if not isinstance(categories, list):
        report_data["categories"] = []

    current_manual_assignments = report_data.get("manual_assignments")
    manual_assignments = dict(current_manual_assignments) if isinstance(current_manual_assignments, dict) else {}
    report_data["manual_assignments"] = manual_assignments

    assignment: ManualAssignmentData = {}
    if target_rule_filter_id is not None:
        assignment["target_rule_filter_id"] = str(target_rule_filter_id)
    if target_report_filter_id is not None:
        assignment["target_report_filter_id"] = str(target_report_filter_id)

    manual_assignments[str(transaction_id)] = assignment

    report.data = report_data
    db.add(report)
    db.commit()


def delete_manual_assignment(
    db: Session,
    report: Report,
    transaction_id: uuid.UUID,
) -> ManualAssignmentData:
    if not isinstance(report.data, dict):
        raise ReportManualAssignmentNotFoundError

    report_data = dict(report.data)
    current_manual_assignments = report_data.get("manual_assignments")
    if not isinstance(current_manual_assignments, dict):
        raise ReportManualAssignmentNotFoundError

    manual_assignments = dict(current_manual_assignments)
    removed_assignment_raw = manual_assignments.pop(str(transaction_id), None)
    if removed_assignment_raw is None:
        raise ReportManualAssignmentNotFoundError

    if len(manual_assignments) > 0:
        report_data["manual_assignments"] = manual_assignments
    else:
        report_data.pop("manual_assignments", None)

    report.data = report_data
    db.add(report)
    db.commit()

    removed_assignment: ManualAssignmentData = {}
    if isinstance(removed_assignment_raw, dict):
        target_rule_filter_id = removed_assignment_raw.get("target_rule_filter_id")
        target_report_filter_id = removed_assignment_raw.get("target_report_filter_id")
        if isinstance(target_rule_filter_id, str):
            removed_assignment["target_rule_filter_id"] = target_rule_filter_id
        if isinstance(target_report_filter_id, str):
            removed_assignment["target_report_filter_id"] = target_report_filter_id
    return removed_assignment


def delete_report_manual_filter_if_unused(
    db: Session,
    report: Report,
    report_filter_id: uuid.UUID,
) -> None:
    if not isinstance(report.data, dict):
        return

    report_data = dict(report.data)
    current_manual_filters = report_data.get("manual_filters")
    if not isinstance(current_manual_filters, list):
        return

    report_filter_id_str = str(report_filter_id)
    current_manual_assignments = report_data.get("manual_assignments")
    manual_assignments = current_manual_assignments if isinstance(current_manual_assignments, dict) else {}
    for assignment in manual_assignments.values():
        if not isinstance(assignment, dict):
            continue
        if assignment.get("target_report_filter_id") == report_filter_id_str:
            return

    manual_filters = list(current_manual_filters)
    filtered_manual_filters = [
        manual_filter
        for manual_filter in manual_filters
        if not (isinstance(manual_filter, dict) and manual_filter.get("id") == report_filter_id_str)
    ]
    if len(filtered_manual_filters) == len(manual_filters):
        return

    if len(filtered_manual_filters) > 0:
        report_data["manual_filters"] = filtered_manual_filters
    else:
        report_data.pop("manual_filters", None)

    report.data = report_data
    db.add(report)
    db.commit()


class ReportManualFilterData(BaseModel):
    id: uuid.UUID
    name: str
    category_id: uuid.UUID
    position: int


def create_report_manual_filter(
    db: Session,
    report: Report,
    name: str,
    category_id: uuid.UUID,
    position: int,
) -> ReportManualFilterData:
    report_data = dict(report.data) if isinstance(report.data, dict) else {}
    categories = report_data.get("categories")
    if not isinstance(categories, list):
        report_data["categories"] = []

    current_manual_filters = report_data.get("manual_filters")
    manual_filters = list(current_manual_filters) if isinstance(current_manual_filters, list) else []

    manual_filter = ReportManualFilterData(
        id=uuid.uuid4(),
        name=name,
        category_id=category_id,
        position=position,
    )
    manual_filters.append(manual_filter.model_dump(mode="json"))
    report_data["manual_filters"] = manual_filters

    report.data = report_data
    db.add(report)
    db.commit()
    return manual_filter


def get_report_manual_filter(report: Report, report_filter_id: uuid.UUID) -> ReportManualFilterData:
    if not isinstance(report.data, dict):
        raise ReportManualFilterNotFoundError

    current_manual_filters = report.data.get("manual_filters")
    if not isinstance(current_manual_filters, list):
        raise ReportManualFilterNotFoundError

    for manual_filter in current_manual_filters:
        if not isinstance(manual_filter, dict):
            continue
        try:
            parsed_manual_filter = ReportManualFilterData.model_validate(manual_filter)
        except ValidationError:
            continue
        if parsed_manual_filter.id == report_filter_id:
            return parsed_manual_filter

    raise ReportManualFilterNotFoundError


def reset_report(db: Session, report: Report) -> None:
    report.data = None
    db.add(report)
    db.commit()


def save_report_data(db: Session, report: Report, data: dict[str, Any]) -> None:
    report.data = data
    db.add(report)
    db.commit()
