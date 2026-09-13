import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, PanResponder, Platform, Pressable, Text, View } from "react-native";
import Svg, { Ellipse, Path } from "react-native-svg";
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
const DIALOGUE_VISIBLE_MS = 5000;
const REMINDER_INTERVAL_MS = 10000;

type PetDialogue =
  | { kind: "encouragement"; index: number }
  | { kind: "checkIn" };

function CloudPerch() {
  return <View pointerEvents="none" style={{ width: 74, height: 27, marginTop: -15 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Svg width="100%" height="100%" viewBox="0 0 86 38">
      <Ellipse cx={43} cy={33} rx={31} ry={3.5} fill={colors.deepForest} opacity={0.18} />
      <Path d="M17 30C9 30 5 26 5 20c0-5 4-9 10-10C17 4 23 1 29 2c5 0 9 3 12 7 3-3 7-5 12-5 8 0 14 5 15 12 7 0 12 4 12 10 0 6-5 9-12 9H17Z" fill={colors.paper} stroke={colors.waterBright} strokeWidth={1.5} strokeLinejoin="round" />
      <Ellipse cx={31} cy={13} rx={10} ry={5} fill={colors.mint} opacity={0.72} />
      <Ellipse cx={59} cy={18} rx={9} ry={4} fill={colors.mint} opacity={0.55} />
    </Svg>
  </View>;
}

/** Original forest companion; anchored above the navigation, outside the scroll area. */
export function StreakPet({ bottom, frame }: { bottom: number; frame: { width: number; height: number } }) {
  const petState = useContext(StreakPetContext);
  const streak = petState?.streak;
  const checkIn = petState?.checkIn;
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
  const [dialogue, setDialogue] = useState<PetDialogue | null>(null);
  const checkInLabel = checkIn?.label;
  useEffect(() => {
    if (!checkInLabel) return;
    const showReminder = () => setDialogue(current => current ?? { kind: "checkIn" });
    const firstReminder = setTimeout(showReminder, 0);
    const interval = setInterval(showReminder, REMINDER_INTERVAL_MS);
    return () => { clearTimeout(firstReminder); clearInterval(interval); };
  }, [checkInLabel]);
  useEffect(() => {
    if (!dialogue) return;
    const timeout = setTimeout(() => setDialogue(null), DIALOGUE_VISIBLE_MS);
    return () => clearTimeout(timeout);
  }, [dialogue]);
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
    setDialogue(current => {
      const currentIndex = current?.kind === "encouragement" ? current.index : null;
      const index = currentIndex === null
        ? Math.floor(Math.random() * encouragements.length)
        : (currentIndex + 1 + Math.floor(Math.random() * (encouragements.length - 1))) % encouragements.length;
      return { kind: "encouragement", index };
    });
    react("wave", 1800);
  };
  const closeDialogue = () => setDialogue(null);
  const openCheckIn = () => {
    if (!checkIn) return;
    closeDialogue();
    checkIn.onPress();
  };
  const rotate = rock.interpolate({ inputRange: [-1, 1], outputRange: ["-9deg", "9deg"] });
  return <View {...pan.panHandlers} pointerEvents="box-none" style={{ position: "absolute", bottom: bottom - clampPosition(position.x, position.y).y, right: 16 - clampPosition(position.x, position.y).x, width: 84, alignItems: "flex-end", paddingBottom: 8 }}>
    {dialogue && (dialogue.kind === "encouragement" || checkIn) ? <View style={{ position: "absolute", bottom: 104, width: Math.min(240, frame.width - 32), right: Math.max(-(frame.width - 272), Math.min(0, position.x)), backgroundColor: colors.paper, borderColor: colors.forest, borderWidth: 1, padding: 12, paddingRight: 38, borderRadius: 16, marginBottom: 10 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close mascot message" hitSlop={7} onPress={closeDialogue} style={({ pressed }) => ({ position: "absolute", top: 6, right: 6, width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: colors.softMint, opacity: pressed ? 0.62 : 1, zIndex: 1 })}><Text style={{ fontFamily: fonts.bold, fontSize: 17, lineHeight: 20, color: colors.forest }}>×</Text></Pressable>
      {dialogue.kind === "encouragement"
        ? <Text style={{ fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.ink }}>{encouragements[dialogue.index]}</Text>
        : <Pressable accessibilityRole="button" accessibilityLabel={checkIn?.label} onPress={openCheckIn} style={({ pressed }) => ({ opacity: pressed ? 0.68 : 1 })}><Text style={{ fontFamily: fonts.bold, fontSize: 14, lineHeight: 20, color: colors.forest }}>{checkIn?.label}</Text><Text style={{ fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.textMuted, marginTop: 2 }}>Tap this note to open it.</Text></Pressable>}
    </View> : null}
    <Pressable accessibilityRole="button" accessibilityHint="Drag to move. Tap to say hi." accessibilityActions={[{ name: "increment", label: "Move pet left" }, { name: "decrement", label: "Move pet right" }]} onAccessibilityAction={event => { const next = clampPosition(position.x + (event.nativeEvent.actionName === "increment" ? -60 : 60), position.y); offset.current = next; setPosition(next); }} accessibilityLabel={`Your streak pet, ${streak} day${streak === 1 ? "" : "s"}`} accessibilityState={{ expanded: dialogue !== null }} onPress={showEncouragement} style={{ minWidth: 84, alignItems: "center" }}>
      <Animated.View style={{ transform: [{ translateX: wander.x }, { translateY: Animated.add(wander.y, hop) }, { rotate }, { scale: blink }] }}><MascotAvatar pose={pose} size={80} /></Animated.View>
      <CloudPerch />
    </Pressable>
  </View>;
}
