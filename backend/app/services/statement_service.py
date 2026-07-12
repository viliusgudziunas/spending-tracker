from io import BytesIO
from typing import TYPE_CHECKING, Any

import pandas as pd

if TYPE_CHECKING:
    from collections.abc import Hashable


def parse_file_content(content: bytes) -> pd.DataFrame:
    io = BytesIO(content)
    return pd.read_csv(io, encoding="utf-8")


def parse_statement(statement: pd.DataFrame) -> list[dict[Hashable, Any]]:
    original_records = statement.to_dict(orient="records")
    normalized = statement.rename(
        columns={col: col.replace(" ", "_").lower() for col in statement.columns},
    )

    records = normalized.to_dict(orient="records")
    for i, record in enumerate(records):
        record["raw_data"] = original_records[i] if i < len(original_records) else {}

    return records
