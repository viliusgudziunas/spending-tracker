import uuid

from sqlalchemy.orm import Session

from app.db.rules.models import RuleGroup
from app.schemas.spapi.rule_groups_schemas import SpapiRuleGroup


def insert_new_rule_group(db: Session, spapi_rule_group: SpapiRuleGroup, filter_id: uuid.UUID) -> RuleGroup:
    rule_group = RuleGroup(
        operator=spapi_rule_group.operator,
        filter_id=filter_id,
    )
    db.add(rule_group)
    db.flush()
    db.refresh(rule_group)
    return rule_group
