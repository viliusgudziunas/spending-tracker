from __future__ import annotations

import enum
import uuid
from datetime import UTC, datetime
from typing import Final

from sqlalchemy import UUID, DateTime, Enum, Float, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def naive_utcnow() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


CURRENT_REPORT_SCHEMA_VERSION: Final[int] = 2


class Report(Base):
    __tablename__ = "report"

    id: Mapped[uuid.UUID] = mapped_column(UUID[uuid.UUID](as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, nullable=False)
    schema_version: Mapped[int] = mapped_column(Integer, default=CURRENT_REPORT_SCHEMA_VERSION, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=naive_utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=naive_utcnow, onupdate=naive_utcnow, nullable=False)

    data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    transactions: Mapped[list[Transaction]] = relationship("Transaction", back_populates="report")

    def __repr__(self) -> str:
        return f"Report({self.name=})"


class TransactionSource(enum.StrEnum):
    generated = enum.auto()
    override = enum.auto()


CURRENT_TRANSACTION_SCHEMA_VERSION: Final[int] = 2


class Transaction(Base):
    __tablename__ = "transaction"

    id: Mapped[uuid.UUID] = mapped_column(UUID[uuid.UUID](as_uuid=True), primary_key=True, default=uuid.uuid4)
    description: Mapped[str] = mapped_column(String, nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    fee: Mapped[float] = mapped_column(Float, nullable=False)
    started_date: Mapped[str] = mapped_column(DateTime, nullable=False)
    completed_date: Mapped[str] = mapped_column(DateTime, nullable=False)
    schema_version: Mapped[int] = mapped_column(Integer, default=CURRENT_TRANSACTION_SCHEMA_VERSION, nullable=False)
    type: Mapped[str | None] = mapped_column(String, nullable=True)
    product: Mapped[str | None] = mapped_column(String, nullable=True)
    currency: Mapped[str | None] = mapped_column(String, nullable=True)
    state: Mapped[str | None] = mapped_column(String, nullable=True)
    balance: Mapped[float | None] = mapped_column(Float, nullable=True)

    raw_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    source: Mapped[TransactionSource] = mapped_column(Enum(TransactionSource), default=TransactionSource.generated)

    report_id: Mapped[uuid.UUID] = mapped_column(UUID[uuid.UUID](as_uuid=True), ForeignKey("report.id"), nullable=False)
    report: Mapped[Report] = relationship(back_populates="transactions")

    def __repr__(self) -> str:
        return (
            "Transaction("
            f"{self.description=}, {self.amount=}, {self.fee=}, {self.started_date=}, {self.completed_date=}"
            ")"
        )


class Category(Base):
    __tablename__ = "category"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)

    filters: Mapped[list[Filter]] = relationship("Filter", back_populates="category", order_by="Filter.position")

    def __repr__(self) -> str:
        return f"Category({self.name=})"


class Filter(Base):
    __tablename__ = "filter"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)

    category_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("category.id"), nullable=False)
    category: Mapped[Category] = relationship(back_populates="filters")

    rule_groups: Mapped[list[RuleGroup]] = relationship(
        "RuleGroup",
        back_populates="filter",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"Filter({self.name=})"


class RuleGroupOperator(enum.StrEnum):
    AND = "AND"
    OR = "OR"


class RuleGroup(Base):
    __tablename__ = "rule_group"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    operator: Mapped[RuleGroupOperator] = mapped_column(Enum(RuleGroupOperator), nullable=False)

    filter_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("filter.id", ondelete="CASCADE"),
        nullable=False,
    )
    filter: Mapped[Filter] = relationship(back_populates="rule_groups")

    rules: Mapped[list[Rule]] = relationship("Rule", back_populates="group", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"RuleGroup({self.operator=!s})"


class RuleType(enum.StrEnum):
    DESCRIPTION = "DESCRIPTION"
    AMOUNT = "AMOUNT"
    PRODUCT = "PRODUCT"


class RuleOperator(enum.StrEnum):
    EQUAL = "EQUAL"
    NOT_EQUAL = "NOT_EQUAL"
    GREATER_THAN = "GREATER_THAN"
    LESS_THAN = "LESS_THAN"
    GREATER_THAN_EQUAL = "GREATER_THAN_EQUAL"
    LESS_THAN_EQUAL = "LESS_THAN_EQUAL"


class Rule(Base):
    __tablename__ = "rule"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    type: Mapped[RuleType] = mapped_column(Enum(RuleType), nullable=False)
    operator: Mapped[RuleOperator] = mapped_column(Enum(RuleOperator), nullable=False)
    value: Mapped[str] = mapped_column(String, nullable=False)

    group_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("rule_group.id", ondelete="CASCADE"),
        nullable=False,
    )
    group: Mapped[RuleGroup] = relationship(back_populates="rules")

    def __repr__(self) -> str:
        return f"Rule({self.type=!s}, {self.operator=!s}, {self.value=})"
