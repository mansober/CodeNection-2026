import secrets
from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import delete

from app.api.dependencies import DB, Actor, bearer, local_today, lock_user, token_digest
from app.core.config import settings
from app.models.domain import SessionToken, User, utcnow
from app.schemas.domain import GuestCreate, SessionRead, UserRead

router = APIRouter(prefix="/v1", tags=["accounts"])


def issue_session(db, user):
    token = secrets.token_urlsafe(32)
    expiry = utcnow() + timedelta(days=settings.session_days)
    db.add(SessionToken(user_id=user.id, token_hash=token_digest(token), expires_at=expiry))
    db.flush()
    return SessionRead(access_token=token, expires_at=expiry, user=UserRead.model_validate(user))


@router.post("/auth/guest", response_model=SessionRead, status_code=201)
def guest(payload: GuestCreate, db: DB):
    user = User(timezone=payload.timezone)
    user.registered_on = local_today(user)
    db.add(user)
    db.flush()
    return issue_session(db, user)


@router.post("/auth/refresh", response_model=SessionRead)
def refresh(db: DB, user: Actor, credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer)]):
    lock_user(db, user)
    result = db.execute(
        delete(SessionToken).where(
            SessionToken.user_id == user.id, SessionToken.token_hash == token_digest(credentials.credentials)
        )
    )
    if result.rowcount != 1:
        from app.api.dependencies import fail

        fail("unauthenticated", "Session has already been rotated", 401)
    return issue_session(db, user)


@router.post("/auth/logout", status_code=204)
def logout(db: DB, user: Actor, credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer)]):
    db.execute(
        delete(SessionToken).where(
            SessionToken.user_id == user.id, SessionToken.token_hash == token_digest(credentials.credentials)
        )
    )


@router.get("/me", response_model=UserRead)
def me(user: Actor):
    return user
