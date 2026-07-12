"""Add PRODUCT value to ruletype enum

Revision ID: 6d9c2d84a1e2
Revises: d9ac54a7c3ef
Create Date: 2026-03-11 14:00:00.000000

"""

from typing import TYPE_CHECKING

from alembic import op

if TYPE_CHECKING:
    from collections.abc import Sequence

revision: str = "6d9c2d84a1e2"
down_revision: str | Sequence[str] | None = "d9ac54a7c3ef"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TYPE ruletype ADD VALUE IF NOT EXISTS 'PRODUCT'")


def downgrade() -> None:
    op.execute("UPDATE rule SET type = 'DESCRIPTION' WHERE type = 'PRODUCT'")
    op.execute("ALTER TYPE ruletype RENAME TO ruletype_old")
    op.execute("CREATE TYPE ruletype AS ENUM ('DESCRIPTION', 'AMOUNT')")
    op.execute("ALTER TABLE rule ALTER COLUMN type TYPE ruletype USING type::text::ruletype")
    op.execute("DROP TYPE ruletype_old")
