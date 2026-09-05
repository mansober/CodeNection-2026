import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { AppButton, BottomNav, Card, ChoicePill, FormField, InlineNotice, MarginMark, PageHeader, ScrollPage, SectionLabel } from "@/components/MarginUI";
import { MarginIcon, StressFaceIcon } from "@/components/MarginIcon";
import { DailyCheckIn, MainTab } from "@/models/margin";
import { colors, fonts, type } from "@/theme/tokens";
import { screenStyles as s } from "@/screens/screenStyles";

const stressChoices = [
  { label: "Low", color: colors.forest },
  { label: "Steady", color: colors.textMuted },
  { label: "Heavy", color: colors.amber },
  { label: "High", color: colors.coral },
  { label: "Too much", color: colors.coralDark },
];

const causes = ["Deadlines", "Sleep", "Money", "Conflict", "Too many plans"];

type CheckInModalProps = {
  visible: boolean;
  initial?: DailyCheckIn;
  onClose: () => void;
  onSave: (checkIn: DailyCheckIn) => void;
};

export function DailyCheckInModal({ visible, initial, onClose, onSave }: CheckInModalProps) {
  const [stress, setStress] = useState(initial?.stress ?? 2);
  const [note, setNote] = useState(initial?.note ?? "");
  const [selectedCauses, setSelectedCauses] = useState<string[]>(initial?.causes ?? ["Deadlines"]);

  const toggleCause = (cause: string) => setSelectedCauses((current) => current.includes(cause) ? current.filter((item) => item !== cause) : [...current, cause]);
  const save = () => onSave({ stress, causes: selectedCauses, note: note.trim(), savedAt: new Date().toISOString() });
  const closeWithoutSaving = () => {
    setStress(initial?.stress ?? 2);
    setNote(initial?.note ?? "");
    setSelectedCauses(initial?.causes ?? ["Deadlines"]);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeWithoutSaving}>
      <ScrollPage>
        <PageHeader eyebrow="Daily check-in" title="How are you holding up?" body="Capture what changed today—even when it is not on your calendar." onBack={closeWithoutSaving} />
        <View style={s.content}>
          <SectionLabel>Stress right now</SectionLabel>
          <Card style={styles.stressCard}>
            <View style={styles.stressRow}>
              {stressChoices.map((choice, index) => (
                <Pressable key={choice.label} accessibilityRole="radio" accessibilityState={{ selected: stress === index }} accessibilityLabel={`${choice.label} stress`} onPress={() => setStress(index)} style={styles.stressChoice}>
                  <View style={[styles.faceBox, { backgroundColor: `${choice.color}18`, borderColor: stress === index ? choice.color : colors.outlineSoft }]}><StressFaceIcon level={index} color={choice.color} size={28} /></View>
                  <Text numberOfLines={2} style={[styles.stressLabel, stress === index && styles.stressLabelSelected]}>{choice.label}</Text>
                </Pressable>
              ))}
            </View>
          </Card>
          <Text style={s.bodySmallMuted}>{stressChoices[stress].label} stress · {selectedCauses.length} {selectedCauses.length === 1 ? "cause" : "causes"} selected</Text>

          <SectionLabel>What is feeding it?</SectionLabel>
          <View style={styles.causeGrid}>
            {causes.map((cause, index) => <ChoicePill key={cause} text={cause} selected={selectedCauses.includes(cause)} onPress={() => toggleCause(cause)} style={index === causes.length - 1 ? styles.causeWide : styles.causeHalf} />)}
          </View>

          <FormField label="Anything irregular today?" value={note} onChangeText={setNote} placeholder="e.g. Slept badly, surprise group meeting…" multiline />
          <InlineNotice title="What this changes" body="High stress or poor sleep raises the priority of recovery suggestions. It never edits your commitments automatically." />
          <AppButton text="Save today’s check-in" onPress={save} />
          <AppButton text="Not now" variant="quiet" onPress={closeWithoutSaving} />
        </View>
      </ScrollPage>
    </Modal>
  );
}

const recoveryDays = [
  { day: "Today · Friday", load: 92, focus: "Mental + time", title: "Walk somewhere green", body: "25 minutes after your 2 pm class", tone: colors.forest },
  { day: "Saturday", load: 74, focus: "Social", title: "Protect the morning", body: "Keep two hours free before the mixer", tone: colors.violet },
  { day: "Sunday", load: 58, focus: "Physical", title: "Reset without rushing", body: "Laundry, food prep, then a quiet hour", tone: colors.amber },
  { day: "Monday", load: 81, focus: "Mental", title: "Start with one task", body: "Delay messages until the first study block ends", tone: colors.coral },
];

export function RecoveryScreen({ onTab, onBlockTime }: { onTab: (tab: MainTab) => void; onBlockTime: () => void }) {
  const [plannedDays, setPlannedDays] = useState<string[]>([]);
  const toggleDay = (day: string) => setPlannedDays((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day]);

  return (
    <ScrollPage bottomBar={<BottomNav selected="recovery" onSelect={onTab} />}>
      <PageHeader eyebrow="Recovery by day" title="Make recovery fit the load." body="Higher-load days get smaller, more protected suggestions." />
      <View style={s.content}>
        <Card tone="dark" style={styles.recoveryHero}>
          <View style={s.rowBetween}><Text style={styles.darkEyebrow}>BEST FIT FOR TODAY · 92% LOAD</Text><MarginMark light size={24} /></View>
          <Text style={s.whiteTitle}>Walk somewhere green</Text>
          <Text style={s.whiteBody}>25 minutes after your 2 pm class</Text>
          <AppButton text="Block today’s time" variant="secondary" onPress={onBlockTime} style={styles.heroButton} />
        </Card>

        <SectionLabel detail="next 4 days">Daily recovery map</SectionLabel>
        {recoveryDays.map((item) => {
          const planned = plannedDays.includes(item.day);
          return (
            <Pressable key={item.day} accessibilityRole="checkbox" accessibilityState={{ checked: planned }} onPress={() => toggleDay(item.day)} style={({ pressed }) => [styles.dayCard, planned && styles.dayCardSelected, pressed && styles.pressed]}>
              <View style={styles.dayTopRow}>
                <View style={s.flex}><Text style={s.eyebrow}>{item.day.toUpperCase()}</Text><Text style={styles.dayTitle}>{item.title}</Text></View>
                <View style={[styles.loadBadge, { borderColor: item.tone }]}><Text style={[styles.loadBadgeText, { color: item.tone }]}>{item.load}%</Text></View>
              </View>
              <View style={styles.loadTrack}><View style={[styles.loadFill, { width: `${item.load}%`, backgroundColor: item.tone }]} /></View>
              <Text style={s.bodySmallMuted}>{item.body}</Text>
              <View style={s.rowBetween}><Text style={[s.eyebrow, { color: item.tone }]}>{item.focus.toUpperCase()}</Text><Text style={styles.planState}>{planned ? "Planned" : "Add to plan"}</Text></View>
            </Pressable>
          );
        })}
        <InlineNotice title="If nothing feels doable" body="Choose five quiet minutes. That still counts." tone="amber" />
      </View>
    </ScrollPage>
  );
}

export function RebalancedWeekScreen({ onReturn }: { onReturn: () => void }) {
  return (
    <ScrollPage contentStyle={styles.successPage}>
      <View style={styles.successMark}><MarginIcon name="check" color={colors.forest} size={54} strokeWidth={2.2} /></View>
      <Text accessibilityRole="header" style={styles.successTitle}>Your week can breathe.</Text>
      <Text style={styles.successBody}>The plan now matches the space you have.</Text>
      <Card tone="dark" style={styles.successCapacity}><Text style={styles.darkEyebrow}>CAPACITY</Text><Text style={styles.successNumber}>90% → 76%</Text></Card>
      <View style={styles.changeList}>
        <ChangeRow title="Laundry" detail="Moved to Sunday morning" state="Moved" />
        <ChangeRow title="Study group" detail="Shortened to 45 minutes" state="Shorter" />
        <ChangeRow title="Recovery block" detail="Friday · 2:30 pm · 25 minutes" state="Added" />
      </View>
      <AppButton text="Return to dashboard" onPress={onReturn} style={styles.fullWidth} />
    </ScrollPage>
  );
}

function ChangeRow({ title, detail, state }: { title: string; detail: string; state: string }) {
  return <View style={styles.changeRow}><View style={s.flex}><Text style={s.label}>{title}</Text><Text style={s.bodySmallMuted}>{detail}</Text></View><View style={s.badge}><Text style={s.badgeText}>{state}</Text></View></View>;
}

const styles = StyleSheet.create({
  stressCard: { paddingHorizontal: 9, paddingVertical: 14 },
  stressRow: { flexDirection: "row", gap: 4 },
  stressChoice: { flex: 1, minHeight: 98, alignItems: "center", justifyContent: "space-between", paddingVertical: 3 },
  faceBox: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  stressLabel: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 17, color: colors.textMuted, textAlign: "center", minHeight: 36, paddingTop: 5 },
  stressLabelSelected: { fontFamily: fonts.semiBold, color: colors.ink },
  causeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  causeHalf: { width: "48.7%" },
  causeWide: { width: "100%" },
  recoveryHero: { gap: 9, padding: 20, borderRadius: 20 },
  darkEyebrow: { ...type.eyebrow, color: colors.mint },
  heroButton: { alignSelf: "flex-start", minWidth: 184, marginTop: 8 },
  dayCard: { minHeight: 174, borderRadius: 14, borderWidth: 1, borderColor: colors.outlineSoft, backgroundColor: colors.paper, padding: 16, gap: 12 },
  dayCardSelected: { borderColor: colors.forest, backgroundColor: colors.softMint },
  dayTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  dayTitle: { ...type.h3, color: colors.ink, marginTop: 4 },
  loadBadge: { minWidth: 54, minHeight: 38, borderRadius: 9, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  loadBadgeText: { ...type.label },
  loadTrack: { height: 8, borderRadius: 4, overflow: "hidden", backgroundColor: colors.outlineSoft },
  loadFill: { height: "100%", borderRadius: 4 },
  planState: { ...type.label, color: colors.forest },
  pressed: { opacity: 0.72 },
  successPage: { paddingHorizontal: 20, paddingTop: 58, paddingBottom: 28, alignItems: "center", gap: 14 },
  successMark: { width: 106, height: 106, borderRadius: 53, backgroundColor: colors.mint, alignItems: "center", justifyContent: "center" },
  successTitle: { ...type.h1, color: colors.ink, textAlign: "center", marginTop: 4 },
  successBody: { ...type.body, color: colors.textMuted, textAlign: "center" },
  successCapacity: { width: "100%", marginTop: 14, padding: 24 },
  successNumber: { fontFamily: fonts.bold, fontSize: 38, lineHeight: 46, color: colors.white, marginTop: 7 },
  changeList: { width: "100%", marginVertical: 10, borderTopWidth: 1, borderColor: colors.outlineSoft },
  changeRow: { minHeight: 76, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderColor: colors.outlineSoft, paddingVertical: 13 },
  fullWidth: { width: "100%" },
});
