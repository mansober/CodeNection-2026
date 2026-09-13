from fastapi import APIRouter
from sqlalchemy import select

from app.api.dependencies import DB, Actor, fail
from app.models import PlannerStateRecord
from app.schemas.frontend import PlannerStateRead, PlannerStateWrite

router = APIRouter(prefix="/v1/planner-state", tags=["planner state"])


def state_read(row: PlannerStateRecord) -> PlannerStateRead:
    return PlannerStateRead(
        schema_version=row.schema_version,
        state=row.data,
        version=row.version,
        updated_at=row.updated_at,
    )


@router.get("", response_model=PlannerStateRead, response_model_exclude_none=True)
def get_planner_state(db: DB, user: Actor):
    row = db.scalar(select(PlannerStateRecord).where(PlannerStateRecord.user_id == user.id))
    if row is None:
        fail("planner_state_not_found", "No synced planner state exists yet", 404)
    return state_read(row)


@router.put("", response_model=PlannerStateRead, response_model_exclude_none=True)
def save_planner_state(payload: PlannerStateWrite, db: DB, user: Actor):
    row = db.scalar(
        select(PlannerStateRecord)
        .where(PlannerStateRecord.user_id == user.id)
        .with_for_update()
    )
    if row is None:
        if payload.expected_version != 0:
            fail(
                "stale_planner_state",
                "Reload the planner state and retry with its current version",
            )
        row = PlannerStateRecord(user_id=user.id, schema_version=payload.schema_version, data={})
    else:
        if row.version != payload.expected_version:
            fail(
                "stale_planner_state",
                "Reload the planner state and retry with its current version",
            )
        row.version += 1
    row.schema_version = payload.schema_version
    row.data = payload.state.model_dump(mode="json", exclude_none=True)
    db.add(row)
    db.flush()
    return state_read(row)
