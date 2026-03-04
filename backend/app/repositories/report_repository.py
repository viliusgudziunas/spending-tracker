from typing import TYPE_CHECKING, Any

from app.db.reports.models import Override, Report

if TYPE_CHECKING:
    from sqlalchemy.orm import Session


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
