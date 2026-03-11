import uuid

from pydantic import BaseModel

from app.db.rules.models import RuleOperator, RuleType


class RuleInput(BaseModel):
    type: RuleType
    operator: RuleOperator
    value: str


class RuleResponse(BaseModel):
    id: uuid.UUID
    type: RuleType
    operator: RuleOperator
    value: str
    filter_id: uuid.UUID
