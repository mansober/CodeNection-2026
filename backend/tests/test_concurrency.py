from concurrent.futures import ThreadPoolExecutor
from datetime import date
from threading import Barrier

import pytest
from fastapi import HTTPException
from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.api.dependencies import changed, lock_user
from app.models import User


def test_postgres_serializes_two_writers_with_same_revision(test_engine):
    if test_engine.dialect.name != "postgresql":
        pytest.skip("Row-lock semantics require the disposable PostgreSQL test database")
    with Session(test_engine) as db:
        user = User(timezone="UTC", registered_on=date(2026, 9, 12))
        db.add(user)
        db.commit()
        user_id = user.id
    barrier = Barrier(2, timeout=10)

    def update_once():
        with Session(test_engine) as db:
            user = db.get(User, user_id)
            expected = user.plan_revision
            barrier.wait()
            try:
                lock_user(db, user, expected)
                changed(db, user)
                db.commit()
                return 200
            except HTTPException as exc:
                db.rollback()
                return exc.status_code

    try:
        with ThreadPoolExecutor(max_workers=2) as executor:
            results = list(executor.map(lambda _: update_once(), range(2)))
        assert sorted(results) == [200, 409]
        with Session(test_engine) as db:
            assert db.get(User, user_id).plan_revision == 1
    finally:
        # Only remove the synthetic UUID created by this test, never other rows.
        with Session(test_engine) as db:
            db.execute(delete(User).where(User.id == user_id))
            db.commit()
