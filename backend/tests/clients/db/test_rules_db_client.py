import pytest
from sqlalchemy.orm import Session

from app.clients.db.rules_db_client import insert_new_rule
from app.db.rules.models import RuleGroupOperator, RuleOperator, RuleType
from app.schemas.spapi.categories_schemas import SpapiCategory
from app.schemas.spapi.filters_schemas import SpapiFilter
from app.schemas.spapi.rule_groups_schemas import SpapiRuleGroup
from app.schemas.spapi.rules_schemas import SpapiRule
from tests.fixtures.rules import InsertCategory, InsertFilter, InsertRuleGroup


class TestInsertNewRule:
    @pytest.mark.parametrize("type_", list(RuleType))
    @pytest.mark.parametrize("operator", list(RuleOperator))
    def test_insert_new_rule(  # noqa: PLR0913
        self,
        db_session: Session,
        insert_category: InsertCategory,
        insert_filter: InsertFilter,
        insert_rule_group: InsertRuleGroup,
        type_: RuleType,
        operator: RuleOperator,
    ) -> None:
        with db_session.begin():
            category = insert_category(SpapiCategory(name="Test Category"))
            filter_ = insert_filter(SpapiFilter(name="Test Filter", position=1), category.id)
            rule_group = insert_rule_group(
                SpapiRuleGroup(
                    operator=RuleGroupOperator.AND,
                    rules=[],
                ),
                filter_.id,
            )

            rule = insert_new_rule(db_session, SpapiRule(type=type_, operator=operator, value="100"), rule_group.id)

        assert rule.id is not None
        assert rule.type == type_
        assert rule.operator == operator
        assert rule.value == "100"
        assert rule.group_id == rule_group.id
