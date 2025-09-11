"""update names of couple rule operators

Revision ID: d283a4571354
Revises: 127d5718371c
Create Date: 2025-09-12 00:00:51.496563

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d283a4571354"
down_revision: str | Sequence[str] | None = "127d5718371c"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("ALTER TYPE ruleoperator RENAME VALUE 'GREATER_THAN_EQUAL' TO 'GREATER_THAN_OR_EQUAL';")
    op.execute("ALTER TYPE ruleoperator RENAME VALUE 'LESS_THAN_EQUAL' TO 'LESS_THAN_OR_EQUAL';")


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("ALTER TYPE ruleoperator RENAME VALUE 'GREATER_THAN_OR_EQUAL' TO 'GREATER_THAN_EQUAL';")
    op.execute("ALTER TYPE ruleoperator RENAME VALUE 'LESS_THAN_OR_EQUAL' TO 'LESS_THAN_EQUAL';")
