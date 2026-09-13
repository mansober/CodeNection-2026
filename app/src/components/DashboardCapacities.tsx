import { StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { CapacityKind, CapacityValue, capacityMeta } from "@/models/margin";
import { colors, fonts, type } from "@/theme/tokens";

const capacityOrder: CapacityKind[] = ["time", "mental", "physical", "social"];

// Retained for a future contextual disclosure; intentionally not rendered in the compact dashboard.
export const dashboardLoadDisclosure = "A planning estimate, not a health measurement. Completing today’s recovery adds 10 energy, once per day.";

export function DashboardLoadSummary({ values, overall, period }: { values: CapacityValue[]; overall: number; period: "Daily" | "Weekly" }) {
  const { width } = useWindowDimensions();
  const stackCards = width < 330;
  const orderedValues = capacityOrder.map(kind => values.find(value => value.kind === kind) ?? { kind, used: 0, limit: 100 });
  const sectionTitle = period === "Daily" ? "TODAY’S LOAD" : "WEEKLY LOAD";
  const summaryTitle = period === "Daily" ? "OVERALL" : "WEEKLY AVERAGE";
  const descriptor = overall >= 85 ? "Heavy" : overall >= 60 ? "Moderate" : "Light";

  return <View style={styles.section}>
    <Text style={styles.sectionTitle}>{sectionTitle}</Text>

    <View style={[styles.loadRow, stackCards && styles.loadRowStacked]}>
      <View style={[styles.loadCard, styles.breakdownCard, stackCards && styles.stackedCard]}>
        <Text style={styles.cardLabel}>BY CAPACITY</Text>
        <View style={styles.bars}>
          {orderedValues.map(value => {
            const meta = capacityMeta[value.kind];
            const percent = Math.round(value.used / Math.max(1, value.limit) * 100);
            const visiblePercent = Math.max(0, Math.min(100, percent));
            return <View key={value.kind} accessible accessibilityLabel={`${meta.label} load, ${percent} percent`} style={styles.barColumn}>
              <View style={[styles.barTrack, { backgroundColor: `${meta.color}1F` }]}>
                <View style={[styles.barFill, { height: `${visiblePercent}%`, backgroundColor: meta.color }]} />
              </View>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.86} style={styles.categoryLabel}>{meta.label}</Text>
              <Text style={styles.categoryValue}>{percent}%</Text>
            </View>
          })}
        </View>
      </View>

      <View accessible accessibilityLabel={`${summaryTitle.toLowerCase()}, ${Math.round(overall)} percent, ${descriptor}`} style={[styles.loadCard, styles.summaryCard, stackCards && styles.stackedCard, stackCards && styles.summaryCardStacked]}>
        <Text style={[styles.cardLabel, styles.summaryLabel]}>{summaryTitle}</Text>
        <View style={styles.summaryValueWrap}>
          <Text style={styles.summaryValue}>{Math.round(overall)}%</Text>
          <View style={styles.descriptorPill}><Text style={styles.descriptorText}>{descriptor}</Text></View>
        </View>
      </View>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  section: {
    padding: 12,
    gap: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.outlineSoft,
    backgroundColor: colors.softMint,
  },
  sectionTitle: {
    ...type.h3,
    color: colors.forest,
    paddingHorizontal: 2,
  },
  loadRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 8,
  },
  loadRowStacked: {
    flexDirection: "column",
  },
  loadCard: {
    minWidth: 0,
    minHeight: 160,
    paddingHorizontal: 10,
    paddingVertical: 11,
    borderRadius: 15,
  },
  breakdownCard: {
    flex: 2.15,
    gap: 8,
    backgroundColor: colors.surfaceMuted,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.mint,
  },
  stackedCard: {
    flex: 0,
    width: "100%",
  },
  summaryCardStacked: {
    minHeight: 116,
  },
  cardLabel: {
    ...type.eyebrow,
    fontSize: 11,
    lineHeight: 15,
    color: colors.forest,
  },
  bars: {
    flex: 1,
    minHeight: 112,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
  },
  barColumn: {
    flex: 1,
    height: 112,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  barTrack: {
    width: 20,
    height: 68,
    overflow: "hidden",
    borderRadius: 7,
    justifyContent: "flex-end",
  },
  barFill: {
    width: "100%",
    borderRadius: 7,
  },
  categoryLabel: {
    fontFamily: fonts.bold,
    fontSize: 11,
    lineHeight: 14,
    color: colors.ink,
    marginTop: 5,
    width: "100%",
    textAlign: "center",
  },
  categoryValue: {
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 14,
    color: colors.textMuted,
  },
  summaryLabel: {
    textAlign: "center",
  },
  summaryValueWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  summaryValue: {
    fontFamily: fonts.number,
    fontSize: 33,
    lineHeight: 39,
    color: colors.forest,
  },
  descriptorPill: {
    minHeight: 26,
    paddingHorizontal: 9,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.paper,
  },
  descriptorText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 16,
    color: colors.forest,
  },
});
