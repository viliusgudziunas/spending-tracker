import uuid

from app.db.rules.models import RuleGroupOperator, RuleOperator, RuleType
from app.parsers.filters_parser import parse_create_filter_input_to_spapi
from app.schemas.api.filters_schemas import FilterCreate
from app.schemas.api.rule_groups_schemas import RuleGroupCreate
from app.schemas.api.rules_schemas import RuleCreate


class TestParseCreateFilterInputToSPAPI:
    def test_parse_create_filter_input_to_spapi_model(self) -> None:
        spapi_filter = parse_create_filter_input_to_spapi(
            FilterCreate(
                name="Test Filter",
                position=1,
                category_id=uuid.uuid4(),
                rule_groups=[
                    RuleGroupCreate(
                        operator=RuleGroupOperator.AND,
                        rules=[
                            RuleCreate(
                                type=RuleType.AMOUNT,
                                operator=RuleOperator.EQUAL,
                                value="100",
                            ),
                        ],
                    ),
                ],
            ),
            1,
        )

        assert spapi_filter.name == "Test Filter"
        assert spapi_filter.position == 1
        assert spapi_filter.rule_groups[0].operator == RuleGroupOperator.AND
        assert spapi_filter.rule_groups[0].rules[0].type == RuleType.AMOUNT
        assert spapi_filter.rule_groups[0].rules[0].operator == RuleOperator.EQUAL
        assert spapi_filter.rule_groups[0].rules[0].value == "100"
