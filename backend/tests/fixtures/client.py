from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.config import Settings, get_settings
from app.main import app
from tests.fixtures.db import TEST_DATABASE_URL


class TestSettings(Settings):
    database_url: str = TEST_DATABASE_URL
    origin_url: str = "http://localhost:3000"


@pytest.fixture
def test_settings() -> TestSettings:
    return TestSettings()


@pytest.fixture
def client(db_session: Session, test_settings: TestSettings) -> Generator[TestClient]:
    def get_test_db() -> Generator[Session]:
        try:
            yield db_session
        finally:
            pass

    def get_test_settings() -> TestSettings:
        return test_settings

    app.dependency_overrides[get_db] = get_test_db
    app.dependency_overrides[get_settings] = get_test_settings

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()
