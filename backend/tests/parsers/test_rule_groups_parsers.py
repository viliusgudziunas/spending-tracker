import uuid

import pytest

from app.db.rules.models import RuleGroupOperator, RuleOperator, RuleType
from app.parsers.rule_groups_parser import (
    parse_create_rule_group_input_to_spapi,
    parse_overwrite_rule_group_input_to_spapi,
)
from app.schemas.api.rule_groups_schemas import RuleGroupCreate, RuleGroupOverwrite
from app.schemas.api.rules_schemas import RuleCreate


class TestParseCreateRuleGroupInputToSPAPI:
    @pytest.mark.parametrize("operator", list(RuleGroupOperator))
    def test_parse_create_rule_group_input_to_spapi_model(self, operator: RuleGroupOperator) -> None:
        spapi_rule_group = parse_create_rule_group_input_to_spapi(
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


class TestParseOverwriteRuleGroupInputToSPAPI:
    @pytest.mark.parametrize("operator", list(RuleGroupOperator))
    def test_parse_overwrite_rule_group_input_to_spapi_model(self, operator: RuleGroupOperator) -> None:
        spapi_rule_group = parse_overwrite_rule_group_input_to_spapi(
            RuleGroupOverwrite(
                id=None,
                operator=operator,
            ),
        )

        assert spapi_rule_group.id is None
        assert spapi_rule_group.operator == operator

    def test_parse_overwrite_rule_group_input_to_spapi_model_with_id(self) -> None:
        id_ = uuid.uuid4()

        spapi_rule_group = parse_overwrite_rule_group_input_to_spapi(
            RuleGroupOverwrite(
                id=id_,
                operator=RuleGroupOperator.AND,
            ),
        )

        assert spapi_rule_group.id == id_
        assert spapi_rule_group.operator == RuleGroupOperator.AND
