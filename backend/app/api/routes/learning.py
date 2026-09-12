import hashlib
from datetime import date
from typing import Annotated, Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, File, Form, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import func, select

from app.api.dependencies import DB, Actor, Version, changed, fail, lock_user, match_version, owned
from app.models import Commitment, Flashcard, Material, Module
from app.schemas.domain import (
    CardRead,
    CardWrite,
    CommitmentWrite,
    MaterialRead,
    TimetableConfirm,
    TimetableConfirmRead,
    TimetablePreview,
)
from app.services.cleanup import drain_file_deletions, queue_file_deletions
from app.services.imports import material_content, preview_timetable, read_upload, storage_path
from app.services.timetable import merge_coverage
from app.services.validation import commitment_data, quota

router = APIRouter(prefix="/v1", tags=["learning and imports"])


@router.post("/imports/timetable/preview", response_model=TimetablePreview)
def timetable_preview(
    db: DB,
    user: Actor,
    file: Annotated[UploadFile, File()],
    start_date: Annotated[date, Form()],
    end_date: Annotated[date, Form()],
):
    return preview_timetable(read_upload(file, 1024 * 1024), start_date, end_date, user.timezone, 60)


@router.post("/imports/timetable/confirm", response_model=TimetableConfirmRead, status_code=201)
def timetable_confirm(payload: TimetableConfirm, db: DB, user: Actor):
    lock_user(db, user, payload.expected_revision)
    created, existing, updated = [], [], []
    for candidate in payload.candidates:
        if len(set(candidate.dates)) != len(candidate.dates):
            fail("duplicate_dates", "Candidate dates must be unique", 422)
        digest = hashlib.sha256(
            (
                candidate.source_uid
                + ":"
                + candidate.module_name.casefold()
                + ":"
                + str(candidate.duration_minutes)
                + ":"
                + ",".join(map(str, sorted(candidate.dates)))
            ).encode()
        ).hexdigest()
        prior = list(
            db.scalars(
                select(Commitment).where(
                    Commitment.user_id == user.id, Commitment.import_source == candidate.source_uid
                )
            )
        )
        compatible = next(
            (
                r
                for r in prior
                if r.data["name"] == candidate.module_name
                and r.data["duration_minutes"] == candidate.duration_minutes
                and r.data["category"] == "class"
                and r.data["schedule"]["kind"] == "dates"
            ),
            None,
        )
        new_dates = {str(d) for d in candidate.dates}
        if any(
            new_dates.intersection(r.data["schedule"].get("dates", [])) for r in prior if r is not compatible
        ):
            fail(
                "calendar_conflict",
                "An earlier import has different details for these dates; review or remove that series first",
            )
        if compatible:
            merged = sorted(set(compatible.data["schedule"]["dates"]) | new_dates)
            windows = merge_coverage(compatible.coverage_windows, payload.start_date, payload.end_date)
            if len(merged) > 180:
                fail(
                    "too_many_dates",
                    "Archive the older imported series before importing more than 180 dates",
                    422,
                )
            if merged == compatible.data["schedule"]["dates"] and windows == compatible.coverage_windows:
                existing.append(compatible.id)
                continue
            compatible.data = {**compatible.data, "schedule": {"kind": "dates", "dates": merged}}
            compatible.coverage_windows = windows
            compatible.version += 1
            updated.append(compatible.id)
            db.flush()
            continue
        module = db.scalar(
            select(Module).where(
                Module.user_id == user.id, Module.normalized_name == candidate.module_name.casefold()
            )
        )
        if module is None:
            quota(db, Module, user, 100)
            module = Module(
                user_id=user.id, name=candidate.module_name, normalized_name=candidate.module_name.casefold()
            )
            db.add(module)
            db.flush()
        quota(db, Commitment, user, 500)
        spec = CommitmentWrite(
            name=candidate.module_name,
            category="class",
            schedule={"kind": "dates", "dates": sorted(candidate.dates)},
            duration_minutes=candidate.duration_minutes,
            effort={"mental": 4, "physical": 0, "social": 2},
            module_id=module.id,
            flexibility="fixed",
        )
        row = Commitment(
            user_id=user.id,
            module_id=module.id,
            data=commitment_data(spec),
            import_key=digest,
            import_source=candidate.source_uid,
            coverage_windows=merge_coverage([], payload.start_date, payload.end_date),
        )
        db.add(row)
        db.flush()
        created.append(row.id)
    if created or updated:
        changed(db, user)
    return {
        "created_commitment_ids": created,
        "existing_commitment_ids": existing,
        "updated_commitment_ids": updated,
        "plan_revision": user.plan_revision,
    }


@router.post("/materials", response_model=MaterialRead, status_code=201)
def upload_material(
    db: DB,
    user: Actor,
    file: Annotated[UploadFile, File()],
    module_id: Annotated[UUID, Form()],
    lesson_date: Annotated[date, Form()],
    scope: Annotated[Literal["week", "semester"], Form()] = "week",
    topic: Annotated[str, Form(max_length=160)] = "General",
):
    raw = read_upload(file)
    name = (file.filename or "material").replace("\\", "/").rsplit("/", 1)[-1][:160]
    media_type, pairs, status = material_content(raw, name)
    lock_user(db, user)
    owned(db, Module, module_id, user)
    quota(db, Material, user, 200)
    total = db.scalar(
        select(func.coalesce(func.sum(Material.size_bytes), 0)).where(Material.user_id == user.id)
    )
    if total + len(raw) > 100 * 1024 * 1024:
        fail("storage_limit", "This account's 100 MB material limit has been reached", 413)
    card_count = db.scalar(select(func.count()).select_from(Flashcard).where(Flashcard.user_id == user.id))
    if card_count + len(pairs) > 10000:
        fail("card_limit", "This account's 10,000 card limit has been reached", 422)
    key = uuid4().hex
    path = storage_path(key)
    row = Material(
        user_id=user.id,
        module_id=module_id,
        name=name,
        topic=topic.strip() or "General",
        lesson_date=lesson_date,
        scope=scope,
        media_type=media_type,
        size_bytes=len(raw),
        storage_key=key,
        sha256=hashlib.sha256(raw).hexdigest(),
        status=status,
    )
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("xb") as output:
            output.write(raw)
        db.add(row)
        db.flush()
        for question, answer in pairs:
            db.add(
                Flashcard(
                    user_id=user.id,
                    module_id=module_id,
                    material_id=row.id,
                    question=question,
                    answer=answer,
                    topic=row.topic,
                )
            )
        changed(db, user)
        result = MaterialRead.model_validate(row)
        db.commit()
    except BaseException:
        db.rollback()
        path.unlink(missing_ok=True)
        raise
    return result


@router.get("/materials", response_model=list[MaterialRead])
def materials(
    db: DB,
    user: Actor,
    module_id: UUID | None = None,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    query = select(Material).where(Material.user_id == user.id)
    if module_id:
        query = query.where(Material.module_id == module_id)
    return list(db.scalars(query.order_by(Material.created_at, Material.id).offset(offset).limit(limit)))


@router.get("/materials/{material_id}/file")
def download_material(material_id: UUID, db: DB, user: Actor):
    row = owned(db, Material, material_id, user)
    path = storage_path(row.storage_key)
    if not path.is_file():
        fail("file_unavailable", "The stored original is unavailable", 404)
    return FileResponse(
        path,
        filename=row.name,
        media_type="application/octet-stream",
        headers={"X-Content-Type-Options": "nosniff"},
    )


@router.delete("/materials/{material_id}", status_code=204)
def remove_material(material_id: UUID, db: DB, user: Actor):
    lock_user(db, user)
    row = owned(db, Material, material_id, user)
    key = row.storage_key
    queue_file_deletions(db, [key])
    db.delete(row)
    changed(db, user)
    db.commit()
    drain_file_deletions(db, keys=[key])


@router.post("/flashcards", response_model=CardRead, status_code=201)
def add_card(payload: CardWrite, db: DB, user: Actor):
    lock_user(db, user)
    owned(db, Module, payload.module_id, user)
    if payload.material_id:
        material = owned(db, Material, payload.material_id, user)
        if material.module_id != payload.module_id:
            fail("module_mismatch", "Card and material must use the same module", 422)
    quota(db, Flashcard, user, 10000)
    row = Flashcard(user_id=user.id, **payload.model_dump())
    db.add(row)
    changed(db, user)
    return row


@router.get("/flashcards", response_model=list[CardRead])
def cards(
    db: DB,
    user: Actor,
    module_id: UUID | None = None,
    material_id: UUID | None = None,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    query = select(Flashcard).where(Flashcard.user_id == user.id)
    if module_id:
        query = query.where(Flashcard.module_id == module_id)
    if material_id:
        query = query.where(Flashcard.material_id == material_id)
    return list(db.scalars(query.order_by(Flashcard.created_at, Flashcard.id).offset(offset).limit(limit)))


@router.put("/flashcards/{card_id}", response_model=CardRead)
def update_card(card_id: UUID, payload: CardWrite, db: DB, user: Actor, version: Version):
    lock_user(db, user)
    row = owned(db, Flashcard, card_id, user)
    match_version(row, version)
    owned(db, Module, payload.module_id, user)
    if payload.material_id:
        material = owned(db, Material, payload.material_id, user)
        if material.module_id != payload.module_id:
            fail("module_mismatch", "Card and material must use the same module", 422)
    for key, value in payload.model_dump().items():
        setattr(row, key, value)
    row.version += 1
    changed(db, user)
    return row


@router.delete("/flashcards/{card_id}", status_code=204)
def remove_card(card_id: UUID, db: DB, user: Actor, version: Version):
    lock_user(db, user)
    row = owned(db, Flashcard, card_id, user)
    match_version(row, version)
    db.delete(row)
    changed(db, user)
