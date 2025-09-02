from dataclasses import dataclass

from app.db.rules.models import RuleGroupOperator


@dataclass(frozen=True, kw_only=True)
class SpapiRuleGroup:
    operator: RuleGroupOperator
