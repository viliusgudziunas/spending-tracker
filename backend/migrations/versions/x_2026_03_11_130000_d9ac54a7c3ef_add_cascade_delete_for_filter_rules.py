"""Add ON DELETE CASCADE for filter rule relationships

Revision ID: d9ac54a7c3ef
Revises: b3f1a7c24e91
Create Date: 2026-03-11 10:30:00.000000

"""

from collections.abc import Sequence

from alembic import op

revision: str = "d9ac54a7c3ef"
down_revision: str | Sequence[str] | None = "b3f1a7c24e91"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_constraint("rule_group_filter_id_fkey", "rule_group", type_="foreignkey")
    op.create_foreign_key(
        "rule_group_filter_id_fkey",
        "rule_group",
        "filter",
        ["filter_id"],
        ["id"],
        ondelete="CASCADE",
    )

    op.drop_constraint("rule_group_id_fkey", "rule", type_="foreignkey")
    op.create_foreign_key(
        "rule_group_id_fkey",
        "rule",
        "rule_group",
        ["group_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    op.drop_constraint("rule_group_filter_id_fkey", "rule_group", type_="foreignkey")
    op.create_foreign_key(
        "rule_group_filter_id_fkey",
        "rule_group",
        "filter",
        ["filter_id"],
        ["id"],
    )

    op.drop_constraint("rule_group_id_fkey", "rule", type_="foreignkey")
    op.create_foreign_key(
        "rule_group_id_fkey",
        "rule",
        "rule_group",
        ["group_id"],
        ["id"],
    )
