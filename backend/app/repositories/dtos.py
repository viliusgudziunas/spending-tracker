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
