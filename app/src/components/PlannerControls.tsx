import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { AppButton, Card, ScrollPage, PageHeader, SegmentedChoices } from "./MarginUI";
import { dateKey, fromKey, prettyDate } from "@/models/planner";
import { colors } from "@/theme/tokens";
import { screenStyles as s } from "@/screens/screenStyles";

export function ValueSlider({ label, value, max = 5, min = 0, step = 1, suffix = "/5", onChange }: { label: string; value: number; max?: number; min?: number; step?: number; suffix?: string; onChange: (value: number) => void }) {
  const [width, setWidth] = useState(1);
  const range = Math.max(step, max - min);
  const changeAt = (x: number) => onChange(Math.max(min, Math.min(max, Math.round((min + (x / Math.max(1, width)) * (max - min)) / step) * step)));
  return <View style={{ gap: 6 }}><View style={s.rowBetween}><Text style={[s.label, s.flex]}>{label}</Text><Text style={s.label}>{value}{suffix}</Text></View>
    <View accessible accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ min, max, now: value }} accessibilityActions={[{ name: "increment" }, { name: "decrement" }]} onAccessibilityAction={e => onChange(Math.max(min, Math.min(max, value + (e.nativeEvent.actionName === "increment" ? step : -step))))} onLayout={e => setWidth(e.nativeEvent.layout.width)} onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true} onResponderGrant={e => changeAt(e.nativeEvent.locationX)} onResponderMove={e => changeAt(e.nativeEvent.locationX)} style={{ height: 48, justifyContent: "center" }}>
      <View pointerEvents="none" style={{ height: 6, backgroundColor: colors.outlineSoft, borderRadius: 3 }}><View style={{ height: 6, width: `${(value - min) / range * 100}%`, backgroundColor: colors.forest }} /></View>
      <View pointerEvents="none" style={{ position: "absolute", left: `${Math.min(94, Math.max(0, (value - min) / range * 94))}%`, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.paper, borderWidth: 2, borderColor: colors.forest }} />
    </View><View style={s.rowBetween}><AppButton text="−" variant="quiet" style={{ minHeight: 48 }} onPress={() => onChange(Math.max(min, value - step))} /><Text style={s.caption}>Slide to adjust</Text><AppButton text="+" variant="quiet" style={{ minHeight: 48 }} onPress={() => onChange(Math.min(max, value + step))} /></View></View>;
}

export function DateField({ label, value, onChange, optional = false }: { label: string; value: string; onChange: (value: string) => void; optional?: boolean }) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(value || dateKey());
  const d = fromKey(month); const year = d.getFullYear(); const m = d.getMonth();
  const count = new Date(year, m + 1, 0).getDate(); const offset = (new Date(year, m, 1).getDay() + 6) % 7;
  const move = (direction: number) => setMonth(dateKey(new Date(year, m + direction, 1)));
  return <View style={{ gap: 8 }}><Text style={s.label}>{label}</Text><AppButton variant="secondary" icon="calendar" text={value ? prettyDate(value) : optional ? "Set up later" : "Choose date"} onPress={() => { setMonth(value || dateKey()); setOpen(true); }} />
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}><View style={{ flex: 1, backgroundColor: "#0008", justifyContent: "center", padding: 16 }}><Card style={{ maxWidth: 480, width: "100%", alignSelf: "center", gap: 12 }}>
      <View style={s.rowBetween}><AppButton text="‹" variant="quiet" onPress={() => move(-1)} /><Text style={s.label}>{d.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</Text><AppButton text="›" variant="quiet" onPress={() => move(1)} /></View>
      <View style={{ flexDirection: "row" }}>{["M", "T", "W", "T", "F", "S", "S"].map((v, i) => <Text key={i} style={[s.caption, { width: "14.2857%", textAlign: "center" }]}>{v}</Text>)}</View>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>{Array.from({ length: offset + count }, (_, i) => { const day = i - offset + 1; const key = dateKey(new Date(year, m, day)); return <View key={i} style={{ width: "14.2857%" }}>{day > 0 ? <Pressable accessibilityRole="button" accessibilityLabel={prettyDate(key)} accessibilityState={{ selected: value === key }} onPress={() => { onChange(key); setOpen(false); }} style={{ minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: 8, backgroundColor: value === key ? colors.mint : colors.paper }}><Text style={s.label}>{day}</Text></Pressable> : null}</View>; })}</View>
      {optional && <AppButton text="Set up later" variant="quiet" onPress={() => { onChange(""); setOpen(false); }} />}<AppButton text="Close calendar" variant="secondary" onPress={() => setOpen(false)} />
    </Card></View></Modal></View>;
}

export function ViewMenu({ choices, value, onChange, onSchedule, onAssignments }: { choices: string[]; value: string; onChange: (value: string) => void; onSchedule?: () => void; onAssignments?: () => void }) {
  const [open, setOpen] = useState(false);
  return <View style={{ paddingHorizontal: 20, paddingTop: 8 }}><Pressable accessibilityRole="button" accessibilityLabel="Open view menu" onPress={() => setOpen(true)} style={{ minHeight: 48, alignSelf: "flex-end", justifyContent: "center", padding: 12 }}><Text style={[s.linkText, { color: colors.white }]}>☰  {value}</Text></Pressable>
    <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}><ScrollPage><PageHeader eyebrow="Menu" title="Your planner" onBack={() => setOpen(false)} /><View style={s.content}><SegmentedChoices label="Time period" choices={choices} selected={value} onSelect={v => { onChange(v); setOpen(false); }} />{onSchedule && <AppButton text="Schedule" icon="calendar" variant="secondary" onPress={() => { setOpen(false); onSchedule(); }} />}{onAssignments && <AppButton text="Assignments" icon="plan" variant="secondary" onPress={() => { setOpen(false); onAssignments(); }} />}</View></ScrollPage></Modal>
  </View>;
}
