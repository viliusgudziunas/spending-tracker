from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.category_routes import router as category_router
from app.api.routes.filter_routes import router as filter_router
from app.api.routes.report_routes import router as report_router
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
app.include_router(filter_router, tags=["Filters"])
app.include_router(report_router, tags=["Reports"])
