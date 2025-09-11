import uuid

from sqlalchemy.orm import Session

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
