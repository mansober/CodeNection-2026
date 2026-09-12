import { StyleSheet, View } from "react-native";
import Svg, { Circle, ClipPath, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { colors } from "@/theme/tokens";

// Visual adaptation of the user-supplied Rimbun forest theme. No Rimbun state or rules.
export function ForestBackdrop() {
  return <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><Svg width="100%" height="100%" viewBox="0 0 440 920" preserveAspectRatio="xMidYMid slice">
    <Defs><LinearGradient id="santai-sky" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#071F19" /><Stop offset="0.46" stopColor="#123F31" /><Stop offset="1" stopColor="#1A4A36" /></LinearGradient></Defs>
    <Rect width={440} height={920} fill="url(#santai-sky)" />
    <Circle cx={110} cy={118} r={118} fill="#77A177" opacity={0.08} />
    <G fill="#87A88A" opacity={0.14}><Path d="M40 0C63 142 28 278 56 448s6 314-21 472h38c14-212-2-326 5-483C91 252 95 113 82 0Z" /><Path d="M177 0c-8 148 27 260 10 424-18 172 10 326 0 496h34c-7-180-1-338 4-489 6-181-3-306-10-431Z" /><Path d="M348 0c-1 127-24 243-8 405 16 163-3 342 12 515h37c-25-198 0-341-14-516-13-162 18-293 13-404Z" /></G>
    <Path d="M0 0h440v62c-38 28-69 10-87-18-31 44-76 37-94-4-29 39-70 37-95-4-34 46-76 39-96 6C44 73 18 75 0 59Z" fill="#061A15" />
    <Path d="M27 0c-7 84 19 118 10 192-7 60 14 87 36 111M407 0c-42 73-9 130-43 202-18 38-12 89 15 124" stroke="#70916D" strokeWidth={4} fill="none" opacity={0.5} />
    <Path d="M31 0c12 91 2 180 51 248M409 0c-13 102 11 182-24 256" stroke="#183F2E" strokeWidth={10} fill="none" />
    <Path d="M0 710Q75 623 162 694t164-8q65-38 114 11v223H0Z" fill="#061E17" opacity={0.4} />
  </Svg></View>;
}

// An original S-shaped resting river, beneath two leaves: Santai's mark.
export function SantaiLogo({ size = 36, light = false }: { size?: number; light?: boolean }) {
  return <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityElementsHidden>
    <Path d="M70 26C42 13 24 29 32 44C38 56 72 47 71 64C70 78 43 86 27 73" stroke={light ? colors.white : colors.forest} strokeWidth={12} strokeLinecap="round" fill="none" />
    <Path d="M51 21C38 21 33 11 36 4C47 4 56 10 51 21Z" fill={colors.moss} />
    <Path d="M54 20C54 9 63 4 73 7C70 18 63 23 54 20Z" fill={light ? colors.waterBright : colors.waterDeep} />
    <Path d="M32 85Q50 92 69 83" stroke={colors.water} strokeWidth={4} strokeLinecap="round" fill="none" />
  </Svg>;
}

export function ForestPool({ level = 65, height = 200 }: { level?: number; height?: number }) {
  const y = 258 - Math.max(0, Math.min(100, level)) * 0.9;
  return <View style={{ height, overflow: "hidden", borderRadius: 22 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><Svg width="100%" height="100%" viewBox="0 0 440 300" preserveAspectRatio="xMidYMid slice">
    <Defs><LinearGradient id="santai-pool-bg" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#08261D" /><Stop offset="1" stopColor="#527761" /></LinearGradient><LinearGradient id="santai-water" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#B6E3D5" /><Stop offset="1" stopColor="#2D7B72" /></LinearGradient><ClipPath id="santai-basin"><Path d="M80 184C119 150 170 156 201 164C261 140 333 162 358 191C382 221 323 272 220 273C137 274 53 229 80 184Z" /></ClipPath></Defs>
    <Rect width={440} height={300} fill="url(#santai-pool-bg)" /><Circle cx={226} cy={91} r={76} fill="#B8D5A4" opacity={0.08} />
    <G stroke="#8FAE89" opacity={0.15} strokeWidth={9}><Path d="M119 0Q99 104 120 196M293 0Q311 124 289 195M348 0Q330 113 350 196" /></G>
    <Path d="M0 201Q78 153 158 189T301 178T440 195V300H0Z" fill="#274D3B" />
    <Path d="M72 179C112 139 170 143 201 152C265 128 344 148 369 185C403 228 323 287 220 287C132 290 39 231 72 179Z" fill="#6D8863" />
    <Path d="M80 184C119 150 170 156 201 164C261 140 333 162 358 191C382 221 323 272 220 273C137 274 53 229 80 184Z" fill="#0A2A21" />
    <G clipPath="url(#santai-basin)"><Rect x={60} y={y} width={330} height={150} fill="url(#santai-water)" /><Path d={`M65 ${y+3}Q140 ${y-7} 214 ${y+3}T390 ${y}`} stroke="#E2F4E8" strokeWidth={2} fill="none" /><Ellipse cx={217} cy={y+30} rx={75} ry={9} stroke="#D6F0E5" opacity={0.5} fill="none" /><Ellipse cx={217} cy={y+30} rx={36} ry={4} stroke="#D6F0E5" opacity={0.5} fill="none" /></G>
    <Path d="M0 0H440V37Q397 71 356 31Q312 59 276 18Q216 50 183 16Q135 59 92 31Q36 71 0 43Z" fill="#061A15" />
    <Path d="M23 0Q45 112 41 237M410 0Q385 118 408 251" stroke="#123D2D" strokeWidth={25} fill="none" />
    <Path d="M36 284Q-6 235 10 202Q46 216 54 259Q45 210 79 204Q89 238 54 286M389 292Q347 241 356 215Q391 225 399 269Q392 217 427 209Q441 247 408 292" fill="#76945E" />
    <Ellipse cx={96} cy={216} rx={22} ry={12} fill="#A1AC86" /><Ellipse cx={348} cy={202} rx={21} ry={10} fill="#8B9B7B" />
  </Svg></View>;
}

/** Exact height of the grass band, in px. The nav bar pads its content by this much
 *  so the icons always start just below the grass, whatever the bar's height is. */
export const GRASS_HEIGHT = 30;

// One smooth, even hump repeated 11× — a simple scalloped skyline, not random blades.
const GRASS_HUMPS = Array.from({ length: 11 }, (_, i) => `Q${i * 40 + 20} 4 ${i * 40 + 40} 14`).join(" ");
const GRASS_TOP = `M0 14 ${GRASS_HUMPS} L440 40 L0 40 Z`;

const PEBBLES = [
  { x: 46, y: 52, rx: 7, ry: 3.5 },
  { x: 138, y: 76, rx: 5, ry: 2.5 },
  { x: 224, y: 48, rx: 8, ry: 4 },
  { x: 312, y: 70, rx: 5, ry: 2.5 },
  { x: 396, y: 54, rx: 7, ry: 3.5 },
];

export function ForestFloor() {
  return <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 440 100" preserveAspectRatio="none">
      <Defs><LinearGradient id="santai-soil" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={colors.soil} /><Stop offset="1" stopColor={colors.soilDark} /></LinearGradient></Defs>
      <Rect width={440} height={80} fill="url(#santai-soil)" />
      <Rect y={46} width={440} height={1.5} fill={colors.soilDark} opacity={0.35} />
      <Rect y={78} width={440} height={1.5} fill={colors.soilDark} opacity={0.25} />
      {PEBBLES.map((p, i) => <Ellipse key={i} cx={p.x} cy={p.y} rx={p.rx} ry={p.ry} fill={colors.soilDark} opacity={0.3} />)}
    </Svg>
    {/* A fixed-height band sitting directly on the soil, so the grass is always exactly
        on top of it rather than a percentage of a stretched viewBox. */}
    <Svg style={{ position: "absolute", top: -10, left: 0, right: 0 }} width="100%" height={GRASS_HEIGHT} viewBox="0 0 440 40" preserveAspectRatio="none">
      <Path d={GRASS_TOP} fill={colors.leaf} />
      <Rect y={35} width={440} height={4} fill={colors.fern} opacity={0.5} />
    </Svg>
  </View>;
}
