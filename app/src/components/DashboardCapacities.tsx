import { Text, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { CapacityValue, capacityMeta } from "@/models/margin";
import { colors, fonts } from "@/theme/tokens";

export function DashboardCapacities({ values }: { values: CapacityValue[] }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
    {values.map(value => {
      const meta = capacityMeta[value.kind];
      const percent = Math.round(value.used / Math.max(1, value.limit) * 100);
      const state = percent > 100 ? "Over limit" : percent >= 80 ? "Nearly full" : percent >= 60 ? "Steady" : "Room left";
      return <View key={value.kind} accessible accessibilityLabel={`${meta.label} at ${percent} percent, ${state}`} style={{ width: "48%", flexGrow: 1, minHeight: 84, borderRadius: 16, borderWidth: 1, borderColor: `${meta.color}32`, backgroundColor: `${meta.color}12`, padding: 12, gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: meta.color, alignItems: "center", justifyContent: "center" }}>
          <Svg width={21} height={21} viewBox="0 0 24 24" accessibilityElementsHidden>
            {value.kind === "time" && <><Circle cx={12} cy={12} r={8} fill="none" stroke={colors.white} strokeWidth={1.8} /><Path d="M12 7v5l4 2" fill="none" stroke={colors.white} strokeWidth={1.8} strokeLinecap="round" /></>}
            {value.kind === "mental" && <Path d="M12 5C9 1 5 4 5 7C1 8 2 13 4 14C2 18 8 22 12 19C16 22 22 18 20 14C22 11 22 8 19 7C19 4 15 1 12 5ZM12 5V19M5 8L8 10M4 14L8 14M19 8L16 10M20 14L16 14" fill="none" stroke={colors.white} strokeWidth={1.5} strokeLinecap="round" />}
            {value.kind === "physical" && <><Path d="M7 12h10M3 9v6M21 9v6" stroke={colors.white} strokeWidth={2} strokeLinecap="round" /><Rect x={5} y={6} width={3} height={12} rx={1} fill={colors.white} /><Rect x={16} y={6} width={3} height={12} rx={1} fill={colors.white} /></>}
            {value.kind === "social" && <><Circle cx={12} cy={7} r={3} fill={colors.white} /><Circle cx={5} cy={9} r={2.3} fill={colors.white} /><Circle cx={19} cy={9} r={2.3} fill={colors.white} /><Path d="M7 20v-4a5 5 0 0 1 10 0v4ZM1 18v-3q0-4 5-3v6ZM18 18v-6q5-1 5 3v3Z" fill={colors.white} /></>}
          </Svg>
          </View>
          <Text style={{ flex: 1, fontFamily: fonts.bold, fontSize: 14, color: colors.ink }}>{meta.label}</Text>
          <Text style={{ fontFamily: fonts.number, fontSize: 21, color: percent > 100 ? colors.coralDark : meta.color }}>{percent}%</Text>
        </View>
        <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted }}>{state}</Text>
      </View>;
    })}
  </View>;
}
