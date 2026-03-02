import os
from collections.abc import Generator

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import get_settings


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
    transaction.rollback()
    connection.close()
