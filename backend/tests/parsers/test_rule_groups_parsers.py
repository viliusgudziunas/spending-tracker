import pytest

from app.db.rules.models import RuleGroupOperator, RuleOperator, RuleType
from app.parsers.rule_groups_parser import parse_rule_group_input_to_spapi
from app.schemas.api.rule_groups_schemas import RuleGroupCreate
from app.schemas.api.rules_schemas import RuleCreate


class TestParseRuleGroupInputToSPAPI:
    @pytest.mark.parametrize("operator", list(RuleGroupOperator))
    def test_parse_rule_group_input_to_spapi_model(self, operator: RuleGroupOperator) -> None:
        spapi_rule_group = parse_rule_group_input_to_spapi(
            RuleGroupCreate(
                operator=operator,
                rules=[
                    RuleCreate(
                        type=RuleType.AMOUNT,
                        operator=RuleOperator.EQUAL,
                        value="100",
                    ),
                ],
            ),
        )

        assert spapi_rule_group.operator == operator
        assert spapi_rule_group.rules[0].type == RuleType.AMOUNT
        assert spapi_rule_group.rules[0].operator == RuleOperator.EQUAL
        assert spapi_rule_group.rules[0].value == "100"
