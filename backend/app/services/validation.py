from datetime import timedelta

from sqlalchemy import func, select

from app.api.dependencies import fail, owned
from app.models import Assignment, Commitment, Module
from app.services.scoring import occurs, schedule_bounds


def quota(db, model, user, maximum):
    count = db.scalar(select(func.count()).select_from(model).where(model.user_id == user.id))
    if count >= maximum:
        fail("resource_limit", f"This account has reached the {maximum} resource limit", 422)


def deadline_check(schedule, start_date=None, deadline=None):
    start, end = schedule_bounds(schedule)
    if start is None:
        return
    if schedule["kind"] == "weekly":
        first = next(
            (start + timedelta(days=i) for i in range(7) if occurs(schedule, start + timedelta(days=i))), None
        )
        if first is None:
            fail("empty_schedule", "The selected weekdays do not occur in this date range", 422)
        start = first
        if end:
            end = next(end - timedelta(days=i) for i in range(7) if occurs(schedule, end - timedelta(days=i)))
    if start_date and start < start_date:
        fail("before_assignment_start", "Work cannot be scheduled before the assignment start", 422)
    if deadline and (end is None or end > deadline):
        fail(
            "after_deadline",
            "All sessions must be on or before the deadline; set an end date for repeating work",
            422,
        )


def validate_commitment(db, user, payload):
    if payload.module_id:
        owned(db, Module, payload.module_id, user)
    assignment = owned(db, Assignment, payload.assignment_id, user) if payload.assignment_id else None
    if assignment and payload.module_id != assignment.module_id:
        fail("module_mismatch", "Assignment work must reference its assignment's module", 422)
    deadline_check(
        payload.schedule.model_dump(mode="json"),
        assignment.start_date if assignment else None,
        assignment.due_date if assignment else payload.deadline,
    )


def commitment_data(payload):
    """Add relationships derived by the server rather than entered by the user."""
    data = payload.model_dump(mode="json")
    data["baseline_routine"] = {
        "class": "classes",
        "assignment_work": "study",
    }.get(payload.category)
    return data


def has_module_children(db, user, module_id):
    from app.models import Flashcard, Material

    return any(
        db.scalar(select(model.id).where(model.user_id == user.id, model.module_id == module_id).limit(1))
        for model in (Assignment, Commitment, Material, Flashcard)
    )
