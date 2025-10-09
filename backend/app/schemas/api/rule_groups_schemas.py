import uuid

from pydantic import BaseModel

from app.db.rules.models import RuleGroupOperator
from app.schemas.api.rules_schemas import RuleCreate, RuleOverwrite


class RuleGroupCreate(BaseModel):
    operator: RuleGroupOperator
    rules: list[RuleCreate]


class RuleGroupOverwrite(BaseModel):
    id: uuid.UUID | None
    operator: RuleGroupOperator
    rules: list[RuleOverwrite]
