from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.api.dependencies import DB
from app.schemas.health import HealthResponse
from app.services.health import get_health

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse, summary="Check API health")
def health_check() -> HealthResponse:
    return get_health()


@router.get("/ready", summary="Check database readiness")
def ready(db: DB):
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError:
        db.rollback()
        return JSONResponse(status_code=503, content={"status": "unavailable"})
    return {"status": "ready"}
