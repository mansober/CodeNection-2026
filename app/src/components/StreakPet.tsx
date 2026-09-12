import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, PanResponder, Pressable, Text, View } from "react-native";
import Svg, { Circle, Ellipse, Path } from "react-native-svg";
import { colors, fonts } from "@/theme/tokens";

export const StreakPetContext = createContext<number | undefined>(undefined);

/** Original forest companion; anchored above the navigation, outside the scroll area. */
export function StreakPet({ bottom, frame }: { bottom: number; frame: { width: number; height: number } }) {
  const streak = useContext(StreakPetContext);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const offset = useRef({ x: 0, y: 0 });
  const start = useRef({ x: 0, y: 0 });
  const clampPosition = (x: number, y: number) => ({
    x: Math.max(-(frame.width - 116), Math.min(0, x)),
    y: Math.max(-(frame.height - bottom - 140), Math.min(0, y)),
  });
  // PanResponder stores these callbacks; ref reads happen only during a gesture, never render.
  /* eslint-disable react-hooks/refs */
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, gesture) => Math.abs(gesture.dx) + Math.abs(gesture.dy) > 8,
    onPanResponderGrant: () => { start.current = offset.current; },
    onPanResponderMove: (_, gesture) => {
      const next = {
        x: Math.max(-(frame.width - 116), Math.min(0, start.current.x + gesture.dx)),
        y: Math.max(-(frame.height - bottom - 140), Math.min(0, start.current.y + gesture.dy)),
      };
      offset.current = next; setPosition(next);
    },
    onPanResponderTerminationRequest: () => false,
  }), [frame.width, frame.height, bottom]);
  /* eslint-enable react-hooks/refs */
  const [message, setMessage] = useState(false);
  const [lift] = useState(() => new Animated.Value(0));
  useEffect(() => {
    let active = true;
    let loop: Animated.CompositeAnimation | undefined;
    const update = (reduced: boolean) => {
      loop?.stop(); lift.setValue(0);
      if (!reduced && active && streak !== undefined) {
        loop = Animated.loop(Animated.sequence([
          Animated.timing(lift, { toValue: -6, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
          Animated.timing(lift, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
        ])); loop.start();
      }
    };
    AccessibilityInfo.isReduceMotionEnabled().then(update).catch(() => update(true));
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", update);
    return () => { active = false; loop?.stop(); sub.remove(); };
  }, [lift, streak]);
  if (streak === undefined) return null;
  return <View {...pan.panHandlers} pointerEvents="box-none" style={{ position: "absolute", bottom: bottom - clampPosition(position.x, position.y).y, right: 16 - clampPosition(position.x, position.y).x, width: 84, alignItems: "flex-end", paddingBottom: 8 }}>
    {message && <View style={{ position: "absolute", bottom: 118, width: Math.min(240, frame.width - 32), right: Math.max(-(frame.width - 272), Math.min(0, position.x)), backgroundColor: colors.paper, borderColor: colors.forest, borderWidth: 1, padding: 12, borderRadius: 16, marginBottom: 10 }}><Text style={{ fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.ink }}>{streak ? `${streak} day${streak === 1 ? "" : "s"} of checking in. One small pause at a time.` : "I’m here to keep you company. Your first check-in starts your streak—no rush."}</Text></View>}
    <Pressable accessibilityRole="button" accessibilityHint="Drag to move. Tap to hear from your pet." accessibilityActions={[{ name: "increment", label: "Move pet left" }, { name: "decrement", label: "Move pet right" }]} onAccessibilityAction={event => { const next = clampPosition(position.x + (event.nativeEvent.actionName === "increment" ? -60 : 60), position.y); offset.current = next; setPosition(next); }} accessibilityLabel={`Your streak pet, ${streak} day${streak === 1 ? "" : "s"}`} accessibilityState={{ expanded: message }} onPress={() => setMessage(!message)} style={{ minWidth: 84, alignItems: "center" }}>
      <Animated.View style={{ transform: [{ translateY: lift }] }}><Svg width={80} height={78} viewBox="0 0 100 100" accessibilityElementsHidden>
        <Ellipse cx={50} cy={94} rx={26} ry={4} fill="#061F18" opacity={0.2} />
        <Path d="M46 25C29 22 23 11 29 3C43 3 53 12 50 25C55 8 70 4 79 12C76 25 63 31 50 27Z" fill="#B8D58C" stroke="#153E30" strokeWidth={2.5} />
        <Path d="M25 47Q13 55 11 71Q20 77 28 69M74 47Q89 51 90 66Q83 74 75 68" fill="#A8D7B9" stroke="#153E30" strokeWidth={2.5} />
        <Path d="M23 51C24 20 76 20 78 51L81 72Q79 85 67 84L60 81Q51 91 42 82Q24 91 20 76Z" fill="#D1E9B5" stroke="#153E30" strokeWidth={3} />
        <Ellipse cx={50} cy={66} rx={22} ry={15} fill="#F2F3D8" />
        <Circle cx={37} cy={51} r={4} fill="#163E31" /><Circle cx={63} cy={51} r={4} fill="#163E31" />
        <Circle cx={38} cy={50} r={1.1} fill="#FFF" /><Circle cx={64} cy={50} r={1.1} fill="#FFF" />
        <Ellipse cx={29} cy={60} rx={5} ry={3} fill="#D59C79" opacity={0.7} /><Ellipse cx={71} cy={60} rx={5} ry={3} fill="#D59C79" opacity={0.7} />
        {streak === 0 && <Path d="M31 41L42 46M58 46L69 41" fill="none" stroke="#163E31" strokeWidth={3} strokeLinecap="round" />}
        <Path d={streak === 0 ? "M44 65Q50 58 56 65" : "M44 60Q50 67 56 60"} fill="none" stroke="#163E31" strokeWidth={2.5} strokeLinecap="round" />
      </Svg></Animated.View>
      <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.white, backgroundColor: colors.forest, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>{streak} day{streak === 1 ? "" : "s"}</Text>
    </Pressable>
  </View>;
}
