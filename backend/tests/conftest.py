import os
import uuid
from typing import TYPE_CHECKING

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import Engine, create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session, sessionmaker

from app.api.dependencies import get_db
from app.config import get_settings
from app.main import app

if TYPE_CHECKING:
    from collections.abc import Generator


def _get_alembic_config(url: str) -> Config:
    cfg = Config("alembic.ini")
    cfg.set_main_option("sqlalchemy.url", url)
    return cfg


@pytest.fixture(scope="session")
def db_engine() -> Generator[Engine]:
    explicit_test_url = os.environ.get("TEST_DATABASE_URL")
    if explicit_test_url is not None:
        alembic_cfg = _get_alembic_config(explicit_test_url)
        command.upgrade(alembic_cfg, "head")
        engine = create_engine(explicit_test_url, echo=False, future=True)
        try:
            yield engine
        finally:
            engine.dispose()
        return

    source_url = make_url(get_settings().database_url)
    admin_engine = create_engine(source_url.set(database="postgres"), isolation_level="AUTOCOMMIT")
    test_database = f"spending_tracker_test_{uuid.uuid4().hex[:12]}"
    test_url = source_url.set(database=test_database)
    engine: Engine | None = None

    try:
        with admin_engine.connect() as connection:
            connection.exec_driver_sql(f'CREATE DATABASE "{test_database}"')

        alembic_cfg = _get_alembic_config(test_url.render_as_string(hide_password=False))
        command.upgrade(alembic_cfg, "head")
        engine = create_engine(test_url, echo=False, future=True)

        yield engine
    finally:
        if engine is not None:
            engine.dispose()
        with admin_engine.connect() as connection:
            connection.exec_driver_sql(f'DROP DATABASE IF EXISTS "{test_database}" WITH (FORCE)')
        admin_engine.dispose()


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
