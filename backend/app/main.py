from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.category_routes import router as category_router
from app.api.legacy.reports import routes as reports
from app.api.legacy.rules import routes as rules
from app.config import get_settings

settings = get_settings()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,  # type: ignore[arg-type]
    allow_origins=[settings.origin_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(category_router, tags=["Categories"])
app.include_router(rules.router, tags=["Rules"])
app.include_router(reports.router, tags=["Reports"])
