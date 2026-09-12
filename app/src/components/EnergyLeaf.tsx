import { Text, View } from "react-native";
import Svg, { Defs, Ellipse, G, LinearGradient, Path, Stop } from "react-native-svg";
import { colors, fonts } from "@/theme/tokens";

/** One leaf: size, droop and colour all communicate the same planning estimate. */
export function LeafIllustration({ energy, height = 230 }: { energy: number; height?: number }) {
  const value = Math.max(0, Math.min(100, Number.isFinite(energy) ? energy : 0));
  const health = value / 100;
  return <Svg width="100%" height={height} viewBox="0 0 270 260" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Defs><LinearGradient id="leaf-fill" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor={value < 30 ? "#A39950" : "#91BE65"} /><Stop offset="1" stopColor={value < 30 ? "#B77A3D" : value < 60 ? "#B8B455" : "#348859"} /></LinearGradient></Defs>
    <Ellipse cx={90} cy={246} rx={48} ry={7} fill="#061A15" opacity={0.3} />
    <Path d="M80 240C85 180 80 91 117 58Q136 40 147 66" fill="none" stroke="#6F9955" strokeWidth={7} strokeLinecap="round" />
    <Path d="M80 240C85 180 80 91 117 58Q136 40 147 66" fill="none" stroke="#ACCA78" strokeWidth={2} strokeLinecap="round" />
    <G transform={`translate(147 66) rotate(${22 - health * 47}) scale(${0.62 + health * 0.38})`}>
      <Path d="M0 0C-51 24-60 78-29 114C-10 137 28 135 43 162C57 132 66 90 43 50C30 26 11 13 0 0Z" fill="url(#leaf-fill)" stroke="#B8CA78" strokeWidth={2} />
      <Path d="M0 3Q-3 58 17 103T43 157M-1 34L-28 51M2 57L-34 79M8 82L-22 105M15 104L-6 120M-1 28L22 39M1 51L38 66M7 77L47 92M16 103L49 119" fill="none" stroke={value < 30 ? "#E2C184" : "#CEE197"} strokeWidth={2} strokeLinecap="round" opacity={0.8} />
    </G>
  </Svg>;
}

export function EnergyLeaf({ energy }: { energy: number }) {
  const value = Math.max(0, Math.min(100, Math.round(energy)));
  const state = value < 30 ? "A little rest would help." : value < 60 ? "Keep some room to recover." : "Room for the day ahead.";
  return <View style={{ paddingHorizontal: 24, paddingBottom: 22 }}>
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <View style={{ flex: 1.2, gap: 10 }} accessible accessibilityLabel={`Today's energy, ${value} out of 100 left. ${state}`}>
        <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.mint }}>TODAY’S ENERGY</Text>
        <Text style={{ fontFamily: fonts.number, fontSize: 52, color: colors.white }}>{value}<Text style={{ fontFamily: fonts.regular, fontSize: 18 }}> / 100 left</Text></Text>
        <Text style={{ fontFamily: fonts.regular, fontSize: 18, lineHeight: 25, color: colors.white }}>{state}</Text>
      </View>
      <View style={{ flex: 1 }}><LeafIllustration energy={value} /></View>
    </View>
    <Text style={{ fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.mint }}>Your leaf grows smaller and droops as energy runs low.</Text>
  </View>;
}
