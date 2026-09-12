import { Text, View } from "react-native";
import Svg, { ClipPath, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop, Text as SvgText } from "react-native-svg";
import { colors, fonts } from "@/theme/tokens";

// Adapted from WaterReservoir in the user's rimbun-forest-final.zip.
// Only the visual is reused: Santai's existing energy calculation stays unchanged.
export function EnergyReservoir({ energy }: { energy: number }) {
  const safe = Math.round(Math.max(0, Math.min(100, energy)));
  const waterY = 326 - safe * 2.56;
  const bowl = "M52 106C82 71 137 62 188 74c50-17 121-5 162 29 26 21 30 61 16 100-20 57-73 116-157 123-82 7-148-39-169-99-17-48-12-92 12-121Z";
  return <View style={{ backgroundColor: "#0B3025", borderRadius: 26, padding: 18, gap: 6 }}>
    <Text style={{ fontFamily: fonts.bold, fontSize: 14, letterSpacing: 1, color: "#D8EAC8" }}>TODAY’S ENERGY</Text>
    <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }} accessibilityLabel={`${safe} out of 100 energy remaining`}><Text style={{ fontFamily: fonts.number, fontSize: 48, lineHeight: 56, color: "#FAF8E6" }}>{safe}</Text><Text style={{ fontFamily: fonts.regular, fontSize: 18, color: "#D8EAC8" }}>/ 100 left</Text></View>
    <Text style={{ fontFamily: fonts.regular, fontSize: 16, lineHeight: 22, color: "#D8EAC8" }}>{safe >= 70 ? "Room for the day ahead" : safe >= 35 ? "Keep some room for yourself" : "Time to replenish, gently"}</Text>
    <Svg width="100%" height={245} viewBox="0 40 420 320" accessibilityElementsHidden>
      <Defs><LinearGradient id="energy-water" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#BCE8DA" /><Stop offset=".22" stopColor="#76C2B6" /><Stop offset="1" stopColor="#286E68" /></LinearGradient><LinearGradient id="energy-rock" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#688A60" /><Stop offset="1" stopColor="#274E39" /></LinearGradient><ClipPath id="energy-bowl"><Path d={bowl} /></ClipPath></Defs>
      <Ellipse cx={205} cy={338} rx={161} ry={12} fill="#031711" opacity={0.35} />
      <Path d="M48 102C83 60 136 54 188 66c57-18 129-4 169 31 31 28 33 72 17 114-23 61-80 120-165 127-87 7-157-41-179-107-17-51-9-99 18-129Z" fill="url(#energy-rock)" />
      <Path d={bowl} fill="#061F19" />
      <G clipPath="url(#energy-bowl)">
        <Rect x={24} y={waterY} width={372} height={330} fill="url(#energy-water)" />
        {safe > 0 && <><Path d={`M19 ${waterY + 2}q38-5 76 0t76 0t76 0t76 0t76 0`} stroke="#F3FFF5" strokeWidth={4} fill="none" /><Ellipse cx={212} cy={Math.min(320, waterY + 36)} rx={76} ry={10} stroke="#E2F6EB" strokeWidth={1.5} opacity={0.5} fill="none" /></>}
      </G>
      <Path d="M46 112c-31-6-36-27-24-55 14 22 35 24 55 10M352 106c32 1 46-17 44-48-19 17-39 15-59-1" stroke="#8AA676" strokeWidth={7} strokeLinecap="round" fill="none" />
      {[0, 50, 100].map(n => <G key={n}><Path d={`M381 ${326 - n * 2.56}h9`} stroke="#D8EAC8" strokeWidth={1.5} /><SvgText x={395} y={331 - n * 2.56} fill="#D8EAC8" fontSize={14}>{n}</SvgText></G>)}
    </Svg>
    <Text style={{ fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.mint }}>The waterline shows your estimated energy left—not your workload.</Text>
  </View>;
}
