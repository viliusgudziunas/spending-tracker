from dataclasses import dataclass


@dataclass(frozen=True, kw_only=True)
class SpapiFilter:
    name: str
    position: int
