import pytest

from app.db.rules.models import RuleOperator, RuleType
from app.parsers.rules_parser import parse_create_rule_input_to_spapi
from app.schemas.api.rules_schemas import RuleCreate


class TestParseCreateRuleInputToSPAPI:
    @pytest.mark.parametrize("type_", list(RuleType))
    @pytest.mark.parametrize("operator", list(RuleOperator))
    def test_parse_create_rule_input_to_spapi_model(self, type_: RuleType, operator: RuleOperator) -> None:
        spapi_category = parse_create_rule_input_to_spapi(RuleCreate(type=type_, operator=operator, value="100"))

        assert spapi_category.type == type_
        assert spapi_category.operator == operator
        assert spapi_category.value == "100"
