from app.parsers.rules_parser import parse_rule_input_to_spapi
from app.schemas.api.rule_groups_schemas import RuleGroupCreate
from app.schemas.spapi.rule_groups_schemas import SpapiRuleGroup


def parse_rule_group_input_to_spapi(input_rule_group: RuleGroupCreate) -> SpapiRuleGroup:
    return SpapiRuleGroup(
        operator=input_rule_group.operator,
        rules=[parse_rule_input_to_spapi(r) for r in input_rule_group.rules],
    )
