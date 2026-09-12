export type CapacityKind = "time" | "mental" | "physical" | "social";

export type CapacityValue = {
  kind: CapacityKind;
  used: number;
  limit: number;
};

export type Commitment = {
  id: string;
  name: string;
  category: string;
  schedule: string;
  flexibility: string;
  time: number;
  mental: number;
  physical: number;
  social: number;
  startDate?: string;
  dueDate?: string;
  moduleId?: string;
  routineId?: string;
  action?: string;
  durationHours?: number;
  originalDate?: string;
  helper?: string;
  scheduleType?: "Fixed" | "Flexible" | "Daily routine";
  endDate?: string;
  weekdays?: number[];
  sourceId?: string;
};

export type LoadWeights = Record<CapacityKind, number>;

export type RoutineItem = {
  id: string;
  label: string;
  weights: LoadWeights;
};

export type RoutineEntry = {
  durationHours: number;
  timesPerWeek: number;
  condition: RoutineCondition;
};

export type RoutineCondition = "Light" | "Typical" | "Demanding";
export type DashboardPeriod = "week" | "month";

export type DailyCheckIn = {
  stress: number;
  causes: string[];
  note: string;
  savedAt: string;
  assignments?: Record<string, number>;
  sportToday?: boolean;
};

export type AppScreen =
  | "welcome"
  | "preparing"
  | "flashcards"
  | "routine-checklist"
  | "routine-hours"
  | "feel-questions"
  | "setup-choice"
  | "import-timetable"
  | "add-onboarding"
  | "anything-else"
  | "today"
  | "plan"
  | "add"
  | "rebalance"
  | "test-commitment"
  | "simulator"
  | "recovery"
  | "profile"
  | "schedule"
  | "assignments"
  | "weekly-note"
  | "rebalanced";

export type MainTab = "today" | "plan" | "recovery" | "profile";

export type QuickAddAction = "timetable" | "assignment" | "commitment" | "materials" | "weekly-note";

export const capacityMeta: Record<CapacityKind, { label: string; color: string }> = {
  time: { label: "Time", color: "#0F6B4F" },
  mental: { label: "Mental", color: "#D45F4E" },
  physical: { label: "Physical", color: "#C68A2E" },
  social: { label: "Social", color: "#6F67B6" },
};

export const sampleCapacities: CapacityValue[] = [
  { kind: "time", used: 96, limit: 100 },
  { kind: "mental", used: 88, limit: 100 },
  { kind: "physical", used: 72, limit: 100 },
  { kind: "social", used: 64, limit: 100 },
];

export const sampleMonthlyCapacities: CapacityValue[] = [
  { kind: "time", used: 84, limit: 100 },
  { kind: "mental", used: 79, limit: 100 },
  { kind: "physical", used: 68, limit: 100 },
  { kind: "social", used: 70, limit: 100 },
];

export const routineCatalog: RoutineItem[] = [
  { id: "classes", label: "Classes / lectures", weights: { time: 1, mental: 1, physical: 0.1, social: 0.3 } },
  { id: "study", label: "Assignments & study", weights: { time: 1, mental: 1, physical: 0, social: 0 } },
  { id: "sport", label: "Gym or sport", weights: { time: 1, mental: 0.2, physical: 1, social: 0.3 } },
  { id: "job", label: "Part-time job", weights: { time: 1, mental: 0.6, physical: 0.6, social: 0.6 } },
  { id: "club", label: "Club or society", weights: { time: 1, mental: 0.5, physical: 0.2, social: 1 } },
  { id: "competition", label: "Competition or team", weights: { time: 1, mental: 1, physical: 0.7, social: 0.8 } },
  { id: "volunteering", label: "Volunteering", weights: { time: 1, mental: 0.5, physical: 0.5, social: 0.9 } },
  { id: "family", label: "Family duties", weights: { time: 1, mental: 0.6, physical: 0.5, social: 0.6 } },
  { id: "commuting", label: "Commuting", weights: { time: 1, mental: 0.2, physical: 0.5, social: 0 } },
  { id: "errands", label: "Errands & chores", weights: { time: 1, mental: 0.3, physical: 0.5, social: 0.1 } },
  { id: "projects", label: "Personal projects", weights: { time: 1, mental: 0.9, physical: 0, social: 0 } },
];

export const durationOptions = [
  ["Under 30 min", 0.25],
  ["30 min", 0.5],
  ["1 hr", 1],
  ["1.5 hrs", 1.5],
  ["2 hrs", 2],
  ["3 hrs", 3],
  ["4 hrs", 4],
  ["5+ hrs", 5],
] as const;

export const frequencyOptions = [
  ["Once", 1],
  ["2×", 2],
  ["3×", 3],
  ["4×", 4],
  ["5×", 5],
  ["6×", 6],
  ["Every day", 7],
] as const;

export const routineConditionOptions: RoutineCondition[] = ["Light", "Typical", "Demanding"];

export const recoveryHourValues = [3, 5, 9, 14];
export const spareHourValues = [2, 5, 11, 18];

export const sampleCommitments: Commitment[] = [
  { id: "robotics-practice", name: "Robotics Club practice", category: "Club", schedule: "Tue, 7:00 PM", flexibility: "Somewhat flexible", time: 16, mental: 18, physical: 10, social: 14 },
  { id: "data-midterm", name: "Data Structures midterm", category: "Class", schedule: "Thu, 10:00 AM", flexibility: "Fixed", time: 18, mental: 34, physical: 4, social: 2 },
  { id: "grocery-run", name: "Grocery run", category: "Personal", schedule: "Wed, 6:00 PM", flexibility: "Flexible", time: 8, mental: 4, physical: 8, social: 2 },
  { id: "poster-design", name: "Robotics Club poster design", category: "Club", schedule: "Due Friday", flexibility: "Flexible", time: 12, mental: 20, physical: 2, social: 4 },
  { id: "social-mixer", name: "Optional club social mixer", category: "Social", schedule: "Sat, 8:00 PM", flexibility: "Flexible", time: 10, mental: 8, physical: 6, social: 24 },
];

export const weekendHackathon: Commitment = {
  id: "weekend-hackathon",
  name: "Weekend Hackathon",
  category: "Club",
  schedule: "Fri–Sun",
  flexibility: "Fixed",
  time: 22,
  mental: 26,
  physical: 18,
  social: 12,
};

export function requiredFeelKinds(selectedIds: string[]): CapacityKind[] {
  const selected = routineCatalog.filter((item) => selectedIds.includes(item.id));
  const extraQuestionCount = Math.min(2, Math.max(0, selected.length - 2));
  const rankedExtras = (["physical", "social"] as CapacityKind[])
    .map((kind) => ({ kind, weight: selected.reduce((sum, item) => sum + item.weights[kind], 0) }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, extraQuestionCount)
    .map(({ kind }) => kind);
  return ["mental", "time", ...rankedExtras];
}

export function weeklyHours(entry: RoutineEntry): number {
  return entry.durationHours * entry.timesPerWeek;
}

export function formatHours(value: number): string {
  return Number.isInteger(value) ? `${value} h` : `${value.toFixed(1)} h`;
}

export function createCommitmentId(name: string): string {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `${slug || "commitment"}-${Date.now()}`;
}

const dayAliases = [
  ["monday", "mon"],
  ["tuesday", "tue"],
  ["wednesday", "wed"],
  ["thursday", "thu"],
  ["friday", "fri", "due friday"],
  ["saturday", "sat"],
  ["sunday", "sun"],
] as const;

export const commitmentDayLabels = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "Unscheduled"];

export function commitmentDayIndex(schedule: string): number {
  const normalized = schedule.toLowerCase();
  const index = dayAliases.findIndex((aliases) => aliases.some((alias) => normalized.includes(alias)));
  return index < 0 ? 7 : index;
}

export function commitmentLoadTotals(commitments: Commitment[]): Record<CapacityKind, number> {
  return commitments.reduce<Record<CapacityKind, number>>(
    (totals, item) => ({
      time: totals.time + item.time,
      mental: totals.mental + item.mental,
      physical: totals.physical + item.physical,
      social: totals.social + item.social,
    }),
    { time: 0, mental: 0, physical: 0, social: 0 },
  );
}
