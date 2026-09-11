import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { AppButton, Card, CheckboxRow, FormField, PageHeader, ScrollPage, SectionLabel, SegmentedChoices } from "@/components/MarginUI";
import { ValueSlider } from "@/components/PlannerControls";
import { StressFaceIcon } from "@/components/MarginIcon";
import { DailyCheckIn } from "@/models/margin";
import { Module } from "@/models/planner";
import { screenStyles as s } from "./screenStyles";
import { colors } from "@/theme/tokens";

export function CurrentCheckIn({ initial, modules, hasSport, sportPlanned, onClose, onSave, onPlan }: { initial?: DailyCheckIn; modules: Module[]; hasSport: boolean; sportPlanned: boolean; onClose: () => void; onSave: (value: DailyCheckIn, goToPlan?: boolean) => void; onPlan: () => void }) {
  const [stress, setStress] = useState(initial?.stress ?? 1);
  const [note, setNote] = useState(initial?.note ?? "");
  const [assignmentToday, setAssignmentToday] = useState<string>(initial ? Object.keys(initial.assignments ?? {}).length ? "Yes" : "No" : "");
  const [assignments, setAssignments] = useState<Record<string, number>>(initial?.assignments ?? {});
  const [sport, setSport] = useState((initial?.sportToday ?? sportPlanned) ? "Yes" : "No");
  const choices = ["Low", "Steady", "Heavy", "High", "Too much"];
  const tones = [colors.forest, colors.forest, colors.amber, colors.coral, colors.coralDark];
  const available = modules.filter(m => m.assignment);
  const invalid = assignmentToday === "" || (assignmentToday === "Yes" && !Object.keys(assignments).length);
  const save = (goToPlan = false) => onSave({ stress, note: note.trim(), causes: [], savedAt: new Date().toISOString(), assignments: assignmentToday === "Yes" ? assignments : {}, sportToday: hasSport ? sport === "Yes" : undefined }, goToPlan);
  return <Modal visible animationType="slide" onRequestClose={onClose}><ScrollPage><PageHeader eyebrow="Daily check-in" title="A moment for yourself" body="Tell us how today feels and what you plan to do." onBack={onClose} /><View style={s.content}>
    <SectionLabel>Stress right now</SectionLabel><Card><View style={{ flexDirection: "row", gap: 4 }}>{choices.map((label, index) => <Pressable key={label} accessibilityRole="radio" accessibilityLabel={`${label} stress`} accessibilityState={{ selected: index === stress }} aria-checked={index === stress} onPress={() => setStress(index)} style={{ flex: 1, minHeight: 100, alignItems: "center", gap: 10, paddingTop: 5 }}><View style={{ width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", borderWidth: index === stress ? 2 : 1, borderColor: index === stress ? tones[index] : colors.outlineSoft, backgroundColor: colors.canvas }}><StressFaceIcon size={28} level={index} color={tones[index]} /></View><Text style={[s.bodySmall, { textAlign: "center" }]}>{label}</Text></Pressable>)}</View></Card>
    <SegmentedChoices label="Do you plan to work on an assignment today?" choices={["Yes", "No"]} selected={assignmentToday} onSelect={setAssignmentToday} />
    {assignmentToday === "Yes" && <><Text style={s.bodySmallMuted}>Choose a module and the percentage of the assignment you aim to work on today. This is a plan, not a completion report.</Text>{available.map(m => <Card key={m.id} style={{ gap: 12 }}><CheckboxRow label={m.name} selected={m.id in assignments} onPress={() => setAssignments(current => { const next = { ...current }; if (m.id in next) delete next[m.id]; else next[m.id] = 10; return next; })} />{m.id in assignments && <ValueSlider label="Planned progress today" min={5} max={100} step={5} suffix="%" value={assignments[m.id]} onChange={v => setAssignments(current => ({ ...current, [m.id]: v }))} />}</Card>)}{!available.length && <><Text style={s.body}>No assignments are set up yet. Add one from your modules in Plan.</Text><AppButton text="Go to Plan to add assignments" variant="secondary" onPress={onPlan} /></>}</>}
    {hasSport && <><SegmentedChoices label="Do you have gym or training today?" choices={["Yes", "No"]} selected={sport} onSelect={setSport} /><Text style={s.caption}>Your routine says {sportPlanned ? "training is planned" : "no training is planned"} today. This answer updates today only.</Text></>}
    <FormField label="Daily diary (optional)" value={note} onChangeText={setNote} multiline placeholder="Let it out. What’s on your mind today?" /><Text style={s.caption}>Your diary stays on this device and does not create commitments.</Text>
    <AppButton text="Save check-in" disabled={invalid} onPress={() => save()} /><AppButton text="Save & open Plan" variant="secondary" disabled={invalid} onPress={() => save(true)} /><AppButton text="Close without saving" variant="quiet" onPress={onClose} />
  </View></ScrollPage></Modal>;
}
