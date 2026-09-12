import { useState } from "react";
import { Text, View } from "react-native";

import { MascotAvatar } from "@/components/MascotAvatar";
import { AppButton, BottomNav, Card, CheckboxRow, FormField, InlineNotice, PageHeader, ScrollPage, SectionLabel } from "@/components/MarginUI";
import { DateField } from "@/components/PlannerControls";
import { CapacityKind, Commitment, MainTab, QuickAddAction, RoutineEntry, capacityMeta, formatHours, routineCatalog, weeklyHours } from "@/models/margin";
import { Material, Module, dateKey, prettyDate, scheduledCommitments, shiftDate, weekStart } from "@/models/planner";
import { colors, fonts } from "@/theme/tokens";
import { screenStyles as s } from "./screenStyles";

const dayOrder = [1, 2, 3, 4, 5, 6, 0];
const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function ScheduleScreen({ modules, commitments, materials, onBack, onImport }: { modules: Module[]; commitments: Commitment[]; materials: Material[]; onBack: () => void; onImport: () => void }) {
  const start = weekStart(dateKey());
  const days = dayOrder.map((weekday, offset) => {
    const date = shiftDate(start, offset);
    return { weekday, date, modules: modules.filter(module => module.days.includes(weekday)), commitments: scheduledCommitments(commitments, date).filter(item => item.category !== "Assignment") };
  });
  const sessionCount = days.reduce((sum, day) => sum + day.modules.length + day.commitments.length, 0);
  return <ScrollPage><PageHeader eyebrow="Planner menu · Schedule" title="Your timetable" body="See fixed classes and scheduled commitments together. Import a new timetable whenever it changes." onBack={onBack} /><View style={s.content}>
    <Card tone="dark" style={{ gap: 7 }}><Text style={s.whiteBody}>THIS WEEK</Text><Text style={{ fontFamily: fonts.number, fontSize: 40, color: colors.white }}>{sessionCount}</Text><Text style={s.whiteBody}>scheduled sessions · {modules.length} modules · {materials.length} learning materials</Text></Card>
    <AppButton text={modules.length ? "Upload a new timetable" : "Import my timetable"} icon="calendar" onPress={onImport} />
    <SectionLabel detail={`Week of ${prettyDate(start)}`}>Timetable</SectionLabel>
    {days.map(day => <Card key={day.date} style={{ gap: 9, borderLeftWidth: 5, borderLeftColor: day.modules.length ? colors.waterDeep : day.commitments.length ? colors.amber : colors.outlineSoft }}><View style={s.rowBetween}><Text style={s.label}>{dayNames[day.weekday]}</Text><Text style={s.caption}>{prettyDate(day.date)}</Text></View>{day.modules.map(module => <View key={module.id} style={{ backgroundColor: colors.softMint, borderRadius: 10, padding: 11 }}><Text style={s.label}>{module.name}</Text><Text style={s.caption}>Class · from timetable</Text></View>)}{day.commitments.map(item => <View key={item.id} style={{ backgroundColor: colors.softAmber, borderRadius: 10, padding: 11 }}><Text style={s.label}>{item.name}</Text><Text style={s.caption}>{item.category} · {item.durationHours ?? item.time / 5} h</Text></View>)}{!day.modules.length && !day.commitments.length ? <Text style={s.bodySmallMuted}>No fixed sessions.</Text> : null}</Card>)}
    {modules.some(module => !module.days.length) ? <InlineNotice title="Some modules have no class days" body="They remain in Assignments and Flashcards. Import an ICS timetable to place them here." /> : null}
  </View></ScrollPage>;
}

export function AssignmentsScreen({ modules, onBack, onSave }: { modules: Module[]; onBack: () => void; onSave: (modules: Module[]) => void }) {
  const [draft, setDraft] = useState(modules);
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  const update = (id: string, patch: Partial<Module>) => { setSaved(false); setDraft(current => current.map(module => module.id === id ? { ...module, ...patch } : module)); };
  const invalid = draft.some(module => module.assignment?.due && module.assignment.due < module.assignment.start);
  return <ScrollPage><PageHeader eyebrow="Planner menu · Assignments" title="Assignments by module" body="Keep assignment dates with the module they belong to." onBack={onBack} /><View style={s.content}>
    {saved ? <InlineNotice title="Assignments updated" body="Your Plan and capacity estimates now use these dates." /> : null}
    <SectionLabel>Add a module</SectionLabel><View style={s.row}><View style={s.flex}><FormField label="Module name" value={name} onChangeText={setName} placeholder="e.g. Algorithms" /></View></View><AppButton text="Add module" variant="secondary" disabled={!name.trim() || draft.some(module => module.name.toLowerCase() === name.trim().toLowerCase())} onPress={() => { setDraft(current => [...current, { id: `module-${Date.now()}`, name: name.trim(), days: [], assignment: { start: dateKey(), due: "" } }]); setName(""); setSaved(false); }} />
    <SectionLabel detail={`${draft.filter(module => module.assignment).length} active`}>Your modules</SectionLabel>
    {draft.map(module => <Card key={module.id} style={{ gap: 12, borderLeftWidth: 5, borderLeftColor: module.assignment ? colors.violet : colors.outlineSoft, backgroundColor: module.assignment ? colors.lavender : colors.paper }}><CheckboxRow label={`${module.name} has an assignment`} selected={!!module.assignment} onPress={() => update(module.id, { assignment: module.assignment ? undefined : { start: dateKey(), due: "" } })} />{module.assignment ? <><DateField label="Start working on it" value={module.assignment.start} onChange={start => update(module.id, { assignment: { ...module.assignment!, start } })} /><DateField label="Due date (optional)" value={module.assignment.due} optional onChange={due => update(module.id, { assignment: { ...module.assignment!, due } })} />{module.assignment.due && module.assignment.due < module.assignment.start ? <Text accessibilityRole="alert" style={s.body}>Due date must be on or after the start date.</Text> : null}</> : <Text style={s.bodySmallMuted}>No assignment planned for this module.</Text>}</Card>)}
    {!draft.length ? <InlineNotice title="No modules yet" body="Add your first module above, or import a timetable from Schedule." /> : null}
    <AppButton text="Save assignments" disabled={invalid} onPress={() => { onSave(draft); setSaved(true); }} />
  </View></ScrollPage>;
}

export function ProfileScreen({ streak, weeklyNote, commitments, modules, routines, answers, onTab, onQuickAdd, onBaseline, onWeeklyNote }: { streak: number; weeklyNote: string; commitments: Commitment[]; modules: Module[]; routines: Record<string, RoutineEntry>; answers: Partial<Record<CapacityKind, number>>; onTab: (tab: MainTab) => void; onQuickAdd: (action: QuickAddAction) => void; onBaseline: () => void; onWeeklyNote: () => void }) {
  const routineHours = Object.values(routines).reduce((sum, entry) => sum + weeklyHours(entry), 0);
  return <ScrollPage bottomBar={<BottomNav selected="profile" onSelect={onTab} onQuickAdd={onQuickAdd} />}><PageHeader eyebrow="Profile" title="The person behind the plan" body="Your baseline, preferences and private planning context live here." /><View style={s.content}>
    <Card tone="mint" style={{ alignItems: "center", gap: 10, paddingVertical: 22 }}><View style={{ borderRadius: 30, borderWidth: 3, borderColor: colors.paper }}><MascotAvatar size={116} /></View><Text style={s.title}>Your Santai companion</Text><Text style={[s.bodySmallMuted, { textAlign: "center" }]}>Tap the mascot on any main page for a small encouragement.</Text><View style={[s.wrapRow, { justifyContent: "center" }]}><View style={s.badge}><Text style={s.badgeText}>{streak} DAY STREAK</Text></View><View style={s.badge}><Text style={s.badgeText}>{commitments.length} PLANS</Text></View><View style={s.badge}><Text style={s.badgeText}>{modules.length} MODULES</Text></View></View></Card>
    <Card style={{ gap: 10, borderLeftWidth: 5, borderLeftColor: colors.waterDeep }}><View style={s.rowBetween}><Text style={s.title}>Normal-week baseline</Text><Text style={[s.label, { color: colors.waterDeep }]}>{formatHours(routineHours)}</Text></View>{routineCatalog.filter(item => routines[item.id]).map(item => <View key={item.id} style={s.rowBetween}><Text style={s.bodySmall}>{item.label}</Text><Text style={s.caption}>{formatHours(weeklyHours(routines[item.id]))}</Text></View>)}<AppButton text="Revisit my baseline" variant="quiet" onPress={onBaseline} /></Card>
    <SectionLabel>Personal capacity answers</SectionLabel><View style={s.wrapRow}>{(Object.keys(capacityMeta) as CapacityKind[]).map(kind => <Card key={kind} style={{ width: "48%", flexGrow: 1, gap: 5, borderTopWidth: 4, borderTopColor: capacityMeta[kind].color }}><Text style={[s.eyebrow, { color: capacityMeta[kind].color }]}>{capacityMeta[kind].label.toUpperCase()}</Text><Text style={s.label}>{answers[kind] === undefined ? "Uses a balanced default" : `Answer ${answers[kind]! + 1} of 4`}</Text></Card>)}</View>
    <Card tone="amber" style={{ gap: 8 }}><Text style={s.eyebrow}>YOUR WEEKLY NOTE</Text><Text style={weeklyNote ? s.body : s.bodySmallMuted}>{weeklyNote || "No note pinned for this week."}</Text><AppButton text={weeklyNote ? "Edit weekly note" : "Add weekly note"} variant="secondary" onPress={onWeeklyNote} /></Card>
    <InlineNotice title="Private by default" body="Your plan, diary, materials and recovery reflections stay on this device in this prototype." />
  </View></ScrollPage>;
}
