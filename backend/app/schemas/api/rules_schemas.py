import uuid

from pydantic import BaseModel

from app.db.rules.models import RuleOperator, RuleType


class RuleCreate(BaseModel):
    type: RuleType
    operator: RuleOperator
    value: str


class RuleOverwrite(BaseModel):
    id: uuid.UUID | None
    type: RuleType
    operator: RuleOperator
    value: str
