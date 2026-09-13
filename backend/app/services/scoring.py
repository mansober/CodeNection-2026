"""Transparent planning heuristics, versioned independently from stored inputs."""

from datetime import date, timedelta

from app.schemas.domain import BaselineWrite, CapacityRead, RoutineInput

POLICY_VERSION = "planning-v1"
KINDS = ("time", "mental", "physical", "social")
DEFAULT_EFFORT = {
    "classes": (4, 0, 2),
    "study": (4, 0, 0),
    "sport": (1, 4, 1),
    "job": (3, 2, 3),
    "club": (2, 1, 3),
    "competition": (4, 2, 3),
    "volunteering": (2, 2, 3),
    "family": (2, 2, 2),
    "commuting": (1, 1, 0),
    "errands": (1, 2, 1),
    "projects": (3, 0, 1),
}
CONDITION = {"light": 0.75, "typical": 1.0, "demanding": 1.25}
BASELINE_UTILIZATION = {"plenty": 0.60, "some": 0.80, "needs_break": 1.0, "exhausted": 1.2}
FREE_MINUTES = {"under_30": 15, "30_to_60": 45, "60_to_120": 90, "over_120": 150}
STATUS_BANDS = {"moderate": 60.0, "high": 85.0, "over_limit": 100.0}


def policy_metadata() -> dict:
    """Machine-readable explanation for clients; formulas remain implemented below."""
    return {
        "policy_version": POLICY_VERSION,
        "purpose": "Estimate date-based workload against a personal planning envelope",
        "dimensions": {
            "time": {"unit": "minutes", "formula": "duration_minutes"},
            "mental": {"unit": "effort_minutes", "formula": "duration_minutes * effort / 5"},
            "physical": {"unit": "effort_minutes", "formula": "duration_minutes * effort / 5"},
            "social": {"unit": "effort_minutes", "formula": "duration_minutes * effort / 5"},
        },
        "effort_scale": {"minimum": 0, "maximum": 5},
        "default_effort": {kind: dict(zip(KINDS[1:], values)) for kind, values in DEFAULT_EFFORT.items()},
        "condition_multipliers": CONDITION,
        "baseline_utilization_anchors": BASELINE_UTILIZATION,
        "free_time_representative_minutes": FREE_MINUTES,
        "status_bands_percent": STATUS_BANDS,
        "daily_bottleneck_formula": "max(time, mental, physical, social utilization)",
        "energy_score_formula": (
            "clamp(0, 100, 100 - mean(capped_dimension_utilization) + 10_if_recovery_completed_today)"
        ),
        "incomplete_when": [
            "any capacity dimension is uncalibrated",
            "an assignment intention has no usable baseline study duration",
        ],
        "guardrails": [
            "stress does not alter mathematical capacity",
            "recovery completion changes the displayed energy score, not workload or capacity",
            "status bands are provisional product rules",
        ],
    }


def dates_between(start: date, end: date):
    for i in range((end - start).days + 1):
        yield start + timedelta(days=i)


def effort_for(routine: RoutineInput) -> dict[str, float]:
    return {
        k: min(5, v * CONDITION[routine.condition]) for k, v in zip(KINDS[1:], DEFAULT_EFFORT[routine.kind])
    }


def demand(minutes: float, effort: dict[str, float]) -> dict[str, float]:
    return {"time": minutes, **{k: minutes * effort[k] / 5 for k in KINDS[1:]}}


def calibrate(baseline: BaselineWrite) -> dict[str, float | None]:
    reference = dict.fromkeys(KINDS, 0.0)
    for routine in baseline.routines:
        for kind, value in demand(
            routine.duration_minutes * routine.days_per_week / 7, effort_for(routine)
        ).items():
            reference[kind] += value
    limits = {"time": reference["time"] + FREE_MINUTES[baseline.answers.free_time]}
    for kind in KINDS[1:]:
        answer = getattr(baseline.answers, kind)
        limits[kind] = (
            reference[kind] / BASELINE_UTILIZATION[answer] if answer and reference[kind] > 0 else None
        )
    return {k: round(v, 6) if v is not None else None for k, v in limits.items()}


def capacity_values(occurrences, limits: dict) -> dict[str, CapacityRead]:
    totals = dict.fromkeys(KINDS, 0.0)
    for item in occurrences:
        if not item.skipped:
            for kind, value in demand(item.duration_minutes, item.effort).items():
                totals[kind] += value
    return {
        kind: CapacityRead(
            used=round(used, 4),
            limit=limits.get(kind),
            usage_percent=(
                round(100 * used / limits[kind], 2) if limits.get(kind) else 0.0 if used == 0 else None
            ),
            remaining=round(limits[kind] - used, 4) if limits.get(kind) else None,
            unit="minutes" if kind == "time" else "effort_minutes",
        )
        for kind, used in totals.items()
    }


def occurs(schedule: dict, day: date) -> bool:
    kind = schedule["kind"]
    if kind == "unscheduled":
        return False
    if kind == "once":
        return str(day) == schedule["date"]
    if kind == "dates":
        return str(day) in schedule["dates"]
    if str(day) < schedule["start_date"] or (schedule.get("end_date") and str(day) > schedule["end_date"]):
        return False
    frontend_weekday = (day.weekday() + 1) % 7
    return kind == "daily" or frontend_weekday in schedule["weekdays"]


def schedule_bounds(schedule: dict):
    if schedule["kind"] == "unscheduled":
        return None, None
    if schedule["kind"] == "once":
        day = date.fromisoformat(schedule["date"])
        return day, day
    if schedule["kind"] == "dates":
        days = [date.fromisoformat(d) for d in schedule["dates"]]
        return min(days), max(days)
    return date.fromisoformat(schedule["start_date"]), date.fromisoformat(
        schedule["end_date"]
    ) if schedule.get("end_date") else None
