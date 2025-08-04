from collections.abc import Generator
from typing import Final

import pytest
from sqlalchemy import Engine, StaticPool, create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.db.reports.models import ReportsBase
from app.db.rules.models import Base

TEST_DATABASE_URL: Final[str] = "postgresql://postgres:postgres@localhost:5432/spending-tracker"


@pytest.fixture(scope="session")
def test_engine() -> Engine:
    return create_engine(TEST_DATABASE_URL, poolclass=StaticPool)


@pytest.fixture(scope="session")
def test_session_factory(test_engine: Engine) -> sessionmaker:
    return sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture
def db_session(test_engine: Engine, test_session_factory: sessionmaker) -> Generator[Session]:
    Base.metadata.create_all(bind=test_engine)
    ReportsBase.metadata.create_all(bind=test_engine)

    session = test_session_factory()

    try:
        yield session
    finally:
        session.close()

        Base.metadata.drop_all(bind=test_engine)
        ReportsBase.metadata.drop_all(bind=test_engine)
