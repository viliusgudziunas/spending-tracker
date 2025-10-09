import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.api.rules.models import RuleInput, RuleResponse
from app.db.rules.models import Rule
from app.db.rules.repository import CreateSingleRuleDTO, FilterNotFoundError, create_rule, delete_filter

router = APIRouter()


@router.delete("/filters/{filter_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_filter_(filter_id: uuid.UUID, db: Annotated[Session, Depends(get_db)]) -> None:
    try:
        delete_filter(db=db, filter_id=filter_id)
    except FilterNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Filter not found") from exc


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
