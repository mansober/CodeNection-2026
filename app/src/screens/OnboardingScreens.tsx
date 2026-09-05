import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";

import {
  AppButton,
  Card,
  CheckboxRow,
  ChoicePill,
  CompactStepper,
  FormField,
  ImpactSelector,
  InlineNotice,
  MarginMark,
  PageHeader,
  ProgressBar,
  ScrollPage,
  SectionLabel,
  SegmentedChoices,
} from "@/components/MarginUI";
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
  spareHourValues,
  weeklyHours,
} from "@/models/margin";
import { colors, fonts, type } from "@/theme/tokens";
import { screenStyles as s } from "@/screens/screenStyles";

export function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <ScrollPage contentStyle={styles.welcomePage}>
      <View style={styles.brandRow}>
        <MarginMark size={24} />
        <Text style={styles.brandName}>MARGIN</Text>
      </View>
      <View style={styles.welcomeHero}>
        <Text accessibilityRole="header" style={styles.display}>Know the cost{"\n"}before you say yes.</Text>
        <Text style={styles.lead}>A weekly capacity planner for classes, clubs, work, and the rest of your life.</Text>
        <View style={styles.capacitySculpture} accessibilityLabel="Four capacity dimensions: Time, Mental, Physical and Social">
          {[
            ["T", colors.forest, 66],
            ["M", colors.coral, 92],
            ["P", colors.softAmber, 58],
            ["S", "#E9E6F8", 76],
          ].map(([label, color, height]) => (
            <View key={String(label)} style={[styles.sculptureBar, { backgroundColor: String(color), height: Number(height) }]}>
              <Text style={[styles.sculptureLabel, { color: label === "T" || label === "M" ? colors.white : colors.ink }]}>{label}</Text>
            </View>
          ))}
        </View>
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
              <CompactStepper label="Length each time" value={durationOptions.find((option) => option[1] === entry.durationHours)?.[0] ?? "1 hr"} onDecrease={() => adjust(item.id, "durationHours", -1)} onIncrease={() => adjust(item.id, "durationHours", 1)} />
              <CompactStepper label="Times each week" value={frequencyOptions.find((option) => option[1] === entry.timesPerWeek)?.[0] ?? "Once"} onDecrease={() => adjust(item.id, "timesPerWeek", -1)} onIncrease={() => adjust(item.id, "timesPerWeek", 1)} />
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
  mental: ["Still sharp", "Fine—manageable", "Drained, but okay tomorrow", "Completely done"],
  physical: ["Could do more", "Fine", "Sore and tired", "Wiped out for days"],
  social: ["Energised", "Fine either way", "A bit worn out", "Need real alone time"],
  time: spareHourValues.map((hours, index) => [`Almost none`, `A few hours`, `A decent amount`, `Plenty of room`][index] + ` · ${hours} h`),
};

function feelQuestion(kind: CapacityKind, entries: Record<string, RoutineEntry>) {
  const total = Object.values(entries).reduce((sum, entry) => sum + weeklyHours(entry), 0);
  if (kind === "mental") return `After a normal ${formatHours(total)} week, how mentally clear are you?`;
  if (kind === "physical") return "After your usual physical commitments, how does your body feel?";
  if (kind === "social") return "After the usual amount of people-time, what do you have left?";
  return "After everything is counted, how much usable time is normally left?";
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
      <PageHeader eyebrow={`Personal limit ${pageIndex + 1} of ${total}`} title={isRecovery ? "How much room helps you recover?" : "How does a normal week leave you?"} body={`${selectedIds.length} recurring ${selectedIds.length === 1 ? "schedule" : "schedules"} gave you ${total} short questions. One question appears per page.`} onBack={back} />
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

type ImportState = "idle" | "loading" | "done" | "error";

export function ImportTimetableScreen({ originalHours, onClassHoursChanged, onBack, onContinue }: { originalHours: number; onClassHoursChanged: (hours: number) => void; onBack: () => void; onContinue: () => void }) {
  const [baselineOriginal] = useState(originalHours);
  const [state, setState] = useState<ImportState>("idle");
  const [filename, setFilename] = useState("");
  const [applied, setApplied] = useState(true);

  useEffect(() => {
    if (state !== "loading") return;
    const timer = setTimeout(() => {
      setApplied(true);
      onClassHoursChanged(18);
      setState("done");
    }, 750);
    return () => clearTimeout(timer);
  }, [state, onClassHoursChanged]);

  const startImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ["image/png", "image/jpeg", "text/calendar"], copyToCacheDirectory: true });
      if (result.canceled) return;
      const pickedName = result.assets[0]?.name ?? "";
      if (!/\.(png|jpe?g|ics)$/i.test(pickedName)) {
        setFilename(pickedName);
        setState("error");
        return;
      }
      setFilename(pickedName);
      setState("loading");
    } catch {
      setState("error");
    }
  };
  const useDemo = () => { setFilename("semester-timetable.png"); setState("loading"); };
  const toggleApplied = () => {
    const next = !applied;
    setApplied(next);
    onClassHoursChanged(next ? 18 : baselineOriginal);
  };

  return (
    <ScrollPage>
      <PageHeader eyebrow="Import timetable" title="Bring in fixed classes first" body="Use a PNG, JPG, or ICS timetable. You review every detected change." onBack={onBack} />
      <View style={s.content}>
        <View style={styles.importPanel} accessibilityLiveRegion="polite">
          {state === "loading" ? <><ActivityIndicator color={colors.forest} size="large" /><Text style={s.label}>Reading your timetable…</Text></> : null}
          {state === "done" ? <><Text style={styles.importNumber}>6</Text><Text style={s.bodySmallMuted}>weekly classes found</Text></> : null}
          {state === "error" ? <><Text style={[s.label, { color: colors.coral }]}>We could not read that file</Text><Text style={[s.bodySmallMuted, styles.center]}>Choose a PNG, JPG, or ICS file, or use the demo timetable.</Text></> : null}
          {state === "idle" ? <><MarginIcon name="calendar" color={colors.forest} size={34} /><Text style={s.eyebrow}>TIMETABLE FILE</Text><Text style={s.caption}>PNG, JPG, or ICS</Text></> : null}
        </View>
        {filename ? <Card><Text style={s.eyebrow}>SELECTED FILE</Text><Text style={[s.label, { marginTop: 5 }]}>{filename}</Text></Card> : null}
        {state === "done" ? (
          <>
            <Card>
              <Text style={s.eyebrow}>FOUND</Text>
              <Text style={s.label}>Data Structures · 3 sessions</Text>
              <Text style={s.label}>Artificial Intelligence · 3 sessions</Text>
            </Card>
            <InlineNotice title={applied ? `Classes updated from ${formatHours(baselineOriginal)} to 18 h` : `Classes restored to ${formatHours(baselineOriginal)}`} body="The original answer is retained, so this change is reversible." />
            <AppButton text={applied ? "Undo timetable update" : "Use timetable hours"} variant="secondary" onPress={toggleApplied} />
            <AppButton text="Continue to commitments" onPress={onContinue} />
          </>
        ) : (
          <>
            <AppButton text={state === "error" ? "Choose another file" : "Choose timetable file"} onPress={startImport} disabled={state === "loading"} />
            <AppButton text="Use demo timetable" variant="quiet" onPress={useDemo} disabled={state === "loading"} />
          </>
        )}
      </View>
    </ScrollPage>
  );
}

export type CommitmentDraft = Omit<Commitment, "id" | "time" | "mental" | "physical" | "social"> & { time: number; mental: number; physical: number; social: number };

export function CommitmentForm({ eyebrow, title, body, initial, submitText, onBack, onSubmit, secondaryAction }: { eyebrow: string; title: string; body: string; initial?: Commitment; submitText: string; onBack: () => void; onSubmit: (commitment: Commitment) => void; secondaryAction?: { text: string; onPress: () => void } }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? "Club");
  const [flexibility, setFlexibility] = useState(initial?.flexibility ?? "Somewhat flexible");
  const [schedule, setSchedule] = useState(initial?.schedule ?? "This week");
  const [impact, setImpact] = useState({
    time: Math.max(1, Math.round((initial?.time ?? 12) / 5)),
    mental: Math.max(1, Math.round((initial?.mental ?? 16) / 5)),
    physical: Math.max(1, Math.round((initial?.physical ?? 8) / 5)),
    social: Math.max(1, Math.round((initial?.social ?? 12) / 5)),
  });
  const submit = () => onSubmit({
    id: initial?.id ?? createCommitmentId(name), name: name.trim(), category, schedule, flexibility,
    time: impact.time * 5, mental: impact.mental * 5, physical: impact.physical * 5, social: impact.social * 5,
  });

  return (
    <ScrollPage>
      <PageHeader eyebrow={eyebrow} title={title} body={body} onBack={onBack} />
      <View style={s.content}>
        <FormField label="Commitment" value={name} onChangeText={setName} placeholder="e.g. Lab report" />
        <SegmentedChoices label="Category" choices={["Class", "Club", "Job", "Sport", "Social"]} selected={category} onSelect={setCategory} />
        <SegmentedChoices label="How locked in is it?" choices={["Fixed", "Somewhat flexible", "Flexible"]} selected={flexibility} onSelect={setFlexibility} />
        <FormField label="When?" value={schedule} onChangeText={setSchedule} placeholder="Friday · 5:00 pm" />
        <SectionLabel>How much will it draw on?</SectionLabel>
        {(Object.keys(capacityMeta) as CapacityKind[]).map((kind) => <ImpactSelector key={kind} label={capacityMeta[kind].label} color={capacityMeta[kind].color} value={impact[kind]} onChange={(value) => setImpact((current) => ({ ...current, [kind]: value }))} />)}
        {secondaryAction ? <AppButton text={secondaryAction.text} variant="secondary" onPress={secondaryAction.onPress} /> : null}
        <AppButton text={submitText} disabled={!name.trim()} onPress={submit} />
      </View>
    </ScrollPage>
  );
}

export function AddCommitmentOnboardingScreen({ onBack, onContinue }: { onBack: () => void; onContinue: (commitment: Commitment) => void }) {
  return <CommitmentForm eyebrow="Add manually" title="Add one commitment" body="Add a named deadline, shift, event, or competition. Your routine is already counted." submitText="Add and continue" onBack={onBack} onSubmit={onContinue} />;
}

export function AnythingElseScreen({ initialNote, onBack, onContinue }: { initialNote: string; onBack: () => void; onContinue: (note: string) => void }) {
  const [note, setNote] = useState(initialNote);
  const [reviewed, setReviewed] = useState(false);
  return (
    <ScrollPage>
      <PageHeader eyebrow="Optional context" title="Anything else about this week?" body="This note can flag a conflict, but it never changes your structured answers." onBack={onBack} />
      <View style={s.content}>
        <FormField label="Weekly context" value={note} onChangeText={(value) => { setNote(value); setReviewed(false); }} placeholder="e.g. I help at home most Sunday mornings…" multiline />
        {reviewed ? <InlineNotice title="One addition to review" body="Sunday family duty · 2 hours suggested. Your baseline was not changed." /> : null}
        {note.trim() && !reviewed ? <AppButton text="Review this note" onPress={() => setReviewed(true)} /> : null}
        <AppButton text="Continue to dashboard" variant={reviewed || !note.trim() ? "primary" : "secondary"} onPress={() => onContinue(note.trim())} />
        <Text style={styles.centerCaption}>This step is optional; leaving it blank adds nothing.</Text>
      </View>
    </ScrollPage>
  );
}

const styles = StyleSheet.create({
  welcomePage: { paddingHorizontal: 24, paddingTop: 22, paddingBottom: 24, justifyContent: "space-between", minHeight: 680 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  brandName: { ...type.eyebrow, color: colors.forest, letterSpacing: 2.3 },
  welcomeHero: { gap: 18, marginVertical: 44 },
  display: { ...type.display, color: colors.ink },
  lead: { ...type.body, color: colors.textMuted, maxWidth: 420 },
  capacitySculpture: { height: 108, flexDirection: "row", alignItems: "flex-end", gap: 7, marginTop: 12 },
  sculptureBar: { flex: 1, borderRadius: 5, padding: 9, justifyContent: "flex-end" },
  sculptureLabel: { fontFamily: fonts.bold, fontSize: 18 },
  welcomeFooter: { gap: 12 },
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
