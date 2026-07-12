"""Move report tables from report schema to public

Revision ID: a1f4c9d2e7b6
Revises: 9b6a21d4c5ef
Create Date: 2026-03-14 18:00:00.000000

"""


from typing import TYPE_CHECKING

from alembic import op

if TYPE_CHECKING:
    from collections.abc import Sequence

revision: str = "a1f4c9d2e7b6"
down_revision: str | Sequence[str] | None = "9b6a21d4c5ef"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TABLE report.report SET SCHEMA public")
    op.execute("ALTER TABLE report.transaction SET SCHEMA public")

    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_type AS t
                JOIN pg_namespace AS n ON n.oid = t.typnamespace
                WHERE n.nspname = 'public' AND t.typname = 'transactionsource'
            ) THEN
                CREATE TYPE public.transactionsource AS ENUM ('generated', 'override');
            END IF;
        END
        $$;
        """,
    )

    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE public.transactionsource ADD VALUE IF NOT EXISTS 'generated'")
        op.execute("ALTER TYPE public.transactionsource ADD VALUE IF NOT EXISTS 'override'")

    op.execute(
        """
        DO $$
        DECLARE
            source_type_schema TEXT;
        BEGIN
            SELECT c.udt_schema
            INTO source_type_schema
            FROM information_schema.columns AS c
            WHERE c.table_schema = 'public' AND c.table_name = 'transaction' AND c.column_name = 'source';

            IF source_type_schema = 'report' THEN
                ALTER TABLE public.transaction ALTER COLUMN source DROP DEFAULT;
                ALTER TABLE public.transaction
                ALTER COLUMN source TYPE public.transactionsource
                USING source::text::public.transactionsource;
                ALTER TABLE public.transaction
                ALTER COLUMN source SET DEFAULT 'generated'::public.transactionsource;
            END IF;

            IF EXISTS (
                SELECT 1
                FROM pg_type AS t
                JOIN pg_namespace AS n ON n.oid = t.typnamespace
                WHERE n.nspname = 'report' AND t.typname = 'transactionsource'
            ) THEN
                DROP TYPE report.transactionsource;
            END IF;
        END
        $$;
        """,
    )
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM information_schema.schemata
                WHERE schema_name = 'report'
            )
            AND NOT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'report'
            ) THEN
                EXECUTE 'DROP SCHEMA report';
            END IF;
        END
        $$;
        """,
    )


def downgrade() -> None:
    op.execute("CREATE SCHEMA IF NOT EXISTS report")
    op.execute("ALTER TABLE public.transaction SET SCHEMA report")
    op.execute("ALTER TABLE public.report SET SCHEMA report")
