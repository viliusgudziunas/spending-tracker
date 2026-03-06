from typing import TYPE_CHECKING

from app.api.schemas.filter_schemas import CreateFilterInput
from app.db.rules.models import Filter
from app.repositories import filter_repository
from app.repositories.dtos import CreateFilterDto, CreateRuleDto, CreateRuleGroupDto

if TYPE_CHECKING:
    from sqlalchemy.orm import Session


def create_filter(db: Session, form_data: CreateFilterInput) -> Filter:
    return filter_repository.create_filter(
        db=db,
        filter_dto=CreateFilterDto(
            name=form_data.name,
            position=form_data.position,
            category_id=form_data.category_id,
            rule_groups=[
                CreateRuleGroupDto(
                    operator=g.operator,
                    rules=[CreateRuleDto(type=r.type, operator=r.operator, value=r.value) for r in g.rules],
                )
                for g in form_data.rule_groups
            ],
        ),
    )
