import { useState, type PropsWithChildren } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { MarginIcon, StressFaceIcon } from "@/components/MarginIcon";
import { AppButton, Card, FormField, PageHeader, ScrollPage } from "@/components/MarginUI";
import { ValueSlider } from "@/components/PlannerControls";
import { DailyCheckIn } from "@/models/margin";
import { Module } from "@/models/planner";
import { colors, fonts, layout, type } from "@/theme/tokens";
import { screenStyles as s } from "./screenStyles";

type Choice = { label: string; value: string };

function CheckInGroup({ label, children }: PropsWithChildren<{ label: string }>) {
  return <View style={styles.group}>
    <Text accessibilityRole="header" style={styles.groupLabel}>{label}</Text>
    {children}
  </View>;
}

function BinaryChoices({ label, choices, selected, onSelect }: { label: string; choices: Choice[]; selected: string; onSelect: (value: string) => void }) {
  return <View style={styles.question}>
    <Text style={styles.questionLabel}>{label}</Text>
    <View style={styles.binaryRow}>
      {choices.map(choice => {
        const active = selected === choice.value;
        return <Pressable
          key={choice.value}
          accessibilityRole="radio"
          accessibilityLabel={choice.label}
          accessibilityState={{ selected: active }}
          aria-checked={active}
          onPress={() => onSelect(choice.value)}
          style={({ pressed }) => [styles.binaryChoice, active && styles.binaryChoiceSelected, pressed && styles.pressed]}
        >
          {active ? <MarginIcon name="check" size={16} color={colors.forest} strokeWidth={2.4} /> : null}
          <Text style={[styles.binaryText, active && styles.binaryTextSelected]}>{choice.label}</Text>
        </Pressable>;
      })}
    </View>
  </View>;
}

export function CurrentCheckIn({ initial, modules, hasSport, sportPlanned, onClose, onSave, onPlan }: { initial?: DailyCheckIn; modules: Module[]; hasSport: boolean; sportPlanned: boolean; onClose: () => void; onSave: (value: DailyCheckIn, goToPlan?: boolean) => void; onPlan: () => void }) {
  const initialStress = initial?.stress ?? 1;
  const initialNote = initial?.note ?? "";
  const initialAssignmentToday = initial ? Object.keys(initial.assignments ?? {}).length ? "Yes" : "No" : "";
  const initialAssignments = initial?.assignments ?? {};
  const initialSport = (initial?.sportToday ?? sportPlanned) ? "Yes" : "No";
  const [stress, setStress] = useState(initialStress);
  const [note, setNote] = useState(initialNote);
  const [assignmentToday, setAssignmentToday] = useState<string>(initialAssignmentToday);
  const [assignments, setAssignments] = useState<Record<string, number>>(initialAssignments);
  const [sport, setSport] = useState(initialSport);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const choices = ["Low", "Steady", "Heavy", "High", "Too much"];
  const tones = [colors.forest, colors.forest, colors.amber, colors.coral, colors.coralDark];
  const available = modules.filter(module => module.assignment);
  const effectiveAssignments = assignmentToday === "Yes" ? assignments : {};
  const initialEffectiveAssignments = initialAssignmentToday === "Yes" ? initialAssignments : {};
  const invalid = assignmentToday === "" || (assignmentToday === "Yes" && !Object.keys(assignments).length);
  const dirty = stress !== initialStress
    || note !== initialNote
    || assignmentToday !== initialAssignmentToday
    || JSON.stringify(effectiveAssignments) !== JSON.stringify(initialEffectiveAssignments)
    || (hasSport && sport !== initialSport);

  const requestClose = () => {
    if (dirty) setConfirmDiscard(true);
    else onClose();
  };
  const save = (goToPlan = false) => onSave({
    stress,
    note: note.trim(),
    causes: [],
    savedAt: new Date().toISOString(),
    assignments: assignmentToday === "Yes" ? assignments : {},
    sportToday: hasSport ? sport === "Yes" : undefined,
  }, goToPlan);

  return <Modal visible animationType="slide" onRequestClose={requestClose}>
    <ScrollPage>
      <PageHeader eyebrow="Daily check-in" title="A moment for yourself" body="Tell us how today feels and what you plan to do." onBack={requestClose} />
      <View style={[s.content, styles.content]}>
        <CheckInGroup label="HOW ARE YOU FEELING?">
          <Text style={styles.questionLabel}>Stress right now</Text>
          <Card style={styles.stressCard}>
            <View style={styles.stressRow}>
              {choices.map((label, index) => {
                const active = index === stress;
                return <Pressable
                  key={label}
                  accessibilityRole="radio"
                  accessibilityLabel={`${label} stress`}
                  accessibilityState={{ selected: active }}
                  aria-checked={active}
                  onPress={() => setStress(index)}
                  style={({ pressed }) => [styles.stressChoice, active && styles.stressChoiceSelected, pressed && styles.pressed]}
                >
                  <View style={[styles.faceBox, { borderColor: active ? tones[index] : colors.outlineSoft, backgroundColor: active ? colors.mint : colors.canvas }]}>
                    <StressFaceIcon size={25} level={index} color={tones[index]} />
                    {active ? <View style={styles.faceCheck}><MarginIcon name="check" size={10} color={colors.white} strokeWidth={2.6} /></View> : null}
                  </View>
                  <Text numberOfLines={2} style={[styles.stressLabel, active && styles.stressLabelSelected]}>{label}</Text>
                </Pressable>;
              })}
            </View>
          </Card>
        </CheckInGroup>

        <CheckInGroup label="TODAY">
          <BinaryChoices label="Will you work on an assignment today?" choices={[{ label: "Yes", value: "Yes" }, { label: "No", value: "No" }]} selected={assignmentToday} onSelect={setAssignmentToday} />

          {assignmentToday === "Yes" ? <View style={styles.revealedArea}>
            <Text style={s.bodySmallMuted}>Choose what you plan to work on. Each target is the share of the whole assignment you intend to complete today.</Text>
            {available.length ? <View style={styles.assignmentList}>
              {available.map(module => {
                const selected = module.id in assignments;
                return <View key={module.id} style={styles.assignmentItem}>
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityLabel={`Work on ${module.name} assignment today`}
                    accessibilityState={{ checked: selected }}
                    aria-checked={selected}
                    onPress={() => setAssignments(current => {
                      const next = { ...current };
                      if (module.id in next) delete next[module.id];
                      else next[module.id] = 10;
                      return next;
                    })}
                    style={({ pressed }) => [styles.assignmentSelect, selected && styles.assignmentSelectSelected, pressed && styles.pressed]}
                  >
                    <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                      {selected ? <MarginIcon name="check" size={15} color={colors.white} strokeWidth={2.4} /> : null}
                    </View>
                    <View style={s.flex}>
                      <Text style={styles.assignmentName}>{module.name}</Text>
                      <Text style={s.caption}>Assignment</Text>
                    </View>
                  </Pressable>
                  {selected ? <ValueSlider
                    compact
                    label="Today’s target"
                    min={5}
                    max={100}
                    step={5}
                    suffix="%"
                    value={assignments[module.id]}
                    valueText={`${assignments[module.id]}% of assignment`}
                    accessibilityText={`Today's assignment target. ${assignments[module.id]} percent of assignment.`}
                    onChange={value => setAssignments(current => ({ ...current, [module.id]: value }))}
                  /> : null}
                </View>;
              })}
            </View> : <View style={styles.emptyAssignments}>
              <Text style={s.bodySmallMuted}>No assignments are set up yet.</Text>
              <AppButton text="Open Modules & assignments" variant="secondary" onPress={onPlan} />
            </View>}
          </View> : null}

          {hasSport ? <View style={styles.routineSection}>
            <Text style={styles.subsectionLabel}>GYM / TRAINING</Text>
            <Text style={s.bodySmallMuted}>{sportPlanned ? "Your routine includes training today." : "Your routine has no training scheduled today."}</Text>
            <BinaryChoices
              label="Are you training today?"
              choices={sportPlanned ? [{ label: "Yes", value: "Yes" }, { label: "No, not today", value: "No" }] : [{ label: "Yes, I’m training", value: "Yes" }, { label: "No", value: "No" }]}
              selected={sport}
              onSelect={setSport}
            />
            {!sportPlanned && sport === "Yes" ? <Text accessibilityLiveRegion="polite" style={styles.overrideText}>Added for today only. Your routine remains unchanged.</Text> : null}
            {sportPlanned && sport === "No" ? <Text accessibilityLiveRegion="polite" style={styles.overrideText}>Skipped for today only. Your routine remains unchanged.</Text> : null}
          </View> : null}
        </CheckInGroup>

        <CheckInGroup label="OPTIONAL REFLECTION">
          <FormField label="Daily diary (optional)" value={note} onChangeText={setNote} multiline style={styles.diaryInput} placeholder="Let it out. What’s on your mind today?" />
          <Text style={s.caption}>Your diary stays on this device and does not create commitments.</Text>
        </CheckInGroup>

        <View style={styles.actions}>
          <AppButton text="Save check-in" disabled={invalid} onPress={() => save()} />
          <AppButton text="Save & view Plan" variant="secondary" disabled={invalid} onPress={() => save(true)} />
          <Pressable accessibilityRole="button" accessibilityLabel="Close check-in without saving" onPress={requestClose} style={({ pressed }) => [styles.closeAction, pressed && styles.pressed]}>
            <Text style={styles.closeActionText}>Close without saving</Text>
          </Pressable>
        </View>
      </View>
    </ScrollPage>

    <Modal visible={confirmDiscard} transparent animationType="fade" onRequestClose={() => setConfirmDiscard(false)}>
      <View style={styles.modalOverlay}>
        <Card style={styles.discardDialog}>
          <Text accessibilityRole="header" style={s.title}>Discard today’s check-in?</Text>
          <Text style={s.bodySmallMuted}>Your unsaved answers and diary changes will be lost.</Text>
          <AppButton text="Keep editing" onPress={() => setConfirmDiscard(false)} />
          <AppButton text="Discard changes" variant="warning" onPress={onClose} />
        </Card>
      </View>
    </Modal>
  </Modal>;
}

const styles = StyleSheet.create({
  content: { gap: 0, paddingTop: 18 },
  group: { gap: 9, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: colors.outlineSoft },
  groupLabel: { ...type.eyebrow, color: colors.forest },
  question: { gap: 7 },
  questionLabel: { ...type.label, color: colors.ink },
  binaryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  binaryChoice: { minHeight: layout.touchTarget, minWidth: 116, flex: 1, borderRadius: 12, borderWidth: 1, borderColor: colors.outlineSoft, backgroundColor: colors.paper, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 12 },
  binaryChoiceSelected: { borderWidth: 2, borderColor: colors.forest, backgroundColor: colors.mint },
  binaryText: { ...type.bodySmall, color: colors.ink, textAlign: "center", flexShrink: 1 },
  binaryTextSelected: { fontFamily: fonts.bold, color: colors.forest },
  stressCard: { paddingHorizontal: 7, paddingVertical: 10 },
  stressRow: { flexDirection: "row", gap: 2 },
  stressChoice: { flex: 1, minWidth: 0, minHeight: 84, borderRadius: 11, alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 1, paddingVertical: 5 },
  stressChoiceSelected: { backgroundColor: colors.softMint },
  faceBox: { width: 43, height: 43, borderRadius: 22, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  faceCheck: { position: "absolute", top: -3, right: -3, width: 17, height: 17, borderRadius: 9, backgroundColor: colors.forest, alignItems: "center", justifyContent: "center" },
  stressLabel: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 15, color: colors.textMuted, textAlign: "center", minHeight: 30 },
  stressLabelSelected: { fontFamily: fonts.bold, color: colors.ink },
  revealedArea: { gap: 9, paddingTop: 10 },
  assignmentList: { gap: 8 },
  assignmentItem: { gap: 8, borderRadius: 14, borderWidth: 1, borderColor: colors.outlineSoft, backgroundColor: colors.paper, padding: 10 },
  assignmentSelect: { minHeight: layout.touchTarget, borderRadius: 10, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 9 },
  assignmentSelectSelected: { backgroundColor: colors.lavender },
  assignmentName: { ...type.label, color: colors.ink, flexShrink: 1 },
  checkbox: { width: 25, height: 25, borderRadius: 7, borderWidth: 1.5, borderColor: colors.outline, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  checkboxSelected: { borderColor: colors.violet, backgroundColor: colors.violet },
  emptyAssignments: { gap: 8 },
  routineSection: { gap: 8, paddingTop: 16, marginTop: 7, borderTopWidth: 1, borderTopColor: colors.outlineSoft },
  subsectionLabel: { ...type.eyebrow, color: colors.textMuted },
  overrideText: { ...type.bodySmall, color: colors.forest, fontFamily: fonts.medium },
  diaryInput: { minHeight: 76 },
  actions: { gap: 9, paddingTop: 16, paddingBottom: 4 },
  closeAction: { minHeight: layout.touchTarget, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  closeActionText: { ...type.label, color: colors.textMuted },
  modalOverlay: { flex: 1, backgroundColor: "rgba(4, 22, 16, 0.58)", justifyContent: "center", padding: 20 },
  discardDialog: { width: "100%", maxWidth: 440, alignSelf: "center", gap: 12 },
  pressed: { opacity: 0.68 },
});
