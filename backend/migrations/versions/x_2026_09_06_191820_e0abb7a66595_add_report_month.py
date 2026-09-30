"""add report month

Revision ID: e0abb7a66595
Revises: 8c8e4eb2de65
Create Date: 2026-09-06 19:18:20.998378

"""

from typing import TYPE_CHECKING

import sqlalchemy as sa
from alembic import op

if TYPE_CHECKING:
    from collections.abc import Sequence

# revision identifiers, used by Alembic.
revision: str = "e0abb7a66595"
down_revision: str | Sequence[str] | None = "8c8e4eb2de65"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("report", sa.Column("month", sa.String(), nullable=True))
    op.create_unique_constraint("report_month_key", "report", ["month"])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint("report_month_key", "report", type_="unique")
    op.drop_column("report", "month")
