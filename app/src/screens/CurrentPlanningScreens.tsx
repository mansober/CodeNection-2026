import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { AppButton, BottomNav, Card, FormField, InlineNotice, PageHeader, ScrollPage, SectionLabel, SegmentedChoices } from "@/components/MarginUI";
import { DateField, ValueSlider, ViewMenu } from "@/components/PlannerControls";
import { CapacityValue, Commitment, MainTab, QuickAddAction, capacityMeta } from "@/models/margin";
import { dateKey, planActions, prettyDate, rankedRecoveryOptions, shiftDate, weekStart } from "@/models/planner";
import { screenStyles as s } from "./screenStyles";
import { DashboardCapacities } from "@/components/DashboardCapacities";
import { EnergyLeaf } from "@/components/EnergyLeaf";
import { colors, fonts } from "@/theme/tokens";

export type Period = "Daily" | "Weekly";
export type PlanFilter = "All" | "Schedule" | "Assignments";
export type PlanDay = { date: string; items: Commitment[]; capacities: CapacityValue[]; load: number };
type MenuProps = { period: Period; onPeriod: (value: Period) => void; onSchedule: () => void; onAssignments: () => void };

function PlannerMenu({ period, onPeriod, onSchedule, onAssignments }: MenuProps) {
  return <ViewMenu choices={["Daily", "Weekly"]} value={period} onChange={v => onPeriod(v as Period)} onSchedule={onSchedule} onAssignments={onAssignments} />;
}

export function CurrentHomeScreen({ period, onPeriod, onSchedule, onAssignments, capacities, overall, energy, onTab, onQuickAdd, onRebalance, onTest, onFlashcards, onWeeklyNote, lessonNames, hasMaterials, weeklyNote }: MenuProps & { capacities: CapacityValue[]; overall: number; energy: number; streak: number; onTab: (tab: MainTab) => void; onQuickAdd: (action: QuickAddAction) => void; onRebalance: () => void; onTest: () => void; onFlashcards: () => void; onWeeklyNote: () => void; lessonNames: string[]; hasMaterials: boolean; weeklyNote: string }) {
  return <ScrollPage bottomBar={<BottomNav selected="today" onSelect={onTab} onQuickAdd={onQuickAdd} />}><PlannerMenu {...{ period, onPeriod, onSchedule, onAssignments }} />
    <PageHeader eyebrow={prettyDate(dateKey())} title="Your day, with room to breathe" />
    <EnergyLeaf energy={energy} />
    <View style={s.content}>
      <Card tone={weeklyNote ? "mint" : "paper"} style={{ gap: 8, borderLeftWidth: 5, borderLeftColor: colors.leaf }}><View style={s.rowBetween}><Text style={[s.eyebrow, { color: colors.forest }]}>YOUR WEEKLY NOTE</Text><Text style={s.caption}>{weeklyNote ? "Pinned" : "Optional"}</Text></View><Text style={weeklyNote ? s.body : s.bodySmallMuted}>{weeklyNote || "Add one reminder or piece of context you want to see throughout the week."}</Text><AppButton text={weeklyNote ? "Update weekly note" : "Add weekly note"} variant="quiet" onPress={onWeeklyNote} /></Card>
      <SectionLabel detail="at a glance">Your capacity signals</SectionLabel><DashboardCapacities values={capacities} />
      <Text style={s.caption}>A planning estimate, not a health measurement. Completing today’s recovery adds 10 energy, once per day.</Text>
      <Card tone="dark" style={{ gap: 8 }}><Text style={s.whiteBody}>{period === "Daily" ? "TODAY’S LOAD" : "WEEKLY AVERAGE LOAD"}</Text><Text style={{ fontFamily: fonts.number, fontSize: 46, color: colors.white }}>{overall}%</Text><Text style={s.whiteBody}>{overall >= 85 ? "Your plan is asking a lot. Make room for a break." : overall >= 60 ? "A steady day. Keep a little space for yourself." : "There’s room to move at your own pace."}</Text></Card>
      <Pressable accessibilityRole="button" accessibilityLabel="Open daily flashcards" onPress={onFlashcards}><Card tone="amber" style={{ gap: 10, borderWidth: 2, borderColor: colors.amber }}><View style={s.rowBetween}><Text style={[s.eyebrow, { color: colors.amber }]}>DAILY FLASHCARDS</Text><View style={[s.badge, { backgroundColor: colors.paper }]}><Text style={s.badgeText}>{hasMaterials ? "READY" : "ADD NOTES"}</Text></View></View><Text style={s.title}>{hasMaterials ? "A little revision for today" : "Upload your learning materials"}</Text><Text style={s.body}>{lessonNames.length ? lessonNames.join(" · ") : "No classes scheduled today. Explore your library."}</Text><Text style={s.bodySmallMuted}>{hasMaterials ? "Open your module cards and practise at your pace." : "Choose a module and add notes to make daily flashcards available."}</Text><Text style={s.linkText}>{hasMaterials ? "Open flashcards →" : "Add learning materials →"}</Text></Card></Pressable>
      {overall >= 60 && <InlineNotice title="A recovery break would help" body={overall >= 85 ? "Try a short, quiet pause. Open Recover for suggestions matched to your load." : "A gentle walk or a screen break can fit around today's plans."} />}
      <AppButton text="Make room in my plan" icon="recovery" onPress={onRebalance} /><AppButton text="See if a new plan fits" variant="secondary" icon="plus" onPress={onTest} />
    </View></ScrollPage>;
}


export function CurrentPlanScreen({ period, onPeriod, onSchedule, onAssignments, filter, unscheduled, days, selectedDate, onDate, onTab, onQuickAdd, onAdd, onEdit, onAction, onImport }: MenuProps & { filter: PlanFilter; unscheduled: Commitment[]; days: PlanDay[]; selectedDate: string; onDate: (date: string) => void; onTab: (tab: MainTab) => void; onQuickAdd: (action: QuickAddAction) => void; onAdd: () => void; onEdit: (item: Commitment) => void; onAction: (item: Commitment, action: string, date: string, duration: number, helper: string) => void; onImport: () => void }) {
  const [expanded, setExpanded] = useState("");
  const visibleDays = period === "Daily" ? days.filter(d => d.date === selectedDate) : days;
  return <ScrollPage bottomBar={<BottomNav selected="plan" onSelect={onTab} onQuickAdd={onQuickAdd} />}><PlannerMenu {...{ period, onPeriod, onSchedule, onAssignments }} /><PageHeader eyebrow={`${period} plan · ${filter}`} title={filter === "Assignments" ? "Your assignments" : "Your commitments"} body="Your routine and dated commitments, together in one place." /><View style={s.content}>
    <DateField label={period === "Daily" ? "Showing this day" : "Choose a day in the week"} value={selectedDate} onChange={onDate} />
    <View style={s.rowBetween}><AppButton text="‹ Previous" variant="quiet" onPress={() => onDate(shiftDate(selectedDate, period === "Daily" ? -1 : -7))} /><Text style={[s.caption, { flex: 1, textAlign: "center" }]}>{period === "Daily" ? prettyDate(selectedDate) : `Week of ${prettyDate(weekStart(selectedDate))}`}</Text><AppButton text="Next ›" variant="quiet" onPress={() => onDate(shiftDate(selectedDate, period === "Daily" ? 1 : 7))} /></View>
    {visibleDays.map(day => { const items = day.items.filter(item => filter !== "Assignments" || item.category === "Assignment").filter(item => filter !== "Schedule" || item.category !== "Assignment"); const lead = [...day.capacities].sort((a, b) => b.used / b.limit - a.used / a.limit)[0]?.kind ?? "mental"; const dayColor = capacityMeta[lead].color; return <View key={day.date} style={{ gap: 12 }}><SectionLabel detail={`${items.length} · ${day.load}% load`}>{prettyDate(day.date)}</SectionLabel><View style={{ minHeight: 42, borderRadius: 12, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: `${dayColor}14`, borderLeftWidth: 5, borderLeftColor: dayColor }}><Text style={s.bodySmall}>{capacityMeta[lead].label} needs the most room</Text><Text style={[s.label, { color: dayColor }]}>{day.load >= 100 ? "OVER" : day.load >= 80 ? "FULL" : "ROOM"}</Text></View>{["Routine", "Commitments & deadlines"].map(section => { const list = items.filter(item => section === "Routine" ? !!item.routineId : !item.routineId); if (!list.length) return null; return <View key={section} style={{ gap: 10 }}><Text style={s.eyebrow}>{section.toUpperCase()}</Text>{list.map(item => { const accent = item.category === "Assignment" ? colors.violet : item.routineId ? colors.waterDeep : item.mental >= item.physical && item.mental >= item.social ? colors.coral : item.physical >= item.social ? colors.amber : colors.violet; return <Card key={item.id} style={{ gap: 10, borderLeftWidth: 5, borderLeftColor: accent, backgroundColor: `${accent}0C` }}><Pressable accessibilityRole="button" accessibilityState={{ expanded: expanded === item.id }} aria-expanded={expanded === item.id} onPress={() => setExpanded(expanded === item.id ? "" : item.id)} style={{ minHeight: 52, justifyContent: "center", gap: 5 }}><Text style={s.label}>{item.name}</Text><Text style={s.bodySmallMuted}>{item.durationHours ?? item.time / 5} h · {item.action ?? "Keep as planned"}</Text><Text style={s.caption}>{item.dueDate ? `Due ${prettyDate(item.dueDate)}` : item.category === "Assignment" ? "Due date: set up later" : item.category}</Text>{item.helper ? <Text style={s.caption}>Ask: {item.helper}</Text> : null}<Text style={s.linkText}>{expanded === item.id ? "Close options ↑" : "Plan options ↓"}</Text></Pressable>{expanded === item.id && <PlanActions key={`${item.id}-${item.action}`} item={item} onSave={(action, date, duration, helper) => { onAction(item, action, date, duration, helper); setExpanded(""); }} onEdit={() => onEdit(item)} />}</Card>; })}</View>; })}{!items.length && <Text style={s.bodySmallMuted}>No {filter === "Assignments" ? "assignments" : filter === "Schedule" ? "routine activities" : "commitments"} planned for this day.</Text>}</View>; })}
    {filter !== "Assignments" && unscheduled.length > 0 && <View style={{ gap: 12 }}><SectionLabel>Set up later</SectionLabel><Text style={s.bodySmallMuted}>These commitments are saved, but are not included in daily load yet.</Text>{unscheduled.map(item => <Card key={item.id}><Text style={s.label}>{item.name}</Text><Text style={s.bodySmallMuted}>{item.category} · {item.durationHours ?? 1} h per session</Text><Text style={s.caption}>{item.action ?? "Keep as planned"}</Text><AppButton text={`Set dates for ${item.name}`} variant="secondary" onPress={() => onEdit(item)} /><AppButton text={`Plan options for ${item.name}`} variant="quiet" onPress={() => setExpanded(expanded === item.id ? "" : item.id)} />{expanded === item.id && <PlanActions item={item} onEdit={() => onEdit(item)} onSave={(action, date, duration, helper) => { onAction(item, action, date, duration, helper); setExpanded(""); }} />}</Card>)}</View>}
    <AppButton text={period === "Daily" ? "Add commitment for this day" : "Add commitment to this week"} icon="plus" onPress={onAdd} /><AppButton text="Manage modules & assignments" variant="quiet" onPress={onImport} />
  </View></ScrollPage>;
}

function PlanActions({ item, onSave, onEdit }: { item: Commitment; onSave: (action: string, date: string, duration: number, helper: string) => void; onEdit: () => void }) {
  const [action, setAction] = useState(item.action ?? planActions[0]);
  const [date, setDate] = useState(item.startDate ?? dateKey());
  const [duration, setDuration] = useState(item.durationHours ?? item.time / 5);
  const [helper, setHelper] = useState(item.helper ?? "");
  const invalidDate = action === "Move to another day" && !!item.dueDate && date > item.dueDate;
  return <View style={{ gap: 14 }}><SegmentedChoices label="Choose what happens next" choices={planActions} selected={action} onSelect={setAction} />
    {action === "Move to another day" && <DateField label="New date" value={date} onChange={setDate} />}{invalidDate && <Text accessibilityRole="alert" style={s.body}>This is after the due date. Edit the deadline first if it has changed.</Text>}
    {action === "Ask someone to help" && <><FormField label="Who could help? (optional)" value={helper} onChangeText={setHelper} placeholder="Name or role" /><Text style={s.caption}>This records a reminder. Your load stays counted until help is confirmed.</Text></>}
    {action === "Make it lighter" && <ValueSlider label="Time you can give it" value={duration} min={0.25} max={Math.max(0.25, item.durationHours ?? item.time / 5)} step={0.25} suffix=" hours" onChange={setDuration} />}
    {action === "Skip this time" && <Text style={s.bodySmallMuted}>Removes this occurrence from your load. You can restore it using Keep as planned.</Text>}
    <AppButton text="Apply to this commitment" disabled={invalidDate} onPress={() => onSave(action, date, duration, helper)} /><AppButton text="Edit details" variant="quiet" onPress={onEdit} />
  </View>;
}

export function CurrentRecoveryScreen({ days, results, onResult, onTab, onQuickAdd }: { days: PlanDay[]; results: Record<string, { done: boolean; feeling?: string }>; onResult: (key: string, value: { done: boolean; feeling?: string }) => void; onTab: (tab: MainTab) => void; onQuickAdd: (action: QuickAddAction) => void }) {
  const [expanded, setExpanded] = useState("");
  const sorted = [...days].filter(d => d.date >= dateKey()).sort((a, b) => b.load - a.load || a.date.localeCompare(b.date));
  return <ScrollPage bottomBar={<BottomNav selected="recovery" onSelect={onTab} onQuickAdd={onQuickAdd} />}><PageHeader eyebrow="Recovery · sorted by load" title="Recovery that respects the load" body="The hardest days come first. Santai filters out activities that would worsen another overloaded capacity." /><View style={s.content}>{sorted.map(day => {
    const recommendation = rankedRecoveryOptions(day.capacities);
    const kind = recommendation.focus;
    const lowLoad = day.load < 50;
    const primary = lowLoad ? undefined : recommendation.options[0];
    const level = day.load >= 90 ? "high" : day.load >= 65 ? "moderate" : "light";
    const key = day.date; const result = results[key]; const isExpanded = expanded === key;
    const focusPercent = Math.round((day.capacities.find(value => value.kind === kind)?.used ?? 0) / Math.max(1, day.capacities.find(value => value.kind === kind)?.limit ?? 1) * 100);
    return <Card key={key} tone={level === "high" ? "amber" : "paper"} style={{ gap: 12, borderLeftWidth: 6, borderLeftColor: capacityMeta[kind].color }}><View style={s.rowBetween}><View style={s.flex}><Text style={s.label}>{prettyDate(day.date)}</Text><Text style={s.caption}>{capacityMeta[kind].label} leads at {focusPercent}%</Text></View><View style={[s.badge, { backgroundColor: day.load >= 90 ? colors.peach : colors.mint }]}><Text style={s.badgeText}>{day.load}% LOAD</Text></View></View>
      {recommendation.timeOverloaded ? <InlineNotice title="Make room—don’t add another task" body="Time is already overloaded, even if another load is slightly higher. Use Drop, Delay or Delegate first. The five-minute plan below is the only decompression option suggested here." tone="coral" /> : null}
      <Text style={[s.eyebrow, { color: capacityMeta[kind].color }]}>{lowLoad ? "ROOM ALREADY PROTECTED" : "BEST FIT"}</Text><Text style={s.title}>{primary?.title ?? "Keep this pocket free"}</Text><Text style={s.bodySmallMuted}>{primary ? `${primary.duration} · ${primary.detail}` : "This day does not need another recovery task. Let the open space stay open."}</Text>{primary?.evidence ? <Text style={s.caption}>{primary.evidence}</Text> : null}
      {kind === "physical" ? <Text style={s.caption}>No exercise suggested: movement adds physical load even when it can help mental recovery.</Text> : null}
      {kind === "social" ? <Text style={s.caption}>No “message a friend” prompt: supportive contact can help mentally, but it costs social energy.</Text> : null}
      {!lowLoad && recommendation.options.length > 1 ? <AppButton text={isExpanded ? "Hide other options" : `See ${recommendation.options.length - 1} other safe options`} variant="quiet" onPress={() => setExpanded(isExpanded ? "" : key)} /> : null}
      {isExpanded ? <View style={{ gap: 9 }}>{recommendation.options.slice(1).map(option => <View key={option.id} style={{ borderTopWidth: 1, borderColor: colors.outlineSoft, paddingTop: 10, gap: 3 }}><View style={s.rowBetween}><Text style={[s.label, s.flex]}>{option.title}</Text><Text style={[s.caption, { color: colors.forest }]}>{option.duration}</Text></View><Text style={s.bodySmallMuted}>{option.detail}</Text>{option.evidence ? <Text style={s.caption}>{option.evidence}</Text> : null}</View>)}</View> : null}
      <AppButton disabled={lowLoad || day.date > dateKey()} text={lowLoad ? "Nothing extra to complete" : day.date > dateKey() ? "Available on this day" : result?.done ? "Completed · undo" : "I’ve done this"} variant={result?.done ? "secondary" : "primary"} onPress={() => onResult(key, { done: !result?.done })} />
      {result?.done && <><SegmentedChoices label="How do you feel afterward?" choices={["Better", "About the same", "Still drained"]} selected={result.feeling ?? ""} onSelect={feeling => onResult(key, { done: true, feeling })} />{result.feeling === "Still drained" && <Text style={s.bodySmallMuted}>You don’t have to push through. Keep the next break gentle and review what can wait.</Text>}{result.feeling && <Text style={s.caption}>Your reflection is saved.</Text>}</>}
    </Card>;
  })}<InlineNotice title="Recovery isn’t another test" body="There’s no penalty for skipping a suggestion. Chosen rest works better than another obligation." /></View></ScrollPage>;
}
