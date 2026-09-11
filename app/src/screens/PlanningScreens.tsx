import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

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
import {
  CapacityKind,
  Commitment,
  DailyCheckIn,
  DashboardPeriod,
  MainTab,
  capacityMeta,
  commitmentDayIndex,
  commitmentDayLabels,
  commitmentLoadTotals,
  sampleCapacities,
  sampleMonthlyCapacities,
} from "@/models/margin";
import { colors, fonts, type } from "@/theme/tokens";
import { screenStyles as s } from "@/screens/screenStyles";

type HomeProps = {
  weeklyNote: string;
  dailyCheckIn?: DailyCheckIn;
  onTab: (tab: MainTab) => void;
  onCheckIn: () => void;
  onRebalance: () => void;
  onTest: () => void;
};

export function HomeScreen({ weeklyNote, dailyCheckIn, onTab, onCheckIn, onRebalance, onTest }: HomeProps) {
  const [period, setPeriod] = useState<DashboardPeriod>("week");
  const isWeek = period === "week";
  const capacities = isWeek ? sampleCapacities : sampleMonthlyCapacities;
  const overall = isWeek ? 90 : 80;

  return (
    <ScrollPage bottomBar={<BottomNav selected="today" onSelect={onTab} />}>
      <View style={styles.homeHeader}>
        <Text style={s.bodySmallMuted}>Good morning</Text>
        <Text accessibilityRole="header" style={styles.homeTitle}>How much room do you have?</Text>
        <PeriodSwitch value={period} onChange={setPeriod} />
      </View>
      <View style={s.content}>
        <Card tone="dark" style={styles.capacityHero}>
          <View style={s.rowBetween}>
            <View style={s.flex}>
              <Text style={styles.darkEyebrow}>{isWeek ? "THIS WEEK · SEP 7–13" : "THIS MONTH · SEPTEMBER"}</Text>
              <Text style={styles.capacityNumber}>{overall}%</Text>
            </View>
            <View style={styles.capacityCheck}><MarginIcon name={overall >= 85 ? "recovery" : "check"} color={colors.white} size={32} strokeWidth={2.2} /></View>
          </View>
          <Text style={styles.darkBody}>{isWeek ? "You are carrying more than fits comfortably." : "The month is busy, with some room still protected."}</Text>
        </Card>

        <View style={styles.pressureSection}>
          <SectionLabel detail={isWeek ? "weekly view" : "monthly view"}>Where the pressure sits</SectionLabel>
          {capacities.map((value) => (
            <View key={value.kind} style={styles.barGroup}>
              <CapacityBar value={value} compact />
              {isWeek && value.kind === "time" ? <Text style={s.caption}>Two deadlines land on Friday</Text> : null}
              {isWeek && value.kind === "mental" ? <Text style={s.caption}>Focus has been low since Tuesday</Text> : null}
            </View>
          ))}
        </View>

        <Card tone="mint">
          <View style={[s.row, { alignItems: "flex-start" }]}>
            <MarginMark size={22} />
            <View style={s.flex}>
              <Text style={s.label}>{isWeek ? "A small reset would help" : "Keep one evening unplanned"}</Text>
              <Text style={s.bodySmallMuted}>{isWeek ? "Block 20 minutes outside after class." : "Thursday has the cleanest margin this month."}</Text>
              <Pressable accessibilityRole="button" onPress={() => onTab("recovery")} style={styles.inlineAction}>
                <Text style={styles.inlineActionText}>Review recovery by day</Text>
              </Pressable>
            </View>
          </View>
        </Card>

        <Card style={styles.checkInCard}>
          <View style={[s.row, { alignItems: "flex-start" }]}>
            <View style={[s.iconTile, { backgroundColor: colors.softAmber }]}><MarginIcon name="check-in" color={colors.amber} size={25} /></View>
            <View style={s.flex}>
              <Text style={s.label}>{dailyCheckIn ? "Today’s check-in is saved" : "Daily check-in"}</Text>
              <Text style={s.bodySmallMuted}>{dailyCheckIn ? `${dailyCheckIn.causes.length} pressure ${dailyCheckIn.causes.length === 1 ? "source" : "sources"} noted. You can update it anytime.` : "Log a change that your timetable cannot see."}</Text>
            </View>
          </View>
          <AppButton text={dailyCheckIn ? "Update check-in" : "Check in now"} variant="secondary" onPress={onCheckIn} />
        </Card>

        {weeklyNote ? <View style={styles.contextNote}><Text style={s.eyebrow}>WEEKLY CONTEXT</Text><Text style={s.bodySmall}>{weeklyNote}</Text></View> : null}

        <AppButton text="Rebalance this week" onPress={onRebalance} />
        <AppButton text="Test a possible commitment" variant="secondary" onPress={onTest} />
      </View>
    </ScrollPage>
  );
}

function PeriodSwitch({ value, onChange }: { value: DashboardPeriod; onChange: (value: DashboardPeriod) => void }) {
  return (
    <View style={styles.periodSwitch} accessibilityRole="tablist">
      {(["week", "month"] as DashboardPeriod[]).map((period) => {
        const selected = value === period;
        return (
          <Pressable key={period} accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => onChange(period)} style={[styles.periodOption, selected && styles.periodOptionSelected]}>
            <Text style={[styles.periodText, selected && styles.periodTextSelected]}>{period === "week" ? "Week" : "Month"}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function PlanScreen({ commitments, onTab, onAdd, onEdit, onRemove }: { commitments: Commitment[]; onTab: (tab: MainTab) => void; onAdd: () => void; onEdit: (item: Commitment) => void; onRemove: (item: Commitment) => void }) {
  const [expandedId, setExpandedId] = useState<string>();
  const grouped = useMemo(() => {
    const sorted = [...commitments].sort((a, b) => commitmentDayIndex(a.schedule) - commitmentDayIndex(b.schedule) || a.schedule.localeCompare(b.schedule));
    return commitmentDayLabels
      .map((label, index) => ({ label, items: sorted.filter((item) => commitmentDayIndex(item.schedule) === index) }))
      .filter((group) => group.items.length > 0);
  }, [commitments]);

  return (
    <ScrollPage bottomBar={<BottomNav selected="plan" onSelect={onTab} />}>
      <PageHeader eyebrow="Plan · sorted by day" title="What is taking up your week?" body="Open an item to inspect, edit, or remove it." />
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
            {grouped.map((group) => (
              <View key={group.label} style={styles.dayGroup}>
                <SectionLabel detail={`${group.items.length}`}>{group.label}</SectionLabel>
                <View style={styles.commitmentList}>
                  {group.items.map((item) => (
                    <CommitmentRow key={item.id} item={item} expanded={expandedId === item.id} onToggle={() => setExpandedId((current) => current === item.id ? undefined : item.id)} onEdit={() => onEdit(item)} onRemove={() => { setExpandedId(undefined); onRemove(item); }} />
                  ))}
                </View>
              </View>
            ))}
            <AppButton text="Add commitment" icon="plus" onPress={onAdd} />
          </>
        )}
      </View>
    </ScrollPage>
  );
}

export function DistributionScreen({ commitments, onTab }: { commitments: Commitment[]; onTab: (tab: MainTab) => void }) {
  const totals = useMemo(() => commitmentLoadTotals(commitments), [commitments]);
  const overall = Math.max(1, Object.values(totals).reduce((sum, value) => sum + value, 0));
  const highest = (Object.keys(totals) as CapacityKind[]).sort((a, b) => totals[b] - totals[a])[0];

  return (
    <ScrollPage bottomBar={<BottomNav selected="distribution" onSelect={onTab} />}>
      <PageHeader eyebrow="Workload distribution" title="Your workload, by capacity" body="Each commitment contributes to all four capacities—not just the time it takes." />
      <View style={s.content}>
        <Card style={styles.chartCard}>
          <LoadDonut totals={totals} />
          <View style={styles.legend}>
            {(Object.keys(capacityMeta) as CapacityKind[]).map((kind) => {
              const percentage = Math.round((totals[kind] / overall) * 100);
              return (
                <View key={kind} style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: capacityMeta[kind].color }]} />
                  <Text style={[s.label, s.flex]}>{capacityMeta[kind].label}</Text>
                  <Text style={styles.legendValue}>{percentage}%</Text>
                  <Text style={styles.legendPoints}>{totals[kind]} load</Text>
                </View>
              );
            })}
          </View>
        </Card>
        <Card tone={highest === "mental" ? "coral" : "mint"}>
          <Text style={s.eyebrow}>HIGHEST DRAW</Text>
          <Text style={[s.title, { marginTop: 5 }]}>{commitments.length ? `${capacityMeta[highest].label} needs the most room.` : "No planned load in this view."}</Text>
          <Text style={[s.bodySmallMuted, { marginTop: 5 }]}>Distribution shows what kind of load dominates. Capacity bars on the dashboard show how close you are to your personal limit.</Text>
        </Card>
        <AppButton text="Review recovery for this load" onPress={() => onTab("recovery")} />
      </View>
    </ScrollPage>
  );
}

function LoadDonut({ totals }: { totals: Record<CapacityKind, number> }) {
  const radius = 74;
  const circumference = 2 * Math.PI * radius;
  const kinds = Object.keys(capacityMeta) as CapacityKind[];
  const total = Math.max(1, kinds.reduce((sum, kind) => sum + totals[kind], 0));
  let consumed = 0;
  return (
    <View style={styles.chartWrap} accessibilityLabel={kinds.map((kind) => `${capacityMeta[kind].label} ${Math.round((totals[kind] / total) * 100)} percent`).join(", ")}>
      <Svg width={200} height={200} viewBox="0 0 200 200">
        <Circle cx="100" cy="100" r={radius} fill="none" stroke={colors.surfaceMuted} strokeWidth="28" />
        {kinds.map((kind) => {
          const length = (totals[kind] / total) * circumference;
          const offset = -consumed;
          consumed += length;
          return <Circle key={kind} cx="100" cy="100" r={radius} fill="none" stroke={capacityMeta[kind].color} strokeWidth="28" strokeDasharray={`${Math.max(0, length - 3)} ${circumference}`} strokeDashoffset={offset} strokeLinecap="butt" transform="rotate(-90 100 100)" />;
        })}
      </Svg>
      <View style={styles.chartCenter}><Text style={styles.chartNumber}>{kinds.reduce((sum, kind) => sum + totals[kind], 0)}</Text><Text style={styles.chartLabel}>TOTAL LOAD</Text></View>
    </View>
  );
}

function CommitmentRow({ item, expanded, onToggle, onEdit, onRemove }: { item: Commitment; expanded: boolean; onToggle: () => void; onEdit: () => void; onRemove: () => void }) {
  return (
    <View style={styles.commitmentRow}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded }} accessibilityLabel={`${item.name}, ${item.category}, ${item.schedule}`} onPress={onToggle} style={({ pressed }) => [styles.commitmentMain, pressed && styles.pressed]}>
        <View style={[styles.categoryTile, item.mental >= 25 && styles.categoryTileHot]}><Text style={[styles.categoryLetter, item.mental >= 25 && { color: colors.coral }]}>{item.category.slice(0, 1)}</Text></View>
        <View style={s.flex}><Text style={s.label}>{item.name}</Text><Text style={s.bodySmallMuted}>{item.category} · {item.schedule}</Text></View>
        <MarginIcon name="chevron" color={colors.forest} size={20} />
      </Pressable>
      {expanded ? (
        <View style={styles.commitmentDetails}>
          <View style={styles.loadNumbers}><LoadNumber label="TIME" value={item.time} /><LoadNumber label="MENTAL" value={item.mental} /><LoadNumber label="PHYSICAL" value={item.physical} /><LoadNumber label="SOCIAL" value={item.social} /></View>
          <Text style={s.bodySmallMuted}>Flexibility: {item.flexibility}</Text>
          <View style={styles.detailActions}><AppButton text="Edit" variant="quiet" onPress={onEdit} style={s.flex} /><AppButton text="Remove" variant="warning" onPress={onRemove} style={s.flex} /></View>
        </View>
      ) : null}
    </View>
  );
}

function LoadNumber({ label, value }: { label: string; value: number }) {
  return <View style={styles.loadNumber}><Text style={styles.loadLabel}>{label}</Text><Text style={styles.loadValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  homeHeader: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8, gap: 7 },
  homeTitle: { ...type.h1, color: colors.ink },
  periodSwitch: { minHeight: 56, flexDirection: "row", alignSelf: "flex-start", borderRadius: 12, borderWidth: 1, borderColor: colors.outlineSoft, padding: 4, marginTop: 7, backgroundColor: colors.paper },
  periodOption: { minWidth: 104, minHeight: 48, borderRadius: 9, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  periodOptionSelected: { backgroundColor: colors.forest },
  periodText: { ...type.label, color: colors.textMuted },
  periodTextSelected: { color: colors.white },
  capacityHero: { padding: 20, borderRadius: 19 },
  darkEyebrow: { ...type.eyebrow, color: "rgba(248,247,242,0.76)" },
  capacityNumber: { fontFamily: fonts.bold, fontSize: 52, lineHeight: 58, color: colors.white, letterSpacing: -1 },
  capacityCheck: { width: 66, height: 66, borderRadius: 33, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(15,107,79,0.58)" },
  darkBody: { ...type.bodySmall, color: "rgba(248,247,242,0.84)" },
  pressureSection: { gap: 15 },
  barGroup: { gap: 5 },
  inlineAction: { minHeight: 48, justifyContent: "center", alignSelf: "flex-start" },
  inlineActionText: { ...type.label, color: colors.forest },
  checkInCard: { gap: 14 },
  contextNote: { borderLeftWidth: 4, borderColor: colors.amber, paddingLeft: 13, paddingVertical: 4, gap: 4 },
  emptyCard: { alignItems: "center", gap: 13, paddingVertical: 26 },
  emptyIcon: { width: 56, height: 56, borderRadius: 14, backgroundColor: colors.softMint, alignItems: "center", justifyContent: "center" },
  center: { textAlign: "center" },
  dayGroup: { gap: 7 },
  commitmentList: { borderTopWidth: 1, borderColor: colors.outlineSoft },
  commitmentRow: { borderBottomWidth: 1, borderColor: colors.outlineSoft },
  commitmentMain: { minHeight: 78, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13 },
  pressed: { opacity: 0.72 },
  categoryTile: { width: 42, height: 42, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: colors.mint },
  categoryTileHot: { backgroundColor: colors.softCoral },
  categoryLetter: { fontFamily: fonts.bold, fontSize: 16, color: colors.forest },
  commitmentDetails: { gap: 14, paddingBottom: 16, paddingLeft: 54 },
  loadNumbers: { flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", gap: 6 },
  loadNumber: { alignItems: "center", minWidth: 54 },
  loadLabel: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 17, color: colors.textMuted },
  loadValue: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 23, color: colors.ink },
  detailActions: { flexDirection: "row", gap: 9 },
  chartCard: { alignItems: "center", gap: 18, paddingVertical: 22 },
  chartWrap: { width: 200, height: 200, alignItems: "center", justifyContent: "center" },
  chartCenter: { position: "absolute", alignItems: "center", justifyContent: "center" },
  chartNumber: { fontFamily: fonts.bold, fontSize: 30, lineHeight: 35, color: colors.ink },
  chartLabel: { ...type.eyebrow, color: colors.textMuted },
  legend: { width: "100%", gap: 2 },
  legendRow: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 10, borderTopWidth: 1, borderColor: colors.outlineSoft },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendValue: { ...type.label, color: colors.ink, minWidth: 42, textAlign: "right" },
  legendPoints: { ...type.bodySmall, color: colors.textMuted, minWidth: 62, textAlign: "right" },
});
