import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Platform, Text, View } from "react-native";
import Svg, { ClipPath, Defs, Ellipse, G, LinearGradient, Path, Stop } from "react-native-svg";
import { colors, fonts } from "@/theme/tokens";

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
  return <Animated.View pointerEvents="none" style={{ height, transform: [{ rotate: breeze.interpolate({ inputRange: [-1, 1], outputRange: ["-2deg", "2deg"] }) }, { translateY: breeze.interpolate({ inputRange: [-1, 1], outputRange: [2, -2] }) }] }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Svg width="100%" height="100%" viewBox="0 0 290 320">
      <Defs><LinearGradient id="leaf-fill" x1="0" y1="0" x2="0.8" y2="1"><Stop offset="0" stopColor={value < 30 ? "#A39B4D" : "#83AE45"} /><Stop offset="0.6" stopColor={value < 30 ? "#B5A352" : "#9ABD59"} /><Stop offset="1" stopColor={value < 30 ? "#D8993D" : value < 60 ? "#CFBD58" : "#4A9253"} /></LinearGradient></Defs>
      <Ellipse cx={54} cy={308} rx={43} ry={6} fill="#061A15" opacity={0.25} />
      <Path d="M36 301C44 217 57 106 99 56Q135 18 153 59" fill="none" stroke="#729B4D" strokeWidth={9} strokeLinecap="round" />
      <Path d="M36 301C44 217 57 106 99 56Q135 18 153 59" fill="none" stroke="#BBCC70" strokeWidth={3} strokeLinecap="round" />
      <G transform={`translate(153 59) rotate(${10 - health * 14}) scale(${0.76 + health * 0.24})`}>
        <Path d="M0 0C-32 43-36 104-6 134C19 158 65 150 86 184Q109 216 139 193C108 207 113 166 100 122C89 67 49 17 0 0Z" fill="url(#leaf-fill)" stroke="#C4CE76" strokeWidth={2} />
        <Defs><ClipPath id="leaf-veins"><Path d="M0 0C-32 43-36 104-6 134C19 158 65 150 86 184Q109 216 139 193C108 207 113 166 100 122C89 67 49 17 0 0Z" /></ClipPath></Defs>
        <Path clipPath="url(#leaf-veins)" d="M0 2C28 44 38 74 51 112S75 176 127 197" fill="none" stroke="#DDE49C" strokeWidth={3} strokeLinecap="round" />
        <Path clipPath="url(#leaf-veins)" d="M13 23Q-11 39-15 69M24 46Q0 68 0 96M35 73Q12 93 15 121M49 105Q31 126 39 142M64 139Q53 154 68 170M12 24Q37 22 54 38M23 45Q55 44 75 62M34 70Q66 66 91 93M46 97Q77 95 103 122M61 131Q87 130 110 157" fill="none" stroke="#D6DC8B" strokeWidth={1.5} strokeLinecap="round" opacity={0.8} />
      </G>
    </Svg>
  </Animated.View>;
}

export function EnergyLeaf({ energy }: { energy: number }) {
  const value = Math.max(0, Math.min(100, Math.round(energy)));
  const state = value < 30 ? "A little rest would help." : value < 60 ? "Keep some room to recover." : "Room for the day ahead.";
  return <View style={{ paddingHorizontal: 24, paddingTop: 4, paddingBottom: 20 }}>
    <View style={{ minHeight: 198, justifyContent: "center" }}>
      <View style={{ width: "61%", gap: 10, zIndex: 1 }} accessible accessibilityLabel={`Today's energy, ${value} out of 100 left. ${state}`}>
        <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.mint }}>TODAY’S ENERGY</Text>
        <Text style={{ fontFamily: fonts.number, fontSize: 48, color: colors.white }}>{value}<Text style={{ fontFamily: fonts.regular, fontSize: 17 }}> / 100 left</Text></Text>
        <Text style={{ fontFamily: fonts.regular, fontSize: 16, lineHeight: 23, color: colors.white }}>{state}</Text>
      </View>
      <View style={{ position: "absolute", right: -12, top: -12, width: "46%" }}><LeafIllustration energy={value} height={224} /></View>
    </View>
    <Text style={{ fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.mint }}>Your leaf droops as energy runs low.</Text>
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
