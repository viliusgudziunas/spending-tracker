"""Drop legacy report category/filter/override tables

Revision ID: 9b6a21d4c5ef
Revises: f2a94b1e3c4d
Create Date: 2026-03-14 16:00:00.000000

"""


from typing import TYPE_CHECKING

from alembic import op

if TYPE_CHECKING:
    from collections.abc import Sequence

revision: str = "9b6a21d4c5ef"
down_revision: str | Sequence[str] | None = "f2a94b1e3c4d"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TABLE report.transaction DROP CONSTRAINT IF EXISTS transaction_filter_id_fkey")
    op.execute("ALTER TABLE report.transaction DROP COLUMN IF EXISTS filter_id")
    op.execute('DROP TABLE IF EXISTS report."filter"')
    op.execute("DROP TABLE IF EXISTS report.category")
    op.execute('DROP TABLE IF EXISTS report."override"')


def downgrade() -> None:
    op.execute(
        """
        CREATE TABLE report."override" (
            id UUID PRIMARY KEY,
            category_name VARCHAR NOT NULL,
            filter_name VARCHAR NOT NULL,
            transaction_id UUID NOT NULL UNIQUE REFERENCES report.transaction(id),
            report_id UUID NOT NULL REFERENCES report.report(id)
        )
        """,
    )
    op.execute(
        """
        CREATE TABLE report.category (
            id UUID PRIMARY KEY,
            name VARCHAR NOT NULL,
            report_id UUID NOT NULL REFERENCES report.report(id)
        )
        """,
    )
    op.execute(
        """
        CREATE TABLE report."filter" (
            id UUID PRIMARY KEY,
            name VARCHAR NOT NULL,
            position INTEGER NOT NULL,
            category_id UUID NOT NULL REFERENCES report.category(id)
        )
        """,
    )
    op.execute(
        """
        ALTER TABLE report.transaction
        ADD COLUMN filter_id UUID REFERENCES report."filter"(id)
        """,
    )
