from typing import TYPE_CHECKING

from app.repositories import category_repository

if TYPE_CHECKING:
    import uuid
    from collections.abc import Sequence

    from sqlalchemy.orm import Session

    from app.db.models import Category


def create_category(db: Session, name: str) -> Category:
    return category_repository.create_category(db=db, name=name)


def get_categories(db: Session) -> Sequence[Category]:
    return category_repository.get_categories(db=db)


def update_category(
    db: Session,
    category_id: uuid.UUID,
    name: str | None,
    position: int | None,
) -> Category:
    return category_repository.update_category(
        db=db,
        category_id=category_id,
        name=name,
        position=position,
    )
