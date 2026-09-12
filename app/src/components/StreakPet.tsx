import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, PanResponder, Platform, Pressable, Text, View } from "react-native";
import { colors, fonts } from "@/theme/tokens";
import { MascotAvatar } from "./MascotAvatar";

type StreakPetState = {
  streak: number;
  checkIn?: { label: string; onPress: () => void };
  hidden?: boolean;
};

export const StreakPetContext = createContext<StreakPetState | undefined>(undefined);

const encouragements = [
  "Small steps still count.",
  "Leave a little room for future you.",
  "Rest protects the work that matters.",
  "One clear next step is enough for now.",
  "You can let one thing wait.",
  "A gentler plan is still a real plan.",
];

/** Original forest companion; anchored above the navigation, outside the scroll area. */
export function StreakPet({ bottom, frame }: { bottom: number; frame: { width: number; height: number } }) {
  const petState = useContext(StreakPetContext);
  const streak = petState?.streak;
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
  const [messageIndex, setMessageIndex] = useState<number | null>(null);
  const [lift] = useState(() => new Animated.Value(0));
  useEffect(() => {
    let active = true;
    let loop: Animated.CompositeAnimation | undefined;
    const update = (reduced: boolean) => {
      loop?.stop(); lift.setValue(0);
      if (!reduced && active && streak !== undefined) {
        loop = Animated.loop(Animated.sequence([
          Animated.timing(lift, { toValue: -6, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== "web", isInteraction: false }),
          Animated.timing(lift, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== "web", isInteraction: false }),
        ])); loop.start();
      }
    };
    AccessibilityInfo.isReduceMotionEnabled().then(update).catch(() => update(true));
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", update);
    return () => { active = false; loop?.stop(); sub.remove(); };
  }, [lift, streak]);
  if (streak === undefined || petState?.hidden) return null;
  const showEncouragement = () => setMessageIndex(current => {
    if (current === null) return Math.floor(Math.random() * encouragements.length);
    if (encouragements.length === 1) return 0;
    return (current + 1 + Math.floor(Math.random() * (encouragements.length - 1))) % encouragements.length;
  });
  return <View {...pan.panHandlers} pointerEvents="box-none" style={{ position: "absolute", bottom: bottom - clampPosition(position.x, position.y).y, right: 16 - clampPosition(position.x, position.y).x, width: 84, alignItems: "flex-end", paddingBottom: 8 }}>
    {messageIndex !== null ? <View style={{ position: "absolute", bottom: 114, width: Math.min(240, frame.width - 32), right: Math.max(-(frame.width - 272), Math.min(0, position.x)), backgroundColor: colors.paper, borderColor: colors.forest, borderWidth: 1, padding: 12, borderRadius: 16, marginBottom: 10 }}><Text style={{ fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.ink }}>{encouragements[messageIndex]}</Text></View> : petState?.checkIn ? <Pressable accessibilityRole="button" accessibilityLabel={petState.checkIn.label} onPress={petState.checkIn.onPress} style={({ pressed }) => ({ position: "absolute", bottom: 114, width: Math.min(220, frame.width - 32), right: Math.max(-(frame.width - 252), Math.min(0, position.x)), backgroundColor: colors.paper, borderColor: colors.forest, borderWidth: 1, padding: 12, borderRadius: 16, marginBottom: 10, opacity: pressed ? 0.75 : 1 })}><Text style={{ fontFamily: fonts.bold, fontSize: 14, lineHeight: 20, color: colors.forest }}>{petState.checkIn.label}</Text><Text style={{ fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.textMuted, marginTop: 2 }}>Tap this note to open it.</Text></Pressable> : null}
    <Pressable accessibilityRole="button" accessibilityHint="Drag to move. Tap for an encouraging note." accessibilityActions={[{ name: "increment", label: "Move pet left" }, { name: "decrement", label: "Move pet right" }]} onAccessibilityAction={event => { const next = clampPosition(position.x + (event.nativeEvent.actionName === "increment" ? -60 : 60), position.y); offset.current = next; setPosition(next); }} accessibilityLabel={`Your streak pet, ${streak} day${streak === 1 ? "" : "s"}`} accessibilityState={{ expanded: messageIndex !== null }} onPress={showEncouragement} style={{ minWidth: 84, alignItems: "center" }}>
      <Animated.View style={{ borderRadius: 25, borderWidth: 2, borderColor: colors.paper, transform: [{ translateY: lift }] }}><MascotAvatar size={80} /></Animated.View>
      <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.white, backgroundColor: colors.forest, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>{streak} day{streak === 1 ? "" : "s"}</Text>
    </Pressable>
  </View>;
}
