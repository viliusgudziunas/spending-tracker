"""Add position column to category table

Revision ID: b3f1a7c24e91
Revises: ae2302096d52
Create Date: 2026-03-07 01:24:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "b3f1a7c24e91"
down_revision: str | Sequence[str] | None = "ae2302096d52"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("category", sa.Column("position", sa.Integer(), nullable=True))

    op.execute(
        "UPDATE category SET position = sub.row_num FROM "
        "(SELECT id, ROW_NUMBER() OVER (ORDER BY name) AS row_num FROM category) sub "
        "WHERE category.id = sub.id",
    )

    op.alter_column("category", "position", existing_type=sa.Integer(), nullable=False)


def downgrade() -> None:
    op.drop_column("category", "position")
