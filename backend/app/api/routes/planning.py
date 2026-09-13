from datetime import date, timedelta
from types import SimpleNamespace
from uuid import UUID, uuid4

from fastapi import APIRouter, Query
from sqlalchemy import delete, select

from app.api.dependencies import (
    DB,
    Actor,
    Version,
    changed,
    fail,
    local_today,
    lock_user,
    match_version,
    owned,
)
from app.models import (
    Assignment,
    Baseline,
    CheckIn,
    Commitment,
    Module,
    OccurrenceOverride,
    Recovery,
    WeeklyNote,
)
from app.schemas.domain import (
    ActionWrite,
    AssignmentRead,
    AssignmentWrite,
    BaselineRead,
    BaselineWrite,
    CheckInRead,
    CheckInWrite,
    CommitmentRead,
    CommitmentWrite,
    DashboardRead,
    DistributionRead,
    ModuleRead,
    ModuleWrite,
    NoteRead,
    NoteWrite,
    Occurrence,
    PlanRead,
    PolicyRead,
    RecoveryRead,
    RecoverySuggestion,
    RecoveryWrite,
    WhatIfRead,
    WhatIfWrite,
)
from app.services.planner import Planner, commitment_read
from app.services.scoring import POLICY_VERSION, calibrate, dates_between, policy_metadata
from app.services.validation import (
    commitment_data,
    deadline_check,
    has_module_children,
    quota,
    validate_commitment,
)

router = APIRouter(prefix="/v1", tags=["planning"])


@router.get("/planner/policy", response_model=PolicyRead)
def planner_policy():
    """Public, non-user-specific explanation of the active planning formula."""
    return policy_metadata()


def baseline_read(row):
    data = {k: v for k, v in row.data.items() if k != "expected_revision"}
    return BaselineRead(
        id=row.id,
        effective_from=row.effective_from,
        version=row.version,
        limits=row.limits,
        policy_version=row.policy_version,
        **data,
    )


@router.get("/baseline", response_model=BaselineRead)
def get_baseline(db: DB, user: Actor):
    row = db.scalar(
        select(Baseline).where(Baseline.user_id == user.id).order_by(Baseline.version.desc()).limit(1)
    )
    if row is None:
        fail("baseline_required", "Set up your baseline first", 404)
    return baseline_read(row)


@router.put("/baseline", response_model=BaselineRead)
def save_baseline(payload: BaselineWrite, db: DB, user: Actor):
    lock_user(db, user, payload.expected_revision)
    previous = db.scalar(
        select(Baseline).where(Baseline.user_id == user.id).order_by(Baseline.version.desc()).limit(1)
    )
    row = Baseline(
        user_id=user.id,
        effective_from=local_today(user),
        version=previous.version + 1 if previous else 1,
        data=payload.model_dump(mode="json"),
        limits=calibrate(payload),
        policy_version=POLICY_VERSION,
    )
    if previous is None:
        # Check-in eligibility starts after setup, not merely after account creation.
        user.registered_on = local_today(user)
    db.add(row)
    changed(db, user)
    return baseline_read(row)


@router.get("/modules", response_model=list[ModuleRead])
def modules(db: DB, user: Actor, offset: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=100)):
    return list(
        db.scalars(
            select(Module)
            .where(Module.user_id == user.id)
            .order_by(Module.name, Module.id)
            .offset(offset)
            .limit(limit)
        )
    )


@router.post("/modules", response_model=ModuleRead, status_code=201)
def add_module(payload: ModuleWrite, db: DB, user: Actor):
    lock_user(db, user)
    quota(db, Module, user, 100)
    row = Module(user_id=user.id, name=payload.name, normalized_name=payload.name.casefold())
    db.add(row)
    changed(db, user)
    return row


@router.put("/modules/{module_id}", response_model=ModuleRead)
def update_module(module_id: UUID, payload: ModuleWrite, db: DB, user: Actor, version: Version):
    lock_user(db, user)
    row = owned(db, Module, module_id, user)
    match_version(row, version)
    row.name, row.normalized_name = payload.name, payload.name.casefold()
    for assignment in db.scalars(
        select(Assignment).where(Assignment.user_id == user.id, Assignment.module_id == row.id)
    ):
        assignment.name = f"{payload.name} assignment"[:160]
        assignment.version += 1
    row.version += 1
    changed(db, user)
    return row


@router.delete("/modules/{module_id}", status_code=204)
def remove_module(module_id: UUID, db: DB, user: Actor, version: Version):
    lock_user(db, user)
    row = owned(db, Module, module_id, user)
    match_version(row, version)
    if has_module_children(db, user, module_id):
        fail("module_in_use", "Remove this module's assignments, classes, materials and cards first")
    db.delete(row)
    changed(db, user)


@router.get("/assignments", response_model=list[AssignmentRead])
def assignments(
    db: DB,
    user: Actor,
    module_id: UUID | None = None,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    query = select(Assignment).where(Assignment.user_id == user.id)
    if module_id:
        query = query.where(Assignment.module_id == module_id)
    return list(db.scalars(query.order_by(Assignment.start_date, Assignment.id).offset(offset).limit(limit)))


@router.post("/assignments", response_model=AssignmentRead, status_code=201)
def add_assignment(payload: AssignmentWrite, db: DB, user: Actor):
    lock_user(db, user)
    parent = owned(db, Module, payload.module_id, user)
    quota(db, Assignment, user, 500)
    row = Assignment(
        user_id=user.id,
        name=f"{parent.name} assignment"[:160],
        **payload.model_dump(),
    )
    db.add(row)
    changed(db, user)
    return row


@router.put("/assignments/{assignment_id}", response_model=AssignmentRead)
def update_assignment(assignment_id: UUID, payload: AssignmentWrite, db: DB, user: Actor, version: Version):
    lock_user(db, user)
    row = owned(db, Assignment, assignment_id, user)
    match_version(row, version)
    owned(db, Module, payload.module_id, user)
    children = list(
        db.scalars(
            select(Commitment).where(Commitment.user_id == user.id, Commitment.assignment_id == assignment_id)
        )
    )
    if payload.module_id != row.module_id:
        fail("module_immutable", "Create another assignment to use a different module", 422)
    for child in children:
        deadline_check(child.data["schedule"], payload.start_date, payload.due_date)
    for override in db.scalars(select(OccurrenceOverride).where(OccurrenceOverride.user_id == user.id)):
        if override.data.get("assignment_id") == str(assignment_id) and (
            override.target_date < payload.start_date
            or payload.due_date
            and override.target_date > payload.due_date
        ):
            fail(
                "adjustment_outside_assignment",
                "Existing adjusted work falls outside the new assignment dates",
            )
        if override.data.get("assignment_id") == str(assignment_id):
            override.data = {
                **override.data,
                "deadline": payload.due_date.isoformat() if payload.due_date else None,
            }
            override.version += 1
    # Changing assignment dates must also preserve dates of existing intentions.
    for check in db.scalars(select(CheckIn).where(CheckIn.user_id == user.id)):
        if any(p["assignment_id"] == str(assignment_id) for p in check.data.get("assignment_plans", [])):
            if check.date < payload.start_date or payload.due_date and check.date > payload.due_date:
                fail(
                    "check_in_outside_assignment", "Existing assignment intentions fall outside the new dates"
                )
    for key, value in payload.model_dump().items():
        setattr(row, key, value)
    row.version += 1
    changed(db, user)
    return row


@router.delete("/assignments/{assignment_id}", status_code=204)
def remove_assignment(assignment_id: UUID, db: DB, user: Actor, version: Version):
    lock_user(db, user)
    row = owned(db, Assignment, assignment_id, user)
    match_version(row, version)
    if db.scalar(
        select(Commitment.id)
        .where(Commitment.user_id == user.id, Commitment.assignment_id == assignment_id)
        .limit(1)
    ):
        fail("assignment_in_use", "Remove the assignment's work sessions first")
    for check in db.scalars(select(CheckIn).where(CheckIn.user_id == user.id)):
        goals = [p for p in check.data["assignment_plans"] if p["assignment_id"] != str(assignment_id)]
        if len(goals) != len(check.data["assignment_plans"]):
            check.data = {**check.data, "assignment_plans": goals}
            check.version += 1
    db.execute(
        delete(OccurrenceOverride).where(
            OccurrenceOverride.user_id == user.id,
            OccurrenceOverride.source == "assignment_plan",
            OccurrenceOverride.source_id == str(assignment_id),
        )
    )
    db.delete(row)
    changed(db, user)


@router.get("/commitments", response_model=list[CommitmentRead])
def commitments(db: DB, user: Actor, offset: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=100)):
    return [
        commitment_read(row)
        for row in db.scalars(
            select(Commitment)
            .where(Commitment.user_id == user.id)
            .order_by(Commitment.created_at, Commitment.id)
            .offset(offset)
            .limit(limit)
        )
    ]


@router.post("/commitments", response_model=CommitmentRead, status_code=201)
def add_commitment(
    payload: CommitmentWrite, db: DB, user: Actor, expected_revision: int | None = Query(None, ge=0)
):
    lock_user(db, user, expected_revision)
    validate_commitment(db, user, payload)
    quota(db, Commitment, user, 500)
    row = Commitment(
        user_id=user.id,
        data=commitment_data(payload),
        module_id=payload.module_id,
        assignment_id=payload.assignment_id,
    )
    db.add(row)
    changed(db, user)
    return commitment_read(row)


@router.put("/commitments/{commitment_id}", response_model=CommitmentRead)
def update_commitment(
    commitment_id: UUID,
    payload: CommitmentWrite,
    db: DB,
    user: Actor,
    version: Version,
    reset_adjustments: bool = False,
):
    lock_user(db, user)
    row = owned(db, Commitment, commitment_id, user)
    match_version(row, version)
    validate_commitment(db, user, payload)
    query = select(OccurrenceOverride).where(
        OccurrenceOverride.user_id == user.id,
        OccurrenceOverride.source == "commitment",
        OccurrenceOverride.source_id == str(commitment_id),
    )
    overrides = list(db.scalars(query))
    if overrides and not reset_adjustments:
        fail(
            "adjustments_exist",
            "Pass reset_adjustments=true to replace this series and clear its individual-day changes",
        )
    for override in overrides:
        db.delete(override)
    # A changed schedule/category becomes a manually managed series. It no longer
    # makes a claim about the completeness of an imported timetable.
    if payload.category != "class" or payload.schedule.model_dump(mode="json") != row.data["schedule"]:
        row.coverage_windows = []
        row.import_key = None
        row.import_source = None
    row.data, row.module_id, row.assignment_id = (
        commitment_data(payload),
        payload.module_id,
        payload.assignment_id,
    )
    row.version += 1
    changed(db, user)
    return commitment_read(row)


@router.delete("/commitments/{commitment_id}", status_code=204)
def remove_commitment(commitment_id: UUID, db: DB, user: Actor, version: Version):
    lock_user(db, user)
    row = owned(db, Commitment, commitment_id, user)
    match_version(row, version)
    db.execute(
        delete(OccurrenceOverride).where(
            OccurrenceOverride.user_id == user.id,
            OccurrenceOverride.source == "commitment",
            OccurrenceOverride.source_id == str(commitment_id),
        )
    )
    db.delete(row)
    changed(db, user)


@router.get("/planner", response_model=PlanRead)
def plan(start_date: date, end_date: date, db: DB, user: Actor):
    lock_user(db, user)
    return Planner(db, user).plan(start_date, end_date)


@router.get("/dashboard", response_model=DashboardRead)
def dashboard(db: DB, user: Actor):
    lock_user(db, user)
    return Planner(db, user).dashboard()


@router.get("/planner/distribution", response_model=DistributionRead)
def distribution(start_date: date, end_date: date, db: DB, user: Actor):
    lock_user(db, user)
    result = Planner(db, user).plan(start_date, end_date)
    values = {}
    for kind in ("time", "mental", "physical", "social"):
        parts = [d.capacities[kind] for d in result.days]
        usage = (
            sum(p.usage_percent for p in parts) if all(p.usage_percent is not None for p in parts) else None
        )
        values[kind] = {
            "used": round(sum(p.used for p in parts), 4),
            "unit": parts[0].unit,
            "summed_usage_percent": usage,
        }
    complete = all(day.assessment_complete for day in result.days)
    total = sum(v["summed_usage_percent"] for v in values.values()) if complete else 0
    for value in values.values():
        value["relative_demand_share_percent"] = (
            round(100 * value["summed_usage_percent"] / total, 2) if complete and total else None
        )
    return {
        "start_date": start_date,
        "end_date": end_date,
        "policy_version": POLICY_VERSION,
        "plan_revision": user.plan_revision,
        "capacities": values,
        "assessment_complete": complete,
        "peak_day_usage_percent": max(
            (d.peak_usage_percent for d in result.days if d.peak_usage_percent is not None), default=None
        ),
        "share_meaning": "Relative shares of normalized estimated demand; these are not percentages of elapsed time.",
    }


@router.post("/planner/what-if", response_model=WhatIfRead)
def what_if(payload: WhatIfWrite, db: DB, user: Actor):
    lock_user(db, user)
    validate_commitment(db, user, payload.commitment)
    planner = Planner(db, user)
    before = planner.plan(payload.start_date, payload.end_date)
    draft = payload.commitment.model_dump(mode="json")
    warnings = ["Only the requested date window is evaluated"]
    if payload.illustrative_date:
        if (
            draft["schedule"]["kind"] != "unscheduled"
            or not payload.start_date <= payload.illustrative_date <= payload.end_date
        ):
            fail(
                "invalid_illustrative_date",
                "Use an in-range illustrative date only for an unscheduled draft",
                422,
            )
        draft["schedule"] = {"kind": "once", "date": str(payload.illustrative_date)}
        warnings.append("An illustrative session is being evaluated; the original draft is unscheduled")
    elif draft["schedule"]["kind"] == "unscheduled":
        warnings.append("Unscheduled work contributes no dated load")
    validated = CommitmentWrite.model_validate(draft)
    validate_commitment(db, user, validated)
    draft = commitment_data(validated)
    planner.commitments.append(SimpleNamespace(id=uuid4(), version=1, data=draft))
    after = planner.plan(payload.start_date, payload.end_date)
    return WhatIfRead(before=before, after=after, warnings=warnings)


@router.post("/planner/actions", response_model=Occurrence | None)
def apply_action(payload: ActionWrite, db: DB, user: Actor):
    lock_user(db, user, payload.expected_revision)
    old = db.scalar(
        select(OccurrenceOverride).where(
            OccurrenceOverride.user_id == user.id, OccurrenceOverride.occurrence_key == payload.occurrence_key
        )
    )
    planner = Planner(db, user)
    original = next(
        (i for i in planner.raw_day(payload.original_date) if i.key == payload.occurrence_key), None
    )
    if old and old.original_date != payload.original_date:
        fail("invalid_occurrence", "Original date does not match the occurrence", 422)
    if original is None and old is None:
        fail("not_found", "Occurrence not found", 404)
    if payload.action == "keep":
        if old:
            db.delete(old)
            changed(db, user)
        return original
    item = Occurrence.model_validate(old.data) if old else original.model_copy(deep=True)
    if item.assignment_id:
        item.deadline = owned(db, Assignment, item.assignment_id, user).due_date
    if payload.action == "move":
        if item.deadline and payload.target_date > item.deadline:
            fail("after_deadline", "Choose a date on or before the deadline", 422)
        if (
            item.assignment_id
            and payload.target_date < planner.assignments[str(item.assignment_id)].start_date
        ):
            fail("before_assignment_start", "Choose a date on or after the assignment start", 422)
        item.date = payload.target_date
    elif payload.action == "skip":
        item.skipped = True
    elif payload.action == "lighten":
        if payload.duration_minutes > item.duration_minutes:
            fail("not_lighter", "The new duration must not exceed the current duration", 422)
        item.duration_minutes = payload.duration_minutes
    else:
        item.helper_note = payload.helper_note or "Help requested"
    item.action = payload.action
    row = old or OccurrenceOverride(
        user_id=user.id,
        occurrence_key=item.key,
        source=item.source,
        source_id=item.source_id,
        original_date=item.original_date,
    )
    row.target_date, row.data = item.date, item.model_dump(mode="json")
    if old:
        row.version += 1
    db.add(row)
    changed(db, user)
    return item


@router.put("/check-ins/{day}", response_model=CheckInRead)
def save_check_in(
    day: date,
    payload: CheckInWrite,
    db: DB,
    user: Actor,
    expected_revision: int = Query(..., ge=0),
    reset_adjustments: bool = False,
):
    lock_user(db, user, expected_revision)
    if day != local_today(user) or day <= user.registered_on:
        fail(
            "check_in_unavailable",
            "Check-ins can be saved for today, starting the day after registration",
            422,
        )
    for goal in payload.assignment_plans:
        assignment = owned(db, Assignment, goal.assignment_id, user)
        if day < assignment.start_date or assignment.due_date and day > assignment.due_date:
            fail(
                "assignment_not_active", "Planned assignment work must be within its start and due dates", 422
            )
    overrides = list(
        db.scalars(
            select(OccurrenceOverride).where(
                OccurrenceOverride.user_id == user.id,
                OccurrenceOverride.original_date == day,
                OccurrenceOverride.source.in_(["routine", "assignment_plan"]),
            )
        )
    )
    if overrides and not reset_adjustments:
        fail("adjustments_exist", "Pass reset_adjustments=true to replace today's routine adjustments")
    for override in overrides:
        db.delete(override)
    row = db.scalar(select(CheckIn).where(CheckIn.user_id == user.id, CheckIn.date == day))
    if row:
        row.version += 1
    else:
        row = CheckIn(user_id=user.id, date=day)
    row.data = payload.model_dump(mode="json")
    db.add(row)
    changed(db, user)
    return CheckInRead(date=day, version=row.version, updated_at=row.updated_at, **row.data)


@router.get("/check-ins", response_model=list[CheckInRead])
def check_ins(start_date: date, end_date: date, db: DB, user: Actor):
    if end_date < start_date or (end_date - start_date).days >= 90:
        fail("invalid_date_range", "Choose 1 to 90 days", 422)
    rows = db.scalars(
        select(CheckIn)
        .where(CheckIn.user_id == user.id, CheckIn.date.between(start_date, end_date))
        .order_by(CheckIn.date)
    )
    return [CheckInRead(date=r.date, version=r.version, updated_at=r.updated_at, **r.data) for r in rows]


@router.put("/weekly-notes/{week_start}", response_model=NoteRead)
def weekly_note(
    week_start: date, payload: NoteWrite, db: DB, user: Actor, expected_revision: int = Query(..., ge=0)
):
    lock_user(db, user, expected_revision)
    if week_start.weekday() != 0:
        fail("invalid_week_start", "week_start must be a Monday", 422)
    row = db.scalar(
        select(WeeklyNote).where(WeeklyNote.user_id == user.id, WeeklyNote.week_start == week_start)
    )
    if row:
        row.version += 1
    else:
        row = WeeklyNote(user_id=user.id, week_start=week_start)
    row.text = payload.text
    db.add(row)
    changed(db, user)
    return row


@router.get("/recovery", response_model=list[RecoverySuggestion])
def recovery(db: DB, user: Actor, days: int = Query(7, ge=1, le=14)):
    lock_user(db, user)
    planner = Planner(db, user)
    today = local_today(user)
    dates = list(dates_between(today, today + timedelta(days=days - 1)))
    dates.sort(key=lambda d: (-(planner.day(d).peak_usage_percent or 0), d))
    return [planner.recovery(d) for d in dates]


@router.put("/recovery/{day}", response_model=RecoveryRead)
def save_recovery(
    day: date, payload: RecoveryWrite, db: DB, user: Actor, expected_revision: int = Query(..., ge=0)
):
    lock_user(db, user, expected_revision)
    if day != local_today(user):
        fail("recovery_unavailable", "Only today's recovery can be completed or updated", 422)
    row = db.scalar(select(Recovery).where(Recovery.user_id == user.id, Recovery.date == day))
    if row:
        row.version += 1
    else:
        row = Recovery(
            user_id=user.id, date=day, recommendation_code=Planner(db, user).recovery(day).recommendation_code
        )
    row.data = payload.model_dump(mode="json")
    db.add(row)
    changed(db, user)
    return RecoveryRead(
        date=day, version=row.version, recommendation_code=row.recommendation_code, **row.data
    )
