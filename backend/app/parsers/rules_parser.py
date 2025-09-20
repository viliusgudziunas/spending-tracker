from app.schemas.api.rules_schemas import RuleCreate
from app.schemas.spapi.rules_schema import SpapiRule


def parse_rule_input_to_spapi(input_rule: RuleCreate) -> SpapiRule:
    return SpapiRule(
        type=input_rule.type,
        operator=input_rule.operator,
        value=input_rule.value,
    )
