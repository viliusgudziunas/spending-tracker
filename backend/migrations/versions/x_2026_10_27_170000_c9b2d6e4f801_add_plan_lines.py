"""add plan lines

Revision ID: c9b2d6e4f801
Revises: e0abb7a66595
Create Date: 2026-10-27 17:00:00

"""

from typing import TYPE_CHECKING

import sqlalchemy as sa
from alembic import op

if TYPE_CHECKING:
    from collections.abc import Sequence

revision: str = "c9b2d6e4f801"
down_revision: str | Sequence[str] | None = "e0abb7a66595"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "plan_line",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("section_id", sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(["section_id"], ["plan_section.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_plan_line_section_id", "plan_line", ["section_id"])


def downgrade() -> None:
    op.drop_index("ix_plan_line_section_id", table_name="plan_line")
    op.drop_table("plan_line")
