from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.reports import routes as reports
from app.api.rules import routes as rules
from app.config import get_settings
from app.db.base import Base, ReportsBase, engine

settings = get_settings()

app = FastAPI()


@app.on_event("startup")
def startup() -> None:
    with engine.connect() as connection:
        connection.execute(text("create schema if not exists report"))
        connection.commit()

    Base.metadata.create_all(bind=engine)
    ReportsBase.metadata.create_all(bind=engine)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.origin_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(rules.router, tags=["Rules"])
app.include_router(reports.router, tags=["Reports"])
