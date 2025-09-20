from dataclasses import dataclass

from app.db.rules.models import RuleGroupOperator
from app.schemas.spapi.rules_schemas import SpapiRule


@dataclass(frozen=True, kw_only=True)
class SpapiRuleGroup:
    operator: RuleGroupOperator
    rules: list[SpapiRule]
