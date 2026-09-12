import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { DateField, ValueSlider } from "@/components/PlannerControls";
import { dateKey, prettyDate, shiftDate, fromKey } from "@/models/planner";

import {
  AppButton,
  Card,
  CheckboxRow,
  ChoicePill,
  CompactStepper,
  FormField,
  InlineNotice,
  PageHeader,
  ProgressBar,
  ScrollPage,
  SectionLabel,
  SegmentedChoices,
} from "@/components/MarginUI";
import { WelcomeLeafScene } from "@/components/EnergyLeaf";
import { MarginIcon } from "@/components/MarginIcon";
import {
  CapacityKind,
  capacityMeta,
  Commitment,
  createCommitmentId,
  durationOptions,
  formatHours,
  frequencyOptions,
  recoveryHourValues,
  requiredFeelKinds,
  routineConditionOptions,
  RoutineEntry,
  routineCatalog,
  weeklyHours,
} from "@/models/margin";
import { colors, fonts, type } from "@/theme/tokens";
import { screenStyles as s } from "@/screens/screenStyles";

export function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <ScrollPage plain contentStyle={styles.welcomePage}>
      <View style={styles.welcomeHero}>
        <WelcomeLeafScene />
        <Text style={styles.brandName}>SANTAI</Text>
        <Text accessibilityRole="header" style={styles.display}>Make room for{"\n"}what matters.</Text>
        <Text style={styles.lead}>See what your week asks of you, protect your recovery, and choose the next step with clarity.</Text>
      </View>
      <View style={styles.welcomeFooter}>
        <AppButton text="Build my week" onPress={onStart} />
        <Text style={styles.centerCaption}>Takes about two minutes. You can change everything later.</Text>
      </View>
    </ScrollPage>
  );
}

export function RoutineChecklistScreen({ selectedIds, onToggle, onBack, onContinue }: { selectedIds: string[]; onToggle: (id: string) => void; onBack: () => void; onContinue: () => void }) {
  return (
    <ScrollPage>
      <PageHeader eyebrow="Your baseline · 1 of 3" title="What is part of your normal week?" body="Choose what usually takes your time—not only what is busy right now." onBack={onBack} />
      <View style={s.contentTight}>
        {routineCatalog.map((item) => <CheckboxRow key={item.id} label={item.label} selected={selectedIds.includes(item.id)} onPress={() => onToggle(item.id)} />)}
        <View style={s.spacer} />
        <AppButton text="Add weekly hours" onPress={onContinue} disabled={selectedIds.length === 0} />
      </View>
    </ScrollPage>
  );
}

export function RoutineHoursScreen({ selectedIds, entries, onEntryChange, onBack, onContinue }: { selectedIds: string[]; entries: Record<string, RoutineEntry>; onEntryChange: (id: string, entry: RoutineEntry) => void; onBack: () => void; onContinue: () => void }) {
  const selectedItems = routineCatalog.filter((item) => selectedIds.includes(item.id));
  const total = selectedItems.reduce((sum, item) => sum + weeklyHours(entries[item.id] ?? { durationHours: 1, timesPerWeek: 1, condition: "Typical" }), 0);

  const adjust = (id: string, key: "durationHours" | "timesPerWeek", direction: -1 | 1) => {
    const current = entries[id] ?? { durationHours: 1, timesPerWeek: 1, condition: "Typical" };
    const options = key === "durationHours" ? durationOptions.map((entry) => entry[1]) : frequencyOptions.map((entry) => entry[1]);
    const index = Math.max(0, options.indexOf(current[key] as never));
    const nextIndex = Math.min(options.length - 1, Math.max(0, index + direction));
    onEntryChange(id, { ...current, [key]: options[nextIndex] });
  };

  return (
    <ScrollPage>
      <PageHeader eyebrow="Your baseline · 2 of 3" title="How much of each?" body="Use a normal week rather than your busiest week." onBack={onBack} />
      <View style={s.content}>
        {selectedItems.map((item) => {
          const entry = entries[item.id] ?? { durationHours: 1, timesPerWeek: 1, condition: "Typical" };
          return (
            <Card key={item.id}>
              <View style={s.rowBetween}>
                <Text style={[s.label, s.flex]}>{item.label}</Text>
                <Text style={styles.hoursTotal}>{formatHours(weeklyHours(entry))} / week</Text>
              </View>
              <CompactStepper label={item.id === "classes" ? "Hours of classes on a class day" : "Hours spent on a typical active day"} value={formatHours(entry.durationHours)} onDecrease={() => adjust(item.id, "durationHours", -1)} onIncrease={() => adjust(item.id, "durationHours", 1)} />
              <CompactStepper label={item.id === "classes" ? "Class days each week" : "Days each week you do this"} value={`${entry.timesPerWeek} ${entry.timesPerWeek === 1 ? "day" : "days"} / week`} onDecrease={() => adjust(item.id, "timesPerWeek", -1)} onIncrease={() => adjust(item.id, "timesPerWeek", 1)} />
              <Text style={s.caption}>{formatHours(entry.durationHours)} per day × {entry.timesPerWeek} days = {formatHours(weeklyHours(entry))} per week</Text>
              <SegmentedChoices label="How does this usually feel?" choices={routineConditionOptions} selected={entry.condition} onSelect={(condition) => onEntryChange(item.id, { ...entry, condition: condition as RoutineEntry["condition"] })} />
            </Card>
          );
        })}
        <InlineNotice title={`${formatHours(total)} already committed`} body="This becomes the starting point for your personal limits." />
        <AppButton text="Set personal limits" onPress={onContinue} />
      </View>
    </ScrollPage>
  );
}

const feelOptions: Record<CapacityKind, string[]> = {
  mental: ["I can focus on another task", "I can manage one small task", "I need a break before focusing", "I cannot concentrate anymore"],
  physical: ["I still have plenty of energy", "I can manage light activities", "I feel tired and need rest", "I need a full day to recover"],
  social: ["I would enjoy more conversation", "A short catch-up feels comfortable", "I prefer a quiet evening alone", "I need a full day without social plans"],
  time: ["Less than 30 minutes per day", "About 30–60 minutes per day", "About 1–2 hours per day", "More than 2 hours per day"],
};

function feelQuestion(kind: CapacityKind, entries: Record<string, RoutineEntry>) {
  const total = Object.values(entries).reduce((sum, entry) => sum + weeklyHours(entry), 0);
  if (kind === "mental") return `Your baseline includes ${formatHours(total)} of activities each week. At the end of a typical day in that week, how easy is it to concentrate?`;
  if (kind === "physical") return "At the end of a typical day in your baseline routine, how much physical energy do you have left?";
  if (kind === "social") return "After the conversations, classes and social plans in your normal week, how much more interaction feels comfortable?";
  return "On a typical day in your baseline week, how much usable free time remains after commitments, sleep and everyday needs?";
}

export function FeelQuestionsScreen({ selectedIds, entries, answers, recoveryChoice, index, onAnswer, onRecovery, onIndexChange, onBack, onContinue }: { selectedIds: string[]; entries: Record<string, RoutineEntry>; answers: Partial<Record<CapacityKind, number>>; recoveryChoice?: number; index: number; onAnswer: (kind: CapacityKind, answer: number) => void; onRecovery: (answer: number) => void; onIndexChange: (index: number) => void; onBack: () => void; onContinue: () => void }) {
  const kinds = requiredFeelKinds(selectedIds);
  const total = kinds.length + 1;
  const pageIndex = Math.min(index, total - 1);
  const kind = kinds[pageIndex];
  const isRecovery = !kind;
  const ready = kind ? answers[kind] !== undefined : recoveryChoice !== undefined;
  const back = () => pageIndex > 0 ? onIndexChange(pageIndex - 1) : onBack();

  return (
    <ScrollPage>
      <PageHeader eyebrow={`Personal limit ${pageIndex + 1} of ${total}`} title={isRecovery ? "Room for recovery" : "Your energy after your routine"} body="Think about the normal week you just described in your baseline. Choose the answer that fits most days." onBack={back} />
      <View style={s.content}>
        <ProgressBar current={pageIndex + 1} total={total} color={kind ? capacityMeta[kind].color : colors.forest} />
        {kind ? (
          <Card>
            <Text style={[s.eyebrow, { color: capacityMeta[kind].color }]}>{capacityMeta[kind].label.toUpperCase()}</Text>
            <Text style={[s.label, styles.question]}>{feelQuestion(kind, entries)}</Text>
            <View style={styles.optionStack}>
              {feelOptions[kind].map((option, optionIndex) => <ChoicePill key={option} text={option} selected={answers[kind] === optionIndex} onPress={() => onAnswer(kind, optionIndex)} />)}
            </View>
          </Card>
        ) : (
          <Card tone="mint">
            <Text style={[s.eyebrow, { color: colors.forest }]}>RECOVERY</Text>
            <Text style={[s.label, styles.question]}>How much completely unplanned time do you need each week to feel okay?</Text>
            <View style={styles.optionStack}>
              {["A couple of hours", "Half a day", "A full day", "More than a day"].map((option, optionIndex) => <ChoicePill key={option} text={`${option} · ${recoveryHourValues[optionIndex]} h`} selected={recoveryChoice === optionIndex} onPress={() => onRecovery(optionIndex)} />)}
            </View>
          </Card>
        )}
        <AppButton text={isRecovery ? "Set my baseline" : "Next question"} disabled={!ready} onPress={() => isRecovery ? onContinue() : onIndexChange(pageIndex + 1)} />
        <Text style={styles.centerCaption}>{isRecovery ? "You can adjust these limits later." : `This answer sets your ${capacityMeta[kind].label.toLowerCase()} boundary.`}</Text>
      </View>
    </ScrollPage>
  );
}

function SetupPath({ number, title, body, accent, onPress }: { number: string; title: string; body: string; accent?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s.optionCard, accent && styles.optionCardAccent, pressed && styles.pressed]}>
      <Text style={s.optionNumber}>{number}</Text>
      <View style={s.flex}><Text style={s.optionTitle}>{title}</Text><Text style={s.optionBody}>{body}</Text></View>
      <MarginIcon name="chevron" color={colors.forest} size={22} />
    </Pressable>
  );
}

export function SetupChoiceScreen({ onBack, onImport, onManual, onSkip }: { onBack: () => void; onImport: () => void; onManual: () => void; onSkip: () => void }) {
  return (
    <ScrollPage>
      <PageHeader eyebrow="Specific commitments" title="Add the things with names and dates" body="Your recurring routine is saved. Now add deadlines, shifts, events, and one-offs." onBack={onBack} />
      <View style={s.content}>
        <SetupPath number="01" title="Import my timetable" body="Start with fixed classes from a timetable." accent onPress={onImport} />
        <SetupPath number="02" title="Add one commitment" body="Best for a deadline, shift, event, or competition." onPress={onManual} />
        <AppButton text="Show my baseline for now" variant="quiet" onPress={onSkip} />
        <View style={s.softRule}><Text style={s.bodySmallMuted}>Nothing is added without review. You can edit every commitment later.</Text></View>
      </View>
    </ScrollPage>
  );
}

export { ImportTimetableScreen } from "./TimetableScreen";

export type CommitmentDraft = Omit<Commitment, "id" | "time" | "mental" | "physical" | "social"> & { time: number; mental: number; physical: number; social: number };

export function CommitmentForm({ eyebrow, title, body, initial, submitText, onBack, onSubmit, secondaryAction, returnAction, onAddAnother, defaultDate }: { eyebrow: string; title: string; body: string; initial?: Commitment; submitText: string; onBack: () => void; onSubmit: (commitment: Commitment) => void; secondaryAction?: { text: string; onPress: () => void }; returnAction?: { text: string; onPress: () => void }; onAddAnother?: (commitment: Commitment) => void; defaultDate?: string }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? "Personal");
  const [scheduleType, setScheduleType] = useState<NonNullable<Commitment["scheduleType"]>>(initial?.scheduleType ?? "Fixed");
  const [later, setLater] = useState(!!initial?.scheduleType && !initial.startDate);
  const [range, setRange] = useState(initial?.endDate && initial.startDate ? Math.round((fromKey(initial.endDate).getTime() - fromKey(initial.startDate).getTime()) / 86400000) + 1 : 1);
  const [weekdays, setWeekdays] = useState<number[]>(initial?.weekdays ?? [0, 1, 2, 3, 4, 5, 6]);
  const flexibility = initial?.flexibility ?? "Somewhat flexible";
  const [startDate, setStartDate] = useState(initial?.startDate ?? defaultDate ?? dateKey());
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? "");
  const [duration, setDuration] = useState(initial?.durationHours ?? 1);
  const [savedNotice, setSavedNotice] = useState("");
  const [effort, setEffort] = useState(Math.max(1, Math.min(5, Math.round(Math.max(initial?.mental ?? 15, initial?.physical ?? 5, initial?.social ?? 10) / 5))));
  const legacy = !!initial && (initial.category === "Assignment" || initial.category === "Class" || !!initial.routineId);
  const dated = legacy || (scheduleType === "Fixed" && !later);
  const deadlineAllowed = category === "Assignment" || category === "Competition";
  const dates = Array.from({ length: range }, (_, i) => shiftDate(startDate, i)).filter(date => range === 1 || weekdays.includes(fromKey(date).getDay()));
  const invalid = !name.trim() || (dated && (!startDate || !dates.length || (deadlineAllowed && !!dueDate && dueDate < shiftDate(startDate, range - 1))));
  const estimatedLoads = () => {
    const mix: Record<string, { mental: number; physical: number; social: number }> = {
      Competition: { mental: 1, physical: 0.45, social: 0.65 }, Club: { mental: 0.65, physical: 0.25, social: 0.85 }, Job: { mental: 0.7, physical: 0.65, social: 0.65 }, Sport: { mental: 0.3, physical: 1, social: 0.35 }, Social: { mental: 0.35, physical: 0.2, social: 1 }, Personal: { mental: 0.55, physical: 0.35, social: 0.25 }, Assignment: { mental: 1, physical: 0.05, social: 0.05 }, Class: { mental: 0.85, physical: 0.1, social: 0.35 }, Routine: { mental: 0.6, physical: 0.4, social: 0.35 },
    };
    const selected = mix[category] ?? mix.Personal;
    return { mental: Math.round(effort * 5 * selected.mental), physical: Math.round(effort * 5 * selected.physical), social: Math.round(effort * 5 * selected.social) };
  };
  const loads = estimatedLoads();
  const draft = (): Commitment => ({ ...initial, id: initial?.id ?? createCommitmentId(name), name: name.trim(), category, scheduleType: legacy ? undefined : scheduleType, startDate: dated ? startDate : scheduleType === "Daily routine" ? initial?.startDate ?? dateKey() : undefined, endDate: dated && !legacy ? shiftDate(startDate, range - 1) : undefined, weekdays: dated && range > 1 ? weekdays : undefined, dueDate: dated && deadlineAllowed ? dueDate || undefined : undefined, schedule: dated ? `${prettyDate(startDate)}${range > 1 ? ` · ${range} days` : ""}` : scheduleType === "Daily routine" ? "Every day" : "Set up later", flexibility: legacy ? flexibility : scheduleType === "Fixed" ? "Fixed" : "Flexible", durationHours: duration, time: duration * 5, ...loads });
  return <ScrollPage><PageHeader eyebrow={eyebrow} title={title} body={body} onBack={onBack} /><View style={s.content}>
    {returnAction ? <AppButton text={returnAction.text} variant="quiet" icon="calendar" onPress={returnAction.onPress} /> : null}
    {savedNotice ? <InlineNotice title="Commitment added" body={savedNotice} /> : null}
    {initial?.scheduleType && <Text style={s.bodySmallMuted}>Editing changes the whole commitment and resets any individual-day adjustments. To change just one day, use its Plan options instead.</Text>}
    <FormField label="Commitment name" value={name} onChangeText={setName} placeholder="e.g. Hackathon practice" />
    {legacy ? <Text style={s.label}>{category}</Text> : <SegmentedChoices label="Category" choices={["Competition", "Club", "Job", "Sport", "Social", "Personal"]} selected={category} onSelect={setCategory} />}
    {!legacy && <><Text style={s.bodySmallMuted}>Classes and assignments are managed in Modules & assignments.</Text><SegmentedChoices label="How does this fit your week?" choices={["Fixed", "Flexible", "Daily routine"]} selected={scheduleType} onSelect={value => setScheduleType(value as NonNullable<Commitment["scheduleType"]>)} /></>}
    {scheduleType === "Fixed" && !legacy && <CheckboxRow label="Set up later" selected={later} onPress={() => setLater(!later)} />}
    {dated && <><DateField label={legacy ? "When will you do it?" : "When will you need it? Start date"} value={startDate} onChange={setStartDate} />{!legacy && <><SegmentedChoices label="For how long?" choices={["One day", "1 week", "2 weeks", "4 weeks"]} selected={range === 1 ? "One day" : range === 7 ? "1 week" : range === 14 ? "2 weeks" : range === 28 ? "4 weeks" : ""} onSelect={value => setRange(value === "One day" ? 1 : parseInt(value) * 7)} /><Text style={s.body}>{prettyDate(startDate)}{range > 1 ? ` – ${prettyDate(shiftDate(startDate, range - 1))}` : ""}</Text>{range > 1 && <><SectionLabel>Which days will you commit?</SectionLabel><View style={s.wrapRow}>{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, i) => <CheckboxRow key={day} label={day} selected={weekdays.includes(i)} onPress={() => setWeekdays(current => current.includes(i) ? current.filter(v => v !== i) : [...current, i])} />)}</View>{!dates.length && <Text accessibilityRole="alert" style={s.body}>Choose at least one day.</Text>}</>}</>}{deadlineAllowed && <DateField label={category === "Competition" ? "Submission deadline (only if required)" : "Due date (optional)"} value={dueDate} onChange={setDueDate} optional />}{deadlineAllowed && dueDate && dueDate < shiftDate(startDate, range - 1) ? <Text accessibilityRole="alert" style={s.body}>Your deadline must be on or after your last planned day.</Text> : null}</>}
    {!dated && <Text style={s.bodySmallMuted}>{scheduleType === "Daily routine" ? "Repeats every day from today. No dates to fill in. Edit it in Plan or Schedule." : "Saved under Set up later in Plan and Schedule. It will not count towards a day's load until you choose dates."}</Text>}
    <ValueSlider label="Time needed" min={0.25} max={8} step={0.25} suffix=" hours" value={duration} onChange={setDuration} />
    <ValueSlider label="Total effort needed" min={1} max={5} step={1} suffix=" / 5" value={effort} onChange={setEffort} />
    <Card tone="mint" style={{ gap: 5 }}><Text style={s.eyebrow}>SANTAI’S ESTIMATE</Text><Text style={s.bodySmall}>Mental {loads.mental} · Physical {loads.physical} · Social {loads.social}</Text><Text style={s.caption}>Estimated from the category and your one effort rating. You can still adjust the plan later.</Text></Card>
    <AppButton text={submitText} disabled={invalid} onPress={() => onSubmit(draft())} />
    {!initial && onAddAnother ? <AppButton text="Add & add another commitment" variant="secondary" disabled={invalid} onPress={() => { onAddAnother(draft()); setSavedNotice(name.trim() + " is saved. Add your next commitment below."); setName(""); setDueDate(""); }} /> : null}
    {secondaryAction ? <AppButton text={secondaryAction.text} variant="quiet" onPress={secondaryAction.onPress} /> : null}
  </View></ScrollPage>;
}

export function AddCommitmentOnboardingScreen({ onBack, onContinue }: { onBack: () => void; onContinue: (commitment: Commitment) => void }) {
  return <CommitmentForm eyebrow="Add manually" title="Add one commitment" body="Add a named deadline, shift, event, or competition. Your routine is already counted." submitText="Add and continue" onBack={onBack} onSubmit={onContinue} />;
}

export function AnythingElseScreen({ initialNote, onBack, onContinue, standalone = false }: { initialNote: string; onBack: () => void; onContinue: (note: string) => void; standalone?: boolean }) {
  const [note, setNote] = useState(initialNote);
  return (
    <ScrollPage>
      <PageHeader eyebrow={standalone ? "Your profile" : "Optional context"} title={standalone ? "Update your weekly note" : "Anything else about this week?"} body={standalone ? "Pin one useful piece of context to your dashboard for this week." : "Keep a note for yourself. You can add any extra plans through Add Commitment."} onBack={onBack} />
      <View style={s.content}>
        <FormField label="Weekly context" value={note} onChangeText={setNote} placeholder="e.g. I help at home most Sunday mornings…" multiline />
        <AppButton text={standalone ? "Save weekly note" : "Build my plan"} onPress={() => onContinue(note.trim())} />
        <Text style={styles.centerCaption}>{standalone ? "This note stays on your dashboard until you change it." : "This step is optional; leaving it blank adds nothing."}</Text>
      </View>
    </ScrollPage>
  );
}

const styles = StyleSheet.create({
  welcomePage: { paddingHorizontal: 24, paddingTop: 22, paddingBottom: 24, justifyContent: "space-between", minHeight: 680 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  brandName: { fontFamily: fonts.bold, fontSize: 30, lineHeight: 38, color: colors.white, letterSpacing: 1 },
  welcomeHero: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, paddingVertical: 36 },
  display: { fontFamily: fonts.bold, fontSize: 25, lineHeight: 32, color: colors.white, textAlign: "center" },
  lead: { ...type.bodySmall, color: colors.mint, maxWidth: 290, textAlign: "center" },
  capacitySculpture: { height: 108, flexDirection: "row", alignItems: "flex-end", gap: 7, marginTop: 12 },
  sculptureBar: { flex: 1, borderRadius: 5, padding: 9, justifyContent: "flex-end" },
  sculptureLabel: { fontFamily: fonts.bold, fontSize: 18 },
  welcomeFooter: { gap: 12, backgroundColor: colors.canvas, borderRadius: 22, padding: 18 },
  centerCaption: { ...type.caption, color: colors.textMuted, textAlign: "center" },
  hoursTotal: { ...type.label, color: colors.forest },
  question: { fontSize: 17, lineHeight: 23, marginTop: 8 },
  optionStack: { gap: 9, marginTop: 14 },
  optionCardAccent: { borderColor: colors.forest, backgroundColor: colors.softMint },
  pressed: { opacity: 0.72 },
  importPanel: { height: 178, borderRadius: 14, borderWidth: 1, borderColor: colors.outlineSoft, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center", gap: 9, padding: 20 },
  importNumber: { fontFamily: fonts.bold, fontSize: 46, lineHeight: 50, color: colors.forest },
  center: { textAlign: "center" },
});
