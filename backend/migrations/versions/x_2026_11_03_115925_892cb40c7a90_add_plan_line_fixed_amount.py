"""add plan line fixed amount

Revision ID: 892cb40c7a90
Revises: c9b2d6e4f801
Create Date: 2026-11-03 11:59:25.745116

"""

from typing import TYPE_CHECKING

import sqlalchemy as sa
from alembic import op

if TYPE_CHECKING:
    from collections.abc import Sequence

revision: str = "892cb40c7a90"
down_revision: str | Sequence[str] | None = "c9b2d6e4f801"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("plan_line", sa.Column("fixed_amount", sa.Numeric(precision=12, scale=2), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("plan_line", "fixed_amount")
