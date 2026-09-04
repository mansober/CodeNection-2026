import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppButton, BottomNav, Card, ChoicePill, FormField, InlineNotice, MarginMark, PageHeader, ScrollPage, SectionLabel } from "@/components/MarginUI";
import { IconName, MarginIcon, StressFaceIcon } from "@/components/MarginIcon";
import { MainTab } from "@/models/margin";
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

export function CheckInScreen({ onTab, onSaved }: { onTab: (tab: MainTab) => void; onSaved: () => void }) {
  const [stress, setStress] = useState(2);
  const [note, setNote] = useState("");
  const [selectedCauses, setSelectedCauses] = useState<string[]>(["Deadlines", "Too many plans"]);
  const toggleCause = (cause: string) => setSelectedCauses((current) => current.includes(cause) ? current.filter((item) => item !== cause) : [...current, cause]);

  return (
    <ScrollPage bottomBar={<BottomNav selected="check-in" onSelect={onTab} />}>
      <PageHeader eyebrow="Check-in" title="How are you holding up?" body="A quick check helps the plan fit the person." />
      <View style={s.content}>
        <SectionLabel>Stress right now</SectionLabel>
        <Card style={styles.stressCard}>
          <View style={styles.stressRow}>
            {stressChoices.map((choice, index) => (
              <Pressable
                key={choice.label}
                accessibilityRole="radio"
                accessibilityState={{ selected: stress === index }}
                accessibilityLabel={`${choice.label} stress`}
                onPress={() => setStress(index)}
                style={styles.stressChoice}
              >
                <View style={[styles.faceBox, { backgroundColor: `${choice.color}18`, borderColor: stress === index ? choice.color : colors.outlineSoft }]}>
                  <StressFaceIcon level={index} color={choice.color} />
                </View>
                <Text numberOfLines={2} style={[styles.stressLabel, stress === index && styles.stressLabelSelected]}>{choice.label}</Text>
              </Pressable>
            ))}
          </View>
        </Card>
        <Text style={s.caption}>{stressChoices[stress].label} stress · {selectedCauses.length} {selectedCauses.length === 1 ? "cause" : "causes"} selected</Text>

        <SectionLabel>What is feeding it?</SectionLabel>
        <View style={styles.causeGrid}>
          {causes.map((cause, index) => <ChoicePill key={cause} text={cause} selected={selectedCauses.includes(cause)} onPress={() => toggleCause(cause)} style={index === causes.length - 1 ? styles.causeWide : styles.causeHalf} />)}
        </View>

        <FormField label="Optional note" value={note} onChangeText={setNote} placeholder="What happened today?" multiline />
        <InlineNotice title="Based on this check-in" body="We will lower your suggested weekly limit and prioritise recovery." />
        <AppButton text="Save check-in" onPress={onSaved} />
      </View>
    </ScrollPage>
  );
}

const recoveryOptions: { id: string; title: string; body: string; color: string; icon: IconName }[] = [
  { id: "tonight", title: "Protect tonight", body: "Stop study at 10:30 pm", color: colors.amber, icon: "calendar" },
  { id: "company", title: "Ask for company", body: "Invite one friend for dinner", color: colors.violet, icon: "person" },
  { id: "clear", title: "Clear one obligation", body: "Move one optional task", color: colors.coral, icon: "document" },
];

export function RecoveryScreen({ onTab, onBlockTime }: { onTab: (tab: MainTab) => void; onBlockTime: () => void }) {
  const [chosen, setChosen] = useState<string>();
  return (
    <ScrollPage bottomBar={<BottomNav selected="recovery" onSelect={onTab} />}>
      <PageHeader eyebrow="Recovery" title="Less input. More recovery." body="Pick one thing your body can feel today." />
      <View style={s.content}>
        <Card tone="dark" style={styles.recoveryHero}>
          <View style={s.rowBetween}>
            <Text style={styles.darkEyebrow}>BEST FIT FOR TODAY</Text>
            <MarginMark light size={24} />
          </View>
          <Text style={s.whiteTitle}>Walk somewhere green</Text>
          <Text style={s.whiteBody}>25 minutes after your 2 pm class</Text>
          <AppButton text="Block the time" variant="secondary" onPress={onBlockTime} style={styles.heroButton} />
        </Card>
        <SectionLabel>Other options</SectionLabel>
        {recoveryOptions.map((option) => (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            accessibilityState={{ selected: chosen === option.id }}
            onPress={() => setChosen((current) => current === option.id ? undefined : option.id)}
            style={({ pressed }) => [styles.recoveryOption, chosen === option.id && styles.recoveryOptionSelected, pressed && styles.pressed]}
          >
            <View style={[s.iconTile, { backgroundColor: `${option.color}1F` }]}><MarginIcon name={option.icon} color={option.color} size={25} /></View>
            <View style={s.flex}><Text style={s.label}>{option.title}</Text><Text style={s.bodySmallMuted}>{option.body}</Text></View>
            <Text style={styles.addState}>{chosen === option.id ? "Added" : "Add"}</Text>
          </Pressable>
        ))}
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
      <Card tone="dark" style={styles.successCapacity}>
        <Text style={styles.darkEyebrow}>CAPACITY</Text>
        <Text style={styles.successNumber}>90% → 76%</Text>
      </Card>
      <View style={styles.changeList}>
        <ChangeRow title="Laundry" detail="Moved to Sunday morning" state="Moved" />
        <ChangeRow title="Study group" detail="Shortened to 45 minutes" state="Shorter" />
        <ChangeRow title="Recovery block" detail="Friday · 2:30 pm · 25 minutes" state="Added" />
      </View>
      <AppButton text="Return to today" onPress={onReturn} style={styles.fullWidth} />
    </ScrollPage>
  );
}

function ChangeRow({ title, detail, state }: { title: string; detail: string; state: string }) {
  return (
    <View style={styles.changeRow}>
      <View style={s.flex}><Text style={s.label}>{title}</Text><Text style={s.bodySmallMuted}>{detail}</Text></View>
      <View style={s.badge}><Text style={s.badgeText}>{state}</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  stressCard: { paddingHorizontal: 9, paddingVertical: 12 },
  stressRow: { flexDirection: "row", gap: 4 },
  stressChoice: { flex: 1, height: 92, alignItems: "center", justifyContent: "space-between", paddingVertical: 2 },
  faceBox: { width: 42, height: 42, borderRadius: 21, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  stressLabel: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 16, color: colors.textMuted, textAlign: "center", minHeight: 32 },
  stressLabelSelected: { fontFamily: fonts.semiBold, color: colors.ink },
  causeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  causeHalf: { width: "48.7%" },
  causeWide: { width: "100%" },
  recoveryHero: { gap: 9, padding: 20, borderRadius: 20 },
  darkEyebrow: { ...type.eyebrow, color: colors.mint },
  heroButton: { alignSelf: "flex-start", minWidth: 166, marginTop: 8 },
  recoveryOption: { minHeight: 84, borderRadius: 13, borderWidth: 1, borderColor: colors.outlineSoft, backgroundColor: colors.paper, flexDirection: "row", alignItems: "center", gap: 13, padding: 14 },
  recoveryOptionSelected: { borderColor: colors.forest, backgroundColor: colors.softMint },
  addState: { ...type.label, color: colors.forest },
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
