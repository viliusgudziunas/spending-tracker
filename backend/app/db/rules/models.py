from __future__ import annotations

import enum
import uuid

from sqlalchemy import UUID, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Category(Base):
    __tablename__ = "category"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)

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

    filter_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("filter.id"), nullable=False)
    filter: Mapped[Filter] = relationship(back_populates="rule_groups")

    rules: Mapped[list[Rule]] = relationship("Rule", back_populates="group", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"RuleGroup({self.operator=!s})"


class RuleType(enum.StrEnum):
    DESCRIPTION = "DESCRIPTION"
    AMOUNT = "AMOUNT"


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

    group_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("rule_group.id"), nullable=False)
    group: Mapped[RuleGroup] = relationship(back_populates="rules")

    def __repr__(self) -> str:
        return f"Rule({self.type=!s}, {self.operator=!s}, {self.value=})"
