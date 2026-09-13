import type { CapacityKind, Commitment, DailyCheckIn, RoutineEntry } from "@/models/margin";
import { recoveryHourValues, routineCatalog } from "@/models/margin";
import type { Module, PlannerState, RecoveryResult } from "@/models/planner";
import { dateKey, normalizeModuleName, shiftDate, weekStart } from "@/models/planner";
import { ApiError, authenticatedRequest, refreshCurrentUser } from "@/services/api";

type ApiRoutineKind = "classes" | "study" | "sport" | "job" | "club" | "competition" | "volunteering" | "family" | "commuting" | "errands" | "projects";
type ApiAnswer = "plenty" | "some" | "needs_break" | "exhausted";
type ApiFreeTime = "under_30" | "30_to_60" | "60_to_120" | "over_120";
type ApiEffort = { mental: number; physical: number; social: number };
type ApiSchedule =
  | { kind: "unscheduled" }
  | { kind: "once"; date: string }
  | { kind: "daily"; start_date: string; end_date?: string | null }
  | { kind: "weekly"; start_date: string; end_date?: string | null; weekdays: number[] }
  | { kind: "dates"; dates: string[] };

type ApiBaseline = {
  id: string;
  effective_from: string;
  version: number;
  routines: { kind: ApiRoutineKind; duration_minutes: number; days_per_week: number; condition: "light" | "typical" | "demanding" }[];
  answers: { mental: ApiAnswer; physical: ApiAnswer; social: ApiAnswer; free_time: ApiFreeTime };
  recovery_minutes_per_week: number;
};

type ApiModule = { id: string; name: string; version: number };
type ApiAssignment = { id: string; module_id: string; name: string; start_date: string; due_date?: string | null; version: number };
type ApiCommitment = {
  id: string;
  version: number;
  name: string;
  category: "class" | "assignment_work" | "competition" | "club" | "job" | "sport" | "social" | "personal";
  schedule: ApiSchedule;
  duration_minutes: number;
  effort: ApiEffort;
  flexibility: "fixed" | "flexible";
  module_id?: string | null;
  assignment_id?: string | null;
  deadline?: string | null;
};

type ApiCapacity = { used: number; limit: number | null; usage_percent: number | null };
type ApiOccurrence = {
  key: string;
  source: "routine" | "commitment" | "assignment_plan";
  source_id: string;
  original_date: string;
  date: string;
  name: string;
  category: string;
  duration_minutes: number;
  effort: ApiEffort;
  baseline_routine?: string | null;
  module_id?: string | null;
  assignment_id?: string | null;
  planned_percent?: number | null;
  deadline?: string | null;
  skipped: boolean;
  helper_note?: string | null;
  estimated: boolean;
  action?: "move" | "skip" | "lighten" | "ask_help" | null;
};
type ApiDay = {
  date: string;
  occurrences: ApiOccurrence[];
  deadlines: ApiAssignment[];
  capacities: Record<CapacityKind, ApiCapacity>;
  peak_usage_percent: number | null;
  energy_score: number | null;
};
type ApiPlan = {
  start_date: string;
  end_date: string;
  plan_revision: number;
  days: ApiDay[];
  unscheduled: ApiCommitment[];
};
type ApiCheckIn = {
  date: string;
  stress: number;
  assignment_plans: { assignment_id: string; planned_percent: number }[];
  sport_today?: boolean | null;
  version: number;
  updated_at: string;
};
type ApiRecovery = {
  date: string;
  recommendation_code: string;
  completed: boolean;
  reflection?: "better" | "same" | "drained" | null;
  version: number;
};
type ApiRecoverySuggestion = {
  date: string;
  recommendation_code: string;
  suggested_minutes: number;
  reason: string;
  can_complete: boolean;
  result?: ApiRecovery | null;
};
type ApiDashboard = {
  today: ApiDay;
  check_in_eligible: boolean;
  check_in_saved: boolean;
  streak: number;
  plan_revision: number;
  weekly_note?: { week_start: string; text: string; version: number } | null;
};
type ApiWhatIf = { before: ApiPlan; after: ApiPlan; warnings: string[] };

export type PlannerDay = { date: string; items: Commitment[]; capacities: { kind: CapacityKind; used: number; limit: number }[]; load: number };
export type PlannerRecoverySuggestion = {
  date: string;
  recommendationCode: string;
  suggestedMinutes: number;
  reason: string;
  canComplete: boolean;
};
export type PlannerViews = {
  planRevision: number;
  days: PlannerDay[];
  unscheduled: Commitment[];
  dashboard: {
    day: PlannerDay;
    energy: number;
    streak: number;
    checkInEligible: boolean;
    checkInSaved: boolean;
    weeklyNote: string;
  };
  recovery: PlannerRecoverySuggestion[];
};
export type WhatIfComparison = { kind: CapacityKind; before: number; after: number }[];

const answerValues: ApiAnswer[] = ["plenty", "some", "needs_break", "exhausted"];
const freeTimeValues: ApiFreeTime[] = ["under_30", "30_to_60", "60_to_120", "over_120"];
const conditionValues = { Light: "light", Typical: "typical", Demanding: "demanding" } as const;
const uiConditionValues = { light: "Light", typical: "Typical", demanding: "Demanding" } as const;
const actionToApi: Record<string, "keep" | "move" | "skip" | "lighten" | "ask_help"> = {
  "Keep as planned": "keep",
  "Move to another day": "move",
  "Skip this time": "skip",
  "Make it lighter": "lighten",
  "Ask someone to help": "ask_help",
};
const actionFromApi = { move: "Move to another day", skip: "Skip this time", lighten: "Make it lighter", ask_help: "Ask someone to help" } as const;
const categoryToApi: Record<string, ApiCommitment["category"]> = {
  Competition: "competition",
  Club: "club",
  Job: "job",
  Sport: "sport",
  Social: "social",
  Personal: "personal",
  Assignment: "assignment_work",
  Class: "class",
};
const categoryFromApi: Record<string, string> = {
  competition: "Competition",
  club: "Club",
  job: "Job",
  sport: "Sport",
  social: "Social",
  personal: "Personal",
  assignment_work: "Assignment",
  class: "Class",
  routine: "Routine",
};

const json = (method: string, body?: unknown, headers?: HeadersInit): RequestInit => ({
  method,
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  ...(headers ? { headers } : {}),
});

async function optional<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

async function listAll<T>(path: string, pageSize = 100): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const separator = path.includes("?") ? "&" : "?";
    const page = await authenticatedRequest<T[]>(`${path}${separator}offset=${offset}&limit=${pageSize}`);
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

function roundedRoutineMinutes(hours: number) {
  const allowed = [15, 30, 60, 90, 120, 180, 240, 300];
  const requested = Math.round(hours * 60);
  return allowed.reduce((best, value) => Math.abs(value - requested) < Math.abs(best - requested) ? value : best);
}

function baselinePayload(state: PlannerState, expectedRevision: number) {
  const routines = Object.entries(state.routineEntries).flatMap(([kind, entry]) => {
    if (!routineCatalog.some(item => item.id === kind)) return [];
    return [{
      kind: kind as ApiRoutineKind,
      duration_minutes: roundedRoutineMinutes(entry.durationHours),
      days_per_week: Math.max(1, Math.min(7, Math.round(entry.timesPerWeek))),
      condition: conditionValues[entry.condition],
    }];
  });
  return {
    routines,
    answers: {
      mental: answerValues[state.feelAnswers.mental ?? 1],
      physical: answerValues[state.feelAnswers.physical ?? 1],
      social: answerValues[state.feelAnswers.social ?? 1],
      free_time: freeTimeValues[state.feelAnswers.time ?? 1],
    },
    recovery_minutes_per_week: recoveryHourValues[state.recoveryChoice ?? 0] * 60,
    expected_revision: expectedRevision,
  };
}

function baselineComparable(value: ApiBaseline) {
  return {
    routines: value.routines,
    answers: value.answers,
    recovery_minutes_per_week: value.recovery_minutes_per_week,
  };
}

function applyBaseline(state: PlannerState, baseline: ApiBaseline): PlannerState {
  const routineEntries = Object.fromEntries(baseline.routines.map(routine => [
    routine.kind,
    {
      durationHours: routine.duration_minutes / 60,
      timesPerWeek: routine.days_per_week,
      condition: uiConditionValues[routine.condition],
    } satisfies RoutineEntry,
  ]));
  const feelAnswers: PlannerState["feelAnswers"] = {
    mental: answerValues.indexOf(baseline.answers.mental),
    physical: answerValues.indexOf(baseline.answers.physical),
    social: answerValues.indexOf(baseline.answers.social),
    time: freeTimeValues.indexOf(baseline.answers.free_time),
  };
  return {
    ...state,
    routineEntries,
    feelAnswers,
    recoveryChoice: Math.max(0, recoveryHourValues.indexOf(baseline.recovery_minutes_per_week / 60)),
  };
}

function scheduleToApi(item: Commitment): ApiSchedule {
  if (item.scheduleType === "Flexible" || (!item.startDate && !item.dueDate)) return { kind: "unscheduled" };
  const start = item.startDate ?? item.dueDate!;
  if (item.scheduleType === "Daily routine") {
    return { kind: "daily", start_date: start, end_date: item.endDate ?? null };
  }
  if (item.endDate && item.endDate !== start || item.weekdays?.length) {
    return {
      kind: "weekly",
      start_date: start,
      end_date: item.endDate ?? null,
      weekdays: item.weekdays?.length ? [...new Set(item.weekdays)].sort((a, b) => a - b) : [new Date(`${start}T12:00:00`).getDay()],
    };
  }
  return { kind: "once", date: start };
}

function scheduleFromApi(schedule: ApiSchedule) {
  if (schedule.kind === "unscheduled") return { scheduleType: "Flexible" as const, schedule: "Set up later" };
  if (schedule.kind === "once") return { scheduleType: "Fixed" as const, startDate: schedule.date, endDate: schedule.date, schedule: schedule.date };
  if (schedule.kind === "dates") {
    const dates = [...schedule.dates].sort();
    return { scheduleType: "Fixed" as const, startDate: dates[0], endDate: dates.at(-1), weekdays: [...new Set(dates.map(value => new Date(`${value}T12:00:00`).getDay()))], schedule: dates[0] };
  }
  return {
    scheduleType: schedule.kind === "daily" ? "Daily routine" as const : "Fixed" as const,
    startDate: schedule.start_date,
    endDate: schedule.end_date ?? undefined,
    weekdays: schedule.kind === "weekly" ? schedule.weekdays : undefined,
    schedule: schedule.start_date,
  };
}

function moduleServerId(modules: Module[], localId?: string | null) {
  if (!localId) return undefined;
  return modules.find(module => module.id === localId)?.serverId;
}

function assignmentServerId(modules: Module[], localId?: string | null) {
  if (!localId) return undefined;
  return modules.find(module => module.id === localId)?.assignment?.serverId;
}

function commitmentPayload(item: Commitment, modules: Module[]) {
  const category = categoryToApi[item.category] ?? "personal";
  const durationMinutes = Math.max(1, Math.min(1440, Math.round((item.durationHours ?? Math.max(0.25, item.time / 5)) * 60)));
  const effort = {
    mental: Math.max(0, Math.min(5, Math.round(item.mental / 5))),
    physical: Math.max(0, Math.min(5, Math.round(item.physical / 5))),
    social: Math.max(0, Math.min(5, Math.round(item.social / 5))),
  };
  const moduleId = moduleServerId(modules, item.moduleId);
  const assignmentId = item.assignmentId ?? assignmentServerId(modules, item.moduleId);
  return {
    name: item.name,
    category,
    schedule: scheduleToApi(item),
    duration_minutes: durationMinutes,
    effort,
    flexibility: item.flexibility === "Fixed" ? "fixed" : "flexible",
    module_id: category === "class" || category === "assignment_work" ? moduleId : undefined,
    assignment_id: category === "assignment_work" ? assignmentId : undefined,
    deadline: category === "competition" ? item.dueDate ?? undefined : undefined,
  };
}

function apiCommitmentToUi(value: ApiCommitment, modules: Module[], local?: Commitment): Commitment {
  const schedule = scheduleFromApi(value.schedule);
  const module = modules.find(item => item.serverId === value.module_id);
  const hours = value.duration_minutes / 60;
  return {
    ...local,
    id: local?.id ?? `commitment-${value.id}`,
    serverId: value.id,
    serverVersion: value.version,
    name: value.name,
    category: categoryFromApi[value.category] ?? "Personal",
    ...schedule,
    flexibility: value.flexibility === "fixed" ? "Fixed" : "Flexible",
    durationHours: hours,
    time: hours * 5,
    mental: value.effort.mental * 5,
    physical: value.effort.physical * 5,
    social: value.effort.social * 5,
    moduleId: module?.id,
    assignmentId: value.assignment_id ?? undefined,
    dueDate: value.deadline ?? undefined,
  };
}

function isManagedCommitment(item: Commitment) {
  return !item.routineId && item.category !== "Routine" && item.category !== "Class"
    && (!item.id.startsWith("assignment-") || !!item.serverId);
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, canonical(child)]));
  }
  return value;
}

function sameJson(left: unknown, right: unknown) {
  return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
}

async function syncBaseline(state: PlannerState) {
  const ready = Object.keys(state.routineEntries).length > 0
    && state.feelAnswers.mental !== undefined
    && state.feelAnswers.time !== undefined
    && state.recoveryChoice !== undefined;
  if (!ready) return optional(authenticatedRequest<ApiBaseline>("/v1/baseline"));
  const existing = await optional(authenticatedRequest<ApiBaseline>("/v1/baseline"));
  const user = await refreshCurrentUser();
  const payload = baselinePayload(state, user.planRevision);
  const { expected_revision: _revision, ...comparablePayload } = payload;
  if (existing && sameJson(baselineComparable(existing), comparablePayload)) return existing;
  return authenticatedRequest<ApiBaseline>("/v1/baseline", json("PUT", payload));
}

async function syncAcademic(
  modules: Module[],
  deletions: NonNullable<PlannerState["pendingModuleDeletes"]> = [],
  assignmentDeletions: NonNullable<PlannerState["pendingAssignmentDeletes"]> = [],
) {
  const existingModules = await listAll<ApiModule>("/v1/modules");
  const existingAssignments = await listAll<ApiAssignment>("/v1/assignments");
  const claimedModules = new Set<string>();
  const nextModules: Module[] = [];

  for (const desired of modules) {
    let current = existingModules.find(item => item.id === desired.serverId && !claimedModules.has(item.id));
    current ??= existingModules.find(item => normalizeModuleName(item.name) === normalizeModuleName(desired.name) && !claimedModules.has(item.id));
    let moduleRenamed = false;
    if (!current) {
      current = await authenticatedRequest<ApiModule>("/v1/modules", json("POST", { name: desired.name }));
    } else if (current.name !== desired.name) {
      const expectedVersion = desired.serverId === current.id ? desired.serverVersion ?? current.version : current.version;
      current = await authenticatedRequest<ApiModule>(
        `/v1/modules/${current.id}`,
        json("PUT", { name: desired.name }, { "X-Resource-Version": String(expectedVersion) }),
      );
      moduleRenamed = true;
    }
    claimedModules.add(current.id);
    let assignment = existingAssignments.find(item => item.id === desired.assignment?.serverId)
      ?? existingAssignments.find(item => item.module_id === current!.id);
    if (assignment && moduleRenamed) assignment = { ...assignment, version: assignment.version + 1 };
    if (desired.assignment) {
      const payload = { module_id: current.id, start_date: desired.assignment.start, due_date: desired.assignment.due || null };
      if (!assignment) {
        assignment = await authenticatedRequest<ApiAssignment>("/v1/assignments", json("POST", payload));
      } else if (assignment.start_date !== payload.start_date || (assignment.due_date ?? null) !== payload.due_date) {
        const expectedVersion = moduleRenamed
          ? assignment.version
          : desired.assignment.serverId === assignment.id ? desired.assignment.serverVersion ?? assignment.version : assignment.version;
        assignment = await authenticatedRequest<ApiAssignment>(
          `/v1/assignments/${assignment.id}`,
          json("PUT", payload, { "X-Resource-Version": String(expectedVersion) }),
        );
      }
    }
    nextModules.push({
      ...desired,
      serverId: current.id,
      serverVersion: current.version,
      assignment: desired.assignment && assignment ? {
        ...desired.assignment,
        serverId: assignment.id,
        serverVersion: assignment.version,
      } : undefined,
    });
  }

  const assignmentDeletes = [...assignmentDeletions, ...deletions.flatMap(deletion => (
    deletion.assignmentId && deletion.assignmentVersion
      ? [{ serverId: deletion.assignmentId, serverVersion: deletion.assignmentVersion }]
      : []
  ))].filter((deletion, index, all) => all.findIndex(item => item.serverId === deletion.serverId) === index);
  for (const deletion of assignmentDeletes) {
    const assignment = existingAssignments.find(item => item.id === deletion.serverId);
    if (!assignment) continue;
    await authenticatedRequest<void>(
      `/v1/assignments/${assignment.id}`,
      json("DELETE", undefined, { "X-Resource-Version": String(deletion.serverVersion) }),
    );
  }

  for (const deletion of deletions) {
    const current = existingModules.find(item => item.id === deletion.serverId);
    if (!current) continue;
    await authenticatedRequest<void>(
      `/v1/modules/${current.id}`,
      json("DELETE", undefined, { "X-Resource-Version": String(deletion.serverVersion) }),
    );
  }
  return nextModules;
}

async function syncCommitments(commitments: Commitment[], modules: Module[]) {
  const existing = await listAll<ApiCommitment>("/v1/commitments");
  const managedExisting = existing.filter(item => item.category !== "class");
  const claimed = new Set<string>();
  const next: Commitment[] = [];
  for (const desired of commitments) {
    if (!isManagedCommitment(desired)) {
      next.push(desired);
      continue;
    }
    const payload = commitmentPayload(desired, modules);
    let current = managedExisting.find(item => item.id === desired.serverId && !claimed.has(item.id));
    current ??= managedExisting.find(item => item.name === desired.name && item.category === payload.category && !claimed.has(item.id));
    if (!current) {
      current = await authenticatedRequest<ApiCommitment>("/v1/commitments", json("POST", payload));
    } else {
      const comparable = { ...current } as Record<string, unknown>;
      delete comparable.id;
      delete comparable.version;
      const normalizedPayload = { ...payload, module_id: payload.module_id ?? null, assignment_id: payload.assignment_id ?? null, deadline: payload.deadline ?? null };
      if (!sameJson(comparable, normalizedPayload)) {
        const expectedVersion = desired.serverId === current.id ? desired.serverVersion ?? current.version : current.version;
        current = await authenticatedRequest<ApiCommitment>(
          `/v1/commitments/${current.id}?reset_adjustments=true`,
          json("PUT", payload, { "X-Resource-Version": String(expectedVersion) }),
        );
      }
    }
    claimed.add(current.id);
    next.push(apiCommitmentToUi(current, modules, desired));
  }
  return next;
}

async function syncTodayCheckIn(state: PlannerState, modules: Module[]) {
  const today = dateKey();
  const check = state.checks[today];
  if (!check) return;
  const user = await refreshCurrentUser();
  if (!user.registeredOn || today <= user.registeredOn) return;
  const assignment_plans = Object.entries(check.assignments ?? {}).flatMap(([moduleId, plannedPercent]) => {
    const assignmentId = assignmentServerId(modules, moduleId);
    return assignmentId ? [{ assignment_id: assignmentId, planned_percent: plannedPercent }] : [];
  });
  const payload = { stress: check.stress, assignment_plans, sport_today: check.sportToday };
  const current = await authenticatedRequest<ApiCheckIn[]>(`/v1/check-ins?start_date=${today}&end_date=${today}`);
  const existing = current[0];
  if (existing && sameJson(
    { stress: existing.stress, assignment_plans: existing.assignment_plans, sport_today: existing.sport_today ?? undefined },
    payload,
  )) return;
  await authenticatedRequest<ApiCheckIn>(
    `/v1/check-ins/${today}?expected_revision=${user.planRevision}&reset_adjustments=true`,
    json("PUT", payload),
  );
}

async function syncWeeklyNote(state: PlannerState) {
  const dashboard = await optional(authenticatedRequest<ApiDashboard>("/v1/dashboard"));
  if (!dashboard || dashboard.weekly_note?.text === state.weeklyNote || (!state.weeklyNote.trim() && !dashboard.weekly_note)) return;
  const user = await refreshCurrentUser();
  await authenticatedRequest(
    `/v1/weekly-notes/${weekStart(dateKey())}?expected_revision=${user.planRevision}`,
    json("PUT", { text: state.weeklyNote }),
  );
}

async function syncTodayRecovery(state: PlannerState) {
  const today = dateKey();
  const desired = state.recoveryResults[today];
  if (!desired) return;
  const suggestions = await authenticatedRequest<ApiRecoverySuggestion[]>("/v1/recovery?days=1");
  const existing = suggestions[0]?.result;
  const reflection = desired.feeling === "Better" ? "better" : desired.feeling === "About the same" ? "same" : desired.feeling === "Still drained" ? "drained" : null;
  if (existing?.completed === desired.done && (existing.reflection ?? null) === reflection) return;
  const user = await refreshCurrentUser();
  await authenticatedRequest<ApiRecovery>(
    `/v1/recovery/${today}?expected_revision=${user.planRevision}`,
    json("PUT", { completed: desired.done, reflection: desired.done ? reflection : null }),
  );
}

/** Persist every non-AI planner input through its normalized, user-owned API. */
export async function syncPlanningState(state: PlannerState): Promise<PlannerState> {
  await syncBaseline(state);
  const modules = await syncAcademic(
    state.modules,
    state.pendingModuleDeletes ?? [],
    state.pendingAssignmentDeletes ?? [],
  );
  const commitments = (await syncCommitments(state.commitments, modules))
    .filter(item => !item.id.startsWith("assignment-"))
    .concat(assignmentCommitments(modules));
  const next = { ...state, modules, commitments, pendingModuleDeletes: [], pendingAssignmentDeletes: [] };
  await syncTodayCheckIn(next, modules);
  if (next.registeredOn) await syncWeeklyNote(next);
  if (next.registeredOn) await syncTodayRecovery(next);
  return next;
}

let pendingPlanningState: PlannerState | undefined;
let planningSyncDrain: Promise<PlannerState> | undefined;

/** Coalesce rapid slider/form changes and serialize revision-sensitive writes. */
export function queuePlanningStateSync(state: PlannerState) {
  pendingPlanningState = state;
  if (!planningSyncDrain) {
    planningSyncDrain = (async () => {
      let latest = state;
      while (pendingPlanningState) {
        const pending = pendingPlanningState;
        pendingPlanningState = undefined;
        latest = await syncPlanningState(pending);
      }
      return latest;
    })().finally(() => {
      planningSyncDrain = undefined;
    });
  }
  return planningSyncDrain;
}

export function clearPlanningSyncQueue() {
  pendingPlanningState = undefined;
}

/** Excludes device-only material contents and diary text from the normalized sync trigger. */
export function planningStateSignature(state: PlannerState) {
  const today = dateKey();
  return JSON.stringify({
    routineEntries: state.routineEntries,
    feelAnswers: state.feelAnswers,
    recoveryChoice: state.recoveryChoice,
    commitments: state.commitments,
    modules: state.modules,
    checkIn: state.checks[today] ? { ...state.checks[today], note: "", causes: [] } : undefined,
    recovery: state.recoveryResults[today],
    registeredOn: state.registeredOn,
    weeklyNote: state.weeklyNote,
    pendingModuleDeletes: state.pendingModuleDeletes,
    pendingAssignmentDeletes: state.pendingAssignmentDeletes,
  });
}

function mergeServerModules(local: PlannerState, modules: ApiModule[], assignments: ApiAssignment[]) {
  const claimedLocal = new Set<string>();
  const next = modules.map(server => {
    const match = local.modules.find(item => item.serverId === server.id)
      ?? local.modules.find(item => normalizeModuleName(item.name) === normalizeModuleName(server.name) && !claimedLocal.has(item.id));
    if (match) claimedLocal.add(match.id);
    const assignment = assignments.find(item => item.module_id === server.id);
    return {
      id: match?.id ?? `module-${server.id}`,
      name: server.name,
      days: match?.days ?? [],
      serverId: server.id,
      serverVersion: server.version,
      assignment: assignment ? {
        start: assignment.start_date,
        due: assignment.due_date ?? "",
        serverId: assignment.id,
        serverVersion: assignment.version,
      } : undefined,
    } satisfies Module;
  });
  return next;
}

function assignmentCommitments(modules: Module[]): Commitment[] {
  return modules.filter(module => module.assignment).map(module => ({
    id: `assignment-${module.id}`,
    moduleId: module.id,
    assignmentId: module.assignment!.serverId,
    name: `${module.name} assignment`,
    category: "Assignment",
    schedule: module.assignment!.start,
    startDate: module.assignment!.start,
    dueDate: module.assignment!.due || undefined,
    durationHours: 1,
    time: 5,
    mental: 15,
    physical: 0,
    social: 0,
    flexibility: "Somewhat flexible",
  }));
}

function apiCheckToUi(value: ApiCheckIn, modules: Module[], local?: DailyCheckIn): DailyCheckIn {
  const assignments = Object.fromEntries(value.assignment_plans.flatMap(plan => {
    const module = modules.find(item => item.assignment?.serverId === plan.assignment_id);
    return module ? [[module.id, plan.planned_percent]] : [];
  }));
  return {
    stress: value.stress,
    assignments,
    sportToday: value.sport_today ?? undefined,
    savedAt: value.updated_at,
    note: local?.note ?? "",
    causes: local?.causes ?? [],
  };
}

function apiRecoveryToUi(value?: ApiRecovery | null): RecoveryResult | undefined {
  if (!value) return undefined;
  const feeling = value.reflection === "better" ? "Better" : value.reflection === "same" ? "About the same" : value.reflection === "drained" ? "Still drained" : undefined;
  return { done: value.completed, feeling };
}

/** Load the normalized backend as source of truth, migrating a completed legacy snapshot once. */
export async function initializePlanningState(local: PlannerState, preferLocal = false): Promise<PlannerState> {
  let baseline = await optional(authenticatedRequest<ApiBaseline>("/v1/baseline"));
  let serverModules = await listAll<ApiModule>("/v1/modules");
  let serverCommitments = await listAll<ApiCommitment>("/v1/commitments");
  const serverHasPlan = !!baseline || serverModules.length > 0 || serverCommitments.length > 0;
  if (local.registeredOn && (!serverHasPlan || preferLocal)) {
    const migrated = await syncPlanningState(local);
    baseline = await optional(authenticatedRequest<ApiBaseline>("/v1/baseline"));
    serverModules = await listAll<ApiModule>("/v1/modules");
    serverCommitments = await listAll<ApiCommitment>("/v1/commitments");
    local = migrated;
  }
  if (!baseline && !serverModules.length && !serverCommitments.length) return local;

  const assignments = await listAll<ApiAssignment>("/v1/assignments");
  const modules = mergeServerModules(local, serverModules, assignments);
  const managedLocal = local.commitments.filter(isManagedCommitment);
  const commitments = serverCommitments
    .filter(item => item.category !== "class")
    .map(item => apiCommitmentToUi(item, modules, managedLocal.find(localItem => localItem.serverId === item.id)))
    .concat(assignmentCommitments(modules));
  let next: PlannerState = { ...local, modules, commitments };
  if (baseline) next = applyBaseline(next, baseline);

  const user = await refreshCurrentUser();
  // Account creation is not onboarding completion. The backend stores a date on
  // every user for domain compatibility, but the planner opens only after a
  // baseline exists (or a completed legacy plan already supplied this value).
  if (baseline) next.registeredOn = user.registeredOn || baseline.effective_from || next.registeredOn;
  const start = shiftDate(dateKey(), -89);
  const checks = await authenticatedRequest<ApiCheckIn[]>(`/v1/check-ins?start_date=${start}&end_date=${dateKey()}`);
  next.checks = {
    ...next.checks,
    ...Object.fromEntries(checks.map(check => [check.date, apiCheckToUi(check, modules, next.checks[check.date])])),
  };
  const dashboard = await optional(authenticatedRequest<ApiDashboard>("/v1/dashboard"));
  if (dashboard) next.weeklyNote = dashboard.weekly_note?.text ?? "";
  const recovery = await optional(authenticatedRequest<ApiRecoverySuggestion[]>("/v1/recovery?days=7"));
  if (recovery) {
    next.recoveryResults = {
      ...next.recoveryResults,
      ...Object.fromEntries(recovery.flatMap(item => {
        const result = apiRecoveryToUi(item.result);
        return result ? [[item.date, result]] : [];
      })),
    };
  }
  return next;
}

function occurrenceToUi(value: ApiOccurrence, state: PlannerState): Commitment {
  const module = state.modules.find(item => item.serverId === value.module_id);
  const source = state.commitments.find(item => item.serverId === value.source_id);
  const hours = value.duration_minutes / 60;
  return {
    id: value.key,
    occurrenceKey: value.key,
    sourceId: value.source_id,
    serverId: value.source === "commitment" ? value.source_id : undefined,
    serverVersion: source?.serverVersion,
    assignmentId: value.assignment_id ?? undefined,
    moduleId: module?.id,
    name: value.name,
    category: categoryFromApi[value.category] ?? (value.source === "routine" ? "Routine" : "Personal"),
    schedule: value.date,
    flexibility: source?.flexibility ?? "Somewhat flexible",
    startDate: value.date,
    originalDate: value.original_date,
    dueDate: value.deadline ?? undefined,
    durationHours: hours,
    time: hours * 5,
    mental: value.effort.mental * 5,
    physical: value.effort.physical * 5,
    social: value.effort.social * 5,
    routineId: value.source === "routine" ? value.baseline_routine ?? value.source_id : undefined,
    action: value.action ? actionFromApi[value.action] : undefined,
    helper: value.helper_note ?? undefined,
  };
}

function dayToUi(value: ApiDay, state: PlannerState): PlannerDay {
  const occurrenceAssignmentIds = new Set(value.occurrences.map(item => item.assignment_id).filter(Boolean));
  const deadlines: Commitment[] = value.deadlines.filter(item => !occurrenceAssignmentIds.has(item.id)).map(item => {
    const module = state.modules.find(module => module.serverId === item.module_id);
    return {
      id: `deadline-${item.id}-${value.date}`,
      assignmentId: item.id,
      moduleId: module?.id,
      name: item.name,
      category: "Assignment",
      schedule: value.date,
      flexibility: "Fixed",
      startDate: value.date,
      dueDate: item.due_date ?? undefined,
      durationHours: 0,
      time: 0,
      mental: 0,
      physical: 0,
      social: 0,
    };
  });
  return {
    date: value.date,
    items: value.occurrences.map(item => occurrenceToUi(item, state)).concat(deadlines),
    capacities: (["time", "mental", "physical", "social"] as CapacityKind[]).map(kind => ({
      kind,
      used: value.capacities[kind].used,
      limit: value.capacities[kind].limit ?? Math.max(1, value.capacities[kind].used),
    })),
    load: Math.round(value.peak_usage_percent ?? 0),
  };
}

export async function loadPlannerViews(state: PlannerState, startDate: string, endDate: string): Promise<PlannerViews> {
  const [plan, dashboard, recovery] = await Promise.all([
    authenticatedRequest<ApiPlan>(`/v1/planner?start_date=${startDate}&end_date=${endDate}`),
    authenticatedRequest<ApiDashboard>("/v1/dashboard"),
    authenticatedRequest<ApiRecoverySuggestion[]>("/v1/recovery?days=7"),
  ]);
  return {
    planRevision: dashboard.plan_revision,
    days: plan.days.map(day => dayToUi(day, state)),
    unscheduled: plan.unscheduled.map(item => apiCommitmentToUi(item, state.modules, state.commitments.find(local => local.serverId === item.id))),
    dashboard: {
      day: dayToUi(dashboard.today, state),
      energy: Math.round(dashboard.today.energy_score ?? 0),
      streak: dashboard.streak,
      checkInEligible: dashboard.check_in_eligible,
      checkInSaved: dashboard.check_in_saved,
      weeklyNote: dashboard.weekly_note?.text ?? "",
    },
    recovery: recovery.map(item => ({
      date: item.date,
      recommendationCode: item.recommendation_code,
      suggestedMinutes: item.suggested_minutes,
      reason: item.reason,
      canComplete: item.can_complete,
    })),
  };
}

export async function previewCommitment(state: PlannerState, item: Commitment): Promise<WhatIfComparison> {
  const start = item.startDate ?? dateKey();
  const end = item.endDate ?? start;
  const schedule = scheduleToApi(item);
  const result = await authenticatedRequest<ApiWhatIf>("/v1/planner/what-if", json("POST", {
    commitment: commitmentPayload(item, state.modules),
    start_date: start,
    end_date: end,
    illustrative_date: schedule.kind === "unscheduled" ? start : undefined,
  }));
  const before = result.before.days.find(day => day.date === start) ?? result.before.days[0];
  const after = result.after.days.find(day => day.date === start) ?? result.after.days[0];
  return (["time", "mental", "physical", "social"] as CapacityKind[]).map(kind => ({
    kind,
    before: Math.round(before.capacities[kind].usage_percent ?? 0),
    after: Math.round(after.capacities[kind].usage_percent ?? 0),
  }));
}

export async function applyPlanningAction(
  state: PlannerState,
  item: Commitment,
  action: string,
  targetDate: string,
  durationHours: number,
  helper: string,
) {
  const originalDate = item.originalDate ?? item.startDate ?? dateKey();
  let occurrenceKey = item.occurrenceKey;
  if (!occurrenceKey) {
    const plan = await authenticatedRequest<ApiPlan>(`/v1/planner?start_date=${originalDate}&end_date=${originalDate}`);
    const candidates = plan.days[0]?.occurrences ?? [];
    occurrenceKey = candidates.find(value => item.serverId && value.source_id === item.serverId)?.key
      ?? candidates.find(value => item.routineId && value.source_id === item.routineId)?.key
      ?? candidates.find(value => value.name === item.name)?.key;
  }
  if (!occurrenceKey) throw new ApiError("This plan item is not available on the server yet", 409);
  const user = await refreshCurrentUser();
  const apiAction = actionToApi[action];
  const payload: Record<string, unknown> = {
    occurrence_key: occurrenceKey,
    original_date: originalDate,
    action: apiAction,
    expected_revision: user.planRevision,
  };
  if (apiAction === "move") payload.target_date = targetDate;
  if (apiAction === "lighten") payload.duration_minutes = Math.max(1, Math.round(durationHours * 60));
  if (apiAction === "ask_help") payload.helper_note = helper.trim() || undefined;
  await authenticatedRequest("/v1/planner/actions", json("POST", payload));
}
