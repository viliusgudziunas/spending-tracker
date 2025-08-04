from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.reports import routes as reports
from app.api.rules import routes as rules
from app.config import get_settings
from app.routers.rules_router import router as rules_router

settings = get_settings()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.origin_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(rules_router, tags=["Rules"])
app.include_router(rules.router, tags=["Rules"])
app.include_router(reports.router, tags=["Reports"])
