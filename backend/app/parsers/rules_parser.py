from app.schemas.api.rules_schemas import RuleCreate, RuleOverwrite
from app.schemas.spapi.rules_schemas import SpapiRule


def parse_create_rule_input_to_spapi(input_rule: RuleCreate) -> SpapiRule:
    return SpapiRule(
        type=input_rule.type,
        operator=input_rule.operator,
        value=input_rule.value,
    )


def parse_update_rule_input_to_spapi(input_rule: RuleOverwrite) -> SpapiRule:
    return SpapiRule(
        id=input_rule.id,
        type=input_rule.type,
        operator=input_rule.operator,
        value=input_rule.value,
    )
