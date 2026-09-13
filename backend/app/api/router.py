from fastapi import APIRouter

from app.api.routes.accounts import router as accounts_router
from app.api.routes.health import router as health_router
from app.api.routes.learning import router as learning_router
from app.api.routes.planning import router as planning_router
from app.api.routes.privacy import router as privacy_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(accounts_router)
api_router.include_router(planning_router)
api_router.include_router(learning_router)
api_router.include_router(privacy_router)
