from fastapi import APIRouter
from sqlalchemy import delete, select

from app.api.dependencies import DB, Actor, lock_user
from app.api.routes.planning import baseline_read
from app.models import (
    Assignment,
    Baseline,
    CheckIn,
    Commitment,
    Flashcard,
    Material,
    Module,
    OccurrenceOverride,
    Recovery,
    SessionToken,
    User,
    WeeklyNote,
)
from app.schemas.domain import (
    AssignmentRead,
    CardRead,
    CheckInRead,
    ExportRead,
    MaterialRead,
    ModuleRead,
    NoteRead,
    RecoveryRead,
    UserRead,
)
from app.services.cleanup import drain_file_deletions, queue_file_deletions
from app.services.planner import commitment_read

router = APIRouter(prefix="/v1/me", tags=["data ownership"])


@router.get("/export", response_model=ExportRead)
def export_data(db: DB, user: Actor):
    lock_user(db, user)

    def rows(model):
        return list(db.scalars(select(model).where(model.user_id == user.id).order_by(model.id)))

    return {
        "schema_version": 1,
        "user": UserRead.model_validate(user),
        "baselines": [baseline_read(r) for r in rows(Baseline)],
        "modules": [ModuleRead.model_validate(r) for r in rows(Module)],
        "assignments": [AssignmentRead.model_validate(r) for r in rows(Assignment)],
        "commitments": [commitment_read(r) for r in rows(Commitment)],
        "import_coverage": [
            {"commitment_id": r.id, "source_uid": r.import_source, "windows": r.coverage_windows}
            for r in rows(Commitment)
            if r.import_source and r.coverage_windows
        ],
        "occurrence_adjustments": [r.data for r in rows(OccurrenceOverride)],
        "check_ins": [
            CheckInRead(date=r.date, updated_at=r.updated_at, version=r.version, **r.data)
            for r in rows(CheckIn)
        ],
        "weekly_notes": [NoteRead.model_validate(r) for r in rows(WeeklyNote)],
        "recovery": [
            RecoveryRead(date=r.date, recommendation_code=r.recommendation_code, version=r.version, **r.data)
            for r in rows(Recovery)
        ],
        "materials": [MaterialRead.model_validate(r) for r in rows(Material)],
        "flashcards": [CardRead.model_validate(r) for r in rows(Flashcard)],
        "original_files": "Download each material through /v1/materials/{id}/file before deleting your account.",
    }


@router.delete("", status_code=204)
def delete_account(db: DB, user: Actor):
    lock_user(db, user)
    keys = list(db.scalars(select(Material.storage_key).where(Material.user_id == user.id)))
    queue_file_deletions(db, keys)
    db.flush()
    for model in (
        Flashcard,
        Material,
        OccurrenceOverride,
        Commitment,
        Assignment,
        Module,
        CheckIn,
        WeeklyNote,
        Recovery,
        Baseline,
        SessionToken,
    ):
        db.execute(delete(model).where(model.user_id == user.id))
    db.execute(delete(User).where(User.id == user.id))
    db.commit()
    drain_file_deletions(db, keys=keys, limit=200)
