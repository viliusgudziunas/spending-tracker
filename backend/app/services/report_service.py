import uuid
from collections.abc import Sequence
from decimal import Decimal
from typing import TYPE_CHECKING, Any, Final

from app.db.reports.models import Override, Report, Transaction
from app.db.reports.repository import get_report
from app.db.rules.models import Category as RuleCategory
from app.db.rules.repository import get_categories
from app.repositories import report_repository
from app.transactions_service import get_transactions_matching_rule

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

EXTENDED_TRANSACTION_SCHEMA_VERSION: Final[int] = 2


def generate_report(db: Session, report_id: uuid.UUID) -> Report:
    report = get_report(db=db, report_id=report_id)
    report_repository.reset_report(db=db, report=report)

    rule_categories = get_categories(db=db)
    transactions = list(report.transactions)
    overrides = list(report.overrides)

    data = _build_report_data(transactions=transactions, rule_categories=rule_categories)
    _apply_overrides(categories=data["categories"], overrides=overrides, db=db)

    report_repository.save_report_data(db=db, report=report, data=data)
    return report


def _build_report_data(
    transactions: list[Transaction],
    rule_categories: Sequence[RuleCategory],
) -> dict[str, Any]:
    remaining = list(transactions)
    categories: list[dict[str, Any]] = []

    for rule_category in rule_categories:
        category_data: dict[str, Any] = {
            "id": str(uuid.uuid4()),
            "name": rule_category.name,
            "filters": [],
        }

        for rule_filter in rule_category.filters:
            filter_data: dict[str, Any] = {
                "id": str(uuid.uuid4()),
                "name": rule_filter.name,
                "position": rule_filter.position,
                "transaction_ids": [],
            }

            for group in rule_filter.rule_groups:
                matching = set(remaining)
                for rule in group.rules:
                    matching &= get_transactions_matching_rule(rule=rule, transactions=remaining)

                for tx in matching:
                    remaining.remove(tx)
                    filter_data["transaction_ids"].append(str(tx.id))

            category_data["filters"].append(filter_data)
        categories.append(category_data)

    return {"categories": categories}


def _apply_overrides(
    categories: list[dict[str, Any]],
    overrides: list[Override],
    db: Session,
) -> None:
    for override in overrides:
        target = _find_override_filter(categories=categories, override=override)
        if target is None:
            report_repository.delete_override(db=db, override=override)
            continue

        tx_id = str(override.transaction_id)
        for cat in categories:
            for f in cat["filters"]:
                if tx_id in f["transaction_ids"]:
                    f["transaction_ids"].remove(tx_id)

        if tx_id not in target["transaction_ids"]:
            target["transaction_ids"].append(tx_id)


def _find_override_filter(
    categories: list[dict[str, Any]],
    override: Override,
) -> dict[str, Any] | None:
    for cat in categories:
        if cat["name"] == override.category_name:
            for f in cat["filters"]:
                if f["name"] == override.filter_name:
                    return f
    return None


def _build_transaction_dict(transaction: Transaction) -> dict[str, Any]:
    data: dict[str, Any] = {
        "schema_version": transaction.schema_version,
        "id": str(transaction.id),
        "started_date": transaction.started_date,
        "completed_date": transaction.completed_date,
        "description": transaction.description,
        "amount": transaction.amount,
        "fee": transaction.fee,
        "source": transaction.source,
    }
    if transaction.schema_version >= EXTENDED_TRANSACTION_SCHEMA_VERSION:
        data.update(
            type=transaction.type,
            product=transaction.product,
            currency=transaction.currency,
            state=transaction.state,
            balance=transaction.balance,
            raw_data=transaction.raw_data,
        )
    return data


def build_report_full_dict(report: Report) -> dict[str, Any]:
    tx_lookup: dict[str, Transaction] = {str(tx.id): tx for tx in report.transactions}
    assigned_tx_ids: set[str] = set()
    categories: list[dict[str, Any]] = []

    if report.data is not None:
        for cat_data in report.data.get("categories", []):
            filters: list[dict[str, Any]] = []

            for f_data in cat_data.get("filters", []):
                tx_ids: list[str] = f_data.get("transaction_ids", [])
                filter_txs = [tx_lookup[tid] for tid in tx_ids if tid in tx_lookup]
                assigned_tx_ids.update(tx_ids)

                amount = sum((Decimal(str(tx.amount)) for tx in filter_txs), Decimal(0))

                filters.append(
                    {
                        "id": f_data["id"],
                        "name": f_data["name"],
                        "position": f_data["position"],
                        "amount": amount,
                        "transactions": [_build_transaction_dict(tx) for tx in filter_txs],
                    },
                )

            categories.append(
                {
                    "id": cat_data["id"],
                    "name": cat_data["name"],
                    "filters": filters,
                },
            )

    unidentified = [_build_transaction_dict(tx) for tx_id, tx in tx_lookup.items() if tx_id not in assigned_tx_ids]

    return {
        "id": str(report.id),
        "name": report.name,
        "schema_version": report.schema_version,
        "categories": categories,
        "unidentified_transactions": unidentified,
    }
