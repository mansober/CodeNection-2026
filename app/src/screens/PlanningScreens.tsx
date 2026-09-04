import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  AppButton,
  BottomNav,
  CapacityBar,
  Card,
  MarginMark,
  PageHeader,
  ScrollPage,
  SectionLabel,
} from "@/components/MarginUI";
import { MarginIcon } from "@/components/MarginIcon";
import { Commitment, MainTab, sampleCapacities } from "@/models/margin";
import { colors, fonts, type } from "@/theme/tokens";
import { screenStyles as s } from "@/screens/screenStyles";

export function HomeScreen({ onTab, onRebalance, onSeePlan, onTest }: { onTab: (tab: MainTab) => void; onRebalance: () => void; onSeePlan: () => void; onTest: () => void }) {
  return (
    <ScrollPage bottomBar={<BottomNav selected="today" onSelect={onTab} />}>
      <View style={styles.homeHeader}>
        <Text style={s.bodySmallMuted}>Good morning</Text>
        <Text accessibilityRole="header" style={styles.homeTitle}>How full is this week?</Text>
        <Text style={s.eyebrow}>SAMPLE WEEK · SEP 7–13</Text>
      </View>
      <View style={s.content}>
        <Card tone="dark" style={styles.capacityHero}>
          <Text style={styles.darkEyebrow}>TOTAL CAPACITY</Text>
          <View style={s.rowBetween}>
            <Text style={styles.capacityNumber}>90%</Text>
            <View style={styles.capacityCheck}><MarginIcon name="check" color={colors.white} size={32} strokeWidth={2.2} /></View>
          </View>
          <Text style={styles.darkBody}>You are carrying more than fits comfortably.</Text>
        </Card>

        <View style={styles.pressureSection}>
          <SectionLabel>Where the pressure sits</SectionLabel>
          {sampleCapacities.map((value) => (
            <View key={value.kind} style={styles.barGroup}>
              <CapacityBar value={value} compact />
              {value.kind === "time" ? <Text style={s.caption}>Two deadlines land on Friday</Text> : null}
              {value.kind === "mental" ? <Text style={s.caption}>Focus has been low since Tuesday</Text> : null}
            </View>
          ))}
        </View>

        <Card tone="mint">
          <View style={[s.row, { alignItems: "flex-start" }]}>
            <MarginMark size={22} />
            <View style={s.flex}>
              <Text style={s.label}>A small reset would help</Text>
              <Text style={s.bodySmallMuted}>Block 20 minutes outside after class.</Text>
              <Pressable accessibilityRole="button" onPress={() => onTab("recovery")} style={styles.inlineAction}>
                <Text style={styles.inlineActionText}>Review recovery options</Text>
              </Pressable>
            </View>
          </View>
        </Card>

        <AppButton text="Rebalance this week" onPress={onRebalance} />
        <View style={styles.actionRow}>
          <AppButton text="View plan" variant="secondary" onPress={onSeePlan} style={s.flex} />
          <AppButton text="Test a possible yes" variant="secondary" onPress={onTest} style={s.flex} />
        </View>
        <Text style={styles.centerCaption}>Recovery nudges appear when any capacity approaches its limit.</Text>
      </View>
    </ScrollPage>
  );
}

export function PlanScreen({ commitments, onTab, onAdd, onEdit, onRemove }: { commitments: Commitment[]; onTab: (tab: MainTab) => void; onAdd: () => void; onEdit: (item: Commitment) => void; onRemove: (item: Commitment) => void }) {
  const [expandedId, setExpandedId] = useState<string>();
  return (
    <ScrollPage bottomBar={<BottomNav selected="plan" onSelect={onTab} />}>
      <PageHeader eyebrow="Plan" title="What is taking up your week?" body="Open an item to inspect, edit, or remove it." />
      <View style={s.content}>
        {commitments.length === 0 ? (
          <Card tone="mint" style={styles.emptyCard}>
            <View style={styles.emptyIcon}><MarginIcon name="plan" color={colors.forest} size={30} /></View>
            <Text style={s.title}>Your plan is clear</Text>
            <Text style={[s.bodyMuted, styles.center]}>Add a deadline, shift, or event when something new appears.</Text>
            <AppButton text="Add a commitment" icon="plus" onPress={onAdd} />
          </Card>
        ) : (
          <>
            <View style={s.rowBetween}>
              <Text style={s.eyebrow}>{commitments.length} COMMITMENTS</Text>
              <Text style={[s.eyebrow, { color: colors.coral }]}>MENTAL IS HIGHEST</Text>
            </View>
            <View style={styles.commitmentList}>
              {commitments.map((item) => (
                <CommitmentRow
                  key={item.id}
                  item={item}
                  expanded={expandedId === item.id}
                  onToggle={() => setExpandedId((current) => current === item.id ? undefined : item.id)}
                  onEdit={() => onEdit(item)}
                  onRemove={() => { setExpandedId(undefined); onRemove(item); }}
                />
              ))}
            </View>
            <AppButton text="Add another commitment" icon="plus" variant="secondary" onPress={onAdd} />
          </>
        )}
      </View>
    </ScrollPage>
  );
}

function CommitmentRow({ item, expanded, onToggle, onEdit, onRemove }: { item: Commitment; expanded: boolean; onToggle: () => void; onEdit: () => void; onRemove: () => void }) {
  return (
    <View style={styles.commitmentRow}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${item.name}, ${item.category}, ${item.schedule}`}
        onPress={onToggle}
        style={({ pressed }) => [styles.commitmentMain, pressed && styles.pressed]}
      >
        <View style={[styles.categoryTile, item.mental >= 25 && styles.categoryTileHot]}>
          <Text style={[styles.categoryLetter, item.mental >= 25 && { color: colors.coral }]}>{item.category.slice(0, 1)}</Text>
        </View>
        <View style={s.flex}>
          <Text style={s.label}>{item.name}</Text>
          <Text style={s.bodySmallMuted}>{item.category} · {item.schedule}</Text>
        </View>
        <MarginIcon name="chevron" color={colors.forest} size={20} />
      </Pressable>
      {expanded ? (
        <View style={styles.commitmentDetails}>
          <View style={styles.loadNumbers}>
            <LoadNumber label="TIME" value={item.time} />
            <LoadNumber label="MENTAL" value={item.mental} />
            <LoadNumber label="PHYSICAL" value={item.physical} />
            <LoadNumber label="SOCIAL" value={item.social} />
          </View>
          <Text style={s.bodySmallMuted}>Flexibility: {item.flexibility}</Text>
          <View style={styles.detailActions}>
            <AppButton text="Edit" variant="quiet" onPress={onEdit} style={s.flex} />
            <AppButton text="Remove" variant="warning" onPress={onRemove} style={s.flex} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function LoadNumber({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.loadNumber}>
      <Text style={styles.loadLabel}>{label}</Text>
      <Text style={styles.loadValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  homeHeader: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8, gap: 3 },
  homeTitle: { ...type.h1, color: colors.ink },
  capacityHero: { padding: 20, borderRadius: 19 },
  darkEyebrow: { ...type.eyebrow, color: "rgba(248,247,242,0.76)" },
  capacityNumber: { fontFamily: fonts.bold, fontSize: 52, lineHeight: 58, color: colors.white, letterSpacing: -1 },
  capacityCheck: { width: 66, height: 66, borderRadius: 33, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(15,107,79,0.58)" },
  darkBody: { ...type.bodySmall, color: "rgba(248,247,242,0.84)" },
  pressureSection: { gap: 15 },
  barGroup: { gap: 5 },
  inlineAction: { minHeight: 48, justifyContent: "center", alignSelf: "flex-start" },
  inlineActionText: { ...type.label, color: colors.forest },
  actionRow: { flexDirection: "row", gap: 9 },
  centerCaption: { ...type.caption, color: colors.textMuted, textAlign: "center", marginBottom: 4 },
  emptyCard: { alignItems: "center", gap: 13, paddingVertical: 26 },
  emptyIcon: { width: 56, height: 56, borderRadius: 14, backgroundColor: colors.softMint, alignItems: "center", justifyContent: "center" },
  center: { textAlign: "center" },
  commitmentList: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.outlineSoft },
  commitmentRow: { borderBottomWidth: 1, borderColor: colors.outlineSoft },
  commitmentMain: { minHeight: 78, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13 },
  pressed: { opacity: 0.72 },
  categoryTile: { width: 42, height: 42, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: colors.mint },
  categoryTileHot: { backgroundColor: colors.softCoral },
  categoryLetter: { fontFamily: fonts.bold, fontSize: 16, color: colors.forest },
  commitmentDetails: { gap: 14, paddingBottom: 16, paddingLeft: 54 },
  loadNumbers: { flexDirection: "row", justifyContent: "space-between" },
  loadNumber: { alignItems: "center", minWidth: 54 },
  loadLabel: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 16, color: colors.textMuted },
  loadValue: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 22, color: colors.ink },
  detailActions: { flexDirection: "row", gap: 9 },
});
