from app.parsers.rules_parser import parse_create_rule_input_to_spapi, parse_update_rule_input_to_spapi
from app.schemas.api.rule_groups_schemas import RuleGroupCreate, RuleGroupOverwrite
from app.schemas.spapi.rule_groups_schemas import SpapiRuleGroup


def parse_create_rule_group_input_to_spapi(input_rule_group: RuleGroupCreate) -> SpapiRuleGroup:
    return SpapiRuleGroup(
        operator=input_rule_group.operator,
        rules=[parse_create_rule_input_to_spapi(r) for r in input_rule_group.rules],
    )


def parse_overwrite_rule_group_input_to_spapi(input_rule_group: RuleGroupOverwrite) -> SpapiRuleGroup:
    return SpapiRuleGroup(
        id=input_rule_group.id,
        operator=input_rule_group.operator,
        rules=[parse_update_rule_input_to_spapi(r) for r in input_rule_group.rules],
    )
