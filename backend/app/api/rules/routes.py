import uuid
from collections.abc import Iterable
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.api.rules.models import (
    CategoryFullResponse,
    CategoryInput,
    FilterFullResponse,
    FilterInput,
    RuleInput,
    RuleResponse,
)
from app.db.rules.models import Category, Filter, Rule
from app.db.rules.repository import (
    CreateFilterDTO,
    CreateRuleDTO,
    CreateRuleGroupDTO,
    CreateSingleRuleDTO,
    DuplicateCategoryError,
    FilterNotFoundError,
    UpdateFilterDTO,
    UpdateRuleDTO,
    UpdateRuleGroupDTO,
    create_category,
    create_filter,
    create_rule,
    delete_filter,
    get_categories,
    get_filter,
    get_filters,
    update_filter,
)

router = APIRouter()


@router.post("/categories", response_model=CategoryFullResponse, status_code=status.HTTP_201_CREATED)
def create_category_(form_data: CategoryInput, db: Annotated[Session, Depends(get_db)]) -> Category:
    try:
        category = create_category(db=db, name=form_data.name)
    except DuplicateCategoryError as exc:
        raise HTTPException(status_code=400, detail="Category already exists") from exc

    return category


@router.get("/categories", response_model=list[CategoryFullResponse], status_code=status.HTTP_200_OK)
def get_categories_(db: Annotated[Session, Depends(get_db)]) -> Iterable[Category]:
    return get_categories(db=db)


@router.post("/filters", response_model=FilterFullResponse, status_code=status.HTTP_201_CREATED)
def create_filter_(form_data: FilterInput, db: Annotated[Session, Depends(get_db)]) -> Filter:
    return create_filter(
        db=db,
        filter_dto=CreateFilterDTO(
            name=form_data.name,
            position=form_data.position,
            category_id=form_data.category_id,
            rule_groups=[
                CreateRuleGroupDTO(
                    operator=g.operator,
                    rules=[CreateRuleDTO(type=r.type, operator=r.operator, value=r.value) for r in g.rules],
                )
                for g in form_data.rule_groups
            ],
        ),
    )


@router.get("/filters", response_model=list[FilterFullResponse], status_code=status.HTTP_200_OK)
def get_filters_(db: Annotated[Session, Depends(get_db)]) -> Iterable[Filter]:
    return get_filters(db=db)


@router.get("/filters/{filter_id}", response_model=FilterFullResponse, status_code=status.HTTP_200_OK)
def get_filter_(filter_id: uuid.UUID, db: Annotated[Session, Depends(get_db)]) -> Filter:
    try:
        filter_ = get_filter(db=db, filter_id=filter_id)
    except FilterNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Filter not found") from exc

    return filter_


@router.put("/filters/{filter_id}", response_model=FilterFullResponse, status_code=status.HTTP_200_OK)
def update_filter_(form_data: FilterInput, filter_id: uuid.UUID, db: Annotated[Session, Depends(get_db)]) -> Filter:
    try:
        filter_ = get_filter(db=db, filter_id=filter_id)
    except FilterNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Filter not found") from exc

    return update_filter(
        db=db,
        filter_=filter_,
        filter_dto=UpdateFilterDTO(
            name=form_data.name,
            position=form_data.position,
            category_id=form_data.category_id,
            rule_groups=[
                UpdateRuleGroupDTO(
                    operator=g.operator,
                    rules=[UpdateRuleDTO(type=r.type, operator=r.operator, value=r.value) for r in g.rules],
                )
                for g in form_data.rule_groups
            ],
        ),
    )


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
