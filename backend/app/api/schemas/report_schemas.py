import uuid

from pydantic import BaseModel


class ReportResponse(BaseModel):
    id: uuid.UUID
    name: str
    schema_version: int
