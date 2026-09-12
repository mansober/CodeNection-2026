import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { AppButton, BottomNav, CapacityBar, Card, FormField, InlineNotice, PageHeader, ScrollPage, SectionLabel, SegmentedChoices } from "@/components/MarginUI";
import { DateField, ValueSlider, ViewMenu } from "@/components/PlannerControls";
import { CapacityValue, Commitment, MainTab, capacityMeta } from "@/models/margin";
import { dateKey, planActions, prettyDate, shiftDate, weekStart } from "@/models/planner";
import { screenStyles as s } from "./screenStyles";
import { EnergyReservoir } from "@/components/EnergyReservoir";
import { colors, fonts } from "@/theme/tokens";

export type Period = "Daily" | "Weekly";
export type PlanFilter = "All" | "Schedule" | "Assignments";
export type PlanDay = { date: string; items: Commitment[]; capacities: CapacityValue[]; load: number };
type MenuProps = { period: Period; onPeriod: (value: Period) => void; onSchedule: () => void; onAssignments: () => void };

function PlannerMenu({ period, onPeriod, onSchedule, onAssignments }: MenuProps) {
  return <ViewMenu choices={["Daily", "Weekly"]} value={period} onChange={v => onPeriod(v as Period)} onSchedule={onSchedule} onAssignments={onAssignments} />;
}

export function CurrentHomeScreen({ period, onPeriod, onSchedule, onAssignments, capacities, overall, energy, checkInEligible, checkInSaved, onCheckIn, onTab, onRebalance, onTest, onFlashcards, lessonNames, hasMaterials, weeklyNote }: MenuProps & { capacities: CapacityValue[]; overall: number; energy: number; streak: number; checkInEligible: boolean; checkInSaved: boolean; onCheckIn: () => void; onTab: (tab: MainTab) => void; onRebalance: () => void; onTest: () => void; onFlashcards: () => void; lessonNames: string[]; hasMaterials: boolean; weeklyNote: string }) {
  return <ScrollPage bottomBar={<BottomNav selected="today" onSelect={onTab} />}><PlannerMenu {...{ period, onPeriod, onSchedule, onAssignments }} />
    <PageHeader eyebrow={prettyDate(dateKey())} title="Your day, with room to breathe" />
    <View style={s.content}>
      {checkInEligible && <View style={[s.rowBetween, { backgroundColor: colors.mint, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 2 }]}><Text style={[s.bodySmall, s.flex]}>{checkInSaved ? "Today’s check-in is saved" : "You haven’t checked in today"}</Text><AppButton text={checkInSaved ? "Update" : "Check in"} variant="quiet" style={{ minHeight: 48, paddingHorizontal: 12 }} onPress={onCheckIn} /></View>}
      <EnergyReservoir energy={energy} /><View style={{ gap: 10 }}><Text style={s.caption}>A planning estimate, not a health measurement. Completing today’s recovery adds 10 energy, once per day.</Text>{!checkInEligible && <Text style={s.bodySmallMuted}>You’re all set for today. Your first daily check-in starts tomorrow.</Text>}</View>
      <Card tone="dark" style={{ gap: 8 }}><Text style={s.whiteBody}>{period === "Daily" ? "TODAY’S LOAD" : "WEEKLY AVERAGE LOAD"}</Text><Text style={{ fontFamily: fonts.number, fontSize: 46, color: colors.white }}>{overall}%</Text><Text style={s.whiteBody}>{overall >= 85 ? "Your plan is asking a lot. Make room for a break." : overall >= 60 ? "A steady day. Keep a little space for yourself." : "There’s room to move at your own pace."}</Text></Card>
      <SectionLabel>Your four capacities</SectionLabel>{capacities.map(value => <CapacityBar key={value.kind} value={value} />)}
      <Pressable accessibilityRole="button" accessibilityLabel="Open daily flashcards" onPress={onFlashcards}><Card tone="amber" style={{ gap: 10 }}><Text style={s.eyebrow}>DAILY FLASHCARDS</Text><Text style={s.title}>{hasMaterials ? "A little revision for today" : "+ Upload your learning materials"}</Text><Text style={s.body}>{lessonNames.length ? lessonNames.join(" · ") : "No classes scheduled today. Explore your library."}</Text><Text style={s.bodySmallMuted}>{hasMaterials ? "Open your module cards and practise at your pace." : "Upload your learning materials for daily flashcards."}</Text><Text style={s.linkText}>{hasMaterials ? "Open flashcards →" : "Add learning materials →"}</Text></Card></Pressable>
      {overall >= 60 && <InlineNotice title="A recovery break would help" body={overall >= 85 ? "Try a short, quiet pause. Open Recover for suggestions matched to your load." : "A gentle walk or a screen break can fit around today's plans."} />}
      <AppButton text="Make room in my plan" icon="recovery" onPress={onRebalance} /><AppButton text="See if a new plan fits" variant="secondary" icon="plus" onPress={onTest} />
      {weeklyNote ? <Card><Text style={s.eyebrow}>YOUR WEEKLY NOTE</Text><Text style={s.body}>{weeklyNote}</Text></Card> : null}
    </View></ScrollPage>;
}


export function CurrentPlanScreen({ period, onPeriod, onSchedule, onAssignments, filter, unscheduled, days, selectedDate, onDate, onTab, onAdd, onEdit, onAction, onImport }: MenuProps & { filter: PlanFilter; unscheduled: Commitment[]; days: PlanDay[]; selectedDate: string; onDate: (date: string) => void; onTab: (tab: MainTab) => void; onAdd: () => void; onEdit: (item: Commitment) => void; onAction: (item: Commitment, action: string, date: string, duration: number, helper: string) => void; onImport: () => void }) {
  const [expanded, setExpanded] = useState("");
  const visibleDays = period === "Daily" ? days.filter(d => d.date === selectedDate) : days;
  return <ScrollPage bottomBar={<BottomNav selected="plan" onSelect={onTab} />}><PlannerMenu {...{ period, onPeriod, onSchedule, onAssignments }} /><PageHeader eyebrow={`${period} plan · ${filter}`} title={filter === "Assignments" ? "Your assignments" : "Your commitments"} body="Your routine and dated commitments, together in one place." /><View style={s.content}>
    <DateField label={period === "Daily" ? "Showing this day" : "Choose a day in the week"} value={selectedDate} onChange={onDate} />
    <View style={s.rowBetween}><AppButton text="‹ Previous" variant="quiet" onPress={() => onDate(shiftDate(selectedDate, period === "Daily" ? -1 : -7))} /><Text style={[s.caption, { flex: 1, textAlign: "center" }]}>{period === "Daily" ? prettyDate(selectedDate) : `Week of ${prettyDate(weekStart(selectedDate))}`}</Text><AppButton text="Next ›" variant="quiet" onPress={() => onDate(shiftDate(selectedDate, period === "Daily" ? 1 : 7))} /></View>
    {visibleDays.map(day => { const items = day.items.filter(item => filter !== "Assignments" || item.category === "Assignment").filter(item => filter !== "Schedule" || item.category !== "Assignment"); return <View key={day.date} style={{ gap: 12 }}><SectionLabel detail={`${items.length} items`}>{prettyDate(day.date)}</SectionLabel>{["Routine", "Commitments & deadlines"].map(section => { const list = items.filter(item => section === "Routine" ? !!item.routineId : !item.routineId); if (!list.length) return null; return <View key={section} style={{ gap: 10 }}><Text style={s.eyebrow}>{section.toUpperCase()}</Text>{list.map(item => <Card key={item.id} style={{ gap: 10 }}><Pressable accessibilityRole="button" accessibilityState={{ expanded: expanded === item.id }} aria-expanded={expanded === item.id} onPress={() => setExpanded(expanded === item.id ? "" : item.id)} style={{ minHeight: 52, justifyContent: "center", gap: 5 }}><Text style={s.label}>{item.name}</Text><Text style={s.bodySmallMuted}>{item.durationHours ?? item.time / 5} h · {item.action ?? "Keep as planned"}</Text><Text style={s.caption}>{item.dueDate ? `Due ${prettyDate(item.dueDate)}` : item.category === "Assignment" ? "Due date: set up later" : item.category}</Text>{item.helper ? <Text style={s.caption}>Ask: {item.helper}</Text> : null}<Text style={s.linkText}>{expanded === item.id ? "Close options ↑" : "Plan options ↓"}</Text></Pressable>{expanded === item.id && <PlanActions key={`${item.id}-${item.action}`} item={item} onSave={(action, date, duration, helper) => { onAction(item, action, date, duration, helper); setExpanded(""); }} onEdit={() => onEdit(item)} />}</Card>)}</View>; })}{!items.length && <Text style={s.bodySmallMuted}>No {filter === "Assignments" ? "assignments" : filter === "Schedule" ? "routine activities" : "commitments"} planned for this day.</Text>}</View>; })}
    {filter !== "Assignments" && unscheduled.length > 0 && <View style={{ gap: 12 }}><SectionLabel>Set up later</SectionLabel><Text style={s.bodySmallMuted}>These commitments are saved, but are not included in daily load yet.</Text>{unscheduled.map(item => <Card key={item.id}><Text style={s.label}>{item.name}</Text><Text style={s.bodySmallMuted}>{item.category} · {item.durationHours ?? 1} h per session</Text><AppButton text={`Set dates for ${item.name}`} variant="secondary" onPress={() => onEdit(item)} /></Card>)}</View>}
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

export function CurrentRecoveryScreen({ days, results, onResult, onTab }: { days: PlanDay[]; results: Record<string, { done: boolean; feeling?: string }>; onResult: (key: string, value: { done: boolean; feeling?: string }) => void; onTab: (tab: MainTab) => void }) {
  const sorted = [...days].filter(d => d.date >= dateKey()).sort((a, b) => b.load - a.load || a.date.localeCompare(b.date));
  return <ScrollPage bottomBar={<BottomNav selected="recovery" onSelect={onTab} />}><PageHeader eyebrow="Recovery" title="A break that fits your day" body="Highest-load days appear first. Suggestions adjust to the energy your plan needs." /><View style={s.content}>{sorted.map(day => {
    const kind = [...day.capacities].sort((a, b) => b.used / b.limit - a.used / a.limit)[0]?.kind ?? "time";
    const level = day.load >= 85 ? "high" : day.load >= 60 ? "moderate" : "light";
    const title = level === "high" ? "Take 10 quiet minutes" : level === "moderate" ? kind === "physical" ? "Rest your body for 15 minutes" : kind === "social" ? "Enjoy 15 minutes on your own" : "Take a gentle screen-free walk" : "Keep a small pocket of free time";
    const key = day.date; const result = results[key];
    return <Card key={key} tone={level === "high" ? "amber" : "paper"} style={{ gap: 12 }}><View style={s.rowBetween}><Text style={[s.label, s.flex]}>{prettyDate(day.date)}</Text><Text style={s.label}>{day.load}% load</Text></View><Text style={s.title}>{title}</Text><Text style={s.bodySmallMuted}>{capacityMeta[kind].label} needs the most room. {level === "high" ? "Find a quiet spot, pause notifications, and let one thing wait." : level === "moderate" ? "Choose a comfortable break between commitments." : "No extra recovery task needed. Leave some time unplanned."}</Text>
      <AppButton disabled={day.date > dateKey()} text={day.date > dateKey() ? "Available on this day" : result?.done ? "Completed · undo" : "I’ve done this"} variant={result?.done ? "secondary" : "primary"} onPress={() => onResult(key, { done: !result?.done })} />
      {result?.done && <><SegmentedChoices label="How do you feel afterward?" choices={["Better", "About the same", "Still drained"]} selected={result.feeling ?? ""} onSelect={feeling => onResult(key, { done: true, feeling })} />{result.feeling === "Still drained" && <Text style={s.bodySmallMuted}>You don’t have to push through. Keep the next break gentle and review what can wait.</Text>}{result.feeling && <Text style={s.caption}>Your reflection is saved.</Text>}</>}
    </Card>;
  })}<InlineNotice title="Recovery isn’t another test" body="There’s no penalty for skipping a suggestion. Choose what feels manageable." /></View></ScrollPage>;
}
