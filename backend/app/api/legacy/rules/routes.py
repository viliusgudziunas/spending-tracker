import uuid
from typing import TYPE_CHECKING, Annotated

from fastapi import APIRouter, Depends, status

from app.api.dependencies import get_db
from app.api.legacy.rules.models import RuleInput, RuleResponse
from app.db.rules.models import Rule
from app.db.rules.repository import CreateSingleRuleDTO, create_rule

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

router = APIRouter()


@router.post("/filters/{filter_id}/rules", response_model=RuleResponse, status_code=status.HTTP_201_CREATED)
def create_rule_(form_data: RuleInput, filter_id: uuid.UUID, db: Annotated[Session, Depends(get_db)]) -> Rule:
    return create_rule(
        db=db,
        rule_dto=CreateSingleRuleDTO(
            type=form_data.type,
            operator=form_data.operator,
            value=form_data.value,
            filter_id=filter_id,
        ),
    )
