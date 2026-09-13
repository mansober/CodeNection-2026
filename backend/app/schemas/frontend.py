"""Validated contract for persisting one authenticated user's planner state."""

from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StrictBool, field_validator

from app.schemas.domain import RoutineKind


class FrontendInput(BaseModel):
    model_config = ConfigDict(extra="forbid")


Identifier = Annotated[str, Field(min_length=1, max_length=240)]
CalendarDate = Annotated[str, Field(pattern=r"^\d{4}-\d{2}-\d{2}$")]
OptionalCalendarDate = Annotated[str, Field(pattern=r"^(?:|\d{4}-\d{2}-\d{2})$")]
CapacityKind = Literal["time", "mental", "physical", "social"]


class FrontendRoutineEntry(FrontendInput):
    durationHours: Annotated[float, Field(ge=0.25, le=24)]
    timesPerWeek: Annotated[int, Field(strict=True, ge=1, le=7)]
    condition: Literal["Light", "Typical", "Demanding"]


class FrontendAssignment(FrontendInput):
    start: CalendarDate
    due: OptionalCalendarDate = ""
    serverId: str | None = None
    serverVersion: Annotated[int, Field(strict=True, ge=1)] | None = None


class FrontendModule(FrontendInput):
    id: Identifier
    name: Annotated[str, Field(min_length=1, max_length=160)]
    days: list[Annotated[int, Field(strict=True, ge=0, le=6)]] = Field(max_length=7)
    assignment: FrontendAssignment | None = None
    serverId: str | None = None
    serverVersion: Annotated[int, Field(strict=True, ge=1)] | None = None

    @field_validator("days")
    @classmethod
    def unique_days(cls, value):
        if len(value) != len(set(value)):
            raise ValueError("Module weekdays must be unique")
        return value


class FrontendCommitment(FrontendInput):
    id: Identifier
    name: Annotated[str, Field(min_length=1, max_length=160)]
    category: Annotated[str, Field(min_length=1, max_length=80)]
    schedule: Annotated[str, Field(max_length=240)]
    flexibility: Annotated[str, Field(max_length=80)]
    time: Annotated[float, Field(ge=0, le=100000)]
    mental: Annotated[float, Field(ge=0, le=100000)]
    physical: Annotated[float, Field(ge=0, le=100000)]
    social: Annotated[float, Field(ge=0, le=100000)]
    startDate: CalendarDate | None = None
    dueDate: CalendarDate | None = None
    moduleId: Identifier | None = None
    assignmentId: Identifier | None = None
    routineId: Identifier | None = None
    action: Annotated[str, Field(max_length=80)] | None = None
    durationHours: Annotated[float, Field(ge=0, le=24)] | None = None
    originalDate: CalendarDate | None = None
    helper: Annotated[str, Field(max_length=300)] | None = None
    scheduleType: Literal["Fixed", "Flexible", "Daily routine"] | None = None
    endDate: CalendarDate | None = None
    weekdays: list[Annotated[int, Field(strict=True, ge=0, le=6)]] | None = Field(
        default=None, max_length=7
    )
    sourceId: Identifier | None = None
    serverId: str | None = None
    serverVersion: Annotated[int, Field(strict=True, ge=1)] | None = None
    occurrenceKey: Identifier | None = None


class FrontendFlashcard(FrontendInput):
    id: Identifier
    question: Annotated[str, Field(min_length=1, max_length=2000)]
    answer: Annotated[str, Field(min_length=1, max_length=10000)]


class FrontendMaterial(FrontendInput):
    id: Identifier
    moduleId: Identifier
    name: Annotated[str, Field(min_length=1, max_length=160)]
    topic: Annotated[str, Field(min_length=1, max_length=160)]
    week: Annotated[str, Field(min_length=1, max_length=40)]
    date: CalendarDate
    # A device-local URI is metadata only. Raw file contents are uploaded through
    # the material/AI parser boundary when that flow is connected.
    uri: Literal[""] = ""
    cards: list[FrontendFlashcard] = Field(max_length=200)


class FrontendCheckIn(FrontendInput):
    stress: Annotated[int, Field(strict=True, ge=0, le=4)]
    causes: list[Annotated[str, Field(max_length=160)]] = Field(max_length=0)
    note: Literal[""] = ""
    savedAt: Annotated[str, Field(min_length=1, max_length=64)]
    assignments: dict[Identifier, Annotated[int, Field(strict=True, ge=5, le=100)]] | None = None
    sportToday: StrictBool | None = None


class FrontendRecoveryResult(FrontendInput):
    done: StrictBool
    feeling: Literal["Better", "About the same", "Still drained"] | None = None


class FrontendModuleDelete(FrontendInput):
    serverId: str
    serverVersion: Annotated[int, Field(strict=True, ge=1)]
    assignmentId: str | None = None
    assignmentVersion: Annotated[int, Field(strict=True, ge=1)] | None = None


class FrontendAssignmentDelete(FrontendInput):
    serverId: str
    serverVersion: Annotated[int, Field(strict=True, ge=1)]


class FrontendPlannerState(FrontendInput):
    routineEntries: dict[RoutineKind, FrontendRoutineEntry]
    feelAnswers: dict[CapacityKind, Annotated[int, Field(strict=True, ge=0, le=3)]]
    recoveryChoice: Annotated[int, Field(strict=True, ge=0, le=3)] | None = None
    commitments: list[FrontendCommitment] = Field(max_length=500)
    modules: list[FrontendModule] = Field(max_length=100)
    materials: list[FrontendMaterial] = Field(max_length=200)
    checks: dict[CalendarDate, FrontendCheckIn]
    recoveryResults: dict[CalendarDate, FrontendRecoveryResult]
    overrides: dict[Identifier, FrontendCommitment]
    registeredOn: CalendarDate | None = None
    weeklyNote: Annotated[str, Field(max_length=10000)]
    pendingModuleDeletes: list[FrontendModuleDelete] = Field(default_factory=list, max_length=100)
    pendingAssignmentDeletes: list[FrontendAssignmentDelete] = Field(
        default_factory=list, max_length=500
    )


class PlannerStateWrite(FrontendInput):
    schema_version: Literal[1] = 1
    state: FrontendPlannerState
    expected_version: Annotated[int, Field(strict=True, ge=0)]


class PlannerStateRead(FrontendInput):
    schema_version: Literal[1]
    state: FrontendPlannerState
    version: int
    updated_at: datetime
