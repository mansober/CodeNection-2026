import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { DateField, ValueSlider } from "@/components/PlannerControls";
import { dateKey, prettyDate, shiftDate, fromKey } from "@/models/planner";

import {
  AppButton,
  Card,
  ChoicePill,
  CompactStepper,
  FormField,
  InlineNotice,
  PageHeader,
  ProgressBar,
  ScrollPage,
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
import { colors, fonts, layout, type } from "@/theme/tokens";
import { screenStyles as s } from "@/screens/screenStyles";

const baselineGroups = [
  { title: "Study & work", ids: ["classes", "study", "job"] },
  { title: "Activities", ids: ["sport", "club", "competition", "volunteering"] },
  { title: "Life", ids: ["family", "commuting", "errands", "projects"] },
] as const;

const routineFieldLabels: Record<string, { duration: string; frequency: string }> = {
  classes: { duration: "Hours on a class day", frequency: "Class days per week" },
  study: { duration: "Hours on a study day", frequency: "Study days per week" },
  job: { duration: "Hours on a work day", frequency: "Work days per week" },
  sport: { duration: "Hours on a training day", frequency: "Training days per week" },
  club: { duration: "Hours on an active club day", frequency: "Club days per week" },
  competition: { duration: "Hours on an active day", frequency: "Competition days per week" },
  volunteering: { duration: "Hours on a volunteer day", frequency: "Volunteer days per week" },
  family: { duration: "Hours on a family-duty day", frequency: "Family-duty days per week" },
  commuting: { duration: "Hours on a commute day", frequency: "Commute days per week" },
  errands: { duration: "Hours on an errands day", frequency: "Errand days per week" },
  projects: { duration: "Hours on a project day", frequency: "Project days per week" },
};

function BaselineQuickPick({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.quickPick, selected && styles.quickPickSelected, pressed && styles.pressed]}
    >
      <View style={[styles.quickPickCheck, selected && styles.quickPickCheckSelected]}>
        {selected ? <MarginIcon name="check" color={colors.white} size={13} strokeWidth={2.5} /> : null}
      </View>
      <Text style={[styles.quickPickText, selected && styles.quickPickTextSelected]}>{label}</Text>
    </Pressable>
  );
}

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
        <View accessibilityLabel="Setup roadmap: Normal week, your limits, then what is coming up" style={styles.setupRoadmap}>
          {["Normal week", "Your limits", "What’s coming up"].map((label, index) => (
            <View key={label} style={styles.roadmapStep}>
              <Text style={styles.roadmapNumber}>{index + 1}</Text>
              <Text style={styles.roadmapLabel}>{label}</Text>
            </View>
          ))}
        </View>
        <AppButton text="Show Santai my normal week" onPress={onStart} />
        <Text style={styles.centerCaption}>Takes about two minutes. You can change everything later.</Text>
      </View>
    </ScrollPage>
  );
}

export function RoutineChecklistScreen({ selectedIds, onToggle, onBack, onContinue }: { selectedIds: string[]; onToggle: (id: string) => void; onBack: () => void; onContinue: () => void }) {
  return (
    <ScrollPage>
      <PageHeader eyebrow="Setup · Normal week · 1 of 2" title="What is part of your normal week?" body="Choose what usually takes your time—not only what is busy right now." onBack={onBack} />
      <View style={s.contentTight}>
        {baselineGroups.map((group) => (
          <View key={group.title} style={styles.quickPickGroup}>
            <Text style={styles.groupTitle}>{group.title.toUpperCase()}</Text>
            <View style={styles.quickPickList}>
              {group.ids.map((id) => {
                const item = routineCatalog.find((candidate) => candidate.id === id);
                return item ? <BaselineQuickPick key={id} label={item.label} selected={selectedIds.includes(id)} onPress={() => onToggle(id)} /> : null;
              })}
            </View>
          </View>
        ))}
        {selectedIds.length === 0 ? <Text accessibilityLiveRegion="polite" style={styles.selectionHelp}>Choose at least one part of your week to continue.</Text> : <Text accessibilityLiveRegion="polite" style={styles.selectionCount}>{selectedIds.length} selected</Text>}
        <AppButton text="Estimate my week" onPress={onContinue} disabled={selectedIds.length === 0} />
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
      <PageHeader eyebrow="Setup · Normal week · 2 of 2" title="Estimate your normal week" body="Use a typical week rather than your busiest one. Rough estimates are enough." onBack={onBack} />
      <View style={s.content}>
        <Card style={styles.baselineSurface}>
          {selectedItems.map((item, index) => {
            const entry = entries[item.id] ?? { durationHours: 1, timesPerWeek: 1, condition: "Typical" };
            const labels = routineFieldLabels[item.id] ?? { duration: "Hours on an active day", frequency: "Active days per week" };
            return (
              <View key={item.id} style={[styles.activityEditor, index > 0 && styles.activityEditorDivider]}>
                <View style={s.rowBetween}>
                  <Text style={[styles.activityTitle, s.flex]}>{item.label}</Text>
                  <Text accessibilityLabel={`${formatHours(weeklyHours(entry))} per week`} style={styles.hoursTotal}>{formatHours(weeklyHours(entry))} / week</Text>
                </View>
                <CompactStepper label={labels.duration} value={formatHours(entry.durationHours)} onDecrease={() => adjust(item.id, "durationHours", -1)} onIncrease={() => adjust(item.id, "durationHours", 1)} />
                <CompactStepper label={labels.frequency} value={`${entry.timesPerWeek} ${entry.timesPerWeek === 1 ? "day" : "days"}`} onDecrease={() => adjust(item.id, "timesPerWeek", -1)} onIncrease={() => adjust(item.id, "timesPerWeek", 1)} />
                <SegmentedChoices label="How does this usually feel?" choices={routineConditionOptions} selected={entry.condition} onSelect={(condition) => onEntryChange(item.id, { ...entry, condition: condition as RoutineEntry["condition"] })} />
              </View>
            );
          })}
        </Card>
        <View accessible accessibilityLiveRegion="polite" accessibilityLabel={`Your baseline so far, ${formatHours(total)} per week`} style={styles.baselineSummary}>
          <View style={styles.summaryIcon}><MarginIcon name="calendar" color={colors.forest} size={18} /></View>
          <View style={s.flex}><Text style={styles.summaryTitle}>Your baseline so far · {formatHours(total)} / week</Text><Text style={styles.summaryBody}>This is a working estimate. You can adjust it anytime.</Text></View>
        </View>
        <Text style={styles.transitionCopy}>Your normal week is mapped. Next, tell Santai what “enough” usually feels like.</Text>
        <AppButton text="Teach Santai my limits" onPress={onContinue} />
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
      <PageHeader eyebrow={`Setup · Your limits · ${pageIndex + 1} of ${total}`} title={isRecovery ? "Room for recovery" : "Your energy after your routine"} body="Choose the answer that fits most days in the normal week you described." onBack={back} />
      <View style={s.content}>
        <ProgressBar current={pageIndex + 1} total={total} color={kind ? capacityMeta[kind].color : colors.forest} />
        {pageIndex === 0 ? <InlineNotice title="Your normal week is mapped" body="Now Santai will learn what enough usually feels like for you." /> : null}
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
        <Text style={styles.centerCaption}>{isRecovery ? "You can adjust these limits later." : "There is no perfect answer—choose what feels most like you."}</Text>
      </View>
    </ScrollPage>
  );
}

function SetupPath({ title, body, badge, accent, icon, onPress }: { title: string; body: string; badge?: string; accent?: boolean; icon: "calendar" | "plus"; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${title}. ${body}${badge ? `. ${badge}` : ""}`} onPress={onPress} style={({ pressed }) => [styles.upcomingAction, accent && styles.optionCardAccent, pressed && styles.pressed]}>
      <View style={[styles.upcomingActionIcon, accent && styles.upcomingActionIconAccent]}><MarginIcon name={icon} color={colors.forest} size={20} /></View>
      <View style={s.flex}>
        <View style={styles.actionTitleRow}><Text style={styles.actionTitle}>{title}</Text>{badge ? <Text style={styles.actionBadge}>{badge}</Text> : null}</View>
        <Text style={styles.actionBody}>{body}</Text>
      </View>
      <MarginIcon name="chevron" color={colors.forest} size={22} />
    </Pressable>
  );
}

export function SetupChoiceScreen({ baselineHours, activityCount, recoveryChoice, onBack, onImport, onManual, onSkip }: { baselineHours: number; activityCount: number; recoveryChoice?: number; onBack: () => void; onImport: () => void; onManual: () => void; onSkip: () => void }) {
  const recoveryHours = recoveryChoice === undefined ? undefined : recoveryHourValues[recoveryChoice];
  return (
    <ScrollPage>
      <PageHeader eyebrow="Setup · Upcoming · Optional" title="What’s coming up?" body="Your normal routine is covered. Add anything with a date, deadline, or one-off schedule—or start with your baseline now." onBack={onBack} />
      <View style={s.content}>
        <View accessible accessibilityLiveRegion="polite" accessibilityLabel={`Baseline ready. About ${formatHours(baselineHours)} per week across ${activityCount} routine types. Personal limits and recovery room are set.`} style={styles.readyCard}>
          <View style={styles.readyIcon}><MarginIcon name="check" color={colors.white} size={21} strokeWidth={2.5} /></View>
          <View style={s.flex}>
            <Text style={styles.readyTitle}>Your baseline is ready</Text>
            <Text style={styles.readyBody}>Santai now has a starting point for reading your week.</Text>
          </View>
          <View style={styles.summaryFacts}>
            <Text style={styles.summaryFact}>About {formatHours(baselineHours)} / week</Text>
            <Text style={styles.summaryFact}>{activityCount} {activityCount === 1 ? "routine type" : "routine types"}</Text>
            <Text style={styles.summaryFact}>Personal limits set</Text>
            {recoveryHours !== undefined ? <Text style={styles.summaryFact}>{recoveryHours} h recovery room</Text> : null}
          </View>
        </View>
        <View style={styles.optionalHeading}>
          <Text style={styles.groupTitle}>OPTIONAL NEXT STEPS</Text>
          <Text style={styles.optionalBody}>Useful when you already know what is coming up.</Text>
        </View>
        <SetupPath title="Import my timetable" body="Add fixed classes from a timetable." badge="Recommended for students" icon="calendar" accent onPress={onImport} />
        <SetupPath title="Add a commitment" body="Add a deadline, shift, event, or competition." icon="plus" onPress={onManual} />
        <AppButton text="Start with my baseline" onPress={onSkip} />
        <View style={s.softRule}><Text style={s.bodySmallMuted}>These are optional. Nothing is added without review, and you can add or edit commitments later.</Text></View>
      </View>
    </ScrollPage>
  );
}

export { ImportTimetableScreen } from "./TimetableScreen";

export type CommitmentDraft = Omit<Commitment, "id" | "time" | "mental" | "physical" | "social"> & { time: number; mental: number; physical: number; social: number };

const scheduleModeDescriptions: Record<NonNullable<Commitment["scheduleType"]>, string> = {
  Fixed: "Choose dates now",
  Flexible: "Schedule it later",
  "Daily routine": "Repeats every day",
};

const commitmentWeekdays = [
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
  { label: "Sun", value: 0 },
];

const effortDescriptions = ["", "Light", "Manageable", "Moderate", "Demanding", "Very demanding"];

function commitmentDuration(value: number) {
  const minutes = Math.round(value * 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Number.isInteger(value) ? value : value.toFixed(2).replace(/0$/, "")} h`;
}

function CommitmentSection({ title, children }: { title: string; children: ReactNode }) {
  return <View style={styles.commitmentSection}><Text style={styles.commitmentSectionTitle}>{title}</Text>{children}</View>;
}

export function CommitmentForm({ eyebrow, title, body, initial, submitText, onBack, onSubmit, secondaryAction, returnAction, onAddAnother, onManageModules, defaultDate }: { eyebrow: string; title: string; body: string; initial?: Commitment; submitText: string; onBack: () => void; onSubmit: (commitment: Commitment) => void; secondaryAction?: { text: string; onPress: () => void }; returnAction?: { text: string; onPress: () => void }; onAddAnother?: (commitment: Commitment) => void; onManageModules?: () => void; defaultDate?: string }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [nameTouched, setNameTouched] = useState(false);
  const [category, setCategory] = useState(initial?.category ?? "Personal");
  const [scheduleType, setScheduleType] = useState<NonNullable<Commitment["scheduleType"]>>(initial?.scheduleType ?? "Fixed");
  const [range, setRange] = useState(initial?.endDate && initial.startDate ? Math.round((fromKey(initial.endDate).getTime() - fromKey(initial.startDate).getTime()) / 86400000) + 1 : 1);
  const [weekdays, setWeekdays] = useState<number[]>(initial?.weekdays ?? [0, 1, 2, 3, 4, 5, 6]);
  const flexibility = initial?.flexibility ?? "Somewhat flexible";
  const [startDate, setStartDate] = useState(initial?.startDate ?? defaultDate ?? dateKey());
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? "");
  const [duration, setDuration] = useState(initial?.durationHours ?? 1);
  const [savedNotice, setSavedNotice] = useState("");
  const [effort, setEffort] = useState(Math.max(1, Math.min(5, Math.round(Math.max(initial?.mental ?? 15, initial?.physical ?? 5, initial?.social ?? 10) / 5))));
  const legacy = !!initial && (initial.category === "Assignment" || initial.category === "Class" || !!initial.routineId);
  const dated = legacy || scheduleType === "Fixed";
  const deadlineAllowed = category === "Assignment" || category === "Competition";
  const dates = Array.from({ length: range }, (_, i) => shiftDate(startDate, i)).filter(date => range === 1 || weekdays.includes(fromKey(date).getDay()));
  const lastDate = shiftDate(startDate, range - 1);
  const nameInvalid = !name.trim();
  const weekdaysInvalid = dated && !legacy && range > 1 && !dates.length;
  const deadlineInvalid = dated && deadlineAllowed && !!dueDate && dueDate < lastDate;
  const invalid = nameInvalid || (dated && (!startDate || weekdaysInvalid || deadlineInvalid));
  const estimatedLoads = () => {
    const mix: Record<string, { mental: number; physical: number; social: number }> = {
      Competition: { mental: 1, physical: 0.45, social: 0.65 }, Club: { mental: 0.65, physical: 0.25, social: 0.85 }, Job: { mental: 0.7, physical: 0.65, social: 0.65 }, Sport: { mental: 0.3, physical: 1, social: 0.35 }, Social: { mental: 0.35, physical: 0.2, social: 1 }, Personal: { mental: 0.55, physical: 0.35, social: 0.25 }, Assignment: { mental: 1, physical: 0.05, social: 0.05 }, Class: { mental: 0.85, physical: 0.1, social: 0.35 }, Routine: { mental: 0.6, physical: 0.4, social: 0.35 },
    };
    const selected = mix[category] ?? mix.Personal;
    return { mental: Math.round(effort * 5 * selected.mental), physical: Math.round(effort * 5 * selected.physical), social: Math.round(effort * 5 * selected.social) };
  };
  const loads = estimatedLoads();
  const draft = (): Commitment => ({ ...initial, id: initial?.id ?? createCommitmentId(name), name: name.trim(), category, scheduleType: legacy ? undefined : scheduleType, startDate: dated ? startDate : scheduleType === "Daily routine" ? initial?.startDate ?? dateKey() : undefined, endDate: dated && !legacy ? shiftDate(startDate, range - 1) : undefined, weekdays: dated && range > 1 ? weekdays : undefined, dueDate: dated && deadlineAllowed ? dueDate || undefined : undefined, schedule: dated ? `${prettyDate(startDate)}${range > 1 ? ` · ${range} days` : ""}` : scheduleType === "Daily routine" ? "Every day" : "Set up later", flexibility: legacy ? flexibility : scheduleType === "Fixed" ? "Fixed" : "Flexible", durationHours: duration, time: duration * 5, ...loads });
  const effortDescription = effortDescriptions[effort];
  return <ScrollPage><PageHeader eyebrow={eyebrow} title={title} body={body} onBack={onBack} /><View style={[s.content, styles.commitmentContent]}>
    {returnAction ? <AppButton text={returnAction.text} variant="quiet" icon="calendar" onPress={returnAction.onPress} /> : null}
    {savedNotice ? <InlineNotice title="Commitment added" body={savedNotice} /> : null}
    {initial?.scheduleType && <Text style={s.bodySmallMuted}>Editing changes the whole commitment and resets any individual-day adjustments. To change just one day, use its Plan options instead.</Text>}
    <CommitmentSection title="WHAT IS IT?">
      <View>
        <FormField label="Commitment name" value={name} onChangeText={setName} onBlur={() => setNameTouched(true)} accessibilityHint={nameTouched && nameInvalid ? "Enter a name to continue" : undefined} returnKeyType="done" blurOnSubmit placeholder="e.g. Hackathon practice" style={nameTouched && nameInvalid ? styles.inputError : undefined} />
        {nameTouched && nameInvalid ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.validationText}>Enter a commitment name.</Text> : null}
      </View>
      {legacy ? <Text style={styles.legacyCategory}>{category}</Text> : <>
        <SegmentedChoices label="Category" choices={["Competition", "Club", "Job", "Sport", "Social", "Personal"]} selected={category} onSelect={setCategory} />
        <Text style={styles.helperText}>Helps Santai estimate the kind of energy this may use.</Text>
        <View style={styles.moduleHelper}>
          <Text style={styles.moduleHelperText}>Adding a class or assignment?</Text>
          {onManageModules ? <Pressable accessibilityRole="link" accessibilityLabel="Manage modules and assignments" onPress={onManageModules} hitSlop={8}><Text style={styles.moduleHelperLink}>Manage modules →</Text></Pressable> : <Text style={styles.moduleHelperText}>Manage it from Modules & assignments.</Text>}
        </View>
      </>}
    </CommitmentSection>

    <CommitmentSection title="WHEN DOES IT HAPPEN?">
      {!legacy ? <>
        <SegmentedChoices label="How does this fit your week?" choices={["Fixed", "Flexible", "Daily routine"]} selected={scheduleType} onSelect={value => setScheduleType(value as NonNullable<Commitment["scheduleType"]>)} />
        <Text accessibilityLiveRegion="polite" style={styles.scheduleModeDescription}><Text style={styles.scheduleModeName}>{scheduleType}</Text> · {scheduleModeDescriptions[scheduleType]}</Text>
      </> : null}

      {dated ? <>
        <DateField label={legacy ? "Date" : "Start date"} value={startDate} onChange={setStartDate} />
        {!legacy ? <>
          <SegmentedChoices label="How long will this repeat?" choices={["One day", "1 week", "2 weeks", "4 weeks"]} selected={range === 1 ? "One day" : range === 7 ? "1 week" : range === 14 ? "2 weeks" : range === 28 ? "4 weeks" : ""} onSelect={value => setRange(value === "One day" ? 1 : parseInt(value) * 7)} />
          {range > 1 ? <Text style={styles.dateRange}>{prettyDate(startDate)} – {prettyDate(lastDate)}</Text> : null}
          {range > 1 ? <View style={styles.weekdayGroup}>
            <Text style={styles.fieldEyebrow}>ACTIVE DAYS</Text>
            <View style={styles.weekdayRow}>{commitmentWeekdays.map(day => {
              const selected = weekdays.includes(day.value);
              return <Pressable key={day.value} accessibilityRole="checkbox" accessibilityLabel={day.label} accessibilityState={{ checked: selected }} aria-checked={selected} onPress={() => setWeekdays(current => selected ? current.filter(value => value !== day.value) : [...current, day.value])} style={({ pressed }) => [styles.weekdayChip, selected && styles.weekdayChipSelected, pressed && styles.pressed]}>
                <View style={styles.weekdayCheck}>{selected ? <MarginIcon name="check" color={colors.white} size={12} strokeWidth={2.5} /> : null}</View>
                <Text style={[styles.weekdayText, selected && styles.weekdayTextSelected]}>{day.label}</Text>
              </Pressable>;
            })}</View>
            {weekdaysInvalid ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.validationText}>Choose at least one active day.</Text> : null}
          </View> : null}
        </> : null}
        {deadlineAllowed ? <DateField label={category === "Competition" ? "Submission deadline (optional)" : "Due date (optional)"} value={dueDate} onChange={setDueDate} optional /> : null}
        {deadlineInvalid ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.validationText}>Choose a deadline on or after the last planned day.</Text> : null}
      </> : scheduleType === "Flexible" ? <View style={styles.scheduleNote}><Text style={styles.scheduleNoteTitle}>DECIDE LATER</Text><Text style={styles.scheduleNoteBody}>Saved to Plan without affecting a day’s load until dates are chosen.</Text></View> : <View style={styles.scheduleNote}><Text style={styles.scheduleNoteTitle}>REPEATS EVERY DAY</Text><Text style={styles.scheduleNoteBody}>Starts today and repeats daily. No weekday setup needed.</Text></View>}
    </CommitmentSection>

    <CommitmentSection title="WHAT WILL IT TAKE?">
      <ValueSlider label="Time needed each time" min={0.25} max={8} step={0.25} value={duration} valueText={commitmentDuration(duration)} accessibilityText={`${commitmentDuration(duration)} per occurrence`} showHint={false} onChange={setDuration} />
      <View style={styles.effortGroup}>
        <ValueSlider label="Overall effort" min={1} max={5} step={1} value={effort} valueText={`${effort} / 5 · ${effortDescription}`} accessibilityText={`${effort} out of 5. ${effortDescription}`} showHint={false} onChange={setEffort} />
        <Text style={styles.effortAnchors}>1 Light · 3 Moderate · 5 Very demanding</Text>
      </View>
      <Card tone="mint" style={styles.estimateCard}>
        <Text style={styles.estimateEyebrow}>SANTAI’S ESTIMATE</Text>
        <View style={styles.estimateRow}>{(["mental", "physical", "social"] as const).map(kind => <View key={kind} accessible accessibilityLabel={`${capacityMeta[kind].label}, ${loads[kind]}`} style={[styles.estimateChip, { borderTopColor: capacityMeta[kind].color }]}><Text style={styles.estimateLabel}>{capacityMeta[kind].label}</Text><Text style={styles.estimateValue}>{loads[kind]}</Text></View>)}</View>
        <Text style={styles.estimateCaption}>Estimated from the category and your overall effort.</Text>
      </Card>
    </CommitmentSection>

    <AppButton text={submitText} disabled={invalid} onPress={() => onSubmit(draft())} />
    {!initial && onAddAnother ? <AppButton text="Add another" accessibilityLabel="Add this commitment and enter another" variant="secondary" disabled={invalid} onPress={() => { onAddAnother(draft()); setSavedNotice(name.trim() + " is saved. Add your next commitment below."); setName(""); setNameTouched(false); setDueDate(""); }} /> : null}
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
  setupRoadmap: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 6, paddingBottom: 2 },
  roadmapStep: { minWidth: 0, flex: 1, alignItems: "center", gap: 5 },
  roadmapNumber: { width: 22, height: 22, borderRadius: 11, overflow: "hidden", backgroundColor: colors.softMint, fontFamily: fonts.bold, fontSize: 11, lineHeight: 22, color: colors.forest, textAlign: "center" },
  roadmapLabel: { fontFamily: fonts.medium, fontSize: 10, lineHeight: 14, color: colors.textMuted, textAlign: "center" },
  centerCaption: { ...type.caption, color: colors.textMuted, textAlign: "center" },
  quickPickGroup: { gap: 7, paddingTop: 7 },
  groupTitle: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 15, letterSpacing: 0.9, color: colors.forest },
  quickPickList: { gap: 7 },
  quickPick: { minHeight: layout.touchTarget, flexDirection: "row", alignItems: "center", gap: 11, borderWidth: 1, borderColor: colors.outlineSoft, backgroundColor: colors.paper, borderRadius: 13, paddingHorizontal: 13, paddingVertical: 9 },
  quickPickSelected: { borderColor: colors.forest, backgroundColor: colors.softMint },
  quickPickCheck: { width: 21, height: 21, borderRadius: 7, borderWidth: 1.5, borderColor: colors.outline, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center" },
  quickPickCheckSelected: { borderColor: colors.forest, backgroundColor: colors.forest },
  quickPickText: { minWidth: 0, flex: 1, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, color: colors.ink },
  quickPickTextSelected: { fontFamily: fonts.bold, color: colors.forest },
  selectionHelp: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 17, color: colors.coralDark, textAlign: "center", marginTop: 4 },
  selectionCount: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 17, color: colors.forest, textAlign: "center", marginTop: 4 },
  baselineSurface: { gap: 0, paddingVertical: 4 },
  activityEditor: { gap: 8, paddingVertical: 15 },
  activityEditorDivider: { borderTopWidth: 1, borderTopColor: colors.outlineSoft },
  activityTitle: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 23, color: colors.ink },
  hoursTotal: { ...type.label, color: colors.forest },
  baselineSummary: { flexDirection: "row", alignItems: "center", gap: 11, borderRadius: 14, borderWidth: 1, borderColor: colors.outlineSoft, backgroundColor: colors.paper, paddingHorizontal: 13, paddingVertical: 12 },
  summaryIcon: { width: 35, height: 35, borderRadius: 12, backgroundColor: colors.softMint, alignItems: "center", justifyContent: "center" },
  summaryTitle: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 19, color: colors.ink },
  summaryBody: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.textMuted, marginTop: 1 },
  transitionCopy: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.textMuted, textAlign: "center", paddingHorizontal: 8 },
  question: { fontSize: 17, lineHeight: 23, marginTop: 8 },
  optionStack: { gap: 9, marginTop: 14 },
  optionCardAccent: { borderColor: colors.forest, backgroundColor: colors.softMint },
  upcomingAction: { minHeight: 78, flexDirection: "row", alignItems: "center", gap: 11, borderRadius: 16, borderWidth: 1, borderColor: colors.outlineSoft, backgroundColor: colors.paper, paddingHorizontal: 13, paddingVertical: 12 },
  upcomingActionIcon: { width: 39, height: 39, borderRadius: 13, backgroundColor: colors.canvas, alignItems: "center", justifyContent: "center" },
  upcomingActionIconAccent: { backgroundColor: colors.paper },
  actionTitleRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
  actionTitle: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20, color: colors.ink },
  actionBody: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.textMuted, marginTop: 2 },
  actionBadge: { fontFamily: fonts.bold, fontSize: 9, lineHeight: 13, color: colors.forest, backgroundColor: colors.mint, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2, overflow: "hidden" },
  readyCard: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 11, borderRadius: 18, backgroundColor: colors.softMint, borderWidth: 1, borderColor: colors.mint, padding: 15 },
  readyIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.forest, alignItems: "center", justifyContent: "center" },
  readyTitle: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 22, color: colors.forest },
  readyBody: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.textMuted, marginTop: 2 },
  summaryFacts: { width: "100%", flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 2 },
  summaryFact: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 15, color: colors.forest, backgroundColor: colors.paper, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, overflow: "hidden" },
  optionalHeading: { gap: 3, paddingTop: 2 },
  optionalBody: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.textMuted },
  pressed: { opacity: 0.72 },
  importPanel: { height: 178, borderRadius: 14, borderWidth: 1, borderColor: colors.outlineSoft, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center", gap: 9, padding: 20 },
  importNumber: { fontFamily: fonts.bold, fontSize: 46, lineHeight: 50, color: colors.forest },
  center: { textAlign: "center" },
  commitmentContent: { gap: 22, paddingBottom: 32 },
  commitmentSection: { gap: 12 },
  commitmentSectionTitle: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 17, letterSpacing: 1, color: colors.forest },
  helperText: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.textMuted, marginTop: -5 },
  legacyCategory: { fontFamily: fonts.semiBold, fontSize: 14, lineHeight: 20, color: colors.forest },
  moduleHelper: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 5, marginTop: -2 },
  moduleHelperText: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.textMuted },
  moduleHelperLink: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 18, color: colors.forest, textDecorationLine: "underline" },
  scheduleModeDescription: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.textMuted, marginTop: -4 },
  scheduleModeName: { fontFamily: fonts.semiBold, color: colors.ink },
  scheduleNote: { borderRadius: 12, backgroundColor: colors.softMint, paddingHorizontal: 13, paddingVertical: 11, gap: 2 },
  scheduleNoteTitle: { fontFamily: fonts.bold, fontSize: 10, lineHeight: 14, letterSpacing: 0.8, color: colors.forest },
  scheduleNoteBody: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.ink },
  dateRange: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.ink, textAlign: "center", marginTop: -4 },
  fieldEyebrow: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 15, letterSpacing: 0.8, color: colors.textMuted },
  weekdayGroup: { gap: 8 },
  weekdayRow: { flexDirection: "row", alignItems: "stretch", gap: 4 },
  weekdayChip: { minWidth: 0, minHeight: 52, flex: 1, borderRadius: 9, borderWidth: 1, borderColor: colors.outlineSoft, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center", gap: 1, paddingHorizontal: 1, paddingVertical: 5 },
  weekdayChipSelected: { borderColor: colors.forest, backgroundColor: colors.forest },
  weekdayCheck: { height: 14, alignItems: "center", justifyContent: "center" },
  weekdayText: { fontFamily: fonts.medium, fontSize: 10, lineHeight: 14, color: colors.ink },
  weekdayTextSelected: { fontFamily: fonts.bold, color: colors.white },
  validationText: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 17, color: colors.coralDark, marginTop: 5 },
  inputError: { borderColor: colors.coral, borderWidth: 1.5 },
  effortGroup: { gap: 2 },
  effortAnchors: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, color: colors.textMuted, textAlign: "center" },
  estimateCard: { gap: 10, padding: 13 },
  estimateEyebrow: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 15, letterSpacing: 0.8, color: colors.forest },
  estimateRow: { flexDirection: "row", gap: 6 },
  estimateChip: { minWidth: 0, flex: 1, borderRadius: 10, borderTopWidth: 3, backgroundColor: colors.paper, paddingHorizontal: 5, paddingVertical: 8, alignItems: "center", gap: 1 },
  estimateLabel: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 15, color: colors.textMuted },
  estimateValue: { fontFamily: fonts.number, fontSize: 18, lineHeight: 22, color: colors.ink },
  estimateCaption: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, color: colors.textMuted },
});
