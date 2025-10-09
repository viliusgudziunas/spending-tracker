import uuid

from sqlalchemy.orm import Session

from app.clients.db.exceptions import RuleGroupNotFoundError
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


def get_rule_group_by_id(db: Session, rule_group_id: uuid.UUID) -> RuleGroup:
    rule_group = db.get(RuleGroup, rule_group_id)

    if rule_group is None:
        raise RuleGroupNotFoundError

    return rule_group


def update_rule_group(db: Session, rule_group_: RuleGroup, spapi_rule_group: SpapiRuleGroup) -> RuleGroup:
    rule_group_.operator = spapi_rule_group.operator
    db.add(rule_group_)
    db.flush()
    db.refresh(rule_group_)
    return rule_group_
