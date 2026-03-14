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
    ReportManualFilterResponse,
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
    manual_filters = _extract_manual_filters(report=report)
    report_repository.reset_report(db=db, report=report)

    rule_categories = category_repository.get_categories(db=db)
    category_names_by_id = {str(category.id): category.name for category in rule_categories}
    transactions = list(report.transactions)
    overrides = list(report.overrides)

    data = _build_report_data(transactions=transactions, rule_categories=rule_categories)
    if len(manual_filters) > 0:
        _apply_manual_filters(
            categories=data["categories"],
            manual_filters=manual_filters,
            category_names_by_id=category_names_by_id,
        )
        data["manual_filters"] = manual_filters
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

        extracted_assignment: dict[str, str] = {}
        target_rule_filter_id = assignment.get("target_rule_filter_id")
        target_report_filter_id = assignment.get("target_report_filter_id")
        if isinstance(target_rule_filter_id, str):
            extracted_assignment["target_rule_filter_id"] = target_rule_filter_id
        if isinstance(target_report_filter_id, str):
            extracted_assignment["target_report_filter_id"] = target_report_filter_id
        if len(extracted_assignment) == 1:
            manual_assignments[transaction_id] = extracted_assignment

    return manual_assignments


def _extract_manual_filters(report: Report) -> list[dict[str, str | int]]:
    if not isinstance(report.data, dict):
        return []

    raw_manual_filters = report.data.get("manual_filters")
    if not isinstance(raw_manual_filters, list):
        return []

    manual_filters: list[dict[str, str | int]] = []
    for manual_filter in raw_manual_filters:
        if not isinstance(manual_filter, dict):
            continue

        filter_id = manual_filter.get("id")
        filter_name = manual_filter.get("name")
        category_id = manual_filter.get("category_id")
        position = manual_filter.get("position")
        if (
            isinstance(filter_id, str)
            and isinstance(filter_name, str)
            and isinstance(category_id, str)
            and isinstance(position, int)
        ):
            manual_filters.append(
                {
                    "id": filter_id,
                    "name": filter_name,
                    "category_id": category_id,
                    "position": position,
                },
            )

    return manual_filters


def _apply_manual_filters(
    categories: list[dict[str, Any]],
    manual_filters: list[dict[str, str | int]],
    category_names_by_id: dict[str, str],
) -> None:
    for manual_filter in manual_filters:
        category_id = str(manual_filter["category_id"])
        category_name = category_names_by_id.get(category_id)
        if category_name is None:
            continue
        target_category = next((category for category in categories if category["name"] == category_name), None)
        if target_category is None:
            target_category = {
                "id": str(uuid.uuid4()),
                "name": category_name,
                "filters": [],
            }
            categories.append(target_category)

        # Guard against malformed persisted data.
        raw_category_filters = target_category.get("filters")
        category_filters: list[dict[str, Any]]
        if isinstance(raw_category_filters, list):
            category_filters = [filter_ for filter_ in raw_category_filters if isinstance(filter_, dict)]
        else:
            category_filters = []
        target_category["filters"] = category_filters

        existing_filter = next(
            (filter_ for filter_ in category_filters if filter_["id"] == manual_filter["id"]),
            None,
        )
        if existing_filter is not None:
            continue

        category_filters.append(
            {
                "id": manual_filter["id"],
                "name": manual_filter["name"],
                "position": manual_filter["position"],
                "transaction_ids": [],
            },
        )


def _apply_manual_assignments(
    categories: list[dict[str, Any]],
    manual_assignments: dict[str, dict[str, str]],
    transactions: list[Transaction],
) -> None:
    report_transaction_ids = {str(transaction.id) for transaction in transactions}
    filters_by_rule_filter_id = _build_rule_filter_lookup(categories=categories)
    filters_by_report_filter_id = _build_report_filter_lookup(categories=categories)

    for transaction_id, assignment in manual_assignments.items():
        if transaction_id not in report_transaction_ids:
            continue

        target_rule_filter_id = assignment.get("target_rule_filter_id")
        target_report_filter_id = assignment.get("target_report_filter_id")
        target_filter = None
        if target_rule_filter_id is not None:
            target_filter = filters_by_rule_filter_id.get(target_rule_filter_id)
        elif target_report_filter_id is not None:
            target_filter = filters_by_report_filter_id.get(target_report_filter_id)
        if target_filter is None:
            continue

        for category in categories:
            for filter_ in category["filters"]:
                if transaction_id in filter_["transaction_ids"]:
                    filter_["transaction_ids"].remove(transaction_id)

        if transaction_id not in target_filter["transaction_ids"]:
            target_filter["transaction_ids"].append(transaction_id)


def _build_rule_filter_lookup(categories: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    filters_by_rule_filter_id: dict[str, dict[str, Any]] = {}
    for category in categories:
        for filter_ in category["filters"]:
            rule_filter_id = filter_.get("rule_filter_id")
            if isinstance(rule_filter_id, str):
                filters_by_rule_filter_id[rule_filter_id] = filter_

    return filters_by_rule_filter_id


def _build_report_filter_lookup(categories: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    filters_by_report_filter_id: dict[str, dict[str, Any]] = {}
    for category in categories:
        for filter_ in category["filters"]:
            report_filter_id = filter_.get("id")
            if isinstance(report_filter_id, str):
                filters_by_report_filter_id[report_filter_id] = filter_

    return filters_by_report_filter_id


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
    rule_filter_id: str | None = None
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
                    rule_filter_id=uuid.UUID(filter_.rule_filter_id) if filter_.rule_filter_id is not None else None,
                    is_manual=filter_.rule_filter_id is None,
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
                    rule_filter_id=filter_.id,
                    is_manual=False,
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


def create_report_manual_filter(
    db: Session,
    report_id: uuid.UUID,
    name: str,
    category_id: uuid.UUID,
    position: int | None,
) -> ReportManualFilterResponse:
    report = report_repository.get_report(db=db, report_id=report_id)
    category = category_repository.get_category(db=db, category_id=category_id)
    resolved_position = position
    if resolved_position is None:
        resolved_position = _get_next_manual_filter_position(category=category, report=report)

    manual_filter = report_repository.create_report_manual_filter(
        db=db,
        report=report,
        name=name,
        category_id=category.id,
        position=resolved_position,
    )
    return ReportManualFilterResponse(
        id=manual_filter.id,
        name=manual_filter.name,
        category_id=manual_filter.category_id,
        position=manual_filter.position,
    )


def _get_next_manual_filter_position(category: RuleCategory, report: Report) -> int:
    category_max_position = 0
    if len(category.filters) > 0:
        category_max_position = max(filter_.position for filter_ in category.filters)

    manual_filters = _extract_manual_filters(report=report)
    manual_category_positions = [
        int(manual_filter["position"])
        for manual_filter in manual_filters
        if manual_filter["category_id"] == str(category.id)
    ]
    if len(manual_category_positions) > 0:
        category_max_position = max([category_max_position, *manual_category_positions])

    return category_max_position + 1


def upsert_transaction_assignment(
    db: Session,
    report_id: uuid.UUID,
    transaction_id: uuid.UUID,
    target_rule_filter_id: uuid.UUID | None = None,
    target_report_filter_id: uuid.UUID | None = None,
) -> ReportDetailResponse:
    report = report_repository.get_report(db=db, report_id=report_id)
    report_repository.get_report_transaction(db=db, report_id=report_id, transaction_id=transaction_id)
    if target_rule_filter_id is not None:
        filter_repository.get_filter(db=db, filter_id=target_rule_filter_id)
    if target_report_filter_id is not None:
        report_repository.get_report_manual_filter(report=report, report_filter_id=target_report_filter_id)

    report_repository.save_manual_assignment(
        db=db,
        report=report,
        transaction_id=transaction_id,
        target_rule_filter_id=target_rule_filter_id,
        target_report_filter_id=target_report_filter_id,
    )

    updated_report = _generate_report(db=db, report_id=report.id)
    return build_report_full_response(updated_report)
