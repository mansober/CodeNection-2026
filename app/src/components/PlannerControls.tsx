import { useState } from "react";
import { Modal, Pressable, StyleProp, Text, View, ViewStyle } from "react-native";
import { AppButton, Card } from "./MarginUI";
import { dateKey, fromKey, prettyDate } from "@/models/planner";
import { colors } from "@/theme/tokens";
import { screenStyles as s } from "@/screens/screenStyles";

export function ValueSlider({ label, value, max = 5, min = 0, step = 1, suffix = "/5", valueText, accessibilityText, showHint = true, compact = false, onChange }: { label: string; value: number; max?: number; min?: number; step?: number; suffix?: string; valueText?: string; accessibilityText?: string; showHint?: boolean; compact?: boolean; onChange: (value: number) => void }) {
  const [width, setWidth] = useState(1);
  const range = Math.max(step, max - min);
  const changeAt = (x: number) => onChange(Math.max(min, Math.min(max, Math.round((min + (x / Math.max(1, width)) * (max - min)) / step) * step)));
  const displayedValue = valueText ?? `${value}${suffix}`;
  const slider = <View accessible accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ min, max, now: value, text: accessibilityText ?? displayedValue }} accessibilityActions={[{ name: "increment" }, { name: "decrement" }]} onAccessibilityAction={e => onChange(Math.max(min, Math.min(max, value + (e.nativeEvent.actionName === "increment" ? step : -step))))} onLayout={e => setWidth(e.nativeEvent.layout.width)} onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true} onResponderGrant={e => changeAt(e.nativeEvent.locationX)} onResponderMove={e => changeAt(e.nativeEvent.locationX)} style={{ height: 48, flex: compact ? 1 : undefined, justifyContent: "center" }}>
      <View pointerEvents="none" style={{ height: 6, backgroundColor: colors.outlineSoft, borderRadius: 3 }}><View style={{ height: 6, width: `${(value - min) / range * 100}%`, backgroundColor: colors.forest }} /></View>
      <View pointerEvents="none" style={{ position: "absolute", left: `${Math.min(94, Math.max(0, (value - min) / range * 94))}%`, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.paper, borderWidth: 2, borderColor: colors.forest }} />
    </View>;
  if (compact) return <View style={{ gap: 4 }}><View style={s.rowBetween}><Text style={[s.label, s.flex]}>{label}</Text><Text style={s.label}>{displayedValue}</Text></View><View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}><AppButton text="−" accessibilityLabel={`Decrease ${label}`} variant="quiet" style={{ minHeight: 48, width: 48, paddingHorizontal: 0 }} onPress={() => onChange(Math.max(min, value - step))} />{slider}<AppButton text="+" accessibilityLabel={`Increase ${label}`} variant="quiet" style={{ minHeight: 48, width: 48, paddingHorizontal: 0 }} onPress={() => onChange(Math.min(max, value + step))} /></View></View>;
  return <View style={{ gap: 6 }}><View style={s.rowBetween}><Text style={[s.label, s.flex]}>{label}</Text><Text style={s.label}>{displayedValue}</Text></View>{slider}<View style={s.rowBetween}><AppButton text="−" accessibilityLabel={`Decrease ${label}`} variant="quiet" style={{ minHeight: 48 }} onPress={() => onChange(Math.max(min, value - step))} />{showHint ? <Text style={s.caption}>Slide to adjust</Text> : <View />}<AppButton text="+" accessibilityLabel={`Increase ${label}`} variant="quiet" style={{ minHeight: 48 }} onPress={() => onChange(Math.min(max, value + step))} /></View></View>;
}

export function DateField({ label, value, onChange, optional = false, displayValue, clearText = "Set up later", accessibilityLabel, buttonVariant = "secondary", buttonStyle }: { label?: string; value: string; onChange: (value: string) => void; optional?: boolean; displayValue?: string; clearText?: string; accessibilityLabel?: string; buttonVariant?: "secondary" | "quiet"; buttonStyle?: StyleProp<ViewStyle> }) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(value || dateKey());
  const d = fromKey(month); const year = d.getFullYear(); const m = d.getMonth();
  const count = new Date(year, m + 1, 0).getDate(); const offset = (new Date(year, m, 1).getDay() + 6) % 7;
  const move = (direction: number) => setMonth(dateKey(new Date(year, m + direction, 1)));
  return <View style={{ gap: label ? 8 : 0 }}>{label ? <Text style={s.label}>{label}</Text> : null}<AppButton accessibilityLabel={accessibilityLabel} variant={buttonVariant} style={buttonStyle} icon="calendar" text={displayValue ?? (value ? prettyDate(value) : optional ? clearText : "Choose date")} onPress={() => { setMonth(value || dateKey()); setOpen(true); }} />
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}><View style={{ flex: 1, backgroundColor: "#0008", justifyContent: "center", padding: 16 }}><Card style={{ maxWidth: 480, width: "100%", alignSelf: "center", gap: 12 }}>
      <View style={s.rowBetween}><AppButton text="‹" variant="quiet" onPress={() => move(-1)} /><Text style={s.label}>{d.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</Text><AppButton text="›" variant="quiet" onPress={() => move(1)} /></View>
      <View style={{ flexDirection: "row" }}>{["M", "T", "W", "T", "F", "S", "S"].map((v, i) => <Text key={i} style={[s.caption, { width: "14.2857%", textAlign: "center" }]}>{v}</Text>)}</View>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>{Array.from({ length: offset + count }, (_, i) => { const day = i - offset + 1; const key = dateKey(new Date(year, m, day)); return <View key={i} style={{ width: "14.2857%" }}>{day > 0 ? <Pressable accessibilityRole="button" accessibilityLabel={prettyDate(key)} accessibilityState={{ selected: value === key }} onPress={() => { onChange(key); setOpen(false); }} style={{ minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: 8, backgroundColor: value === key ? colors.mint : colors.paper }}><Text style={s.label}>{day}</Text></Pressable> : null}</View>; })}</View>
      {optional && <AppButton text={clearText} accessibilityLabel={`${clearText} for ${label ?? "date"}`} variant="quiet" onPress={() => { onChange(""); setOpen(false); }} />}<AppButton text="Close calendar" variant="secondary" onPress={() => setOpen(false)} />
    </Card></View></Modal></View>;
}
