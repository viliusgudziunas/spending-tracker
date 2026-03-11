import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session  # noqa: TC002

from app.api.dependencies import get_db
from app.api.legacy.reports.models import OverrideInput, OverrideResponse
from app.db.reports.models import Override
from app.db.reports.repository import (
    CreateOverrideDto,
    LinkTransactionToFilterDto,
    create_override,
    delete_override,
    get_filter,
    get_transaction,
    link_transaction_to_filter,
)

router = APIRouter()


@router.post("/overrides", response_model=OverrideResponse)
async def create_override_(form_data: OverrideInput, db: Annotated[Session, Depends(get_db)]) -> Override:
    filter_ = get_filter(db=db, filter_id=form_data.filter_id)
    override = create_override(
        db=db,
        override_dto=CreateOverrideDto(
            category_name=filter_.category.name,
            filter_name=filter_.name,
            transaction_id=form_data.transaction_id,
            report_id=filter_.category.report_id,
        ),
    )
    link_transaction_to_filter(
        db=db,
        link_dto=LinkTransactionToFilterDto(filter_id=filter_.id, transaction_id=form_data.transaction_id),
    )

    return override


@router.delete("/overrides/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_override_(transaction_id: uuid.UUID, db: Annotated[Session, Depends(get_db)]) -> None:
    transaction = get_transaction(db=db, transaction_id=transaction_id)
    delete_override(db=db, transaction=transaction)
