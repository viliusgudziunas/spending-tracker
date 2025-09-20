from sqlalchemy.orm import Session

from app.clients.db.rule_groups_db_client import insert_new_rule_group
from app.db.rules.models import RuleGroupOperator
from app.schemas.spapi.categories_schemas import SpapiCategory
from app.schemas.spapi.filters_schemas import SpapiFilter
from app.schemas.spapi.rule_groups_schemas import SpapiRuleGroup
from tests.fixtures.rules import InsertCategory, InsertFilter


class TestInsertNewRuleGroup:
    def test_insert_new_rule_group(
        self,
        db_session: Session,
        insert_category: InsertCategory,
        insert_filter: InsertFilter,
    ) -> None:
        with db_session.begin():
            category = insert_category(SpapiCategory(name="Test Category"))
            filter_ = insert_filter(
                SpapiFilter(
                    name="Test Filter",
                    position=1,
                    rule_groups=[],
                ),
                category.id,
            )

            rule_group = insert_new_rule_group(
                db_session,
                SpapiRuleGroup(
                    operator=RuleGroupOperator.AND,
                    rules=[],
                ),
                filter_.id,
            )

        assert rule_group.id is not None
        assert rule_group.operator == RuleGroupOperator.AND
        assert rule_group.filter_id == filter_.id
