import { useContext, useState, type PropsWithChildren, type ReactNode } from "react";
import { StreakPet, StreakPetContext } from "./StreakPet";
import {
  KeyboardAvoidingView,
  Modal,
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

import { MainTab, QuickAddAction } from "@/models/margin";
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

export function PageShell({ children, bottomBar, plain = false }: PropsWithChildren<{ bottomBar?: ReactNode; plain?: boolean }>) {
  const [navHeight, setNavHeight] = useState(80);
  const [frame, setFrame] = useState({ width: 320, height: 600 });
  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.pageFrame} onLayout={e => setFrame(e.nativeEvent.layout)}>
        {!plain && <ForestBackdrop />}
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          {children}
        </KeyboardAvoidingView>
        {bottomBar && <View onLayout={event => setNavHeight(event.nativeEvent.layout.height)}>{bottomBar}</View>}
        {bottomBar && <StreakPet bottom={navHeight} frame={frame} />}
      </View>
    </SafeAreaView>
  );
}

export function ScrollPage({ children, bottomBar, contentStyle, plain }: PropsWithChildren<{ bottomBar?: ReactNode; contentStyle?: StyleProp<ViewStyle>; plain?: boolean }>) {
  const pet = useContext(StreakPetContext);
  return (
    <PageShell bottomBar={bottomBar} plain={plain}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.scrollContent, contentStyle, bottomBar && pet !== undefined && !pet.hidden ? { paddingBottom: 120 } : undefined]}
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

export function ChoiceDropdown({ label, value, placeholder, options, onSelect }: { label: string; value: string; placeholder: string; options: { label: string; value: string; detail?: string }[]; onSelect: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const selected = options.find(option => option.value === value);
  return <View style={styles.fieldGroup}>
    <Text style={styles.fieldLabel}>{label.toUpperCase()}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}, ${selected?.label ?? placeholder}`} accessibilityState={{ expanded: open }} onPress={() => setOpen(true)} style={({ pressed }) => [styles.dropdownButton, pressed && styles.pressed]}>
      <View style={styles.flex}><Text style={[styles.dropdownValue, !selected && styles.dropdownPlaceholder]}>{selected?.label ?? placeholder}</Text>{selected?.detail ? <Text style={styles.dropdownDetail}>{selected.detail}</Text> : null}</View>
      <Text style={styles.dropdownChevron}>⌄</Text>
    </Pressable>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <Pressable style={styles.sheetOverlay} onPress={() => setOpen(false)}>
        <View style={styles.optionSheet}>
          <View style={styles.sheetHandle} />
          <Text accessibilityRole="header" style={styles.sheetTitle}>{label}</Text>
          {options.map(option => <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ selected: option.value === value }} onPress={() => { onSelect(option.value); setOpen(false); }} style={({ pressed }) => [styles.dropdownOption, option.value === value && styles.dropdownOptionSelected, pressed && styles.pressed]}><View style={styles.flex}><Text style={styles.dropdownOptionTitle}>{option.label}</Text>{option.detail ? <Text style={styles.dropdownDetail}>{option.detail}</Text> : null}</View>{option.value === value ? <MarginIcon name="check" size={20} color={colors.forest} /> : null}</Pressable>)}
          <AppButton text="Close" variant="quiet" onPress={() => setOpen(false)} />
        </View>
      </Pressable>
    </Modal>
  </View>;
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

const tabs: { key: MainTab; label: string; icon: IconName }[] = [
  { key: "today", label: "Dashboard", icon: "today" },
  { key: "plan", label: "Plan", icon: "plan" },
  { key: "recovery", label: "Recover", icon: "recovery" },
  { key: "profile", label: "Profile", icon: "person" },
];

const quickActions: { key: QuickAddAction; label: string; detail: string; icon: IconName }[] = [
  { key: "commitment", label: "Add commitment", detail: "Event, shift, club, sport or personal plan", icon: "plus" },
  { key: "assignment", label: "Add assignment", detail: "Choose a module, start date and due date", icon: "plan" },
  { key: "timetable", label: "Import schedule", detail: "Upload or replace your timetable", icon: "calendar" },
  { key: "materials", label: "Add learning material", detail: "Upload notes for a module", icon: "document" },
  { key: "weekly-note", label: "Update weekly note", detail: "Keep one piece of context visible", icon: "leaf" },
];

export function BottomNav({ selected, onSelect, onQuickAdd }: { selected: MainTab; onSelect: (tab: MainTab) => void; onQuickAdd?: (action: QuickAddAction) => void }) {
  const [open, setOpen] = useState(false);
  const renderTab = (tab: (typeof tabs)[number]) => {
    const active = selected === tab.key;
    return <Pressable key={tab.key} accessibilityRole="tab" accessibilityState={{ selected: active }} aria-selected={active} onPress={() => onSelect(tab.key)} style={({ pressed }) => [styles.navItem, pressed && styles.pressed]}><View style={[styles.navIconBox, active && styles.navIconBoxActive]}><MarginIcon name={tab.icon} color={active ? colors.forest : colors.white} size={20} /></View><Text style={[styles.navLabel, active && styles.navLabelActive]}>{tab.label}</Text></Pressable>;
  };
  return (
    <>
      <View style={styles.navOuter}>
        <ForestFloor />
        <View style={styles.navBar} accessibilityRole="tablist">
          {tabs.slice(0, 2).map(renderTab)}
          <Pressable accessibilityRole="button" accessibilityLabel="Open add menu" accessibilityState={{ expanded: open }} onPress={() => setOpen(true)} style={({ pressed }) => [styles.addNavItem, pressed && styles.pressed]}><View style={styles.addNavButton}><MarginIcon name="plus" color={colors.soilDark} size={27} strokeWidth={2.3} /></View><Text style={styles.navLabelActive}>Add</Text></Pressable>
          {tabs.slice(2).map(renderTab)}
        </View>
      </View>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setOpen(false)}>
          <View style={styles.quickAddSheet}>
            <View style={styles.sheetHandle} />
            <Text accessibilityRole="header" style={styles.sheetTitle}>Add to Santai</Text>
            <Text style={styles.sheetBody}>Choose what you want to add. Nothing is saved until you review it.</Text>
            {quickActions.map(action => <Pressable key={action.key} accessibilityRole="button" onPress={() => { setOpen(false); onQuickAdd?.(action.key); }} style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]}><View style={styles.quickActionIcon}><MarginIcon name={action.icon} color={colors.forest} size={22} /></View><View style={styles.flex}><Text style={styles.quickActionTitle}>{action.label}</Text><Text style={styles.quickActionDetail}>{action.detail}</Text></View><MarginIcon name="chevron" color={colors.forest} size={19} /></Pressable>)}
            <AppButton text="Close" variant="quiet" onPress={() => setOpen(false)} />
          </View>
        </Pressable>
      </Modal>
    </>
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
  dropdownButton: { minHeight: 58, borderRadius: 12, borderWidth: 1, borderColor: colors.outline, backgroundColor: colors.paper, paddingHorizontal: 15, paddingVertical: 9, flexDirection: "row", alignItems: "center", gap: 12 },
  dropdownValue: { ...type.label, color: colors.ink },
  dropdownPlaceholder: { color: colors.textMuted },
  dropdownDetail: { ...type.caption, color: colors.textMuted, marginTop: 2 },
  dropdownChevron: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 24, color: colors.forest },
  sheetOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(4, 22, 16, 0.55)" },
  optionSheet: { width: "100%", maxWidth: layout.pageMaxWidth, alignSelf: "center", backgroundColor: colors.canvas, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24, gap: 10 },
  sheetHandle: { width: 44, height: 5, borderRadius: 3, backgroundColor: colors.outlineSoft, alignSelf: "center", marginBottom: 4 },
  sheetTitle: { ...type.h2, color: colors.ink },
  sheetBody: { ...type.bodySmall, color: colors.textMuted, marginBottom: 5 },
  dropdownOption: { minHeight: 58, borderRadius: 12, borderWidth: 1, borderColor: colors.outlineSoft, backgroundColor: colors.paper, paddingHorizontal: 14, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 12 },
  dropdownOptionSelected: { borderColor: colors.forest, backgroundColor: colors.mint },
  dropdownOptionTitle: { ...type.label, color: colors.ink },
  stepperRow: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 12, borderTopWidth: 1, borderColor: colors.outlineSoft, paddingTop: 10 },
  stepperText: { flex: 1 },
  stepperLabel: { ...type.caption, color: colors.textMuted },
  stepperValue: { ...type.label, color: colors.ink, marginTop: 2 },
  stepperControls: { flexDirection: "row", gap: 8 },
  stepperButton: { width: 48, height: 48, borderRadius: 10, borderWidth: 1, borderColor: colors.outlineSoft, backgroundColor: colors.softMint, alignItems: "center", justifyContent: "center" },
  stepperSymbol: { fontFamily: fonts.medium, fontSize: 24, lineHeight: 26, color: colors.forest },
  navOuter: { backgroundColor: colors.soil, paddingHorizontal: 10, paddingTop: 16, paddingBottom: Platform.OS === "web" ? 12 : 4 },
  navBar: { minHeight: 78, borderRadius: 17, borderWidth: 0, borderColor: colors.outlineSoft, backgroundColor: "transparent", flexDirection: "row", paddingHorizontal: 2, paddingVertical: 5 },
  navItem: { flex: 1, minHeight: 62, alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
  navIconBox: { width: 52, height: 34, borderRadius: 18, borderWidth: 0, borderColor: colors.outlineSoft, backgroundColor: "transparent", alignItems: "center", justifyContent: "center" },
  navIconBoxActive: { backgroundColor: colors.mint, borderColor: "rgba(15,107,79,0.25)" },
  navLabel: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.white },
  navLabelActive: { fontFamily: fonts.semiBold, color: colors.white },
  addNavItem: { flex: 1, minHeight: 66, alignItems: "center", justifyContent: "space-between", marginTop: -19, paddingBottom: 4 },
  addNavButton: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.leaf, borderWidth: 4, borderColor: colors.paper, alignItems: "center", justifyContent: "center" },
  quickAddSheet: { width: "100%", maxWidth: layout.pageMaxWidth, alignSelf: "center", backgroundColor: colors.canvas, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24, gap: 10 },
  quickAction: { minHeight: 68, borderRadius: 15, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.outlineSoft, padding: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  quickActionIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.mint, alignItems: "center", justifyContent: "center" },
  quickActionTitle: { ...type.label, color: colors.ink },
  quickActionDetail: { ...type.caption, color: colors.textMuted, marginTop: 2 },
  progressTrack: { height: 7, backgroundColor: colors.outlineSoft, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  notice: { borderRadius: 12, padding: 16, gap: 4 },
  noticeMint: { backgroundColor: colors.mint },
  noticeAmber: { backgroundColor: colors.softAmber },
  noticeCoral: { backgroundColor: colors.softCoral },
  noticeTitle: { ...type.label, color: colors.ink },
  noticeBody: { ...type.bodySmall, color: colors.textMuted },
});
