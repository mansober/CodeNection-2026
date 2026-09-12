import { useId, useState } from "react";
import { Text, View } from "react-native";
import Svg, { Circle, ClipPath, Defs, G, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { CapacityKind, CapacityValue, capacityMeta } from "@/models/margin";
import { colors, type } from "@/theme/tokens";

function CapacityGlyph({ kind, size }: { kind: CapacityKind; size: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden>
    {kind === "time" && <><Circle cx={12} cy={12} r={8} fill="none" stroke={colors.white} strokeWidth={2.1} /><Path d="M12 7v5l4 2" fill="none" stroke={colors.white} strokeWidth={2.1} strokeLinecap="round" /></>}
    {kind === "mental" && <Path d="M12 5C9 1 5 4 5 7C1 8 2 13 4 14C2 18 8 22 12 19C16 22 22 18 20 14C22 11 22 8 19 7C19 4 15 1 12 5ZM12 5V19M5 8L8 10M4 14L8 14M19 8L16 10M20 14L16 14" fill="none" stroke={colors.white} strokeWidth={1.7} strokeLinecap="round" />}
    {kind === "physical" && <><Path d="M7 12h10M3 9v6M21 9v6" stroke={colors.white} strokeWidth={2.2} strokeLinecap="round" /><Rect x={5} y={6} width={3} height={12} rx={1} fill={colors.white} /><Rect x={16} y={6} width={3} height={12} rx={1} fill={colors.white} /></>}
    {kind === "social" && <><Circle cx={12} cy={7} r={3} fill={colors.white} /><Circle cx={5} cy={9} r={2.3} fill={colors.white} /><Circle cx={19} cy={9} r={2.3} fill={colors.white} /><Path d="M7 20v-4a5 5 0 0 1 10 0v4ZM1 18v-3q0-4 5-3v6ZM18 18v-6q5-1 5 3v3Z" fill={colors.white} /></>}
  </Svg>;
}

/**
 * A compact water gauge. The fill is exactly `percent` of the track width — measured in
 * real pixels so the SVG is never stretched — with a meniscus curve at the surface and a
 * little depth shading, so it reads as liquid rather than a plain progress bar.
 * Past 100% the water fills the track; the figure beside it still shows the true number.
 */
function WaterBar({ percent, color, height = 13 }: { percent: number; color: string; height?: number }) {
  const [width, setWidth] = useState(0);
  const uid = useId().replace(/:/g, "");
  const filled = width * (Math.max(0, Math.min(100, percent)) / 100);
  // A gentle S-curve at the water's edge, but only when there is room to draw one.
  const amp = filled > 7 && filled < width - 1 ? 2.4 : 0;
  const surface = amp
    ? `C${filled + amp} ${height * 0.34}, ${filled - amp} ${height * 0.66}, ${filled} ${height}`
    : `V${height}`;
  const bubbles = filled > 30
    ? [{ cx: filled * 0.3, cy: height * 0.64, r: 1.5 }, { cx: filled * 0.56, cy: height * 0.34, r: 1.1 }, { cx: filled * 0.79, cy: height * 0.66, r: 1.3 }]
    : [];
  return <View style={{ flex: 1, height }} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    {width > 0 ? <Svg width={width} height={height}>
      <Defs>
        <ClipPath id={`track-${uid}`}><Rect x={0} y={0} width={width} height={height} rx={height / 2} /></ClipPath>
        <LinearGradient id={`water-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.7} />
          <Stop offset="1" stopColor={color} stopOpacity={1} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={height} rx={height / 2} fill={color} fillOpacity={0.13} />
      <G clipPath={`url(#track-${uid})`}>
        <Path d={`M0 0 H${filled} ${surface} H0 Z`} fill={`url(#water-${uid})`} />
        {filled > 12 ? <Rect x={3} y={2.4} width={Math.max(0, filled - 9)} height={1.4} rx={0.7} fill={colors.white} opacity={0.3} /> : null}
        {bubbles.map((b, i) => <Circle key={i} cx={b.cx} cy={b.cy} r={b.r} fill={colors.white} opacity={0.28} />)}
      </G>
      <Rect x={0.5} y={0.5} width={width - 1} height={height - 1} rx={(height - 1) / 2} fill="none" stroke={color} strokeOpacity={0.24} strokeWidth={1} />
    </Svg> : null}
  </View>;
}

export function DashboardCapacities({ values }: { values: CapacityValue[] }) {
  return <View style={{ backgroundColor: colors.paper, borderRadius: 16, borderWidth: 1, borderColor: colors.outlineSoft, paddingHorizontal: 12, paddingVertical: 11, gap: 10 }}>
    {values.map(value => {
      const meta = capacityMeta[value.kind];
      const percent = Math.round(value.used / Math.max(1, value.limit) * 100);
      const state = percent > 100 ? "Over limit" : percent >= 80 ? "Nearly full" : percent >= 60 ? "Steady" : "Room left";
      return <View key={value.kind} accessible accessibilityLabel={`${meta.label} at ${percent} percent, ${state}`} style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
        <View style={{ width: 20, height: 20, borderRadius: 6, backgroundColor: meta.color, alignItems: "center", justifyContent: "center" }}>
          <CapacityGlyph kind={value.kind} size={13} />
        </View>
        {/* One typographic voice for the row: the app's own body/label scale, not the
            SpaceGrotesk display numerals, which are meant for the hero figures. */}
        <Text style={{ ...type.bodySmall, width: 64, color: colors.ink }}>{meta.label}</Text>
        <WaterBar percent={percent} color={meta.color} />
        {/* The number carries the over-limit signal in text, never colour alone. */}
        <Text style={{ ...type.label, width: 46, textAlign: "right", color: percent > 100 ? colors.coralDark : colors.ink }}>{percent}%</Text>
      </View>;
    })}
  </View>;
}
