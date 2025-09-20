from dataclasses import dataclass

from app.schemas.spapi.rule_groups_schemas import SpapiRuleGroup


@dataclass(frozen=True, kw_only=True)
class SpapiFilter:
    name: str
    position: int
    rule_groups: list[SpapiRuleGroup]
