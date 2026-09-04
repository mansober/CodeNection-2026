import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppButton, Card, ChoicePill, FormField, InlineNotice, PageHeader, ScrollPage, SectionLabel, SegmentedChoices } from "@/components/MarginUI";
import { colors, fonts, type } from "@/theme/tokens";
import { screenStyles as s } from "@/screens/screenStyles";

type RebalanceItem = { name: string; reason: string; suggested: FiveD };
type FiveD = "Do" | "Delay" | "Delegate" | "Drop" | "Decompress";

const fiveDs: FiveD[] = ["Do", "Delay", "Delegate", "Drop", "Decompress"];
const rebalanceItems: RebalanceItem[] = [
  { name: "Data Structures midterm", reason: "Fixed and high impact", suggested: "Do" },
  { name: "Robotics Club practice", reason: "Can move by one day", suggested: "Delay" },
  { name: "Robotics Club poster", reason: "A clear handoff is available", suggested: "Delegate" },
  { name: "Optional club social", reason: "Lowest priority this week", suggested: "Drop" },
  { name: "Friday evening", reason: "Recovery has been squeezed out", suggested: "Decompress" },
];

export function RebalanceScreen({ onBack, onApply, onTest }: { onBack: () => void; onApply: () => void; onTest: () => void }) {
  const [assignments, setAssignments] = useState<Record<string, FiveD>>(() => Object.fromEntries(rebalanceItems.map((item) => [item.name, item.suggested])));
  return (
    <ScrollPage>
      <PageHeader eyebrow="Rebalance" title="Make room for Friday" body="Two lower-stakes tasks can move without harm. Change any recommendation before applying." onBack={onBack} />
      <View style={s.content}>
        <BeforeAfterSummary />
        <SectionLabel detail="Editable">Your plan</SectionLabel>
        <View style={styles.rebalanceList}>
          {rebalanceItems.map((item) => (
            <View key={item.name} style={styles.rebalanceRow}>
              <Text style={s.label}>{item.name}</Text>
              <Text style={s.bodySmallMuted}>{item.reason}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceScroller}>
                {fiveDs.map((choice) => <ChoicePill key={choice} text={choice} selected={assignments[item.name] === choice} onPress={() => setAssignments((current) => ({ ...current, [item.name]: choice }))} />)}
              </ScrollView>
            </View>
          ))}
        </View>
        <Card tone="mint">
          <Text style={[s.eyebrow, { color: colors.forest }]}>DECOMPRESS IDEAS</Text>
          <Text style={s.label}>Friday · Phone-free dinner and a 30-minute walk</Text>
          <Text style={s.label}>Sunday · Slow breakfast before opening your laptop</Text>
        </Card>
        <AppButton text="Apply these changes" onPress={onApply} />
        <AppButton text="Test another commitment" variant="secondary" onPress={onTest} />
      </View>
    </ScrollPage>
  );
}

function BeforeAfterSummary() {
  return (
    <Card tone="dark" style={styles.summary}>
      <View style={styles.summaryRow}>
        <View>
          <Text style={styles.summaryLabel}>BEFORE</Text>
          <Text style={[styles.summaryNumber, { color: "#FFB4A8" }]}>112%</Text>
          <Text style={styles.summaryMeta}>mental</Text>
        </View>
        <Text style={styles.summaryArrow}>→</Text>
        <View style={styles.summaryAfter}>
          <Text style={styles.summaryLabel}>PROJECTED</Text>
          <Text style={styles.summaryNumber}>94%</Text>
          <Text style={styles.summaryMeta}>mental</Text>
        </View>
      </View>
      <View style={styles.darkDivider} />
      <Text style={styles.summaryOutcome}>Projected outcome: Saturday opens up</Text>
    </Card>
  );
}

export function TestCommitmentScreen({ onBack, onTest }: { onBack: () => void; onTest: () => void }) {
  const [title, setTitle] = useState("Weekend Hackathon");
  const [category, setCategory] = useState("Club");
  const [duration, setDuration] = useState("Friday evening to Sunday");
  return (
    <ScrollPage>
      <PageHeader eyebrow="Test a commitment" title="What would saying yes cost?" body="This stays hypothetical until you explicitly add it." onBack={onBack} />
      <View style={s.content}>
        <FormField label="Commitment" value={title} onChangeText={setTitle} />
        <SegmentedChoices label="Category" choices={["Class", "Club", "Job", "Sport", "Social"]} selected={category} onSelect={setCategory} />
        <FormField label="Rough duration" value={duration} onChangeText={setDuration} />
        <InlineNotice title="Margin's estimate" body="High mental effort · High time cost, based on a multi-day team event." />
        <AppButton text="Test against my week" onPress={onTest} disabled={!title.trim() || !duration.trim()} />
        <Text style={styles.centerCaption}>Nothing will be added yet.</Text>
      </View>
    </ScrollPage>
  );
}

export function SimulatorScreen({ onBack, onDecline, onReschedule, onAddAnyway, onMakeRoom }: { onBack: () => void; onDecline: () => void; onReschedule: () => void; onAddAnyway: () => void; onMakeRoom: () => void }) {
  return (
    <ScrollPage>
      <PageHeader eyebrow="Testing · not added" title="Weekend Hackathon" body="Friday evening to Sunday" onBack={onBack} />
      <View style={s.content}>
        <Card tone="dark" style={styles.simulationCard}>
          <View style={styles.simHeader}><Text style={styles.simLabel}>NOW</Text><Text style={styles.simLabel}>IF YES</Text></View>
          <SimulationRow label="Time" now={64} after={88} />
          <SimulationRow label="Mental" now={112} after={138} danger />
          <SimulationRow label="Physical" now={41} after={67} />
          <SimulationRow label="Social" now={58} after={72} />
        </Card>
        <InlineNotice title="Your Friday recovery disappears" body="Mental load reaches 138%, and the next unplanned break moves to Sunday night." tone="coral" />
        <SectionLabel>Choose what happens next</SectionLabel>
        <DecisionButton title="Decline" detail="Keep this week as it is" onPress={onDecline} primary />
        <DecisionButton title="Reschedule" detail="Try a different date or shorter duration" onPress={onReschedule} />
        <DecisionButton title="Add anyway" detail="Add it with the overload visible" onPress={onAddAnyway} warning />
        <AppButton text="Show me how to make room" variant="quiet" onPress={onMakeRoom} />
      </View>
    </ScrollPage>
  );
}

function SimulationRow({ label, now, after, danger }: { label: string; now: number; after: number; danger?: boolean }) {
  return (
    <View style={styles.simulationRow} accessibilityLabel={`${label} changes from ${now} percent to ${after} percent`}>
      <Text style={styles.simulationName}>{label}</Text>
      <Text style={styles.simulationNow}>{now}%</Text>
      <Text style={styles.simulationArrow}>→</Text>
      <Text style={[styles.simulationAfter, danger && { color: "#FFB4A8" }]}>{after}%</Text>
    </View>
  );
}

function DecisionButton({ title, detail, primary, warning, onPress }: { title: string; detail: string; primary?: boolean; warning?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.decision, primary && styles.decisionPrimary, warning && styles.decisionWarning, pressed && styles.pressed]}>
      <Text style={[styles.decisionTitle, primary && styles.decisionTextLight]}>{title}</Text>
      <Text style={[styles.decisionDetail, primary && styles.decisionDetailLight]}>{detail}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rebalanceList: { borderTopWidth: 1, borderColor: colors.outlineSoft },
  rebalanceRow: { borderBottomWidth: 1, borderColor: colors.outlineSoft, paddingVertical: 16, gap: 3 },
  choiceScroller: { gap: 7, paddingTop: 10, paddingRight: 18 },
  summary: { padding: 19 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLabel: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 17, color: "rgba(248,247,242,0.72)" },
  summaryNumber: { fontFamily: fonts.bold, fontSize: 34, lineHeight: 40, color: colors.white },
  summaryMeta: { ...type.caption, color: "rgba(248,247,242,0.7)" },
  summaryArrow: { fontFamily: fonts.regular, fontSize: 26, color: colors.white },
  summaryAfter: { alignItems: "flex-end" },
  darkDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.2)", marginVertical: 13 },
  summaryOutcome: { ...type.label, color: colors.white },
  centerCaption: { ...type.caption, color: colors.textMuted, textAlign: "center" },
  simulationCard: { padding: 18 },
  simHeader: { flexDirection: "row", justifyContent: "flex-end", gap: 28, marginBottom: 2 },
  simLabel: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 17, color: "rgba(248,247,242,0.72)" },
  simulationRow: { minHeight: 48, flexDirection: "row", alignItems: "center" },
  simulationName: { ...type.label, color: colors.white, flex: 1 },
  simulationNow: { ...type.bodySmall, color: "rgba(248,247,242,0.7)", width: 50, textAlign: "right" },
  simulationArrow: { ...type.bodySmall, color: "rgba(248,247,242,0.5)", width: 38, textAlign: "center" },
  simulationAfter: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20, color: colors.white, width: 54, textAlign: "right" },
  decision: { minHeight: 68, borderRadius: 12, borderWidth: 1, borderColor: colors.outline, backgroundColor: colors.paper, paddingHorizontal: 16, paddingVertical: 12, justifyContent: "center" },
  decisionPrimary: { backgroundColor: colors.forest, borderColor: colors.forest },
  decisionWarning: { backgroundColor: colors.softCoral, borderColor: colors.coral },
  decisionTitle: { ...type.label, color: colors.ink },
  decisionTextLight: { color: colors.white },
  decisionDetail: { ...type.bodySmall, color: colors.textMuted, marginTop: 2 },
  decisionDetailLight: { color: "rgba(255,255,255,0.78)" },
  pressed: { opacity: 0.72 },
});
