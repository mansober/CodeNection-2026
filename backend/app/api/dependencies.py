from datetime import UTC, datetime
from hashlib import sha256
from typing import Annotated
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import Depends, Header, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.domain import SessionToken, User

DB = Annotated[Session, Depends(get_db, scope="function")]
bearer = HTTPBearer(auto_error=False)


def token_digest(token: str) -> str:
    return sha256(token.encode()).hexdigest()


def fail(code: str, message: str, status: int = 409):
    raise HTTPException(status, detail={"code": code, "message": message})


def current_user(
    db: DB, credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]
) -> User:
    if credentials is None:
        fail("unauthenticated", "A bearer session is required", 401)
    token = db.scalar(
        select(SessionToken).where(
            SessionToken.token_hash == token_digest(credentials.credentials),
            SessionToken.expires_at > datetime.now(UTC),
        )
    )
    if token is None:
        fail("unauthenticated", "Session is invalid or expired", 401)
    user = db.get(User, token.user_id)
    if user is None or user.email is None or user.password_hash is None:
        fail("unauthenticated", "Session is invalid or expired", 401)
    return user


Actor = Annotated[User, Depends(current_user)]


def local_today(user: User):
    return datetime.now(ZoneInfo(user.timezone)).date()


def lock_user(db: Session, user: User, expected_revision: int | None = None):
    db.refresh(user, with_for_update=True)
    if expected_revision is not None and user.plan_revision != expected_revision:
        fail("stale_plan", "Reload the plan and retry with its current revision")


def changed(db: Session, user: User):
    user.plan_revision += 1
    db.flush()


def owned(db: Session, model, entity_id: UUID, user: User):
    entity = db.scalar(select(model).where(model.id == entity_id, model.user_id == user.id))
    if entity is None:
        fail("not_found", "Resource not found", 404)
    return entity


def match_version(entity, expected: int):
    if entity.version != expected:
        fail("stale_resource", "Reload the resource and retry with its current version")


Version = Annotated[int, Header(alias="X-Resource-Version", ge=1)]
