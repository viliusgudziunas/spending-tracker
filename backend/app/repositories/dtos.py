import uuid
from dataclasses import dataclass


@dataclass(frozen=True, kw_only=True)
class CreateFilterDto:
    name: str
    position: int | None
    category_id: uuid.UUID
    rule_groups: list[CreateRuleGroupDto]


@dataclass(frozen=True, kw_only=True)
class CreateRuleGroupDto:
    operator: str
    rules: list[CreateRuleDto]


@dataclass(frozen=True, kw_only=True)
class CreateRuleDto:
    type: str
    operator: str
    value: str


@dataclass(frozen=True, kw_only=True)
class PutRuleDto:
    id: uuid.UUID | None
    type: str
    operator: str
    value: str


@dataclass(frozen=True, kw_only=True)
class PutRuleGroupDto:
    id: uuid.UUID | None
    operator: str
    rules: list[PutRuleDto]


@dataclass(frozen=True, kw_only=True)
class CreateTransactionDto:
    description: str
    amount: float
    fee: float
    started_date: str
    completed_date: str
    type: str | None = None
    product: str | None = None
    currency: str | None = None
    state: str | None = None
    balance: float | None = None
    raw_data: dict | None = None
