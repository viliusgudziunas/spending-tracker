from __future__ import annotations

import enum
import uuid
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import UUID, DateTime, Enum, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import ReportsBase


def naive_utcnow() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


class Report(ReportsBase):
    __tablename__ = "report"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=naive_utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=naive_utcnow, onupdate=naive_utcnow, nullable=False)

    transactions: Mapped[list[Transaction]] = relationship("Transaction", back_populates="report")
    categories: Mapped[list[Category]] = relationship("Category", back_populates="report")
    overrides: Mapped[list[Override]] = relationship("Override", back_populates="report")

    @property
    def unidentified_transactions(self) -> list[Transaction]:
        return [transaction for transaction in self.transactions if transaction.filter is None]

    def __repr__(self) -> str:
        return f"Report({self.name=})"


class Category(ReportsBase):
    __tablename__ = "category"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, nullable=False)

    report_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("report.id"), nullable=False)
    report: Mapped[Report] = relationship(back_populates="categories")

    filters: Mapped[list[Filter]] = relationship("Filter", back_populates="category", order_by="Filter.position")

    def __repr__(self) -> str:
        return f"Category({self.name=})"


class Filter(ReportsBase):
    __tablename__ = "filter"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)

    category_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("category.id"), nullable=False)
    category: Mapped[Category] = relationship(back_populates="filters")

    transactions: Mapped[list[Transaction]] = relationship("Transaction", back_populates="filter")

    def __repr__(self) -> str:
        return f"Filter({self.name=}, {self.amount=})"

    @property
    def amount(self) -> Decimal:
        return Decimal(sum(Decimal(str(transaction.amount)) for transaction in self.transactions))


class TransactionSource(enum.StrEnum):
    generated = enum.auto()
    override = enum.auto()


class Transaction(ReportsBase):
    __tablename__ = "transaction"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    description: Mapped[str] = mapped_column(String, nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    fee: Mapped[float] = mapped_column(Integer, nullable=False)
    started_date: Mapped[str] = mapped_column(DateTime, nullable=False)
    completed_date: Mapped[str] = mapped_column(DateTime, nullable=False)
    source: Mapped[TransactionSource] = mapped_column(Enum(TransactionSource))

    report_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("report.id"), nullable=False)
    report: Mapped[Report] = relationship(back_populates="transactions")

    filter_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("filter.id"))
    filter: Mapped[Filter | None] = relationship(back_populates="transactions")

    override: Mapped[Override | None] = relationship("Override", back_populates="transaction")

    def reset(self) -> None:
        self.filter_id = None
        self.source = TransactionSource.generated

    def __repr__(self) -> str:
        return (
            "Transaction("
            f"{self.description=}, {self.amount=}, {self.fee=}, {self.started_date=}, {self.completed_date=}"
            ")"
        )


class Override(ReportsBase):
    __tablename__ = "override"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category_name: Mapped[str] = mapped_column(String, nullable=False)
    filter_name: Mapped[str] = mapped_column(String, nullable=False)

    transaction_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("transaction.id"),
        nullable=False,
        unique=True,
    )
    transaction: Mapped[Transaction] = relationship("Transaction")

    report_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("report.id"), nullable=False)
    report: Mapped[Report] = relationship(back_populates="overrides")
