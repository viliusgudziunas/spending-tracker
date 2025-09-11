from dataclasses import dataclass

from app.db.rules.models import RuleOperator, RuleType


@dataclass(frozen=True, kw_only=True)
class SpapiRule:
    type: RuleType
    operator: RuleOperator
    value: str
