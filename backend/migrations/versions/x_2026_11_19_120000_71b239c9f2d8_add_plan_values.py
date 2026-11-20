"""add plan values

Revision ID: 71b239c9f2d8
Revises: 892cb40c7a90
Create Date: 2026-11-19 12:00:00

"""

from typing import TYPE_CHECKING

import sqlalchemy as sa
from alembic import op

if TYPE_CHECKING:
    from collections.abc import Sequence

revision: str = "71b239c9f2d8"
down_revision: str | Sequence[str] | None = "892cb40c7a90"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "plan_value",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("line_id", sa.UUID(), nullable=False),
        sa.Column("month", sa.String(), nullable=False),
        sa.Column("amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.ForeignKeyConstraint(["line_id"], ["plan_line.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("line_id", "month", name="uq_plan_value_line_id_month"),
    )


def downgrade() -> None:
    op.drop_table("plan_value")
