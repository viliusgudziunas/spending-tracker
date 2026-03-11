import uuid
from dataclasses import dataclass
from typing import TYPE_CHECKING

from app.db.rules.models import Rule
from app.repositories.dtos import CreateRuleDto

if TYPE_CHECKING:
    from sqlalchemy.orm import Session


@dataclass(frozen=True, kw_only=True)
class CreateSingleRuleDTO(CreateRuleDto):
    filter_id: uuid.UUID


def create_rule(db: Session, rule_dto: CreateSingleRuleDTO) -> Rule:
    rule = Rule(type=rule_dto.type, operator=rule_dto.operator, value=rule_dto.value, filter_id=rule_dto.filter_id)

    db.add(rule)
    db.commit()
    db.refresh(rule)

    return rule
