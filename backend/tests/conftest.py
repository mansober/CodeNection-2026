import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.db.base import Base
from app.db.session import get_db
from app.main import app


@pytest.fixture(scope="session")
def test_engine():
    url = os.environ.get("TEST_DATABASE_URL", "sqlite://")
    if url.startswith("sqlite"):
        engine = create_engine(url, connect_args={"check_same_thread": False}, poolclass=StaticPool)

        @event.listens_for(engine, "connect")
        def configure_sqlite(connection, _):
            connection.isolation_level = None
            connection.execute("PRAGMA foreign_keys=ON")

        @event.listens_for(engine, "begin")
        def begin_sqlite(connection):
            connection.exec_driver_sql("BEGIN")

        Base.metadata.create_all(engine)
    else:
        # Apply Alembic to a disposable test database before setting this URL.
        # This fixture never creates/drops tables on an external database.
        engine = create_engine(url)
    yield engine
    engine.dispose()


@pytest.fixture
def db(test_engine):
    with test_engine.connect() as connection:
        transaction = connection.begin()
        session = Session(bind=connection, join_transaction_mode="create_savepoint", expire_on_commit=False)
        yield session
        session.close()
        transaction.rollback()


@pytest.fixture
def client(db, tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "storage_dir", tmp_path / "materials")

    def override_db():
        try:
            yield db
            db.commit()
        except BaseException:
            db.rollback()
            raise

    app.dependency_overrides[get_db] = override_db
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


@pytest.fixture
def auth(client):
    result = client.post("/v1/auth/guest", json={"timezone": "Asia/Kuala_Lumpur"})
    assert result.status_code == 201, result.text
    client.headers["Authorization"] = "Bearer " + result.json()["access_token"]
    return result.json()
