import uuid
from dataclasses import dataclass, field
from decimal import Decimal
from typing import TYPE_CHECKING

from app.api.schemas.breakdown_schemas import (
    BreakdownCategoryResponse,
    BreakdownFilterResponse,
    BreakdownResponse,
    BreakdownUnidentifiedResponse,
)
from app.repositories import category_repository, filter_repository, report_repository
from app.services import report_service

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

    from app.api.schemas.report_schemas import ReportDetailCategoryResponse, ReportDetailFilterResponse
    from app.db.models import Category, Filter, Report

_AMOUNT_QUANTUM = Decimal("0.01")
_GHOST_CATEGORY_NAMESPACE = uuid.UUID("2f1c8a7e-4d3b-5a19-8c26-9e0f1b2a3d4e")


@dataclass
class _FilterAccumulator:
    key: str
    name: str
    position: int
    amounts: dict[str, Decimal]


@dataclass
class _CategoryAccumulator:
    id: uuid.UUID
    name: str
    position: int
    filters: dict[str, _FilterAccumulator] = field(default_factory=dict)


@dataclass(frozen=True)
class _LiveTaxonomy:
    filters: dict[uuid.UUID, Filter]
    filters_by_name: dict[str, Filter]
    categories: dict[uuid.UUID, Category]
    categories_by_name: dict[str, Category]


@dataclass(frozen=True)
class _FilterPlacement:
    category_id: uuid.UUID
    category_name: str
    category_position: int
    filter_key: str
    filter_name: str
    filter_position: int


def get_breakdown(db: Session) -> BreakdownResponse:
    reports = report_repository.get_generated_monthly_reports(db=db)
    months = [report.month for report in reports if report.month is not None]
    live_categories = {category.id: category for category in category_repository.get_categories(db=db)}
    live_filters = filter_repository.get_filters(db=db)
    live = _LiveTaxonomy(
        filters={filter_.id: filter_ for filter_ in live_filters},
        filters_by_name={filter_.name: filter_ for filter_ in live_filters},
        categories=live_categories,
        categories_by_name={category.name: category for category in live_categories.values()},
    )

    categories: dict[uuid.UUID, _CategoryAccumulator] = {}
    unidentified = {month: Decimal(0) for month in months}

    for report in reports:
        month = report.month
        if month is None:
            continue
        detail = report_service.build_report_full_response(report)
        unidentified[month] = sum(
            (Decimal(str(transaction.amount)) for transaction in detail.unidentified_transactions),
            Decimal(0),
        )
        manuals_by_id = _manual_filters_by_id(report)
        for snapshot_category in detail.categories:
            for snapshot_filter in snapshot_category.filters:
                placement = _place_filter(
                    snapshot_category=snapshot_category,
                    snapshot_filter=snapshot_filter,
                    manuals_by_id=manuals_by_id,
                    live=live,
                )
                category = categories.get(placement.category_id)
                if category is None:
                    category = _CategoryAccumulator(
                        id=placement.category_id,
                        name=placement.category_name,
                        position=placement.category_position,
                    )
                    categories[placement.category_id] = category
                else:
                    category.name = placement.category_name
                    category.position = placement.category_position

                filter_row = category.filters.get(placement.filter_key)
                if filter_row is None:
                    filter_row = _FilterAccumulator(
                        key=placement.filter_key,
                        name=placement.filter_name,
                        position=placement.filter_position,
                        amounts={existing_month: Decimal(0) for existing_month in months},
                    )
                    category.filters[placement.filter_key] = filter_row
                else:
                    filter_row.name = placement.filter_name
                    filter_row.position = placement.filter_position
                filter_row.amounts[month] = snapshot_filter.amount

    return BreakdownResponse(
        months=months,
        categories=_emit_categories(categories=categories, months=months, live_category_ids=set(live.categories)),
        unidentified=BreakdownUnidentifiedResponse(amounts=_quantized_amounts(unidentified, months)),
    )


def _manual_filters_by_id(report: Report) -> dict[uuid.UUID, tuple[uuid.UUID, str, int]]:
    if not isinstance(report.data, dict):
        return {}
    raw_manual_filters = report.data.get("manual_filters")
    if not isinstance(raw_manual_filters, list):
        return {}

    manuals: dict[uuid.UUID, tuple[uuid.UUID, str, int]] = {}
    for manual_filter in raw_manual_filters:
        if not isinstance(manual_filter, dict):
            continue
        name = manual_filter.get("name")
        position = manual_filter.get("position")
        if not isinstance(name, str) or not isinstance(position, int):
            continue
        try:
            filter_id = uuid.UUID(str(manual_filter.get("id")))
            category_id = uuid.UUID(str(manual_filter.get("category_id")))
        except ValueError, TypeError:
            continue
        manuals[filter_id] = (category_id, name, position)
    return manuals


def _place_filter(
    snapshot_category: ReportDetailCategoryResponse,
    snapshot_filter: ReportDetailFilterResponse,
    manuals_by_id: dict[uuid.UUID, tuple[uuid.UUID, str, int]],
    live: _LiveTaxonomy,
) -> _FilterPlacement:
    if snapshot_filter.rule_filter_id is not None:
        return _place_rule_filter(
            snapshot_category=snapshot_category,
            snapshot_filter=snapshot_filter,
            live=live,
        )
    return _place_manual_filter(
        snapshot_category=snapshot_category,
        snapshot_filter=snapshot_filter,
        manuals_by_id=manuals_by_id,
        live=live,
    )


def _place_rule_filter(
    snapshot_category: ReportDetailCategoryResponse,
    snapshot_filter: ReportDetailFilterResponse,
    live: _LiveTaxonomy,
) -> _FilterPlacement:
    rule_filter_id = snapshot_filter.rule_filter_id
    if rule_filter_id is None:
        msg = "Rule filter placement requires rule_filter_id"
        raise ValueError(msg)

    live_filter = live.filters.get(rule_filter_id)
    if live_filter is None and snapshot_filter.id == rule_filter_id:
        live_filter = live.filters_by_name.get(snapshot_filter.name)
    if live_filter is not None:
        category = live.categories[live_filter.category_id]
        return _FilterPlacement(
            category_id=category.id,
            category_name=category.name,
            category_position=category.position,
            filter_key=f"rule:{live_filter.id}",
            filter_name=live_filter.name,
            filter_position=live_filter.position,
        )

    category = live.categories_by_name.get(snapshot_category.name)
    category_id, category_name, category_position = _resolved_category(category, snapshot_category.name)
    return _FilterPlacement(
        category_id=category_id,
        category_name=category_name,
        category_position=category_position,
        filter_key=_unresolved_rule_filter_key(
            snapshot_filter=snapshot_filter,
            rule_filter_id=rule_filter_id,
            category_id=category_id,
        ),
        filter_name=snapshot_filter.name,
        filter_position=snapshot_filter.position,
    )


def _unresolved_rule_filter_key(
    snapshot_filter: ReportDetailFilterResponse,
    rule_filter_id: uuid.UUID,
    category_id: uuid.UUID,
) -> str:
    if snapshot_filter.id == rule_filter_id:
        return f"legacy:{category_id}:{snapshot_filter.name}"
    return f"rule:{rule_filter_id}"


def _place_manual_filter(
    snapshot_category: ReportDetailCategoryResponse,
    snapshot_filter: ReportDetailFilterResponse,
    manuals_by_id: dict[uuid.UUID, tuple[uuid.UUID, str, int]],
    live: _LiveTaxonomy,
) -> _FilterPlacement:
    manual = manuals_by_id.get(snapshot_filter.id)
    if manual is not None:
        category_id, filter_name, filter_position = manual
        live_category = live.categories.get(category_id)
        resolved_id, category_name, category_position = _resolved_category(
            live_category,
            snapshot_category.name,
            fallback_id=category_id,
        )
        return _FilterPlacement(
            category_id=resolved_id,
            category_name=category_name,
            category_position=category_position,
            filter_key=f"manual:{category_id}:{filter_name}",
            filter_name=filter_name,
            filter_position=filter_position,
        )

    category = live.categories_by_name.get(snapshot_category.name)
    category_id, category_name, category_position = _resolved_category(category, snapshot_category.name)
    return _FilterPlacement(
        category_id=category_id,
        category_name=category_name,
        category_position=category_position,
        filter_key=f"manual:{category_id}:{snapshot_filter.name}",
        filter_name=snapshot_filter.name,
        filter_position=snapshot_filter.position,
    )


def _resolved_category(
    category: Category | None,
    snapshot_name: str,
    fallback_id: uuid.UUID | None = None,
) -> tuple[uuid.UUID, str, int]:
    if category is not None:
        return category.id, category.name, category.position
    if fallback_id is not None:
        return fallback_id, snapshot_name, 0
    return uuid.uuid5(_GHOST_CATEGORY_NAMESPACE, snapshot_name), snapshot_name, 0


def _emit_categories(
    categories: dict[uuid.UUID, _CategoryAccumulator],
    months: list[str],
    live_category_ids: set[uuid.UUID],
) -> list[BreakdownCategoryResponse]:
    live_rows = [
        _emit_category(category, months)
        for category_id, category in categories.items()
        if category_id in live_category_ids
    ]
    ghost_rows = [
        _emit_category(category, months)
        for category_id, category in categories.items()
        if category_id not in live_category_ids
    ]
    live_rows.sort(key=lambda category: (category.position, category.name))
    ghost_rows.sort(key=lambda category: category.name)
    next_ghost_position = live_rows[-1].position + 1 if len(live_rows) > 0 else 1
    positioned_ghosts = [
        ghost.model_copy(update={"position": next_ghost_position + index}) for index, ghost in enumerate(ghost_rows)
    ]
    return [*live_rows, *positioned_ghosts]


def _emit_category(category: _CategoryAccumulator, months: list[str]) -> BreakdownCategoryResponse:
    filters = [_emit_filter(filter_row, months) for filter_row in category.filters.values()]
    filters.sort(key=lambda filter_row: (filter_row.position, filter_row.key))
    amounts = {month: sum((filter_row.amounts[month] for filter_row in filters), Decimal(0)) for month in months}
    return BreakdownCategoryResponse(
        id=category.id,
        name=category.name,
        position=category.position,
        amounts=_quantized_amounts(amounts, months),
        filters=filters,
    )


def _emit_filter(filter_row: _FilterAccumulator, months: list[str]) -> BreakdownFilterResponse:
    return BreakdownFilterResponse(
        key=filter_row.key,
        name=filter_row.name,
        position=filter_row.position,
        amounts=_quantized_amounts(filter_row.amounts, months),
    )


def _quantized_amounts(amounts: dict[str, Decimal], months: list[str]) -> dict[str, Decimal]:
    return {month: amounts.get(month, Decimal(0)).quantize(_AMOUNT_QUANTUM) for month in months}
