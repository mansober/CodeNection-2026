import { CapacityKind, CapacityValue, Commitment, DailyCheckIn, RoutineEntry, capacityMeta, routineCatalog } from "./margin";

export type Module = {
  /** Stable UI id. Existing local plans keep this id during the backend migration. */
  id: string;
  name: string;
  days: number[];
  serverId?: string;
  serverVersion?: number;
  assignment?: {
    start: string;
    due: string;
    serverId?: string;
    serverVersion?: number;
  };
};
export type FlashCard = { id: string; question: string; answer: string };
export type Material = { id: string; moduleId: string; name: string; topic: string; week: string; date: string; uri: string; cards: FlashCard[] };
export type RecoveryResult = { done: boolean; feeling?: string };
export type PlannerState = {
  routineEntries: Record<string, RoutineEntry>;
  feelAnswers: Partial<Record<CapacityKind, number>>;
  recoveryChoice?: number;
  commitments: Commitment[];
  modules: Module[];
  materials: Material[];
  checks: Record<string, DailyCheckIn>;
  recoveryResults: Record<string, RecoveryResult>;
  overrides: Record<string, Commitment>;
  registeredOn?: string;
  weeklyNote: string;
  pendingModuleDeletes?: {
    serverId: string;
    serverVersion: number;
    assignmentId?: string;
    assignmentVersion?: number;
  }[];
  pendingAssignmentDeletes?: {
    serverId: string;
    serverVersion: number;
  }[];
};
export type RecoveryOption = {
  id: string;
  title: string;
  duration: string;
  detail: string;
  evidence?: string;
  supports: CapacityKind[];
  costs?: CapacityKind[];
};
export const dateKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export const fromKey = (value: string) => new Date(`${value}T12:00:00`);
export const shiftDate = (value: string, days: number) => { const d = fromKey(value); d.setDate(d.getDate() + days); return dateKey(d); };
export const weekStart = (value: string) => shiftDate(value, -((fromKey(value).getDay() + 6) % 7));
export const prettyDate = (value: string) => fromKey(value).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
export const planActions = ["Keep as planned", "Move to another day", "Ask someone to help", "Skip this time", "Make it lighter"];

export const normalizeModuleName = (value: string) => value.normalize("NFKC").trim().toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

export function mergeImportedModules(current: Module[], imported: Module[]) {
  const next = [...current];
  imported.forEach(module => {
    const match = next.findIndex(existing => normalizeModuleName(existing.name) === normalizeModuleName(module.name));
    if (match < 0) {
      next.push({ ...module, id: `${module.id}-${Date.now()}-${next.length}` });
      return;
    }
    // Keep the existing id so assignments and learning materials remain linked,
    // while the timetable becomes authoritative for the display name and class days.
    next[match] = { ...next[match], name: module.name, days: module.days };
  });
  return next;
}

export function parseTimetable(text: string): Module[] {
  const unfolded = text.replace(/\r?\n[ \t]/g, "");
  const modules: Module[] = [];
  for (const block of unfolded.split("BEGIN:VEVENT").slice(1)) {
    const name = block.match(/(?:^|\n)SUMMARY(?:;[^:]*)?:(.*)/)?.[1]?.trim().replace(/\\,/g, ",");
    if (!name) continue;
    const start = block.match(/DTSTART[^:]*:(\d{4})(\d{2})(\d{2})/);
    const byday = block.match(/BYDAY=([A-Z,0-9-]+)/)?.[1];
    const codes = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
    const days = byday ? byday.split(",").map(v => codes.indexOf(v.slice(-2))).filter(v => v >= 0) : start ? [fromKey(`${start[1]}-${start[2]}-${start[3]}`).getDay()] : [];
    const existing = modules.find(m => normalizeModuleName(m.name) === normalizeModuleName(name));
    if (existing) existing.days = [...new Set([...existing.days, ...days])];
    else modules.push({ id: `module-${modules.length}-${name.toLowerCase().replace(/\W/g, "")}`, name, days });
  }
  return modules;
}

export function routinePlan(entries: Record<string, RoutineEntry>, modules: Module[], date: string, checkIn?: DailyCheckIn): Commitment[] {
  modules = modules.filter(module => module.days.length > 0);
  const weekday = fromKey(date).getDay();
  const index = (weekday + 6) % 7;
  return routineCatalog.flatMap(item => {
    const entry = entries[item.id];
    if (!entry) return [];
    const todaySport = item.id === "sport" && checkIn && dateKey(new Date(checkIn.savedAt)) === date ? checkIn.sportToday : undefined;
    const assignmentSession = item.id === "study" && Object.keys(checkIn?.assignments ?? {}).length > 0;
    if (todaySport === false || (todaySport === undefined && !assignmentSession && index >= entry.timesPerWeek && !(item.id === "classes" && modules.length))) return [];
    const classModules = item.id === "classes" && modules.length ? modules.filter(m => m.days.includes(weekday)) : [];
    if (item.id === "classes" && modules.length && !classModules.length) return [];
    const names = classModules.length ? classModules.map(m => m.name) : [item.label];
    return names.map(name => {
      const hours = entry.durationHours / names.length;
      const condition = entry.condition === "Demanding" ? 1.3 : entry.condition === "Light" ? 0.7 : 1;
      const cost = (kind: CapacityKind) => Math.round(hours * 5 * item.weights[kind] * (kind === "time" ? 1 : condition));
      return { id: `routine-${item.id}-${name}-${date}`, routineId: item.id, name, category: "Routine", startDate: date, schedule: prettyDate(date), flexibility: "Somewhat flexible", durationHours: hours, time: cost("time"), mental: cost("mental"), physical: cost("physical"), social: cost("social") };
    });
  });
}

export function itemsOnDate(items: Commitment[], date: string) {
  return items.filter(item => item.action !== "Skip this time" && (item.startDate === date || (!item.startDate && item.dueDate === date)));
}

export function scheduledCommitments(items: Commitment[], date: string): Commitment[] {
  return items.flatMap(item => {
    if (item.scheduleType) {
      if (!item.startDate || item.startDate > date) return [];
      const occurs = item.scheduleType === "Daily routine" || (item.scheduleType === "Fixed" && date <= (item.endDate ?? item.startDate) && (!item.weekdays?.length || item.weekdays.includes(fromKey(date).getDay())));
      if (!occurs) return [];
      return [{ ...item, sourceId: item.id, id: `${item.id}@${date}`, startDate: date, routineId: item.scheduleType === "Daily routine" ? "daily-commitment" : undefined }];
    }
    return item.startDate === date || item.dueDate === date || (item.category === "Assignment" && !!item.startDate && item.startDate <= date && (!item.dueDate || item.dueDate >= date)) ? [item] : [];
  });
}
export function loadFor(items: Commitment[], answers: Partial<Record<CapacityKind, number>>, checkIn?: DailyCheckIn) {
  return (Object.keys(capacityMeta) as CapacityKind[]).map(kind => {
    const answer = answers[kind] ?? 1;
    const limit = kind === "time" ? 40 + answer * 5 : 60 - answer * 8;
    const used = items.reduce((sum, item) => sum + item[kind], 0);
    return { kind, used: Math.round(used + (kind === "mental" ? (checkIn?.stress ?? 0) * 3 : 0)), limit };
  });
}
export const loadPercent = (values: ReturnType<typeof loadFor>) => Math.round(Math.max(0, ...values.map(v => v.used / v.limit * 100)));

export const recoveryLibrary: RecoveryOption[] = [
  { id: "outside", title: "Go outside", duration: "20–30 min", detail: "Sit somewhere green or take an easy stroll. Keep the pace genuinely gentle.", evidence: "Outdoor time is associated with lower cortisol; your research notes about 21.3% per hour.", supports: ["mental"], costs: ["time", "physical"] },
  { id: "mastery", title: "Do a mastery hobby", duration: "30 min+", detail: "Choose a hobby that feels absorbing and gives you a small sense of progress.", evidence: "Strongest mental-recovery type in your research.", supports: ["mental"], costs: ["time"] },
  { id: "game", title: "Play an absorbing game", duration: "30–60 min", detail: "Pick something immersive with a clear stopping point.", supports: ["mental"], costs: ["time"] },
  { id: "awe", title: "Take an awe walk", duration: "15 min", detail: "Walk slowly and notice something larger than your current task list.", supports: ["mental"], costs: ["time", "physical"] },
  { id: "microbreak", title: "Take a micro-break", duration: "Under 10 min", detail: "Step away, unfocus your eyes and let fatigue settle. Best when only a small pause fits.", evidence: "Small effect; mainly useful for fatigue.", supports: ["mental"], costs: ["time"] },
  { id: "plan", title: "Write the next-task plan", duration: "5 min", detail: "Write exactly when and where you will continue the unfinished task.", evidence: "Helps stop unfinished work from intruding on the rest of your day.", supports: ["mental", "time"], costs: ["time"] },
  { id: "support", title: "Talk to someone supportive", duration: "10–20 min", detail: "Choose someone who helps you feel understood, not someone who needs energy from you.", supports: ["mental"], costs: ["time", "social"] },
  { id: "sleep", title: "Protect consistent sleep", duration: "Tonight", detail: "Choose a realistic bedtime and protect it across the week.", supports: ["mental", "physical"], costs: ["time"] },
  { id: "nap", title: "Take a short nap", duration: "15–25 min", detail: "Set an alarm before you lie down so the break stays restorative.", supports: ["mental", "physical"], costs: ["time"] },
  { id: "nothing", title: "Rest with no task", duration: "10–20 min", detail: "Sit or lie down. No productivity target, workout or content queue.", supports: ["mental", "physical"], costs: ["time"] },
  { id: "alone", title: "Choose some alone time", duration: "Any length", detail: "It only works when it is your choice. Protect a quiet pocket without messages.", supports: ["social"], costs: ["time"] },
  { id: "solo-hobby", title: "Do a hobby alone", duration: "30 min+", detail: "Use the solo version of a hobby you already enjoy.", supports: ["social", "mental"], costs: ["time"] },
  { id: "solo-game", title: "Play something solo", duration: "30–60 min", detail: "Choose an absorbing game without chat or group coordination.", supports: ["social", "mental"], costs: ["time"] },
];

export function rankedRecoveryOptions(capacities: CapacityValue[]): { focus: CapacityKind; options: RecoveryOption[]; timeOverloaded: boolean } {
  const ratio = (kind: CapacityKind) => {
    const value = capacities.find(v => v.kind === kind);
    return value ? value.used / Math.max(1, value.limit) : 0;
  };
  const kinds = (Object.keys(capacityMeta) as CapacityKind[]).sort((a, b) => ratio(b) - ratio(a));
  const focus = kinds[0] ?? "mental";
  const timeOverloaded = ratio("time") >= 0.9;
  const physicalOverloaded = ratio("physical") >= 0.8;
  const socialOverloaded = ratio("social") >= 0.8;

  if (timeOverloaded) {
    return { focus, timeOverloaded, options: recoveryLibrary.filter(option => option.id === "plan") };
  }

  const safe = recoveryLibrary.filter(option => {
    if (!option.supports.includes(focus)) return false;
    if (physicalOverloaded && option.costs?.includes("physical")) return false;
    if (socialOverloaded && option.costs?.includes("social")) return false;
    return true;
  });
  const preferredOrder: Record<CapacityKind, string[]> = {
    mental: ["outside", "mastery", "game", "awe", "plan", "microbreak", "support", "sleep", "nap", "nothing"],
    physical: ["nothing", "nap", "sleep", "plan"],
    social: ["alone", "solo-hobby", "solo-game", "nothing", "plan"],
    time: ["plan", "microbreak"],
  };
  return { focus, timeOverloaded, options: safe.sort((a, b) => preferredOrder[focus].indexOf(a.id) - preferredOrder[focus].indexOf(b.id)) };
}

export function cardsFromText(text: string): FlashCard[] {
  return text.split(/\r?\n/).flatMap((line, index) => {
    const match = line.match(/^\s*(?:[-*]\s*)?(.{2,160}?)\s*(?::|\t)\s*(.{2,})$/);
    return match ? [{ id: `card-${index}`, question: match[1].trim(), answer: match[2].trim() }] : [];
  }).slice(0, 200);
}
