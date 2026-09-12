from datetime import date, timedelta

from sqlalchemy import select

from app.api.dependencies import fail, local_today
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
    AssignmentRead,
    BaselineWrite,
    CommitmentRead,
    DashboardRead,
    DayRead,
    ModuleRead,
    NoteRead,
    Occurrence,
    PlanRead,
    RecoveryRead,
    RecoverySuggestion,
)
from app.services.scoring import (
    POLICY_VERSION,
    STATUS_BANDS,
    capacity_values,
    dates_between,
    effort_for,
    occurs,
)
from app.services.timetable import covers_class_day


def commitment_read(row):
    # baseline_routine is an internal attribution used by the planner. It is
    # derived from category on write and is not part of the frontend contract.
    data = {key: value for key, value in row.data.items() if key != "baseline_routine"}
    return CommitmentRead(id=row.id, version=row.version, **data)


class Planner:
    """One bounded user snapshot shared by all calculations and simulations."""

    def __init__(self, db, user):
        self.user = user
        self.baselines = list(
            db.scalars(select(Baseline).where(Baseline.user_id == user.id).order_by(Baseline.version))
        )
        self.commitments = list(db.scalars(select(Commitment).where(Commitment.user_id == user.id)))
        self.assignments = {
            str(a.id): a for a in db.scalars(select(Assignment).where(Assignment.user_id == user.id))
        }
        self.checks = {c.date: c for c in db.scalars(select(CheckIn).where(CheckIn.user_id == user.id))}
        self.overrides = list(
            db.scalars(select(OccurrenceOverride).where(OccurrenceOverride.user_id == user.id))
        )
        self.recoveries = {r.date: r for r in db.scalars(select(Recovery).where(Recovery.user_id == user.id))}
        self.modules = list(db.scalars(select(Module).where(Module.user_id == user.id)))
        self.notes = {
            n.week_start: n for n in db.scalars(select(WeeklyNote).where(WeeklyNote.user_id == user.id))
        }

    def baseline_for(self, day):
        return next((b for b in reversed(self.baselines) if b.effective_from <= day), None)

    def raw_day(self, day: date) -> list[Occurrence]:
        baseline = self.baseline_for(day)
        spec = BaselineWrite.model_validate(baseline.data) if baseline else None
        check = self.checks.get(day)
        routines = {}
        for r in spec.routines if spec else []:
            minutes = r.duration_minutes * r.days_per_week / 7
            if r.kind == "classes" and any(covers_class_day(c, day) for c in self.commitments):
                minutes = 0
            if r.kind == "sport" and check and check.data.get("sport_today") is not None:
                minutes = r.duration_minutes if check.data["sport_today"] else 0
            routines[r.kind] = (r, minutes)
        items = []
        for row in self.commitments:
            value = row.data
            if not occurs(value["schedule"], day):
                continue
            assignment = self.assignments.get(value.get("assignment_id"))
            items.append(
                Occurrence(
                    key=f"commitment:{row.id}:{day}",
                    source="commitment",
                    source_id=str(row.id),
                    original_date=day,
                    date=day,
                    name=value["name"],
                    category=value["category"],
                    duration_minutes=value["duration_minutes"],
                    effort=value["effort"],
                    baseline_routine=value.get("baseline_routine"),
                    module_id=value.get("module_id"),
                    assignment_id=value.get("assignment_id"),
                    deadline=assignment.due_date if assignment else value.get("deadline"),
                )
            )
        # An explicit work session already represents that assignment's check-in goal.
        existing_assignments = {str(i.assignment_id) for i in items if i.assignment_id}
        goals = (
            [
                p
                for p in check.data.get("assignment_plans", [])
                if p["assignment_id"] not in existing_assignments
            ]
            if check
            else []
        )
        study = routines.get("study")
        allocated = sum(i.duration_minutes for i in items if i.baseline_routine == "study")
        unestimated_weight = sum(p["planned_percent"] for p in goals)
        unallocated = max(0, (study[1] if study else 0) - allocated)
        for goal in goals:
            assignment = self.assignments.get(goal["assignment_id"])
            if assignment is None:
                continue
            minutes = unallocated * goal["planned_percent"] / max(1, unestimated_weight)
            if minutes <= 0:
                continue
            items.append(
                Occurrence(
                    key=f"assignment_plan:{assignment.id}:{day}",
                    source="assignment_plan",
                    source_id=str(assignment.id),
                    original_date=day,
                    date=day,
                    name=assignment.name,
                    category="assignment_work",
                    duration_minutes=minutes,
                    effort=effort_for(study[0]) if study else {"mental": 4, "physical": 0, "social": 0},
                    baseline_routine="study",
                    module_id=assignment.module_id,
                    assignment_id=assignment.id,
                    planned_percent=goal["planned_percent"],
                    deadline=assignment.due_date,
                    estimated=True,
                )
            )
        incoming = [
            Occurrence.model_validate(o.data)
            for o in self.overrides
            if o.target_date == day and o.original_date != day
        ]
        # Reserve the original allocation even after skipping/moving, so baseline
        # filler cannot silently replace the work that the user removed.
        reservations = items + [i for i in incoming if i.source != "routine" and not i.skipped]
        for kind, (routine, minutes) in routines.items():
            remaining = max(
                0, minutes - sum(i.duration_minutes for i in reservations if i.baseline_routine == kind)
            )
            if remaining > 0:
                items.append(
                    Occurrence(
                        key=f"routine:{kind}:{day}",
                        source="routine",
                        source_id=kind,
                        original_date=day,
                        date=day,
                        name=f"Usual {kind}",
                        category="routine",
                        duration_minutes=remaining,
                        effort=effort_for(routine),
                        baseline_routine=kind,
                        estimated=True,
                    )
                )
        return items

    def day(self, day: date) -> DayRead:
        base = self.raw_day(day)
        replaced = {o.occurrence_key for o in self.overrides}
        items = [i for i in base if i.key not in replaced]
        items += [Occurrence.model_validate(o.data) for o in self.overrides if o.target_date == day]
        baseline = self.baseline_for(day)
        capacities = capacity_values(items, baseline.limits if baseline else {})
        known = [v.usage_percent for v in capacities.values() if v.usage_percent is not None]
        calibration_complete = baseline is not None and len(known) == 4
        peak = max(known) if known else None
        assumptions = ["provisional_scoring_policy", "planned_demand_is_not_completed_work"]
        if any(i.estimated for i in items):
            assumptions.append("some_daily_durations_are_estimated")
        if not calibration_complete:
            assumptions.append("some_personal_limits_are_unknown")
        check = self.checks.get(day)
        missing_duration = bool(
            check
            and any(
                not any(str(i.assignment_id) == p["assignment_id"] for i in base)
                for p in check.data.get("assignment_plans", [])
            )
        )
        if missing_duration:
            assumptions.append("some_assignment_goals_have_no_duration_estimate")
        complete = calibration_complete and not missing_duration
        recovery = self.recoveries.get(day)
        recovery_bonus = bool(recovery and recovery.data.get("completed"))
        energy = (
            round(
                max(
                    0,
                    min(
                        100, 100 - sum(min(100, value) for value in known) / 4 + (10 if recovery_bonus else 0)
                    ),
                ),
                2,
            )
            if complete
            else None
        )
        status = (
            "over_limit"
            if peak is not None and peak > STATUS_BANDS["over_limit"]
            else "uncalibrated"
            if not calibration_complete
            else "incomplete"
            if missing_duration
            else "high"
            if peak >= STATUS_BANDS["high"]
            else "moderate"
            if peak >= STATUS_BANDS["moderate"]
            else "within_limits"
        )
        return DayRead(
            date=day,
            occurrences=sorted(items, key=lambda i: (i.category, i.name, i.key)),
            deadlines=[
                AssignmentRead.model_validate(a) for a in self.assignments.values() if a.due_date == day
            ],
            capacities=capacities,
            peak_usage_percent=peak,
            energy_score=energy,
            assessment_complete=complete,
            status=status,
            assumptions=assumptions,
            reported_stress=check.data["stress"] if check else None,
        )

    def plan(self, start: date, end: date) -> PlanRead:
        if end < start or (end - start).days >= 90:
            fail("invalid_date_range", "Choose an inclusive range of 1 to 90 days", 422)
        days = [self.day(d) for d in dates_between(start, end)]
        recovery_room = {}
        weeks = {d.date - timedelta(days=d.date.weekday()) for d in days}
        for week in weeks:
            whole_week = [self.day(week + timedelta(days=i)) for i in range(7)]
            targets = [self.baseline_for(d.date) for d in whole_week]
            free = sum(max(0, d.capacities["time"].remaining or 0) for d in whole_week)
            target = sum(b.data["recovery_minutes_per_week"] / 7 if b else 0 for b in targets)
            time_known = all(
                d.capacities["time"].limit is not None
                and "some_assignment_goals_have_no_duration_estimate" not in d.assumptions
                for d in whole_week
            )
            recovery_room[str(week)] = round(free - target, 2) if time_known else None
        return PlanRead(
            start_date=start,
            end_date=end,
            timezone=self.user.timezone,
            plan_revision=self.user.plan_revision,
            policy_version=POLICY_VERSION,
            days=days,
            unscheduled=[
                commitment_read(c)
                for c in self.commitments
                if c.data["schedule"]["kind"] == "unscheduled" and c.id is not None
            ],
            weekly_recovery_room=recovery_room,
        )

    def recovery(self, day: date) -> RecoverySuggestion:
        plan = self.day(day)
        known = {k: c.usage_percent for k, c in plan.capacities.items() if c.usage_percent is not None}
        kind = max(known, key=known.get) if known else "time"
        pressure = plan.peak_usage_percent or 0
        high_stress = plan.reported_stress is not None and plan.reported_stress >= 3
        code = (
            "quiet_pause"
            if high_stress or pressure >= STATUS_BANDS["high"]
            else f"rest_{kind}"
            if pressure >= STATUS_BANDS["moderate"]
            else "keep_unplanned_time"
        )
        row = self.recoveries.get(day)
        result = (
            RecoveryRead(
                date=day, version=row.version, recommendation_code=row.recommendation_code, **row.data
            )
            if row
            else None
        )
        return RecoverySuggestion(
            date=day,
            recommendation_code=code,
            suggested_minutes=(
                5
                if high_stress
                else 10
                if pressure >= STATUS_BANDS["high"]
                else 15
                if pressure >= STATUS_BANDS["moderate"]
                else 0
            ),
            reason="reported_stress"
            if high_stress
            else f"highest_estimated_demand:{kind}"
            if known
            else "capacity_not_calibrated",
            can_complete=day == local_today(self.user),
            result=result,
        )

    def dashboard(self) -> DashboardRead:
        today = local_today(self.user)
        day = self.day(today)
        cursor = today if today in self.checks else today - timedelta(days=1)
        streak = 0
        while cursor in self.checks:
            streak += 1
            cursor -= timedelta(days=1)
        module_ids = {i.module_id for i in day.occurrences if i.category == "class" and not i.skipped}
        note = self.notes.get(today - timedelta(days=today.weekday()))
        return DashboardRead(
            today=day,
            check_in_eligible=today > self.user.registered_on,
            check_in_saved=today in self.checks,
            streak=streak,
            plan_revision=self.user.plan_revision,
            today_modules=[ModuleRead.model_validate(m) for m in self.modules if m.id in module_ids],
            recovery=self.recovery(today),
            weekly_note=NoteRead.model_validate(note) if note else None,
        )
