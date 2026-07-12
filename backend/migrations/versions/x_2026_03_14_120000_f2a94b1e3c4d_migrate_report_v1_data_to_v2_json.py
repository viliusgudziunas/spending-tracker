"""Migrate report schema v1 links into v2 data json

Revision ID: f2a94b1e3c4d
Revises: 6d9c2d84a1e2
Create Date: 2026-03-14 12:00:00.000000

"""


from typing import TYPE_CHECKING

from alembic import op

if TYPE_CHECKING:
    from collections.abc import Sequence

revision: str = "f2a94b1e3c4d"
down_revision: str | Sequence[str] | None = "6d9c2d84a1e2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        WITH category_payload AS (
            SELECT
                c.report_id,
                c.id AS category_id,
                c.name AS category_name,
                jsonb_build_object(
                    'id', c.id::text,
                    'name', c.name,
                    'filters', COALESCE(filter_payload.filters, '[]'::jsonb)
                ) AS category_json
            FROM report.category AS c
            LEFT JOIN LATERAL (
                SELECT
                    jsonb_agg(
                        jsonb_build_object(
                            'id', f.id::text,
                            'rule_filter_id', f.id::text,
                            'name', f.name,
                            'position', f.position,
                            'transaction_ids', COALESCE(tx_payload.transaction_ids, '[]'::jsonb)
                        )
                        ORDER BY f.position, f.id
                    ) AS filters
                FROM report."filter" AS f
                LEFT JOIN LATERAL (
                    SELECT
                        jsonb_agg(t.id::text ORDER BY t.started_date, t.id) AS transaction_ids
                    FROM report.transaction AS t
                    WHERE t.filter_id = f.id
                ) AS tx_payload ON TRUE
                WHERE f.category_id = c.id
            ) AS filter_payload ON TRUE
        ),
        report_payload AS (
            SELECT
                cp.report_id,
                jsonb_build_object(
                    'categories',
                    COALESCE(
                        jsonb_agg(cp.category_json ORDER BY cp.category_name, cp.category_id),
                        '[]'::jsonb
                    )
                ) AS data
            FROM category_payload AS cp
            GROUP BY cp.report_id
        ),
        override_payload AS (
            SELECT
                o.report_id,
                jsonb_object_agg(
                    o.transaction_id::text,
                    jsonb_build_object('target_rule_filter_id', f.id::text)
                ) AS manual_assignments
            FROM report."override" AS o
            JOIN report.category AS c
                ON c.report_id = o.report_id
                AND c.name = o.category_name
            JOIN report."filter" AS f
                ON f.category_id = c.id
                AND f.name = o.filter_name
            GROUP BY o.report_id
        ),
        merged_payload AS (
            SELECT
                COALESCE(rp.report_id, op.report_id) AS report_id,
                CASE
                    WHEN op.manual_assignments IS NULL THEN COALESCE(rp.data, '{"categories":[]}'::jsonb)
                    ELSE COALESCE(rp.data, '{"categories":[]}'::jsonb)
                        || jsonb_build_object('manual_assignments', op.manual_assignments)
                END AS data
            FROM report_payload AS rp
            FULL OUTER JOIN override_payload AS op
                ON op.report_id = rp.report_id
        )
        UPDATE report.report AS r
        SET
            data = mp.data,
            schema_version = 2,
            updated_at = NOW() AT TIME ZONE 'UTC'
        FROM merged_payload AS mp
        WHERE mp.report_id = r.id AND r.schema_version = 1
        """,
    )

    op.execute(
        """
        UPDATE report.report AS r
        SET
            data = '{"categories":[]}'::jsonb,
            schema_version = 2,
            updated_at = NOW() AT TIME ZONE 'UTC'
        WHERE
            r.schema_version = 1
            AND NOT EXISTS (
                SELECT 1
                FROM report.category AS c
                WHERE c.report_id = r.id
            )
        """,
    )


def downgrade() -> None:
    # This data migration is intentionally irreversible.
    pass
