import { CapacityKind, Commitment, DailyCheckIn, RoutineEntry, capacityMeta, routineCatalog } from "./margin";

export type Module = { id: string; name: string; days: number[]; assignment?: { start: string; due: string } };
export type FlashCard = { id: string; question: string; answer: string };
export type Material = { id: string; moduleId: string; name: string; topic: string; week: string; date: string; uri: string; cards: FlashCard[] };
export type RecoveryResult = { done: boolean; feeling?: string };
export const dateKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export const fromKey = (value: string) => new Date(`${value}T12:00:00`);
export const shiftDate = (value: string, days: number) => { const d = fromKey(value); d.setDate(d.getDate() + days); return dateKey(d); };
export const weekStart = (value: string) => shiftDate(value, -((fromKey(value).getDay() + 6) % 7));
export const prettyDate = (value: string) => fromKey(value).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
export const planActions = ["Keep as planned", "Move to another day", "Ask someone to help", "Skip this time", "Make it lighter"];

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
    const existing = modules.find(m => m.name.toLowerCase() === name.toLowerCase());
    if (existing) existing.days = [...new Set([...existing.days, ...days])];
    else modules.push({ id: `module-${modules.length}-${name.toLowerCase().replace(/\W/g, "")}`, name, days });
  }
  return modules;
}

export function routinePlan(entries: Record<string, RoutineEntry>, modules: Module[], date: string, checkIn?: DailyCheckIn): Commitment[] {
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
export function loadFor(items: Commitment[], answers: Partial<Record<CapacityKind, number>>, checkIn?: DailyCheckIn) {
  return (Object.keys(capacityMeta) as CapacityKind[]).map(kind => {
    const answer = answers[kind] ?? 1;
    const limit = kind === "time" ? 40 + answer * 5 : 60 - answer * 8;
    const used = items.reduce((sum, item) => sum + item[kind], 0);
    return { kind, used: Math.round(used + (kind === "mental" ? (checkIn?.stress ?? 0) * 3 : 0)), limit };
  });
}
export const loadPercent = (values: ReturnType<typeof loadFor>) => Math.round(Math.max(0, ...values.map(v => v.used / v.limit * 100)));
export function cardsFromText(text: string): FlashCard[] {
  return text.split(/\r?\n/).flatMap((line, index) => {
    const match = line.match(/^\s*(?:[-*]\s*)?(.{2,160}?)\s*(?::|\t)\s*(.{2,})$/);
    return match ? [{ id: `card-${index}`, question: match[1].trim(), answer: match[2].trim() }] : [];
  }).slice(0, 200);
}
