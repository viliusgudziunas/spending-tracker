import uuid

from sqlalchemy.orm import Session

from app.clients.db.exceptions import RuleNotFoundError
from app.db.rules.models import Rule
from app.schemas.spapi.rules_schemas import SpapiRule


def insert_new_rule(db: Session, spapi_rule: SpapiRule, rule_group_id: uuid.UUID) -> Rule:
    rule = Rule(
        type=spapi_rule.type,
        operator=spapi_rule.operator,
        value=spapi_rule.value,
        group_id=rule_group_id,
    )
    db.add(rule)
    db.flush()
    db.refresh(rule)
    return rule


def get_rule_by_id(db: Session, rule_id: uuid.UUID) -> Rule:
    rule = db.get(Rule, rule_id)

    if rule is None:
        raise RuleNotFoundError

    return rule


def update_rule(db: Session, rule_: Rule, spapi_rule: SpapiRule) -> Rule:
    rule_.type = spapi_rule.type
    rule_.operator = spapi_rule.operator
    rule_.value = spapi_rule.value
    db.add(rule_)
    db.flush()
    db.refresh(rule_)
    return rule_
