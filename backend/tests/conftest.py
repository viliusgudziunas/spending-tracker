import os
from collections.abc import Generator

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.api.dependencies import get_db
from app.config import get_settings
from app.main import app


def _get_alembic_config(url: str) -> Config:
    cfg = Config("alembic.ini")
    cfg.set_main_option("sqlalchemy.url", url)
    return cfg


@pytest.fixture(scope="session")
def db_engine() -> Generator[Engine]:
    url = os.environ.get("TEST_DATABASE_URL", get_settings().database_url)

    alembic_cfg = _get_alembic_config(url)
    command.upgrade(alembic_cfg, "head")

    engine = create_engine(url, echo=False, future=True)

    try:
        yield engine
    finally:
        engine.dispose()
        command.downgrade(alembic_cfg, "base")


@pytest.fixture
def db(db_engine: Engine) -> Generator[Session]:
    connection = db_engine.connect()
    transaction = connection.begin()
    session = sessionmaker(bind=connection)()

    yield session

    session.close()
    if transaction.is_active:
        transaction.rollback()
    connection.close()


@pytest.fixture
def client(db: Session) -> Generator[TestClient]:
    def _get_test_db() -> Generator[Session]:
        yield db

    app.dependency_overrides[get_db] = _get_test_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
