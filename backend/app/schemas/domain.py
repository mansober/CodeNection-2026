"""Version-one API contracts. Dates are local calendar dates; timestamps are UTC."""

from datetime import date, datetime
from enum import StrEnum
from typing import Annotated, Literal
from uuid import UUID
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, ConfigDict, Field, StrictBool, field_validator, model_validator


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Output(BaseModel):
    model_config = ConfigDict(from_attributes=True)


Name = Annotated[str, Field(min_length=1, max_length=160)]
Minutes = Annotated[int, Field(strict=True, ge=1, le=1440)]
RoutineMinutes = Literal[15, 30, 60, 90, 120, 180, 240, 300]
Rating = Annotated[int, Field(strict=True, ge=0, le=5)]
# Matches JavaScript Date.getDay() and the active weekday selector:
# Sunday=0, Monday=1, ..., Saturday=6.
Weekday = Annotated[int, Field(strict=True, ge=0, le=6)]
Percent = Annotated[int, Field(strict=True, ge=5, le=100, multiple_of=5)]


class RoutineKind(StrEnum):
    classes = "classes"
    study = "study"
    sport = "sport"
    job = "job"
    club = "club"
    competition = "competition"
    volunteering = "volunteering"
    family = "family"
    commuting = "commuting"
    errands = "errands"
    projects = "projects"


class Effort(Input):
    mental: Rating
    physical: Rating
    social: Rating


class GuestCreate(Input):
    timezone: str = Field(min_length=1, max_length=64)

    @field_validator("timezone")
    @classmethod
    def valid_timezone(cls, value: str) -> str:
        try:
            ZoneInfo(value)
        except (ZoneInfoNotFoundError, ValueError) as exc:
            raise ValueError("Use an IANA timezone, such as Asia/Kuala_Lumpur") from exc
        return value


class UserRead(Output):
    id: UUID
    timezone: str
    registered_on: date
    plan_revision: int
    created_at: datetime


class SessionRead(Output):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_at: datetime
    user: UserRead


class RoutineInput(Input):
    kind: RoutineKind
    duration_minutes: RoutineMinutes
    days_per_week: Annotated[int, Field(strict=True, ge=1, le=7)]
    condition: Literal["light", "typical", "demanding"] = "typical"


class CapacityAnswers(Input):
    mental: Literal["plenty", "some", "needs_break", "exhausted"]
    # The active onboarding asks these only when the selected routine makes
    # them relevant. Its own calculation uses the neutral second answer when
    # a question is omitted, so the API makes that implied default explicit.
    physical: Literal["plenty", "some", "needs_break", "exhausted"] = "some"
    social: Literal["plenty", "some", "needs_break", "exhausted"] = "some"
    free_time: Literal["under_30", "30_to_60", "60_to_120", "over_120"]


class BaselineWrite(Input):
    routines: list[RoutineInput] = Field(min_length=1, max_length=11)
    answers: CapacityAnswers
    recovery_minutes_per_week: Literal[180, 300, 540, 840]
    expected_revision: Annotated[int, Field(strict=True, ge=0)]

    @model_validator(mode="after")
    def unique_routines(self):
        if len({r.kind for r in self.routines}) != len(self.routines):
            raise ValueError("Each routine type may appear once")
        return self


class BaselineRead(Output):
    id: UUID
    effective_from: date
    version: int
    routines: list[RoutineInput]
    answers: CapacityAnswers
    recovery_minutes_per_week: int
    limits: dict[str, float | None]
    policy_version: str


class Unscheduled(Input):
    kind: Literal["unscheduled"]


class Once(Input):
    kind: Literal["once"]
    date: date


class Daily(Input):
    kind: Literal["daily"]
    start_date: date
    end_date: date | None = None

    @model_validator(mode="after")
    def ordered_dates(self):
        if self.end_date and self.end_date < self.start_date:
            raise ValueError("end_date must be on or after start_date")
        return self


class Weekly(Daily):
    kind: Literal["weekly"]
    weekdays: list[Weekday] = Field(min_length=1, max_length=7)

    @field_validator("weekdays")
    @classmethod
    def unique_days(cls, value):
        if len(set(value)) != len(value):
            raise ValueError("Weekdays must be unique")
        return sorted(value)


class SpecificDates(Input):
    kind: Literal["dates"]
    dates: list[date] = Field(min_length=1, max_length=180)

    @field_validator("dates")
    @classmethod
    def unique_dates(cls, value):
        if len(set(value)) != len(value):
            raise ValueError("Dates must be unique")
        return sorted(value)


Schedule = Annotated[Unscheduled | Once | Daily | Weekly | SpecificDates, Field(discriminator="kind")]


class ModuleWrite(Input):
    name: Name


class ModuleRead(Output):
    id: UUID
    name: str
    version: int


class AssignmentWrite(Input):
    module_id: UUID
    start_date: date
    due_date: date | None = None

    @model_validator(mode="after")
    def ordered_dates(self):
        if self.due_date and self.due_date < self.start_date:
            raise ValueError("due_date must be on or after start_date")
        return self


class AssignmentRead(AssignmentWrite, Output):
    id: UUID
    name: str
    version: int


class CommitmentWrite(Input):
    name: Name
    category: Literal["class", "assignment_work", "competition", "club", "job", "sport", "social", "personal"]
    schedule: Schedule
    duration_minutes: Minutes
    effort: Effort
    flexibility: Literal["fixed", "flexible"] = "flexible"
    module_id: UUID | None = None
    assignment_id: UUID | None = None
    deadline: date | None = None

    @model_validator(mode="after")
    def validate_relationships(self):
        if self.category == "class" and not self.module_id:
            raise ValueError("Classes require module_id")
        if self.category == "assignment_work" and not self.assignment_id:
            raise ValueError("Assignment work requires assignment_id")
        if self.assignment_id and self.category != "assignment_work":
            raise ValueError("assignment_id is only valid for assignment_work")
        if self.deadline and self.category != "competition":
            raise ValueError(
                "Only competitions have a direct deadline; assignment work inherits its assignment deadline"
            )
        return self


class CommitmentRead(CommitmentWrite, Output):
    id: UUID
    version: int


class AssignmentPlan(Input):
    assignment_id: UUID
    planned_percent: Percent


class CheckInWrite(Input):
    stress: Annotated[int, Field(strict=True, ge=0, le=4)]
    assignment_plans: list[AssignmentPlan] = Field(default_factory=list, max_length=30)
    sport_today: StrictBool | None = None

    @field_validator("assignment_plans")
    @classmethod
    def unique_assignments(cls, value):
        if len({v.assignment_id for v in value}) != len(value):
            raise ValueError("Each assignment may appear once")
        return value


class CheckInRead(CheckInWrite, Output):
    date: date
    version: int
    updated_at: datetime


class NoteWrite(Input):
    text: str = Field(max_length=10000)


class NoteRead(NoteWrite, Output):
    week_start: date
    version: int


class ActionWrite(Input):
    occurrence_key: str = Field(min_length=1, max_length=200)
    original_date: date
    action: Literal["keep", "move", "skip", "lighten", "ask_help"]
    target_date: date | None = None
    duration_minutes: Minutes | None = None
    helper_note: str | None = Field(default=None, max_length=300)
    expected_revision: Annotated[int, Field(strict=True, ge=0)]

    @model_validator(mode="after")
    def action_fields(self):
        if (self.action == "move") != (self.target_date is not None):
            raise ValueError("Only move requires target_date")
        if (self.action == "lighten") != (self.duration_minutes is not None):
            raise ValueError("Only lighten requires duration_minutes")
        if self.action != "ask_help" and self.helper_note is not None:
            raise ValueError("helper_note belongs to ask_help")
        return self


class RecoveryWrite(Input):
    completed: StrictBool
    reflection: Literal["better", "same", "drained"] | None = None

    @model_validator(mode="after")
    def reflection_needs_completion(self):
        if self.reflection is not None and not self.completed:
            raise ValueError("Complete recovery before adding a reflection")
        return self


class RecoveryRead(RecoveryWrite, Output):
    date: date
    version: int
    recommendation_code: str


class MaterialRead(Output):
    id: UUID
    module_id: UUID
    name: str
    topic: str
    lesson_date: date
    scope: Literal["week", "semester"]
    media_type: str
    size_bytes: int
    status: Literal["ready", "manual_cards_required"]
    created_at: datetime


class CardWrite(Input):
    module_id: UUID
    material_id: UUID | None = None
    question: str = Field(min_length=1, max_length=2000)
    answer: str = Field(min_length=1, max_length=10000)
    topic: str = Field(default="General", min_length=1, max_length=160)


class CardRead(CardWrite, Output):
    id: UUID
    version: int


class Occurrence(Output):
    key: str
    source: Literal["routine", "commitment", "assignment_plan"]
    source_id: str
    original_date: date
    date: date
    name: str
    category: str
    duration_minutes: float
    effort: dict[str, float]
    baseline_routine: str | None = None
    module_id: UUID | None = None
    assignment_id: UUID | None = None
    planned_percent: int | None = None
    deadline: date | None = None
    skipped: bool = False
    helper_note: str | None = None
    estimated: bool = False


class CapacityRead(Output):
    used: float
    limit: float | None
    usage_percent: float | None
    remaining: float | None
    unit: Literal["minutes", "effort_minutes"]


class DayRead(Output):
    date: date
    occurrences: list[Occurrence]
    deadlines: list[AssignmentRead]
    capacities: dict[Literal["time", "mental", "physical", "social"], CapacityRead]
    peak_usage_percent: float | None
    energy_score: float | None
    assessment_complete: bool
    status: Literal["within_limits", "moderate", "high", "over_limit", "uncalibrated", "incomplete"]
    assumptions: list[str]
    reported_stress: int | None


class PlanRead(Output):
    start_date: date
    end_date: date
    timezone: str
    plan_revision: int
    policy_version: str
    days: list[DayRead]
    unscheduled: list[CommitmentRead]
    weekly_recovery_room: dict[str, float | None]


class WhatIfWrite(Input):
    commitment: CommitmentWrite
    start_date: date
    end_date: date
    illustrative_date: date | None = None


class WhatIfRead(Output):
    before: PlanRead
    after: PlanRead
    added: Literal[False] = False
    warnings: list[str]


class RecoverySuggestion(Output):
    date: date
    recommendation_code: str
    suggested_minutes: int
    reason: str
    can_complete: bool
    result: RecoveryRead | None


class DashboardRead(Output):
    today: DayRead
    check_in_eligible: bool
    check_in_saved: bool
    streak: int
    plan_revision: int
    today_modules: list[ModuleRead]
    recovery: RecoverySuggestion
    weekly_note: NoteRead | None


class ImportCandidate(Input):
    source_uid: str = Field(min_length=1, max_length=512)
    module_name: Name
    dates: list[date] = Field(min_length=1, max_length=180)
    duration_minutes: Minutes


class TimetablePreview(Output):
    start_date: date
    end_date: date
    candidates: list[ImportCandidate]
    warnings: list[str]


class TimetableConfirm(Input):
    start_date: date
    end_date: date
    candidates: list[ImportCandidate] = Field(min_length=1, max_length=100)
    expected_revision: Annotated[int, Field(strict=True, ge=0)]

    @model_validator(mode="after")
    def bounded_import(self):
        if self.end_date < self.start_date or (self.end_date - self.start_date).days >= 180:
            raise ValueError("Choose an import range of 1 to 180 days")
        if any(not self.start_date <= day <= self.end_date for c in self.candidates for day in c.dates):
            raise ValueError("Candidate dates must fall within the reviewed import window")
        return self


class TimetableConfirmRead(Output):
    created_commitment_ids: list[UUID]
    existing_commitment_ids: list[UUID]
    updated_commitment_ids: list[UUID]
    plan_revision: int


class DistributionCapacity(Output):
    used: float
    unit: Literal["minutes", "effort_minutes"]
    summed_usage_percent: float | None
    relative_demand_share_percent: float | None


class DistributionRead(Output):
    start_date: date
    end_date: date
    policy_version: str
    plan_revision: int
    capacities: dict[Literal["time", "mental", "physical", "social"], DistributionCapacity]
    assessment_complete: bool
    peak_day_usage_percent: float | None
    share_meaning: str


class PolicyDimension(Output):
    unit: Literal["minutes", "effort_minutes"]
    formula: str


class PolicyRead(Output):
    policy_version: str
    purpose: str
    dimensions: dict[Literal["time", "mental", "physical", "social"], PolicyDimension]
    effort_scale: dict[str, int]
    default_effort: dict[str, dict[str, float]]
    condition_multipliers: dict[str, float]
    baseline_utilization_anchors: dict[str, float]
    free_time_representative_minutes: dict[str, int]
    status_bands_percent: dict[str, float]
    daily_bottleneck_formula: str
    energy_score_formula: str
    incomplete_when: list[str]
    guardrails: list[str]


class CoverageWindow(Output):
    start: date
    end: date


class ImportCoverageRead(Output):
    commitment_id: UUID
    source_uid: str
    windows: list[CoverageWindow]


class ExportRead(Output):
    schema_version: Literal[1]
    user: UserRead
    baselines: list[BaselineRead]
    modules: list[ModuleRead]
    assignments: list[AssignmentRead]
    commitments: list[CommitmentRead]
    import_coverage: list[ImportCoverageRead]
    occurrence_adjustments: list[Occurrence]
    check_ins: list[CheckInRead]
    weekly_notes: list[NoteRead]
    recovery: list[RecoveryRead]
    materials: list[MaterialRead]
    flashcards: list[CardRead]
    original_files: str
