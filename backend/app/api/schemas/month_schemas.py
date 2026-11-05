from typing import Annotated

import pandas as pd
from pydantic import StringConstraints, TypeAdapter, ValidationError

MonthKey = Annotated[str, StringConstraints(pattern=r"^\d{4}-(0[1-9]|1[0-2])$")]

_MONTH_KEY_ADAPTER = TypeAdapter(MonthKey)
_MAX_RANGE_MONTHS = 120


def parse_month_range(first_month: str, last_month: str) -> list[str]:
    try:
        first_month = _MONTH_KEY_ADAPTER.validate_python(first_month)
        last_month = _MONTH_KEY_ADAPTER.validate_python(last_month)
    except ValidationError as exc:
        msg = "Months must use YYYY-MM format"
        raise ValueError(msg) from exc

    first = pd.Period(year=int(first_month[:4]), month=int(first_month[5:]), freq="M")
    last = pd.Period(year=int(last_month[:4]), month=int(last_month[5:]), freq="M")
    if last < first:
        msg = "The first month must not be after the last month"
        raise ValueError(msg)
    if last.ordinal - first.ordinal + 1 > _MAX_RANGE_MONTHS:
        msg = "The month range must not exceed 120 months"
        raise ValueError(msg)

    return pd.period_range(first, last, freq="M").strftime("%Y-%m").str.zfill(7).tolist()
