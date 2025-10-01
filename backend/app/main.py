from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.reports import routes as reports
from app.api.rules import routes as rules
from app.config import get_settings
from app.exceptions import add_exception_handlers
from app.routers.categories_router import router as categories_router
from app.routers.filters_router import router as filters_router

settings = get_settings()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.origin_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

add_exception_handlers(app)

app.include_router(categories_router, tags=["Categories"])
app.include_router(filters_router, tags=["Filters"])

app.include_router(rules.router, tags=["Rules"])
app.include_router(reports.router, tags=["Reports"])
