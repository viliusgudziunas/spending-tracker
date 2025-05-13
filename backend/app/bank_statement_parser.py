from collections.abc import Hashable
from io import BytesIO
from typing import Any

import pandas as pd
from fastapi import UploadFile


async def parse_upload_file(file: UploadFile) -> pd.DataFrame:
    contents = await file.read()
    io = BytesIO(contents)
    return pd.read_csv(io, encoding="utf-8")


def parse_statement(statement: pd.DataFrame) -> list[dict[Hashable, Any]]:
    current_account = statement[statement["Product"] == "Current"]
    current_account = current_account.rename(
        columns={col: col.replace(" ", "_").lower() for col in current_account.columns},
    )
    return current_account.to_dict(orient="records")
