import uuid
from collections.abc import Sequence
from typing import TYPE_CHECKING, Any

from sqlalchemy.sql import select

from app.db.reports.models import Override, Report
from app.repositories.exceptions import ReportNotFoundError

if TYPE_CHECKING:
    from sqlalchemy.orm import Session


def get_reports(db: Session) -> Sequence[Report]:
    return db.scalars(select(Report).order_by(Report.created_at.desc())).all()


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
