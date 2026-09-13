import { useEffect, useId, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Platform, Text, View } from "react-native";
import Svg, { ClipPath, Defs, Ellipse, G, LinearGradient, Path, Stop } from "react-native-svg";
import { colors, fonts } from "@/theme/tokens";

/** Blend two theme colours; t = 0 is the wilted end, t = 1 the healthy end. */
function mix(from: string, to: string, t: number) {
  const parse = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const [r1, g1, b1] = parse(from);
  const [r2, g2, b2] = parse(to);
  const at = (a: number, b: number) => Math.round(a + (b - a) * t);
  return `rgb(${at(r1, r2)},${at(g1, g2)},${at(b1, b2)})`;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

type Point = { x: number; y: number };

const cubicAt = (p: Point[], t: number): Point => {
  const u = 1 - t;
  return {
    x: u * u * u * p[0].x + 3 * u * u * t * p[1].x + 3 * u * t * t * p[2].x + t * t * t * p[3].x,
    y: u * u * u * p[0].y + 3 * u * u * t * p[1].y + 3 * u * t * t * p[2].y + t * t * t * p[3].y,
  };
};

const cubicDir = (p: Point[], t: number): Point => {
  const u = 1 - t;
  return {
    x: 3 * u * u * (p[1].x - p[0].x) + 6 * u * t * (p[2].x - p[1].x) + 3 * t * t * (p[3].x - p[2].x),
    y: 3 * u * u * (p[1].y - p[0].y) + 6 * u * t * (p[2].y - p[1].y) + 3 * t * t * (p[3].y - p[2].y),
  };
};

/** The stem as a filled ribbon that tapers base-to-tip, not a uniform capsule stroke. */
function taperedStem(spine: Point[], baseWidth: number, tipWidth: number, steps = 20) {
  const left: string[] = [];
  const right: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const point = cubicAt(spine, t);
    const dir = cubicDir(spine, t);
    const len = Math.hypot(dir.x, dir.y) || 1;
    const half = (baseWidth + (tipWidth - baseWidth) * t ** 0.85) / 2;
    const nx = (-dir.y / len) * half;
    const ny = (dir.x / len) * half;
    left.push(`${(point.x + nx).toFixed(1)} ${(point.y + ny).toFixed(1)}`);
    right.push(`${(point.x - nx).toFixed(1)} ${(point.y - ny).toFixed(1)}`);
  }
  return `M${left.join(" L")} L${right.reverse().join(" L")} Z`;
}

/** One blade: asymmetric and gently curved, with its own shading and sheen shapes. */
function blade(length: number, halfWidth: number, bend: number, arc: number) {
  const spine: Point[] = [
    { x: 0, y: 0 },
    { x: length * 0.3, y: -arc },
    { x: length * 0.7, y: bend * 0.35 },
    { x: length, y: bend },
  ];
  const midrib = `M0 0 C${length * 0.3} ${-arc}, ${length * 0.7} ${bend * 0.35}, ${length} ${bend}`;
  const lower = `C${length * 0.66} ${bend + halfWidth * 0.86}, ${length * 0.2} ${halfWidth * 0.9}, 0 0`;
  return {
    spine, midrib,
    outline: `M0 0 C${length * 0.14} ${-halfWidth * 0.62}, ${length * 0.52} ${-halfWidth * 1.02 - arc * 0.3}, ${length} ${bend} ${lower} Z`,
    shade: `${midrib} ${lower} Z`,
    sheen: `M${length * 0.07} ${-halfWidth * 0.12} C${length * 0.2} ${-halfWidth * 0.6}, ${length * 0.44} ${-halfWidth * 0.8}, ${length * 0.63} ${-halfWidth * 0.52}`
      + ` C${length * 0.42} ${-halfWidth * 0.28}, ${length * 0.2} ${-halfWidth * 0.1}, ${length * 0.07} ${-halfWidth * 0.12} Z`,
  };
}

/**
 * Every dimension of the plant derived from one 0..1 health value, so energy and the
 * drawing can never drift apart: at 0 the stem crooks over under a small shrivelled
 * blade, at 1 it stands tall carrying a long, broad, deeply veined leaf.
 */
function leafShape(h: number) {
  const tipX = 104 + (1 - h) * 46;
  const tipY = 96 + (1 - h) * 84;
  const spine: Point[] = [
    { x: 46, y: 306 },
    { x: 50, y: 236 - h * 6 },
    { x: 58 + h * 16, y: 140 - h * 30 },
    { x: tipX, y: tipY },
  ];
  const length = 96 + h * 76;
  const halfWidth = 22 + h * 40;
  const bend = 8 + (1 - h) * 30;
  const arc = 6 + h * 12;
  const main = blade(length, halfWidth, bend, arc);
  const veins = [0.1, 0.24, 0.38, 0.52, 0.66, 0.79].map(t => {
    const m = cubicAt(main.spine, t);
    const d = cubicDir(main.spine, t);
    const len = Math.hypot(d.x, d.y) || 1;
    const dx = d.x / len;
    const dy = d.y / len;
    const w = halfWidth * Math.sin(Math.PI * t) ** 0.65;
    const reach = length * 0.15;
    const branch = (side: number) => `M${m.x.toFixed(1)} ${m.y.toFixed(1)}`
      + ` Q${(m.x + dx * reach * 0.4 - side * dy * w * 0.42).toFixed(1)} ${(m.y + dy * reach * 0.4 + side * dx * w * 0.42).toFixed(1)},`
      + ` ${(m.x + dx * reach - side * dy * w * 0.8).toFixed(1)} ${(m.y + dy * reach + side * dx * w * 0.8).toFixed(1)}`;
    return { up: branch(-1), down: branch(1) };
  });
  return {
    tipX, tipY, veins, main,
    angle: 70 - h * 82,
    stem: taperedStem(spine, 9 + h * 7, 3.5 + h * 3.5),
    stemLine: `M46 306 C50 ${236 - h * 6}, ${58 + h * 16} ${140 - h * 30}, ${tipX} ${tipY}`,
    backAt: cubicAt(spine, 0.84),
    back: blade(length * 0.6, halfWidth * 0.58, bend * 0.7, arc * 0.6),
  };
}

/** Side shoots when thriving, shed leaves on the ground when spent. */
function SmallLeaf({ x, y, angle, length, halfWidth, opacity, fill, stroke }: { x: number; y: number; angle: number; length: number; halfWidth: number; opacity: number; fill: string; stroke: string }) {
  const d = `M0 0 C${length * 0.25} ${-halfWidth}, ${length * 0.72} ${-halfWidth * 0.8}, ${length} 0`
    + ` C${length * 0.7} ${halfWidth * 0.8}, ${length * 0.25} ${halfWidth}, 0 0 Z`;
  return <G transform={`translate(${x} ${y}) rotate(${angle})`} opacity={opacity}>
    <Path d={d} fill={fill} stroke={stroke} strokeWidth={0.8} strokeOpacity={0.5} />
  </G>;
}

/** A gentle breeze; reduced-motion users see the same illustration without movement. */
export function LeafIllustration({ energy, height = 230 }: { energy: number; height?: number }) {
  const [breeze] = useState(() => new Animated.Value(0));
  useEffect(() => {
    let active = true;
    let loop: Animated.CompositeAnimation | undefined;
    const update = (reduced: boolean) => {
      loop?.stop(); breeze.setValue(0);
      if (!active || reduced) return;
      loop = Animated.loop(Animated.sequence([
        Animated.timing(breeze, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== "web", isInteraction: false }),
        Animated.timing(breeze, { toValue: -1, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== "web", isInteraction: false }),
      ]));
      loop.start();
    };
    AccessibilityInfo.isReduceMotionEnabled().then(update).catch(() => update(true));
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", update);
    return () => { active = false; loop?.stop(); subscription.remove(); };
  }, [breeze]);
  const value = Math.max(0, Math.min(100, Number.isFinite(energy) ? energy : 0));
  const health = value / 100;
  const uid = useId().replace(/:/g, "");
  const shape = leafShape(health);
  // Dry ambers and browns at empty, living greens at full — one continuous blend.
  const edge = mix(colors.soilDark, colors.forest, health);
  const veinColor = mix(colors.amber, colors.mint, health);
  const veinOpacity = 0.12 + health * 0.5;
  const shoots = clamp01((health - 0.55) / 0.45);
  const shed = clamp01((0.45 - health) / 0.45);
  const sway = 1 + health * 2;
  return <Animated.View pointerEvents="none" style={{ height, transform: [{ rotate: breeze.interpolate({ inputRange: [-1, 1], outputRange: [`-${sway}deg`, `${sway}deg`] }) }, { translateY: breeze.interpolate({ inputRange: [-1, 1], outputRange: [2, -2] }) }] }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Svg width="100%" height="100%" viewBox="0 0 290 320">
      <Defs>
        <LinearGradient id={`leaf-fill-${uid}`} x1="0.1" y1="0" x2="0.75" y2="1">
          <Stop offset="0" stopColor={mix(colors.amber, colors.leaf, health)} />
          <Stop offset="0.35" stopColor={mix(colors.coral, colors.moss, health)} />
          <Stop offset="0.72" stopColor={mix(colors.coralDark, colors.fern, health)} />
          <Stop offset="1" stopColor={mix(colors.soilDark, colors.forest, health)} />
        </LinearGradient>
        <ClipPath id={`leaf-veins-${uid}`}><Path d={shape.main.outline} /></ClipPath>
      </Defs>
      <Ellipse cx={52} cy={313} rx={36 + health * 16} ry={4.5 + health * 2} fill={colors.deepForest} opacity={0.2 + health * 0.1} />
      {shed > 0.01 ? <>
        <SmallLeaf x={108} y={302} angle={12} length={30} halfWidth={10} opacity={shed * 0.85} fill={mix(colors.amber, colors.leaf, 0.1)} stroke={edge} />
        <SmallLeaf x={18} y={306} angle={-18} length={24} halfWidth={8} opacity={shed * 0.7} fill={mix(colors.soilDark, colors.leaf, 0.15)} stroke={edge} />
      </> : null}
      {/* A second blade set behind the first, for depth once the plant is thriving. */}
      {shoots > 0.01 ? <G transform={`translate(${shape.backAt.x.toFixed(1)} ${shape.backAt.y.toFixed(1)}) rotate(34)`} opacity={shoots * 0.9}>
        <Path d={shape.back.outline} fill={mix(colors.fern, colors.forest, 0.45)} />
      </G> : null}
      <Path d={shape.stem} fill={mix(colors.amber, colors.moss, health)} />
      {/* The vein running up the stem: faint when spent, bright and thick when fed. */}
      <Path d={shape.stemLine} fill="none" stroke={mix(colors.amber, colors.leaf, health)} strokeWidth={1 + health * 1.6} strokeLinecap="round" opacity={0.25 + health * 0.5} />
      {shoots > 0.01 ? <>
        <SmallLeaf x={62} y={190} angle={196} length={36} halfWidth={12} opacity={shoots} fill={mix(colors.coral, colors.moss, health)} stroke={edge} />
        <SmallLeaf x={80} y={130} angle={206} length={29} halfWidth={9} opacity={shoots * 0.9} fill={mix(colors.coral, colors.moss, health)} stroke={edge} />
      </> : null}
      <G transform={`translate(${shape.tipX} ${shape.tipY}) rotate(${shape.angle})`}>
        <Path d={shape.main.outline} fill={`url(#leaf-fill-${uid})`} />
        <G clipPath={`url(#leaf-veins-${uid})`}>
          <Path d={shape.main.shade} fill={mix(colors.soilDark, colors.forest, health)} opacity={0.26} />
          <Path d={shape.main.sheen} fill={colors.mint} opacity={0.08 + health * 0.13} />
          <Path d={shape.main.midrib} fill="none" stroke={veinColor} strokeWidth={1.1 + health * 1.5} strokeLinecap="round" opacity={veinOpacity} />
          {shape.veins.map((vein, i) => <G key={i}>
            <Path d={vein.up} fill="none" stroke={veinColor} strokeWidth={0.6 + health * 0.9} strokeLinecap="round" opacity={veinOpacity * 0.8} />
            <Path d={vein.down} fill="none" stroke={veinColor} strokeWidth={0.6 + health * 0.9} strokeLinecap="round" opacity={veinOpacity * 0.8} />
          </G>)}
        </G>
        <Path d={shape.main.outline} fill="none" stroke={edge} strokeWidth={1} opacity={0.45} />
      </G>
    </Svg>
  </Animated.View>;
}

export function EnergyLeaf({ energy }: { energy: number }) {
  const value = Math.max(0, Math.min(100, Math.round(energy)));
  const state = value < 30 ? "A little rest would help." : value < 60 ? "Keep some room to recover." : "Room for the day ahead.";
  return <View
    accessible
    accessibilityLabel={`Today's energy, ${value} out of 100 left. ${state}`}
    style={{ height: 132, flexDirection: "row", alignItems: "flex-start" }}
  >
    <View style={{ flex: 1, zIndex: 1 }}>
      <View style={{ flexDirection: "row", alignItems: "baseline" }}>
        <Text style={{ fontFamily: fonts.number, fontSize: 46, lineHeight: 52, color: colors.white }}>{value}</Text>
        <Text style={{ fontFamily: fonts.regular, fontSize: 17, lineHeight: 24, color: colors.mint }}> / 100</Text>
      </View>
      <Text style={{ fontFamily: fonts.medium, fontSize: 14, lineHeight: 19, color: colors.mint }}>energy left</Text>
      <Text style={{ fontFamily: fonts.regular, fontSize: 16, lineHeight: 22, color: colors.white, marginTop: 10 }}>{state}</Text>
    </View>
    <View pointerEvents="none" style={{ position: "absolute", right: -8, top: -16, width: "46%", height: 148 }}>
      <LeafIllustration energy={value} height={148} />
    </View>
  </View>;
}

function LeafAccent({ size, color }: { size: number; color: string }) {
  return <Svg width={size} height={size} viewBox="0 0 40 40" accessibilityElementsHidden><Path d="M5 31C7 13 17 5 35 5c-1 18-11 28-29 29 8-7 15-14 22-22" fill={color} stroke="#DDE49C" strokeWidth={1.2} strokeLinecap="round" /></Svg>;
}

/** A more playful first impression built from the same leaf language as the dashboard. */
export function WelcomeLeafScene() {
  const [drift] = useState(() => new Animated.Value(0));
  useEffect(() => {
    let active = true;
    let loop: Animated.CompositeAnimation | undefined;
    const update = (reduced: boolean) => {
      loop?.stop(); drift.setValue(0);
      if (!active || reduced) return;
      loop = Animated.loop(Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== "web", isInteraction: false }),
        Animated.timing(drift, { toValue: -1, duration: 3600, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== "web", isInteraction: false }),
      ]));
      loop.start();
    };
    AccessibilityInfo.isReduceMotionEnabled().then(update).catch(() => update(true));
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", update);
    return () => { active = false; loop?.stop(); subscription.remove(); };
  }, [drift]);
  const float = drift.interpolate({ inputRange: [-1, 1], outputRange: [8, -8] });
  return <View pointerEvents="none" style={{ width: "100%", maxWidth: 320, height: 250 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Animated.View style={{ position: "absolute", inset: 0, transform: [{ translateY: float }] }}><LeafIllustration energy={100} height={250} /></Animated.View>
    <Animated.View style={{ position: "absolute", left: 14, top: 50, transform: [{ translateY: drift.interpolate({ inputRange: [-1, 1], outputRange: [-5, 9] }) }, { rotate: "-18deg" }] }}><LeafAccent size={34} color="#91B85B" /></Animated.View>
    <Animated.View style={{ position: "absolute", right: 12, top: 24, transform: [{ translateY: drift.interpolate({ inputRange: [-1, 1], outputRange: [7, -10] }) }, { rotate: "32deg" }] }}><LeafAccent size={27} color="#74B9AF" /></Animated.View>
    <Animated.View style={{ position: "absolute", right: 52, bottom: 16, transform: [{ translateY: drift.interpolate({ inputRange: [-1, 1], outputRange: [-8, 5] }) }, { rotate: "105deg" }] }}><LeafAccent size={22} color="#C4CE76" /></Animated.View>
  </View>;
}
