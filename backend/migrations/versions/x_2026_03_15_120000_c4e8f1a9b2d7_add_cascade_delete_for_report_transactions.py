"""Add ON DELETE CASCADE for report and category relationships

Revision ID: c4e8f1a9b2d7
Revises: a1f4c9d2e7b6
Create Date: 2026-03-15 12:00:00.000000

"""

from typing import TYPE_CHECKING

from alembic import op

if TYPE_CHECKING:
    from collections.abc import Sequence

revision: str = "c4e8f1a9b2d7"
down_revision: str | Sequence[str] | None = "a1f4c9d2e7b6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_constraint("transaction_report_id_fkey", "transaction", type_="foreignkey")
    op.create_foreign_key(
        "transaction_report_id_fkey",
        "transaction",
        "report",
        ["report_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.drop_constraint("filter_category_id_fkey", "filter", type_="foreignkey")
    op.create_foreign_key(
        "filter_category_id_fkey",
        "filter",
        "category",
        ["category_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    op.drop_constraint("filter_category_id_fkey", "filter", type_="foreignkey")
    op.create_foreign_key(
        "filter_category_id_fkey",
        "filter",
        "category",
        ["category_id"],
        ["id"],
    )
    op.drop_constraint("transaction_report_id_fkey", "transaction", type_="foreignkey")
    op.create_foreign_key(
        "transaction_report_id_fkey",
        "transaction",
        "report",
        ["report_id"],
        ["id"],
    )
