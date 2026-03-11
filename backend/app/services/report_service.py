import uuid
from collections.abc import Sequence
from decimal import Decimal
from typing import TYPE_CHECKING, Any

from pydantic import BaseModel

from app.api.schemas.report_schemas import (
    ReportDetailCategoryResponse,
    ReportDetailFilterResponse,
    ReportDetailResponse,
    ReportDetailTransactionResponse,
    ReportDetailTransactionV1Response,
    ReportDetailTransactionV2Response,
)
from app.db.reports.models import (
    CURRENT_REPORT_SCHEMA_VERSION,
    CURRENT_TRANSACTION_SCHEMA_VERSION,
    Override,
    Report,
    Transaction,
)
from app.db.rules.models import Category as RuleCategory
from app.repositories import category_repository, filter_repository, report_repository
from app.repositories.dtos import CreateTransactionDto
from app.services import statement_service, transactions_service

if TYPE_CHECKING:
    from sqlalchemy.orm import Session


def list_reports(db: Session) -> Sequence[Report]:
    return report_repository.get_reports(db=db)


def create_report(db: Session, name: str, file_content: bytes) -> Report:
    statement = statement_service.parse_file_content(content=file_content)
    records = statement_service.parse_statement(statement=statement)

    transactions = [
        CreateTransactionDto(
            type=r["type"],
            product=r["product"],
            started_date=r["started_date"],
            completed_date=r["completed_date"],
            description=r["description"],
            amount=r["amount"],
            fee=r["fee"],
            currency=r["currency"],
            state=r["state"],
            balance=r["balance"],
            raw_data=r["raw_data"],
        )
        for r in records
    ]

    return report_repository.create_report(db=db, name=name, transactions=transactions)


def get_report_detail(db: Session, report_id: uuid.UUID) -> ReportDetailResponse:
    report = report_repository.get_report(db=db, report_id=report_id)
    return build_report_full_response(report)


def generate_report_detail(db: Session, report_id: uuid.UUID) -> ReportDetailResponse:
    report = _generate_report(db=db, report_id=report_id)
    return build_report_full_response(report)


def _generate_report(db: Session, report_id: uuid.UUID) -> Report:
    report = report_repository.get_report(db=db, report_id=report_id)
    manual_assignments = _extract_manual_assignments(report=report)
    report_repository.reset_report(db=db, report=report)

    rule_categories = category_repository.get_categories(db=db)
    transactions = list(report.transactions)
    overrides = list(report.overrides)

    data = _build_report_data(transactions=transactions, rule_categories=rule_categories)
    if len(manual_assignments) > 0:
        _apply_manual_assignments(
            categories=data["categories"],
            manual_assignments=manual_assignments,
            transactions=transactions,
        )
        data["manual_assignments"] = manual_assignments
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
                "rule_filter_id": str(rule_filter.id),
                "name": rule_filter.name,
                "position": rule_filter.position,
                "transaction_ids": [],
            }

            for group in rule_filter.rule_groups:
                matching = set(remaining)
                for rule in group.rules:
                    matching &= transactions_service.get_transactions_matching_rule(rule=rule, transactions=remaining)

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


def _extract_manual_assignments(report: Report) -> dict[str, dict[str, str]]:
    if not isinstance(report.data, dict):
        return {}

    raw_assignments = report.data.get("manual_assignments")
    if not isinstance(raw_assignments, dict):
        return {}

    manual_assignments: dict[str, dict[str, str]] = {}
    for transaction_id, assignment in raw_assignments.items():
        if not isinstance(transaction_id, str) or not isinstance(assignment, dict):
            continue

        target_rule_filter_id = assignment.get("target_rule_filter_id")
        if isinstance(target_rule_filter_id, str):
            manual_assignments[transaction_id] = {"target_rule_filter_id": target_rule_filter_id}

    return manual_assignments


def _apply_manual_assignments(
    categories: list[dict[str, Any]],
    manual_assignments: dict[str, dict[str, str]],
    transactions: list[Transaction],
) -> None:
    report_transaction_ids = {str(transaction.id) for transaction in transactions}
    filters_by_rule_filter_id = _build_filter_lookup(categories=categories)

    for transaction_id, assignment in manual_assignments.items():
        if transaction_id not in report_transaction_ids:
            continue

        target_rule_filter_id = assignment["target_rule_filter_id"]
        target_filter = filters_by_rule_filter_id.get(target_rule_filter_id)
        if target_filter is None:
            continue

        for category in categories:
            for filter_ in category["filters"]:
                if transaction_id in filter_["transaction_ids"]:
                    filter_["transaction_ids"].remove(transaction_id)

        if transaction_id not in target_filter["transaction_ids"]:
            target_filter["transaction_ids"].append(transaction_id)


def _build_filter_lookup(categories: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    filters_by_rule_filter_id: dict[str, dict[str, Any]] = {}
    for category in categories:
        for filter_ in category["filters"]:
            rule_filter_id = filter_.get("rule_filter_id")
            if isinstance(rule_filter_id, str):
                filters_by_rule_filter_id[rule_filter_id] = filter_

    return filters_by_rule_filter_id


class ReportData(BaseModel):
    categories: list[ReportDataCategory]


class ReportDataCategory(BaseModel):
    id: str
    name: str
    filters: list[ReportDataFilter]


class ReportDataFilter(BaseModel):
    id: str
    name: str
    position: int
    transaction_ids: list[str]


def _build_transaction_response(transaction: Transaction) -> ReportDetailTransactionResponse:
    base = {
        "id": transaction.id,
        "started_date": transaction.started_date,
        "completed_date": transaction.completed_date,
        "description": transaction.description,
        "amount": transaction.amount,
        "fee": transaction.fee,
        "source": transaction.source,
    }
    if transaction.schema_version >= CURRENT_TRANSACTION_SCHEMA_VERSION:
        return ReportDetailTransactionV2Response.model_validate(
            {
                **base,
                "type": transaction.type,
                "product": transaction.product,
                "currency": transaction.currency,
                "state": transaction.state,
                "balance": transaction.balance,
            },
        )
    return ReportDetailTransactionV1Response.model_validate(base)


def build_report_full_response(report: Report) -> ReportDetailResponse:
    tx_lookup: dict[str, Transaction] = {str(tx.id): tx for tx in report.transactions}
    if report.schema_version >= CURRENT_REPORT_SCHEMA_VERSION:
        categories, assigned_tx_ids = _build_categories_from_data(report=report, tx_lookup=tx_lookup)
    else:
        categories, assigned_tx_ids = _build_categories_from_legacy_links(report=report)

    unidentified = [_build_transaction_response(tx) for tx_id, tx in tx_lookup.items() if tx_id not in assigned_tx_ids]

    return ReportDetailResponse(
        id=report.id,
        name=report.name,
        schema_version=report.schema_version,
        categories=categories,
        unidentified_transactions=unidentified,
    )


def _build_categories_from_data(
    report: Report,
    tx_lookup: dict[str, Transaction],
) -> tuple[list[ReportDetailCategoryResponse], set[str]]:
    assigned_tx_ids: set[str] = set()
    categories: list[ReportDetailCategoryResponse] = []

    if report.data is None:
        return categories, assigned_tx_ids

    report_data = ReportData.model_validate(report.data)
    for category in report_data.categories:
        filters: list[ReportDetailFilterResponse] = []

        for filter_ in category.filters:
            filter_txs = [tx_lookup[tid] for tid in filter_.transaction_ids if tid in tx_lookup]
            assigned_tx_ids.update(str(tx.id) for tx in filter_txs)

            amount = sum((Decimal(str(tx.amount)) for tx in filter_txs), Decimal(0))

            filters.append(
                ReportDetailFilterResponse(
                    id=uuid.UUID(filter_.id),
                    name=filter_.name,
                    position=filter_.position,
                    amount=amount,
                    transactions=[_build_transaction_response(tx) for tx in filter_txs],
                ),
            )

        categories.append(
            ReportDetailCategoryResponse(
                id=uuid.UUID(category.id),
                name=category.name,
                filters=filters,
            ),
        )

    return categories, assigned_tx_ids


def _build_categories_from_legacy_links(report: Report) -> tuple[list[ReportDetailCategoryResponse], set[str]]:
    assigned_tx_ids: set[str] = set()
    categories: list[ReportDetailCategoryResponse] = []

    for category in report.categories:
        filters: list[ReportDetailFilterResponse] = []

        for filter_ in category.filters:
            filter_txs = list(filter_.transactions)
            assigned_tx_ids.update(str(tx.id) for tx in filter_txs)

            amount = sum((Decimal(str(tx.amount)) for tx in filter_txs), Decimal(0))

            filters.append(
                ReportDetailFilterResponse(
                    id=filter_.id,
                    name=filter_.name,
                    position=filter_.position,
                    amount=amount,
                    transactions=[_build_transaction_response(tx) for tx in filter_txs],
                ),
            )

        categories.append(
            ReportDetailCategoryResponse(
                id=category.id,
                name=category.name,
                filters=filters,
            ),
        )

    return categories, assigned_tx_ids


def upsert_transaction_assignment(
    db: Session,
    report_id: uuid.UUID,
    transaction_id: uuid.UUID,
    target_rule_filter_id: uuid.UUID,
) -> ReportDetailResponse:
    report = report_repository.get_report(db=db, report_id=report_id)
    report_repository.get_report_transaction(db=db, report_id=report_id, transaction_id=transaction_id)
    filter_repository.get_filter(db=db, filter_id=target_rule_filter_id)

    report_repository.save_manual_assignment(
        db=db,
        report=report,
        transaction_id=transaction_id,
        target_rule_filter_id=target_rule_filter_id,
    )

    updated_report = _generate_report(db=db, report_id=report.id)
    return build_report_full_response(updated_report)
