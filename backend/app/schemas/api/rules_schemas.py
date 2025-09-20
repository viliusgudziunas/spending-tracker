from pydantic import BaseModel

from app.db.rules.models import RuleOperator, RuleType


class RuleCreate(BaseModel):
    type: RuleType
    operator: RuleOperator
    value: str
