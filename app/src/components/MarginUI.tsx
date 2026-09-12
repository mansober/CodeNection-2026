import { useContext, useState, type PropsWithChildren, type ReactNode } from "react";
import { StreakPet, StreakPetContext } from "./StreakPet";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { capacityMeta, CapacityValue, MainTab } from "@/models/margin";
import { colors, fonts, layout, type } from "@/theme/tokens";
import { ForestBackdrop, ForestFloor, SantaiLogo } from "./ForestTheme";
import { IconName, MarginIcon } from "@/components/MarginIcon";

export function MarginMark({ light = false, size = 24 }: { light?: boolean; size?: number }) {
  return (
    <View style={[styles.mark, { width: size + 12, height: size + 12, backgroundColor: light ? "rgba(230,242,236,0.14)" : colors.softMint }]}>
      <SantaiLogo size={size} light={light} />
    </View>
  );
}

export function PageShell({ children, bottomBar }: PropsWithChildren<{ bottomBar?: ReactNode }>) {
  const [navHeight, setNavHeight] = useState(80);
  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.pageFrame}>
        <ForestBackdrop />
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          {children}
        </KeyboardAvoidingView>
        {bottomBar && <View onLayout={event => setNavHeight(event.nativeEvent.layout.height)}>{bottomBar}</View>}
        {bottomBar && <StreakPet bottom={navHeight} />}
      </View>
    </SafeAreaView>
  );
}

export function ScrollPage({ children, bottomBar, contentStyle }: PropsWithChildren<{ bottomBar?: ReactNode; contentStyle?: StyleProp<ViewStyle> }>) {
  const pet = useContext(StreakPetContext);
  return (
    <PageShell bottomBar={bottomBar}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.scrollContent, contentStyle, bottomBar && pet !== undefined ? { paddingBottom: 120 } : undefined]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </PageShell>
  );
}

export function PageHeader({ eyebrow, title, body, onBack }: { eyebrow: string; title: string; body?: string; onBack?: () => void }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerTopRow}>
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={8}
            onPress={onBack}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <Text style={styles.backText}>‹ Back</Text>
          </Pressable>
        ) : (
          <MarginMark size={20} />
        )}
        <Text style={styles.eyebrow}>{eyebrow.toUpperCase()}</Text>
      </View>
      <Text accessibilityRole="header" style={styles.pageTitle}>{title}</Text>
      {body ? <Text style={styles.headerBody}>{body}</Text> : null}
    </View>
  );
}

type ButtonProps = {
  text: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "quiet" | "warning";
  disabled?: boolean;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
};

export function AppButton({ text, onPress, variant = "primary", disabled = false, icon, style }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "primary" && styles.buttonPrimary,
        variant === "secondary" && styles.buttonSecondary,
        variant === "quiet" && styles.buttonQuiet,
        variant === "warning" && styles.buttonWarning,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      {icon ? <MarginIcon name={icon} color={variant === "primary" ? colors.white : colors.forest} size={19} /> : null}
      <Text
        style={[
          styles.buttonText,
          variant === "primary" ? styles.buttonTextPrimary : styles.buttonTextSecondary,
          disabled && styles.buttonTextDisabled,
        ]}
      >
        {text}
      </Text>
    </Pressable>
  );
}

export function SectionLabel({ children, detail }: PropsWithChildren<{ detail?: string }>) {
  return (
    <View style={styles.sectionLabelRow}>
      <Text style={styles.sectionLabel}>{children}</Text>
      {detail ? <Text style={styles.sectionDetail}>{detail}</Text> : null}
    </View>
  );
}

export function Card({ children, tone = "paper", style }: PropsWithChildren<{ tone?: "paper" | "mint" | "dark" | "coral" | "amber"; style?: StyleProp<ViewStyle> }>) {
  const toneStyle = {
    paper: styles.cardPaper,
    mint: styles.cardMint,
    dark: styles.cardDark,
    coral: styles.cardCoral,
    amber: styles.cardAmber,
  }[tone];
  return <View style={[styles.card, toneStyle, style]}>{children}</View>;
}

export function ChoicePill({ text, selected, onPress, style }: { text: string; selected: boolean; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      aria-checked={selected}
      onPress={onPress}
      style={({ pressed }) => [styles.choice, selected && styles.choiceSelected, pressed && styles.pressed, style]}
    >
      <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{text}</Text>
    </Pressable>
  );
}

export function CheckboxRow({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      onPress={onPress}
      style={({ pressed }) => [styles.checkboxRow, selected && styles.checkboxRowSelected, pressed && styles.pressed]}
    >
      <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
        {selected ? <MarginIcon name="check" color={colors.white} size={16} strokeWidth={2.4} /> : null}
      </View>
      <Text style={styles.checkboxLabel}>{label}</Text>
    </Pressable>
  );
}

export function FormField({ label, multiline, style, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label.toUpperCase()}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        style={[styles.input, multiline && styles.inputMultiline, style]}
        {...props}
      />
    </View>
  );
}

export function SegmentedChoices({ label, choices, selected, onSelect }: { label: string; choices: string[]; selected: string; onSelect: (value: string) => void }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label.toUpperCase()}</Text>
      <View style={styles.wrapRow}>
        {choices.map((choice) => (
          <ChoicePill key={choice} text={choice} selected={selected === choice} onPress={() => onSelect(choice)} style={styles.segmentChoice} />
        ))}
      </View>
    </View>
  );
}

export function ImpactSelector({ label, color, value, onChange }: { label: string; color: string; value: number; onChange: (value: number) => void }) {
  return (
    <View style={styles.impactRow}>
      <View style={styles.impactLabelRow}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={styles.impactLabel}>{label}</Text>
        <Text style={styles.impactValue}>{value}/5</Text>
      </View>
      <View style={styles.impactChoices}>
        {[1, 2, 3, 4, 5].map((option) => (
          <Pressable
            key={option}
            accessibilityRole="radio"
            accessibilityLabel={`${label} impact ${option} of 5`}
            accessibilityState={{ selected: option === value }}
            aria-checked={option === value}
            onPress={() => onChange(option)}
            style={[styles.impactButton, option === value && { backgroundColor: color, borderColor: color }]}
          >
            <Text style={[styles.impactButtonText, option === value && styles.impactButtonTextSelected]}>{option}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function CompactStepper({ label, value, onDecrease, onIncrease }: { label: string; value: string; onDecrease: () => void; onIncrease: () => void }) {
  return (
    <View style={styles.stepperRow}>
      <View style={styles.stepperText}>
        <Text style={styles.stepperLabel}>{label}</Text>
        <Text style={styles.stepperValue}>{value}</Text>
      </View>
      <View style={styles.stepperControls}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Decrease ${label}`} onPress={onDecrease} style={styles.stepperButton}><Text style={styles.stepperSymbol}>−</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Increase ${label}`} onPress={onIncrease} style={styles.stepperButton}><Text style={styles.stepperSymbol}>+</Text></Pressable>
      </View>
    </View>
  );
}

export function CapacityBar({ value, compact = false }: { value: CapacityValue; compact?: boolean }) {
  const meta = capacityMeta[value.kind];
  const percentage = Math.min(150, Math.round((value.used / Math.max(value.limit, 1)) * 100));
  return (
    <View style={styles.capacityBlock} accessibilityLabel={`${meta.label} at ${percentage} percent`}>
      <View style={styles.capacityTopRow}>
        <Text style={[styles.capacityName, compact && styles.capacityNameCompact]}>{meta.label}</Text>
        <Text style={[styles.capacityPercent, compact && styles.capacityPercentCompact]}>{percentage}%</Text>
      </View>
      <View style={[styles.capacityTrack, compact && styles.capacityTrackCompact]}>
        <View style={[styles.capacityFill, { width: `${Math.min(100, percentage)}%`, backgroundColor: meta.color }]} />
      </View>
    </View>
  );
}

const tabs: { key: MainTab; label: string; icon: IconName }[] = [
  { key: "today", label: "Dashboard", icon: "today" },
  { key: "plan", label: "Plan", icon: "plan" },
  { key: "distribution", label: "Load", icon: "distribution" },
  { key: "recovery", label: "Recover", icon: "recovery" },
];

export function BottomNav({ selected, onSelect }: { selected: MainTab; onSelect: (tab: MainTab) => void }) {
  return (
    <View style={styles.navOuter}>
      <ForestFloor />
      <View style={styles.navBar} accessibilityRole="tablist">
        {tabs.map((tab) => {
          const active = selected === tab.key;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              aria-selected={active}
              onPress={() => onSelect(tab.key)}
              style={({ pressed }) => [styles.navItem, pressed && styles.pressed]}
            >
              <View style={[styles.navIconBox, active && styles.navIconBoxActive]}>
                <MarginIcon name={tab.icon} color={active ? colors.forest : colors.mint} size={20} />
              </View>
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function ProgressBar({ current, total, color = colors.forest }: { current: number; total: number; color?: string }) {
  return (
    <View style={styles.progressTrack} accessibilityLabel={`Step ${current} of ${total}`}>
      <View style={[styles.progressFill, { width: `${Math.round((current / total) * 100)}%`, backgroundColor: color }]} />
    </View>
  );
}

export function InlineNotice({ title, body, tone = "mint" }: { title: string; body: string; tone?: "mint" | "amber" | "coral" }) {
  return (
    <View style={[styles.notice, tone === "mint" && styles.noticeMint, tone === "amber" && styles.noticeAmber, tone === "coral" && styles.noticeCoral]}>
      <Text style={styles.noticeTitle}>{title}</Text>
      <Text style={styles.noticeBody}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: colors.deepForest },
  pageFrame: { flex: 1, width: "100%", maxWidth: layout.pageMaxWidth, alignSelf: "center", backgroundColor: colors.deepForest, ...layout.webShadow },
  scrollContent: { flexGrow: 1, paddingBottom: 0 },
  mark: { borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  header: { paddingHorizontal: layout.pagePadding, paddingTop: 14, paddingBottom: 24, gap: 8 },
  headerTopRow: { minHeight: 40, flexDirection: "row", alignItems: "center", gap: 10 },
  backButton: { minHeight: layout.touchTarget, minWidth: 72, justifyContent: "center" },
  backText: { ...type.label, color: colors.white },
  eyebrow: { ...type.eyebrow, color: colors.mint, flexShrink: 1 },
  pageTitle: { ...type.h1, color: colors.white },
  headerBody: { ...type.body, color: colors.mint, maxWidth: 440 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  button: { minHeight: 56, borderRadius: 17, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, borderWidth: 1 },
  buttonPrimary: { backgroundColor: colors.forest, borderColor: colors.forest },
  buttonSecondary: { backgroundColor: colors.paper, borderColor: colors.outline },
  buttonQuiet: { backgroundColor: colors.softMint, borderColor: colors.softMint },
  buttonWarning: { backgroundColor: colors.softCoral, borderColor: colors.coral },
  buttonDisabled: { backgroundColor: colors.surfaceMuted, borderColor: colors.outlineSoft },
  buttonText: { ...type.label, textAlign: "center", flexShrink: 1 },
  buttonTextPrimary: { color: colors.white },
  buttonTextSecondary: { color: colors.ink },
  buttonTextDisabled: { color: colors.textMuted },
  sectionLabelRow: { minHeight: 26, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  sectionLabel: { ...type.h3, color: colors.ink },
  sectionDetail: { ...type.caption, color: colors.textMuted },
  card: { borderRadius: layout.radius, padding: 16, borderWidth: 1 },
  cardPaper: { backgroundColor: colors.paper, borderColor: colors.outlineSoft },
  cardMint: { backgroundColor: colors.mint, borderColor: colors.mint },
  cardDark: { backgroundColor: colors.deepForest, borderColor: colors.deepForest },
  cardCoral: { backgroundColor: colors.softCoral, borderColor: colors.softCoral },
  cardAmber: { backgroundColor: colors.softAmber, borderColor: colors.softAmber },
  choice: { minHeight: 50, borderRadius: 10, borderWidth: 1, borderColor: colors.outlineSoft, backgroundColor: colors.paper, paddingHorizontal: 14, paddingVertical: 11, alignItems: "center", justifyContent: "center" },
  choiceSelected: { borderColor: colors.forest, backgroundColor: colors.mint },
  choiceText: { ...type.bodySmall, color: colors.ink, textAlign: "center" },
  choiceTextSelected: { fontFamily: fonts.semiBold, color: colors.forest },
  checkboxRow: { minHeight: 56, borderRadius: 11, borderWidth: 1, borderColor: colors.outlineSoft, backgroundColor: colors.paper, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 8 },
  checkboxRowSelected: { backgroundColor: colors.mint, borderColor: colors.forest },
  checkbox: { width: 26, height: 26, borderRadius: 7, borderWidth: 1.5, borderColor: colors.outline, alignItems: "center", justifyContent: "center" },
  checkboxSelected: { backgroundColor: colors.forest, borderColor: colors.forest },
  checkboxLabel: { ...type.body, fontFamily: fonts.medium, color: colors.ink, flex: 1 },
  fieldGroup: { gap: 8 },
  fieldLabel: { ...type.eyebrow, color: colors.textMuted },
  input: { minHeight: 54, borderRadius: 11, borderWidth: 1, borderColor: colors.outlineSoft, backgroundColor: colors.paper, color: colors.ink, paddingHorizontal: 15, paddingVertical: 12, ...type.body },
  inputMultiline: { minHeight: 108, textAlignVertical: "top" },
  wrapRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  segmentChoice: { minWidth: 104, flexGrow: 1 },
  impactRow: { gap: 10 },
  impactLabelRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  impactLabel: { ...type.label, color: colors.ink, flex: 1 },
  impactValue: { ...type.caption, color: colors.textMuted },
  impactChoices: { flexDirection: "row", gap: 8 },
  impactButton: { flex: 1, minHeight: 48, borderRadius: 9, borderWidth: 1, borderColor: colors.outlineSoft, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center" },
  impactButtonText: { ...type.label, color: colors.ink },
  impactButtonTextSelected: { color: colors.white },
  stepperRow: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 12, borderTopWidth: 1, borderColor: colors.outlineSoft, paddingTop: 10 },
  stepperText: { flex: 1 },
  stepperLabel: { ...type.caption, color: colors.textMuted },
  stepperValue: { ...type.label, color: colors.ink, marginTop: 2 },
  stepperControls: { flexDirection: "row", gap: 8 },
  stepperButton: { width: 48, height: 48, borderRadius: 10, borderWidth: 1, borderColor: colors.outlineSoft, backgroundColor: colors.softMint, alignItems: "center", justifyContent: "center" },
  stepperSymbol: { fontFamily: fonts.medium, fontSize: 24, lineHeight: 26, color: colors.forest },
  capacityBlock: { gap: 7 },
  capacityTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  capacityName: { ...type.label, color: colors.ink },
  capacityNameCompact: { fontSize: 13 },
  capacityPercent: { ...type.bodySmall, color: colors.textMuted },
  capacityPercentCompact: { fontSize: 13 },
  capacityTrack: { height: 9, borderRadius: 5, backgroundColor: colors.outlineSoft, overflow: "hidden" },
  capacityTrackCompact: { height: 7 },
  capacityFill: { height: "100%", borderRadius: 5 },
  navOuter: { backgroundColor: colors.deepForest, paddingHorizontal: 14, paddingTop: 16, paddingBottom: Platform.OS === "web" ? 12 : 4 },
  navBar: { minHeight: 74, borderRadius: 17, borderWidth: 0, borderColor: colors.outlineSoft, backgroundColor: "transparent", flexDirection: "row", paddingHorizontal: 5, paddingVertical: 5 },
  navItem: { flex: 1, minHeight: 62, alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
  navIconBox: { width: 52, height: 34, borderRadius: 18, borderWidth: 0, borderColor: colors.outlineSoft, backgroundColor: "transparent", alignItems: "center", justifyContent: "center" },
  navIconBoxActive: { backgroundColor: colors.mint, borderColor: "rgba(15,107,79,0.25)" },
  navLabel: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.mint },
  navLabelActive: { fontFamily: fonts.semiBold, color: colors.white },
  progressTrack: { height: 7, backgroundColor: colors.outlineSoft, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  notice: { borderRadius: 12, padding: 16, gap: 4 },
  noticeMint: { backgroundColor: colors.mint },
  noticeAmber: { backgroundColor: colors.softAmber },
  noticeCoral: { backgroundColor: colors.softCoral },
  noticeTitle: { ...type.label, color: colors.ink },
  noticeBody: { ...type.bodySmall, color: colors.textMuted },
});
