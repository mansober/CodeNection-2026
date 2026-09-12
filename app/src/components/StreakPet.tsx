import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, PanResponder, Platform, Pressable, Text, View } from "react-native";
import { colors, fonts } from "@/theme/tokens";
import { MascotAvatar, MascotPose } from "./MascotAvatar";

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

const REST: MascotPose = "idle";
const idleReactions: MascotPose[] = ["wink", "happy", "sleepy"];

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
  const snapAnim = useRef<number | null>(null);
  // glideTo/snapToNearestSide and the PanResponder below only ever run from a gesture
  // callback or rAF loop, never during render, despite reading refs / the clock.
  /* eslint-disable react-hooks/refs, react-hooks/purity */
  // Glide from wherever the pet is now to a target spot, instead of jumping there.
  const glideTo = (targetX: number, targetY: number) => {
    if (snapAnim.current !== null) cancelAnimationFrame(snapAnim.current);
    const from = offset.current;
    const duration = 260;
    const startedAt = Date.now();
    const step = () => {
      const t = Math.min(1, (Date.now() - startedAt) / duration);
      const eased = 1 - (1 - t) ** 3;
      const next = { x: from.x + (targetX - from.x) * eased, y: from.y + (targetY - from.y) * eased };
      offset.current = next; setPosition(next);
      snapAnim.current = t < 1 ? requestAnimationFrame(step) : null;
    };
    snapAnim.current = requestAnimationFrame(step);
  };
  // After a drag, don't leave the pet parked mid-screen where it can block content —
  // glide it to whichever side edge it's already closer to.
  const snapToNearestSide = () => {
    const xMin = -(frame.width - 116);
    const target = offset.current.x > xMin / 2 ? 0 : xMin;
    glideTo(target, offset.current.y);
  };
  useEffect(() => () => { if (snapAnim.current !== null) cancelAnimationFrame(snapAnim.current); }, []);
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, gesture) => Math.abs(gesture.dx) + Math.abs(gesture.dy) > 8,
    onPanResponderGrant: () => { if (snapAnim.current !== null) { cancelAnimationFrame(snapAnim.current); snapAnim.current = null; } start.current = offset.current; },
    onPanResponderMove: (_, gesture) => {
      const next = {
        x: Math.max(-(frame.width - 116), Math.min(0, start.current.x + gesture.dx)),
        y: Math.max(-(frame.height - bottom - 140), Math.min(0, start.current.y + gesture.dy)),
      };
      offset.current = next; setPosition(next);
    },
    onPanResponderRelease: snapToNearestSide,
    onPanResponderTerminate: snapToNearestSide,
    onPanResponderTerminationRequest: () => false,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [frame.width, frame.height, bottom]);
  /* eslint-enable react-hooks/refs, react-hooks/purity */
  const [messageIndex, setMessageIndex] = useState<number | null>(null);
  const [pose, setPose] = useState<MascotPose>(REST);
  const poseRef = useRef(pose);
  useEffect(() => { poseRef.current = pose; }, [pose]);
  const reactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [wander] = useState(() => new Animated.ValueXY({ x: 0, y: 0 }));
  const [rock] = useState(() => new Animated.Value(0)); // wave: side-to-side wobble
  const [hop] = useState(() => new Animated.Value(0)); // happy: a little jump
  const [blink] = useState(() => new Animated.Value(1)); // wink: one quick pulse
  const wanderAnim = useRef<Animated.CompositeAnimation | null>(null);
  const useNative = Platform.OS !== "web";

  // Each reaction gets its own small gesture instead of one generic bounce for everything.
  const playGesture = (next: MascotPose) => {
    if (next === "wave") {
      rock.setValue(0);
      Animated.sequence([
        Animated.timing(rock, { toValue: 1, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: useNative }),
        Animated.timing(rock, { toValue: -1, duration: 260, easing: Easing.inOut(Easing.sin), useNativeDriver: useNative }),
        Animated.timing(rock, { toValue: 1, duration: 260, easing: Easing.inOut(Easing.sin), useNativeDriver: useNative }),
        Animated.timing(rock, { toValue: 0, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: useNative }),
      ]).start();
    } else if (next === "happy") {
      hop.setValue(0);
      Animated.sequence([
        Animated.timing(hop, { toValue: -16, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: useNative }),
        Animated.spring(hop, { toValue: 0, friction: 4, useNativeDriver: useNative }),
      ]).start();
    } else if (next === "wink") {
      blink.setValue(1);
      Animated.sequence([
        Animated.timing(blink, { toValue: 1.1, duration: 110, easing: Easing.out(Easing.quad), useNativeDriver: useNative }),
        Animated.timing(blink, { toValue: 1, duration: 160, easing: Easing.inOut(Easing.quad), useNativeDriver: useNative }),
      ]).start();
    }
  };

  // A brief pose swap with its own gesture (tap, or a spontaneous idle moment), then back to resting.
  const react = (next: MascotPose, holdMs = 1500) => {
    setPose(next);
    playGesture(next);
    if (reactionTimer.current) clearTimeout(reactionTimer.current);
    reactionTimer.current = setTimeout(() => setPose(REST), holdMs);
  };

  useEffect(() => {
    let active = true;
    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    const scheduleIdleEmote = () => {
      idleTimer = setTimeout(() => {
        if (active && poseRef.current === REST) react(idleReactions[Math.floor(Math.random() * idleReactions.length)], 1400);
        scheduleIdleEmote();
      }, 18000 + Math.random() * 20000);
    };
    const drift = () => {
      if (!active) return;
      const next = { x: (Math.random() - 0.5) * 26, y: (Math.random() - 0.5) * 14 };
      const anim = Animated.timing(wander, { toValue: next, duration: 3600 + Math.random() * 2000, easing: Easing.inOut(Easing.quad), useNativeDriver: useNative });
      wanderAnim.current = anim;
      anim.start(({ finished }) => { if (finished && active) drift(); });
    };
    const update = (reduced: boolean) => {
      wanderAnim.current?.stop(); wander.setValue({ x: 0, y: 0 });
      if (idleTimer) clearTimeout(idleTimer);
      if (!reduced && active && streak !== undefined) { drift(); scheduleIdleEmote(); }
    };
    AccessibilityInfo.isReduceMotionEnabled().then(update).catch(() => update(true));
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", update);
    return () => { active = false; wanderAnim.current?.stop(); if (idleTimer) clearTimeout(idleTimer); if (reactionTimer.current) clearTimeout(reactionTimer.current); sub.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wander, streak]);

  if (streak === undefined || petState?.hidden) return null;
  const showEncouragement = () => {
    setMessageIndex(current => {
      if (current === null) return Math.floor(Math.random() * encouragements.length);
      if (encouragements.length === 1) return 0;
      return (current + 1 + Math.floor(Math.random() * (encouragements.length - 1))) % encouragements.length;
    });
    react("wave", 1800);
  };
  const rotate = rock.interpolate({ inputRange: [-1, 1], outputRange: ["-9deg", "9deg"] });
  return <View {...pan.panHandlers} pointerEvents="box-none" style={{ position: "absolute", bottom: bottom - clampPosition(position.x, position.y).y, right: 16 - clampPosition(position.x, position.y).x, width: 84, alignItems: "flex-end", paddingBottom: 8 }}>
    {messageIndex !== null ? <View style={{ position: "absolute", bottom: 114, width: Math.min(240, frame.width - 32), right: Math.max(-(frame.width - 272), Math.min(0, position.x)), backgroundColor: colors.paper, borderColor: colors.forest, borderWidth: 1, padding: 12, borderRadius: 16, marginBottom: 10 }}><Text style={{ fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.ink }}>{encouragements[messageIndex]}</Text></View> : petState?.checkIn ? <Pressable accessibilityRole="button" accessibilityLabel={petState.checkIn.label} onPress={petState.checkIn.onPress} style={({ pressed }) => ({ position: "absolute", bottom: 114, width: Math.min(220, frame.width - 32), right: Math.max(-(frame.width - 252), Math.min(0, position.x)), backgroundColor: colors.paper, borderColor: colors.forest, borderWidth: 1, padding: 12, borderRadius: 16, marginBottom: 10, opacity: pressed ? 0.75 : 1 })}><Text style={{ fontFamily: fonts.bold, fontSize: 14, lineHeight: 20, color: colors.forest }}>{petState.checkIn.label}</Text><Text style={{ fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.textMuted, marginTop: 2 }}>Tap this note to open it.</Text></Pressable> : null}
    <Pressable accessibilityRole="button" accessibilityHint="Drag to move. Tap to say hi." accessibilityActions={[{ name: "increment", label: "Move pet left" }, { name: "decrement", label: "Move pet right" }]} onAccessibilityAction={event => { const next = clampPosition(position.x + (event.nativeEvent.actionName === "increment" ? -60 : 60), position.y); offset.current = next; setPosition(next); }} accessibilityLabel={`Your streak pet, ${streak} day${streak === 1 ? "" : "s"}`} accessibilityState={{ expanded: messageIndex !== null }} onPress={showEncouragement} style={{ minWidth: 84, alignItems: "center" }}>
      <Animated.View style={{ transform: [{ translateX: wander.x }, { translateY: Animated.add(wander.y, hop) }, { rotate }, { scale: blink }] }}><MascotAvatar pose={pose} size={80} /></Animated.View>
      <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.white, backgroundColor: colors.forest, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>{streak} day{streak === 1 ? "" : "s"}</Text>
    </Pressable>
  </View>;
}
