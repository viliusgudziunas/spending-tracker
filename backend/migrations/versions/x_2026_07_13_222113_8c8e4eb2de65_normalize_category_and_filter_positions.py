"""normalize category and filter positions

Revision ID: 8c8e4eb2de65
Revises: ed7951893470
Create Date: 2026-07-13 22:21:13.784837

"""

from typing import TYPE_CHECKING

from alembic import op

if TYPE_CHECKING:
    from collections.abc import Sequence

# revision identifiers, used by Alembic.
revision: str = "8c8e4eb2de65"
down_revision: str | Sequence[str] | None = "ed7951893470"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute(
        """
        WITH ranked AS (
            SELECT id, ROW_NUMBER() OVER (ORDER BY position, id) AS new_position
            FROM category
        )
        UPDATE category
        SET position = ranked.new_position
        FROM ranked
        WHERE category.id = ranked.id
        """,
    )
    op.execute(
        """
        WITH ranked AS (
            SELECT
                id,
                ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY position, id) AS new_position
            FROM filter
        )
        UPDATE filter
        SET position = ranked.new_position
        FROM ranked
        WHERE filter.id = ranked.id
        """,
    )


def downgrade() -> None:
    """Position normalization cannot be reversed."""
