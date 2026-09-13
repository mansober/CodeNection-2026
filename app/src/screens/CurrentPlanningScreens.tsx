import { useEffect, useState } from "react";
import { Animated, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { MarginIcon } from "@/components/MarginIcon";
import { AppButton, BottomNav, Card, FormField, InlineNotice, ScrollPage, SegmentedChoices } from "@/components/MarginUI";
import { DateField, ValueSlider } from "@/components/PlannerControls";
import { CapacityValue, Commitment, MainTab, QuickAddAction, capacityMeta, formatHours } from "@/models/margin";
import { dateKey, fromKey, planActions, prettyDate, rankedRecoveryOptions, shiftDate } from "@/models/planner";
import { screenStyles as s } from "./screenStyles";
import { DashboardLoadSummary } from "@/components/DashboardCapacities";
import { EnergyLeaf } from "@/components/EnergyLeaf";
import { colors, fonts } from "@/theme/tokens";

export type Period = "Daily" | "Weekly";
export type PlanFilter = "All" | "Schedule" | "Assignments";
export type PlanDay = { date: string; items: Commitment[]; capacities: CapacityValue[]; load: number };
type MenuProps = { period: Period; onPeriod: (value: Period) => void };

const periodOptions: { label: string; value: Period }[] = [
  { label: "Day", value: "Daily" },
  { label: "Week", value: "Weekly" },
];

function PeriodSwitch({ period, onPeriod }: MenuProps) {
  return <View accessibilityRole="tablist" style={dashboardHeroStyles.periodSwitch}>
    {periodOptions.map(option => {
      const selected = period === option.value;
      return <Pressable
        key={option.value}
        accessibilityRole="tab"
        accessibilityState={{ selected }}
        onPress={() => onPeriod(option.value)}
        style={({ pressed }) => [dashboardHeroStyles.periodOption, selected && dashboardHeroStyles.periodOptionSelected, pressed && dashboardHeroStyles.periodOptionPressed]}
      >
        <Text style={[dashboardHeroStyles.periodText, selected && dashboardHeroStyles.periodTextSelected]}>{option.label}</Text>
      </Pressable>;
    })}
  </View>;
}

type DashboardFlashcardGroup = { name: string; count: number };

function DailyFlashcards({ groups, hasMaterials, onOpen }: { groups: DashboardFlashcardGroup[]; hasMaterials: boolean; onOpen: () => void }) {
  const totalCards = groups.reduce((total, group) => total + group.count, 0);
  const active = totalCards > 0;
  return <View style={dashboardSectionStyles.flashcardSection}>
    <View style={dashboardSectionStyles.flashcardHeader}>
      <Text style={[s.eyebrow, { color: colors.amber }]}>DAILY FLASHCARDS</Text>
      {active ? <View style={dashboardSectionStyles.flashcardCountBadge}><Text style={dashboardSectionStyles.flashcardCountBadgeText}>{totalCards} {totalCards === 1 ? "card" : "cards"}</Text></View> : null}
    </View>
    <View style={dashboardSectionStyles.flashcardSurface}>
      {active ? <>
        <View style={dashboardSectionStyles.flashcardList}>
          {groups.slice(0, 3).map(group => <View key={group.name} style={dashboardSectionStyles.flashcardRow}><Text numberOfLines={1} style={dashboardSectionStyles.flashcardModule}>{group.name}</Text><Text style={dashboardSectionStyles.flashcardModuleCount}>{group.count} {group.count === 1 ? "card" : "cards"}</Text></View>)}
          {groups.length > 3 ? <Text style={dashboardSectionStyles.flashcardMore}>+{groups.length - 3} more {groups.length - 3 === 1 ? "module" : "modules"}</Text> : null}
        </View>
        <AppButton text="Start review" icon="document" onPress={onOpen} />
      </> : <>
        <Text style={dashboardSectionStyles.flashcardTitle}>{hasMaterials ? "No review cards yet." : "No flashcards ready yet."}</Text>
        <Text style={dashboardSectionStyles.flashcardBody}>{hasMaterials ? "Add text notes to create cards for future reviews." : "Add learning materials to create your first review."}</Text>
        <AppButton text="Add learning materials" icon="document" variant="secondary" onPress={onOpen} />
      </>}
    </View>
  </View>;
}

export function CurrentHomeScreen({ period, onPeriod, capacities, overall, energy, onTab, onQuickAdd, onRebalance, onTest, onFlashcards, onWeeklyNote, flashcardGroups, hasMaterials, weeklyNote }: MenuProps & { capacities: CapacityValue[]; overall: number; energy: number; streak: number; onTab: (tab: MainTab) => void; onQuickAdd: (action: QuickAddAction) => void; onRebalance: () => void; onTest: () => void; onFlashcards: () => void; onWeeklyNote: () => void; flashcardGroups: DashboardFlashcardGroup[]; hasMaterials: boolean; weeklyNote: string }) {
  return <ScrollPage suppressPetEndPadding bottomBar={<BottomNav selected="today" onSelect={onTab} onQuickAdd={onQuickAdd} />}>
    <View style={dashboardHeroStyles.hero}>
      <View style={dashboardHeroStyles.heroTopRow}>
        <Text style={dashboardHeroStyles.date}>{prettyDate(dateKey()).toUpperCase()}</Text>
        <PeriodSwitch {...{ period, onPeriod }} />
      </View>
      <Text accessibilityRole="header" style={dashboardHeroStyles.title}>Your day has room to breathe</Text>
      <EnergyLeaf energy={energy} />
    </View>
    <View style={[s.content, dashboardSectionStyles.contentWithPetClearance]}>
      <Card tone={weeklyNote ? "mint" : "paper"} style={dashboardSectionStyles.weeklyNote}>
        <View style={s.rowBetween}>
          <Text style={[s.eyebrow, { color: colors.forest }]}>YOUR WEEKLY NOTE</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Edit weekly note" hitSlop={8} onPress={onWeeklyNote} style={({ pressed }) => [dashboardSectionStyles.editNote, pressed && dashboardSectionStyles.editNotePressed]}>
            <Text style={dashboardSectionStyles.editNoteText}>Edit</Text>
          </Pressable>
        </View>
        <Text numberOfLines={2} ellipsizeMode="tail" style={weeklyNote ? dashboardSectionStyles.noteText : s.bodySmallMuted}>{weeklyNote || "Add one reminder or piece of context for this week."}</Text>
      </Card>
      <DashboardLoadSummary values={capacities} overall={overall} period={period} />
      <DailyFlashcards groups={flashcardGroups} hasMaterials={hasMaterials} onOpen={onFlashcards} />
      {overall >= 60 && <InlineNotice title="A recovery break would help" body={overall >= 85 ? "Try a short, quiet pause. Open Recover for suggestions matched to your load." : "A gentle walk or a screen break can fit around today's plans."} />}
      <View style={dashboardSectionStyles.planActions}>
        <Text style={[s.eyebrow, { color: colors.forest }]}>PLAN ACTIONS</Text>
        <View style={dashboardSectionStyles.planActionButtons}>
          <AppButton text="Make room in my plan" icon="recovery" onPress={onRebalance} />
          <AppButton text="Test a new commitment" variant="secondary" icon="plus" onPress={onTest} />
        </View>
      </View>
    </View></ScrollPage>;
}


function filterPlanItems(items: Commitment[], filter: PlanFilter) {
  return items
    .filter(item => filter !== "Assignments" || item.category === "Assignment")
    .filter(item => filter !== "Schedule" || item.category !== "Assignment");
}

function planStateLabel(item: Commitment, needsDate = false) {
  if (needsDate && !item.startDate && !item.dueDate) return "Set date";
  if (item.action === "Move to another day") return "Moved";
  if (item.action === "Ask someone to help") return "Help requested";
  if (item.action === "Skip this time") return "Skipped";
  if (item.action === "Make it lighter") return "Lighter";
  return "As planned";
}

function planDuration(item: Commitment) {
  return formatHours(item.durationHours ?? item.time / 5);
}

function ScheduleRow({ item, needsDate = false, onOpen }: { item: Commitment; needsDate?: boolean; onOpen: () => void }) {
  const state = planStateLabel(item, needsDate);
  const currentAction = item.action ?? planActions[0];
  const stateTone = currentAction === "Skip this time" ? planPageStyles.stateSkipped : currentAction === "Ask someone to help" ? planPageStyles.stateHelp : currentAction === "Move to another day" ? planPageStyles.stateMoved : planPageStyles.stateDefault;
  return <Pressable
    accessibilityRole="button"
    accessibilityLabel={`${item.name}. ${planDuration(item)}. ${needsDate && !item.startDate && !item.dueDate ? "Needs a date." : `Currently ${currentAction.toLowerCase()}.`}`}
    accessibilityHint="Opens planning actions"
    onPress={onOpen}
    style={({ pressed }) => [planPageStyles.scheduleRow, pressed && planPageStyles.rowPressed]}
  >
    <View style={planPageStyles.scheduleTitleRow}>
      <Text style={planPageStyles.scheduleTitle}>{item.name}</Text>
      <Text style={planPageStyles.scheduleDuration}>{planDuration(item)}</Text>
    </View>
    <View style={[planPageStyles.stateControl, stateTone]}>
      <Text style={planPageStyles.stateControlText}>{state}</Text>
      <Text aria-hidden style={planPageStyles.stateChevron}>⌄</Text>
    </View>
  </Pressable>;
}

function ScheduleSections({ items, onOpen }: { items: Commitment[]; onOpen: (item: Commitment) => void }) {
  const sections = [
    { key: "routine", label: "Routine", accent: colors.waterDeep, items: items.filter(item => !!item.routineId) },
    { key: "commitments", label: "Commitments", accent: colors.soil, items: items.filter(item => !item.routineId && item.category !== "Assignment") },
    { key: "assignments", label: "Assignments", accent: colors.violet, items: items.filter(item => !item.routineId && item.category === "Assignment") },
  ];
  return <>{sections.filter(section => section.items.length > 0).map(section => <View key={section.key} style={planPageStyles.scheduleSection}>
    <View style={planPageStyles.sectionHeading}><View style={[planPageStyles.sectionDot, { backgroundColor: section.accent }]} /><Text style={planPageStyles.sectionLabel}>{section.label.toUpperCase()}</Text></View>
    <View style={planPageStyles.scheduleGroup}>{section.items.map((item, index) => <View key={item.id}>{index > 0 ? <View style={planPageStyles.scheduleDivider} /> : null}<ScheduleRow item={item} onOpen={() => onOpen(item)} /></View>)}</View>
  </View>)}</>;
}

function weekRangeLabel(days: PlanDay[], selectedDate: string) {
  const start = fromKey(days[0]?.date ?? selectedDate);
  const end = fromKey(days[days.length - 1]?.date ?? selectedDate);
  const startMonth = start.toLocaleDateString(undefined, { month: "short" });
  const endMonth = end.toLocaleDateString(undefined, { month: "short" });
  return start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
    ? `${startMonth} ${start.getDate()}–${end.getDate()}`
    : `${startMonth} ${start.getDate()}–${endMonth} ${end.getDate()}`;
}

function PlanDateNavigator({ period, days, selectedDate, onDate }: { period: Period; days: PlanDay[]; selectedDate: string; onDate: (date: string) => void }) {
  const step = period === "Daily" ? 1 : 7;
  const displayValue = period === "Daily" ? prettyDate(selectedDate) : weekRangeLabel(days, selectedDate);
  return <View style={planPageStyles.dateNavigator}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Previous ${period === "Daily" ? "day" : "week"}`} hitSlop={6} onPress={() => onDate(shiftDate(selectedDate, -step))} style={({ pressed }) => [planPageStyles.dateArrow, pressed && planPageStyles.rowPressed]}><Text style={planPageStyles.dateArrowText}>‹</Text></Pressable>
    <View style={planPageStyles.datePicker}><DateField value={selectedDate} displayValue={displayValue} buttonVariant="quiet" buttonStyle={planPageStyles.datePickerButton} onChange={onDate} /></View>
    <Pressable accessibilityRole="button" accessibilityLabel={`Next ${period === "Daily" ? "day" : "week"}`} hitSlop={6} onPress={() => onDate(shiftDate(selectedDate, step))} style={({ pressed }) => [planPageStyles.dateArrow, pressed && planPageStyles.rowPressed]}><Text style={planPageStyles.dateArrowText}>›</Text></Pressable>
  </View>;
}

function PlanWeekOverview({ days, selectedDate, onSelect }: { days: PlanDay[]; selectedDate: string; onSelect: (date: string) => void }) {
  return <View style={planPageStyles.weekOverview}>
    <Text style={planPageStyles.sectionLabel}>WEEK AT A GLANCE</Text>
    <View style={planPageStyles.weekDayRow}>{days.map(day => {
      const selected = day.date === selectedDate;
      const label = `${fullDate(day.date)}.${selected ? " Selected." : ""}`;
      return <Pressable key={day.date} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }} hitSlop={{ top: 4, right: 3, bottom: 4, left: 3 }} onPress={() => onSelect(day.date)} style={({ pressed }) => [planPageStyles.weekDay, { flex: selected ? 1.18 : 1 }, selected && planPageStyles.weekDaySelected, pressed && planPageStyles.rowPressed]}>
        <Text style={[planPageStyles.weekDayName, selected && planPageStyles.weekDayNameSelected]}>{shortWeekday(day.date).toUpperCase()}</Text>
        <Text style={[planPageStyles.weekDayNumber, selected && planPageStyles.weekDayNumberSelected]}>{fromKey(day.date).getDate()}</Text>
      </Pressable>;
    })}</View>
  </View>;
}

function PlanEmptyState({ period, date, filtered, onAdd }: { period: Period; date: string; filtered: boolean; onAdd?: () => void }) {
  const weekday = fromKey(date).toLocaleDateString(undefined, { weekday: "long" });
  const title = filtered ? "Nothing in this view" : period === "Daily" ? "No commitments yet" : `No commitments on ${weekday}`;
  const body = filtered ? "Your other schedule groups are still available." : period === "Daily" ? "Your day is open." : "This day is open.";
  return <View style={planPageStyles.emptyState}>
    <View style={planPageStyles.emptyIcon}><MarginIcon name="calendar" size={21} color={colors.fern} /></View>
    <Text style={planPageStyles.emptyTitle}>{title}</Text>
    <Text style={planPageStyles.emptyBody}>{body}</Text>
    {onAdd ? <AppButton text="Add commitment" icon="plus" onPress={onAdd} /> : null}
  </View>;
}

function PlanActionSheet({ item, defaultDate, onClose, onSave, onEdit }: { item: Commitment; defaultDate: string; onClose: () => void; onSave: (action: string, date: string, duration: number, helper: string) => void; onEdit: () => void }) {
  const currentAction = item.action ?? planActions[0];
  const [detailAction, setDetailAction] = useState("");
  const [date, setDate] = useState(item.startDate ?? defaultDate);
  const [duration, setDuration] = useState(Math.max(0.25, item.durationHours ?? item.time / 5));
  const [helper, setHelper] = useState(item.helper ?? "");
  const invalidDate = detailAction === "Move to another day" && !!item.dueDate && date > item.dueDate;
  const commit = (action: string) => { onSave(action, date, duration, helper); onClose(); };
  const choose = (action: string) => {
    if (action === "Move to another day" || action === "Ask someone to help" || action === "Make it lighter") setDetailAction(action);
    else commit(action);
  };
  const confirmText = detailAction === "Move to another day" ? "Move commitment" : detailAction === "Ask someone to help" ? "Save help request" : "Save lighter plan";
  return <Modal visible transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
    <KeyboardAvoidingView style={planPageStyles.sheetKeyboard} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Pressable style={planPageStyles.sheetOverlay} onPress={onClose}>
        <Pressable style={planPageStyles.actionSheet} onPress={event => event.stopPropagation()}>
          <View style={planPageStyles.sheetHandle} />
          <View style={planPageStyles.sheetHeader}>
            <View style={s.flex}><Text style={planPageStyles.sheetEyebrow}>PLAN ACTIONS</Text><Text accessibilityRole="header" numberOfLines={2} style={planPageStyles.sheetTitle}>Plan for “{item.name}”</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close planning actions" hitSlop={8} onPress={onClose} style={({ pressed }) => [planPageStyles.sheetClose, pressed && planPageStyles.rowPressed]}><Text style={planPageStyles.sheetCloseText}>×</Text></Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={planPageStyles.sheetContent}>
            {detailAction ? <>
              <Pressable accessibilityRole="button" onPress={() => setDetailAction("")} style={planPageStyles.backToActions}><Text style={planPageStyles.backToActionsText}>‹ All planning actions</Text></Pressable>
              <View style={planPageStyles.detailActionHeading}><Text style={planPageStyles.detailActionTitle}>{detailAction}</Text></View>
              {detailAction === "Move to another day" ? <><DateField label="New date" value={date} onChange={setDate} />{invalidDate ? <Text accessibilityRole="alert" style={planPageStyles.sheetError}>This is after the due date. Edit the deadline first if it has changed.</Text> : null}</> : null}
              {detailAction === "Ask someone to help" ? <FormField label="Who could help? (optional)" value={helper} onChangeText={setHelper} placeholder="Name or role" /> : null}
              {detailAction === "Make it lighter" ? <ValueSlider label="Time you can give it" value={duration} min={0.25} max={Math.max(0.25, item.durationHours ?? item.time / 5)} step={0.25} suffix=" hours" onChange={setDuration} /> : null}
              <AppButton text={confirmText} disabled={invalidDate} onPress={() => commit(detailAction)} />
            </> : <>
              <View accessibilityRole="radiogroup" style={planPageStyles.actionList}>{planActions.map(action => <Pressable key={action} accessibilityRole="radio" accessibilityState={{ selected: action === currentAction }} onPress={() => choose(action)} style={({ pressed }) => [planPageStyles.actionOption, action === currentAction && planPageStyles.actionOptionSelected, pressed && planPageStyles.rowPressed]}>
                <Text style={[planPageStyles.actionOptionText, action === currentAction && planPageStyles.actionOptionTextSelected]}>{action}</Text>
                {action === currentAction ? <MarginIcon name="check" size={20} color={colors.forest} /> : <MarginIcon name="chevron" size={18} color={colors.textMuted} />}
              </Pressable>)}</View>
              <View style={planPageStyles.sheetDivider} />
              <Pressable accessibilityRole="button" onPress={() => { onClose(); onEdit(); }} style={({ pressed }) => [planPageStyles.editDetailsAction, pressed && planPageStyles.rowPressed]}><Text style={planPageStyles.editDetailsText}>Edit details</Text><MarginIcon name="chevron" size={19} color={colors.forest} /></Pressable>
            </>}
          </ScrollView>
        </Pressable>
      </Pressable>
    </KeyboardAvoidingView>
  </Modal>;
}

export function CurrentPlanScreen({ period, onPeriod, filter, unscheduled, days, selectedDate, onDate, onTab, onQuickAdd, onAdd, onEdit, onAction }: MenuProps & { filter: PlanFilter; unscheduled: Commitment[]; days: PlanDay[]; selectedDate: string; onDate: (date: string) => void; onTab: (tab: MainTab) => void; onQuickAdd: (action: QuickAddAction) => void; onAdd: () => void; onEdit: (item: Commitment) => void; onAction: (item: Commitment, action: string, date: string, duration: number, helper: string) => void }) {
  const [activeItem, setActiveItem] = useState<Commitment>();
  const selectedDay = days.find(day => day.date === selectedDate) ?? days[0];
  const selectedItems = filterPlanItems(selectedDay?.items ?? [], filter);
  const dayIsEmpty = (selectedDay?.items.length ?? 0) === 0;
  const filteredEmpty = !dayIsEmpty && selectedItems.length === 0;
  const unscheduledItems = filter !== "Assignments" ? unscheduled : [];
  return <>
    <ScrollPage suppressPetEndPadding bottomBar={<BottomNav selected="plan" onSelect={onTab} onQuickAdd={onQuickAdd} />}>
      <View style={planPageStyles.hero}>
        <View style={planPageStyles.heroTopRow}><Text style={planPageStyles.heroEyebrow}>{period === "Daily" ? "DAILY PLAN" : "WEEKLY PLAN"}</Text><PeriodSwitch {...{ period, onPeriod }} /></View>
        <Text accessibilityRole="header" style={planPageStyles.heroTitle}>Your commitments</Text>
        <Text style={planPageStyles.heroBody}>{period === "Daily" ? "See what’s ahead and adjust what needs to change." : "See how your schedule is distributed across the week."}</Text>
      </View>
      <View style={[s.content, planPageStyles.contentWithPetClearance]}>
        <PlanDateNavigator period={period} days={days} selectedDate={selectedDate} onDate={onDate} />
        {period === "Weekly" ? <PlanWeekOverview days={days} selectedDate={selectedDay?.date ?? selectedDate} onSelect={onDate} /> : null}
        {period === "Weekly" && selectedDay ? <Text style={planPageStyles.selectedDayHeading}>{prettyDate(selectedDay.date).toUpperCase()}</Text> : null}
        {selectedItems.length > 0 ? <ScheduleSections items={selectedItems} onOpen={setActiveItem} /> : <PlanEmptyState period={period} date={selectedDay?.date ?? selectedDate} filtered={filteredEmpty} onAdd={dayIsEmpty ? onAdd : undefined} />}
        {period === "Weekly" && unscheduledItems.length > 0 ? <View style={planPageStyles.scheduleSection}>
          <View style={planPageStyles.sectionHeading}><View style={[planPageStyles.sectionDot, { backgroundColor: colors.moss }]} /><Text style={planPageStyles.sectionLabel}>SET UP LATER</Text></View>
          <View style={planPageStyles.scheduleGroup}>{unscheduledItems.map((item, index) => <View key={item.id}>{index > 0 ? <View style={planPageStyles.scheduleDivider} /> : null}<ScheduleRow item={item} needsDate onOpen={() => setActiveItem(item)} /></View>)}</View>
        </View> : null}
      </View>
    </ScrollPage>
    {activeItem ? <PlanActionSheet key={activeItem.id} item={activeItem} defaultDate={selectedDay?.date ?? selectedDate} onClose={() => setActiveItem(undefined)} onEdit={() => onEdit(activeItem)} onSave={(action, date, duration, helper) => onAction(activeItem, action, date, duration, helper)} /> : null}
  </>;
}

const RECOVERY_LOAD_THRESHOLD = 50;

type RecoveryDayInsight = {
  day: PlanDay;
  recommendation: ReturnType<typeof rankedRecoveryOptions>;
  focusPercent: number;
  needsRecovery: boolean;
  loadDescriptor: "Light" | "Moderate" | "Heavy";
};

function recoveryInsight(day: PlanDay): RecoveryDayInsight {
  const recommendation = rankedRecoveryOptions(day.capacities);
  const focusCapacity = day.capacities.find(value => value.kind === recommendation.focus);
  const focusPercent = Math.round((focusCapacity?.used ?? 0) / Math.max(1, focusCapacity?.limit ?? 1) * 100);
  const loadDescriptor = day.load >= 85 ? "Heavy" : day.load >= 60 ? "Moderate" : "Light";
  return { day, recommendation, focusPercent, needsRecovery: day.load >= RECOVERY_LOAD_THRESHOLD, loadDescriptor };
}

function shortWeekday(date: string) {
  return fromKey(date).toLocaleDateString(undefined, { weekday: "short" });
}

function fullDate(date: string) {
  return fromKey(date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

function weekdayName(date: string) {
  return fromKey(date).toLocaleDateString(undefined, { weekday: "long" });
}

function RecoveryDayItem({ insight, selected, onSelect }: { insight: RecoveryDayInsight; selected: boolean; onSelect: () => void }) {
  const { day, recommendation, needsRecovery } = insight;
  const meta = capacityMeta[recommendation.focus];
  const [selectionProgress] = useState(() => new Animated.Value(selected ? 1 : 0));
  const markerHeight = day.load === 0 ? 0 : Math.max(3, Math.round(Math.min(100, Math.max(0, day.load)) * 0.58));
  const capacityDescription = day.load === 0 ? "No capacity load." : `${meta.label} is highest.`;
  const accessibilityLabel = `${fullDate(day.date)}. ${day.load} percent load. ${capacityDescription} ${needsRecovery ? "Recovery recommended." : "Room protected."}${selected ? " Selected." : ""}`;

  useEffect(() => {
    const animation = Animated.timing(selectionProgress, {
      toValue: selected ? 1 : 0,
      duration: 200,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [selected, selectionProgress]);

  const flexGrow = selectionProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] });
  return <Animated.View style={[recoveryStyles.dayItemSlot, selected && recoveryStyles.dayItemSlotSelected, { flexGrow }]}>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Selects this day’s recovery details"
      accessibilityState={{ selected }}
      hitSlop={{ top: 6, right: 3, bottom: 6, left: 3 }}
      onPress={onSelect}
      style={({ pressed }) => [recoveryStyles.dayItem, selected && recoveryStyles.dayItemSelected, pressed && recoveryStyles.pressed]}
    >
      {needsRecovery ? <View accessibilityElementsHidden importantForAccessibility="no" style={recoveryStyles.attentionMark} /> : null}
      <View style={recoveryStyles.dayHeading}>
        <Text numberOfLines={1} style={[recoveryStyles.dayName, selected && recoveryStyles.dayNameSelected]}>{shortWeekday(day.date).toUpperCase()}</Text>
        <Text style={[recoveryStyles.dayNumber, selected && recoveryStyles.dayNumberSelected]}>{fromKey(day.date).getDate()}</Text>
      </View>
      <View style={recoveryStyles.plantStage}>
        <View style={recoveryStyles.plantGuide} />
        <View style={recoveryStyles.plantGround} />
        {markerHeight === 0 ? <View style={recoveryStyles.zeroBud} /> : <View style={[recoveryStyles.plantStem, { height: markerHeight, backgroundColor: meta.color }]}>
          {markerHeight >= 7 ? <View style={[recoveryStyles.plantLeaf, recoveryStyles.plantLeafLeft, { backgroundColor: meta.color }]} /> : null}
          {markerHeight >= 24 ? <View style={[recoveryStyles.plantLeaf, recoveryStyles.plantLeafRight, { backgroundColor: meta.color }]} /> : null}
        </View>}
      </View>
      <Text style={[recoveryStyles.dayLoad, selected && recoveryStyles.dayLoadSelected]}>{day.load}%</Text>
    </Pressable>
  </Animated.View>;
}

function RecoveryWeekMap({ insights, selectedDate, onSelect }: { insights: RecoveryDayInsight[]; selectedDate: string; onSelect: (date: string) => void }) {
  const attentionDays = insights.filter(insight => insight.needsRecovery);
  const protectedCount = insights.length - attentionDays.length;
  const status = attentionDays.length === 0
    ? `All ${insights.length} days already have enough room.`
    : protectedCount === 0
      ? "This week could use some extra room."
      : `${protectedCount} ${protectedCount === 1 ? "day already has" : "days already have"} enough room. ${attentionDays.length <= 2 ? `${attentionDays.map(insight => weekdayName(insight.day.date)).join(" and ")} could use some support.` : `${attentionDays.length} days could use some support.`}`;
  return <View style={recoveryStyles.weekMapGroup}>
    <View style={recoveryStyles.weekMap}>
      <View style={recoveryStyles.weekMapHeader}>
        <Text style={recoveryStyles.sectionEyebrow}>THIS WEEK</Text>
        <View style={recoveryStyles.capacityLegend} accessibilityLabel="Leaf colors show the leading capacity">
          {(Object.keys(capacityMeta) as (keyof typeof capacityMeta)[]).map(kind => <View key={kind} style={recoveryStyles.legendItem}><View style={[recoveryStyles.legendDot, { backgroundColor: capacityMeta[kind].color }]} /><Text style={recoveryStyles.legendText}>{capacityMeta[kind].label}</Text></View>)}
        </View>
      </View>
      <View style={recoveryStyles.dayRow}>
        {insights.map(insight => <RecoveryDayItem key={insight.day.date} insight={insight} selected={insight.day.date === selectedDate} onSelect={() => onSelect(insight.day.date)} />)}
      </View>
      <Text style={recoveryStyles.attentionSummary}>{status}</Text>
    </View>
  </View>;
}

function SelectedRecoveryDetail({ insight, result, whyOpen, onWhy, onResult, onPlan }: { insight: RecoveryDayInsight; result?: { done: boolean; feeling?: string }; whyOpen: boolean; onWhy: () => void; onResult: (value: { done: boolean; feeling?: string }) => void; onPlan: () => void }) {
  const { day, recommendation, focusPercent, needsRecovery, loadDescriptor } = insight;
  const meta = capacityMeta[recommendation.focus];
  const primary = recommendation.options[0];
  const today = dateKey();
  const hasCapacityLoad = day.load > 0;
  const capacitySummary = !hasCapacityLoad
    ? "No capacity load"
    : loadDescriptor === "Light"
      ? `${meta.label} is the largest share today.`
      : loadDescriptor === "Moderate"
        ? `${meta.label} is carrying most of today’s load.`
        : `${meta.label} is under the most pressure today.`;
  const selectedAccessibilityLabel = `${fullDate(day.date)}. ${day.load} percent load, ${loadDescriptor}. ${capacitySummary}. ${needsRecovery ? "Recovery suggested." : "No recovery needed."}`;
  return <View accessibilityLiveRegion="polite" style={recoveryStyles.selectedArea}>
    <View accessible accessibilityLabel={selectedAccessibilityLabel} style={[recoveryStyles.selectedContext, { borderTopColor: hasCapacityLoad ? meta.color : colors.outline }]}>
      <View style={recoveryStyles.selectedHeading}>
        <Text style={recoveryStyles.selectedDate}>{prettyDate(day.date).toUpperCase()}</Text>
        <View style={recoveryStyles.loadStateBlock}>
          <View style={recoveryStyles.loadBlock}><Text style={recoveryStyles.selectedLoad}>{day.load}%</Text><Text style={recoveryStyles.loadLabel}>LOAD</Text></View>
          <View style={recoveryStyles.descriptorPill}><Text numberOfLines={1} style={recoveryStyles.descriptorText}>{loadDescriptor}</Text></View>
        </View>
      </View>
      <View style={recoveryStyles.capacitySummaryRow}>
        <View aria-hidden style={[recoveryStyles.capacityDot, { backgroundColor: hasCapacityLoad ? meta.color : colors.outline }]} />
        <Text style={recoveryStyles.capacitySummary}>{capacitySummary}</Text>
      </View>
      <View style={[recoveryStyles.selectedStatus, needsRecovery ? recoveryStyles.selectedStatusAttention : recoveryStyles.selectedStatusProtected]}>
        <MarginIcon name={needsRecovery ? "recovery" : "check"} size={17} color={colors.forest} />
        <View style={recoveryStyles.statusCopy}>
          <Text style={recoveryStyles.statusTitle}>{needsRecovery ? "Recovery suggested" : "No recovery needed"}</Text>
          {!needsRecovery ? <Text style={recoveryStyles.statusBody}>Keep this space open.</Text> : null}
        </View>
      </View>
    </View>

    {needsRecovery && primary ? <Card tone="mint" style={[recoveryStyles.recommendationCard, { borderLeftColor: meta.color }]}>
      <View style={recoveryStyles.recommendationHeading}>
        <View style={recoveryStyles.recommendationHeadingCopy}><Text style={[recoveryStyles.sectionEyebrow, { color: meta.color }]}>RECOMMENDED RECOVERY</Text><Text style={recoveryStyles.recommendationTitle}>{primary.title}</Text></View>
        <View style={recoveryStyles.durationPill}><Text style={recoveryStyles.durationText}>{primary.duration}</Text></View>
      </View>
      <Text style={recoveryStyles.recommendationBody}>{primary.detail}</Text>
      <View style={recoveryStyles.helpBlock}>
        <Text style={recoveryStyles.helpLabel}>HELPS</Text>
        <Text style={recoveryStyles.helpValue}>{primary.supports.map(kind => capacityMeta[kind].label).join(" · ")}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={whyOpen ? "Hide why this recommendation" : "Why this recommendation"} accessibilityState={{ expanded: whyOpen }} onPress={onWhy} style={({ pressed }) => [recoveryStyles.whyButton, pressed && recoveryStyles.pressed]}>
        <Text style={recoveryStyles.whyButtonText}>{whyOpen ? "Hide why" : "Why this?"}</Text><Text aria-hidden style={recoveryStyles.disclosureChevron}>{whyOpen ? "⌃" : "⌄"}</Text>
      </Pressable>
      {whyOpen ? <View accessibilityLiveRegion="polite" style={recoveryStyles.whyPanel}>
        <Text style={recoveryStyles.whyEyebrow}>WHY THIS WORKS</Text>
        <Text style={recoveryStyles.whyText}>{meta.label} has the highest load relative to your capacity at {focusPercent}%.</Text>
        <Text style={recoveryStyles.whyText}>This option helps {primary.supports.map(kind => capacityMeta[kind].label).join(" and ")}{primary.costs?.length ? ` and also uses some ${primary.costs.map(kind => capacityMeta[kind].label).join(" and ")}` : ""}.</Text>
        {recommendation.timeOverloaded ? <Text style={recoveryStyles.whyText}>Time is already highly loaded, so only the brief planning option is shown.</Text> : null}
        {primary.evidence ? <Text style={recoveryStyles.evidenceText}>{primary.evidence}</Text> : null}
      </View> : null}
      <AppButton text="Review this day in Plan" icon="recovery" onPress={onPlan} />
      {day.date === today ? <>
        <AppButton text={result?.done ? "Completed · undo" : "I’ve done this"} variant={result?.done ? "secondary" : "quiet"} onPress={() => onResult({ done: !result?.done })} />
        {result?.done ? <><SegmentedChoices label="How do you feel afterward?" choices={["Better", "About the same", "Still drained"]} selected={result.feeling ?? ""} onSelect={feeling => onResult({ done: true, feeling })} />{result.feeling === "Still drained" ? <Text style={s.bodySmallMuted}>You don’t have to push through. Keep the next break gentle and review what can wait.</Text> : null}{result.feeling ? <Text style={s.caption}>Your reflection is saved.</Text> : null}</> : null}
      </> : null}
    </Card> : null}
  </View>;
}

export function CurrentRecoveryScreen({ days, results, onResult, onPlan, onTab, onQuickAdd }: { days: PlanDay[]; results: Record<string, { done: boolean; feeling?: string }>; onResult: (key: string, value: { done: boolean; feeling?: string }) => void; onPlan: (date: string) => void; onTab: (tab: MainTab) => void; onQuickAdd: (action: QuickAddAction) => void }) {
  const chronological = [...days].filter(day => day.date >= dateKey()).sort((a, b) => a.date.localeCompare(b.date)).map(recoveryInsight);
  const priority = chronological.filter(insight => insight.needsRecovery).sort((a, b) => b.day.load - a.day.load || a.day.date.localeCompare(b.day.date));
  const initialDate = priority[0]?.day.date ?? chronological[0]?.day.date ?? "";
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [whyOpen, setWhyOpen] = useState(false);
  const selected = chronological.find(insight => insight.day.date === selectedDate) ?? priority[0] ?? chronological[0];
  const attentionCount = priority.length;
  const heroSummary = attentionCount ? `${attentionCount} ${attentionCount === 1 ? "day could" : "days could"} use some room this week.` : "Your upcoming week has room.";
  return <ScrollPage suppressPetEndPadding bottomBar={<BottomNav selected="recovery" onSelect={onTab} onQuickAdd={onQuickAdd} />}>
    <View style={recoveryStyles.hero}>
      <Text style={recoveryStyles.heroEyebrow}>RECOVERY</Text>
      <Text accessibilityRole="header" style={recoveryStyles.heroTitle}>Recovery that respects the load</Text>
      <Text style={recoveryStyles.heroSummary}>{heroSummary}</Text>
    </View>
    <View style={recoveryStyles.content}>
      <RecoveryWeekMap insights={chronological} selectedDate={selected?.day.date ?? ""} onSelect={date => { setSelectedDate(date); setWhyOpen(false); }} />
      {selected ? <SelectedRecoveryDetail insight={selected} result={results[selected.day.date]} whyOpen={whyOpen} onWhy={() => setWhyOpen(open => !open)} onResult={value => onResult(selected.day.date, value)} onPlan={() => onPlan(selected.day.date)} /> : <Text style={s.bodySmallMuted}>No upcoming recovery days are available.</Text>}
      <View style={recoveryStyles.philosophy}>
        <MarginIcon name="leaf" size={22} color={colors.fern} />
        <View style={recoveryStyles.philosophyCopy}><Text style={recoveryStyles.philosophyTitle}>Recovery isn’t another test.</Text><Text style={recoveryStyles.philosophyBody}>There’s no penalty for skipping a suggestion. Chosen rest works better than another obligation.</Text></View>
      </View>
    </View>
  </ScrollPage>;
}

const planPageStyles = StyleSheet.create({
  hero: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 22,
    gap: 7,
  },
  heroTopRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  heroEyebrow: {
    fontFamily: fonts.bold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.1,
    color: colors.waterBright,
  },
  heroTitle: {
    fontFamily: fonts.bold,
    fontSize: 30,
    lineHeight: 35,
    letterSpacing: -0.45,
    color: colors.white,
  },
  heroBody: {
    maxWidth: 390,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.mint,
  },
  contentWithPetClearance: {
    paddingTop: 18,
    paddingBottom: 92,
    gap: 16,
  },
  dateNavigator: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "stretch",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.outlineSoft,
    backgroundColor: colors.paper,
    overflow: "hidden",
  },
  dateArrow: {
    width: 50,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  dateArrowText: {
    fontFamily: fonts.medium,
    fontSize: 29,
    lineHeight: 31,
    color: colors.forest,
  },
  datePicker: {
    minWidth: 0,
    flex: 1,
    justifyContent: "center",
  },
  datePickerButton: {
    minHeight: 54,
    paddingHorizontal: 6,
    borderWidth: 0,
    borderRadius: 0,
    backgroundColor: colors.transparent,
  },
  weekOverview: {
    gap: 8,
    marginHorizontal: -8,
  },
  sectionLabel: {
    fontFamily: fonts.bold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.9,
    color: colors.textMuted,
  },
  weekDayRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 3,
  },
  weekDay: {
    minWidth: 0,
    minHeight: 86,
    paddingHorizontal: 1,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.outlineSoft,
    backgroundColor: colors.paper,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  weekDaySelected: {
    borderWidth: 2,
    borderColor: colors.forest,
    backgroundColor: colors.mint,
  },
  weekDayName: {
    fontFamily: fonts.bold,
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 0.4,
    color: colors.textMuted,
  },
  weekDayNameSelected: {
    fontSize: 10,
    color: colors.forest,
  },
  weekDayNumber: {
    fontFamily: fonts.number,
    fontSize: 16,
    lineHeight: 19,
    color: colors.ink,
  },
  weekDayNumberSelected: {
    fontSize: 19,
    lineHeight: 22,
  },
  selectedDayHeading: {
    marginTop: 1,
    fontFamily: fonts.bold,
    fontSize: 17,
    lineHeight: 22,
    color: colors.ink,
  },
  scheduleSection: {
    gap: 7,
  },
  sectionHeading: {
    minHeight: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  scheduleGroup: {
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.outlineSoft,
    backgroundColor: colors.paper,
    overflow: "hidden",
  },
  scheduleDivider: {
    height: 1,
    marginHorizontal: 13,
    backgroundColor: colors.outlineSoft,
  },
  scheduleRow: {
    minHeight: 80,
    paddingHorizontal: 13,
    paddingVertical: 10,
    justifyContent: "center",
    gap: 7,
  },
  scheduleTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  scheduleTitle: {
    minWidth: 0,
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 20,
    color: colors.ink,
  },
  scheduleDuration: {
    flexShrink: 0,
    fontFamily: fonts.number,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: "right",
  },
  stateControl: {
    minHeight: 32,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  stateDefault: {
    backgroundColor: colors.softMint,
  },
  stateMoved: {
    backgroundColor: colors.surfaceMuted,
  },
  stateHelp: {
    backgroundColor: colors.lavender,
  },
  stateSkipped: {
    backgroundColor: colors.softCoral,
  },
  stateControlText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 16,
    color: colors.forest,
  },
  stateChevron: {
    fontFamily: fonts.bold,
    fontSize: 13,
    lineHeight: 14,
    color: colors.forest,
  },
  rowPressed: {
    opacity: 0.68,
  },
  emptyState: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
    gap: 6,
  },
  emptyIcon: {
    width: 38,
    height: 38,
    marginBottom: 2,
    borderRadius: 12,
    backgroundColor: colors.paper,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    lineHeight: 23,
    color: colors.ink,
  },
  emptyBody: {
    marginBottom: 6,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
  sheetKeyboard: {
    flex: 1,
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(4, 22, 16, 0.58)",
  },
  actionSheet: {
    width: "100%",
    maxWidth: 520,
    maxHeight: "92%",
    alignSelf: "center",
    paddingTop: 10,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.canvas,
  },
  sheetHandle: {
    width: 44,
    height: 5,
    marginBottom: 9,
    borderRadius: 3,
    backgroundColor: colors.outlineSoft,
    alignSelf: "center",
  },
  sheetHeader: {
    paddingHorizontal: 18,
    paddingBottom: 13,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  sheetEyebrow: {
    fontFamily: fonts.bold,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.9,
    color: colors.fern,
  },
  sheetTitle: {
    marginTop: 3,
    fontFamily: fonts.bold,
    fontSize: 21,
    lineHeight: 27,
    color: colors.ink,
  },
  sheetClose: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.softMint,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetCloseText: {
    fontFamily: fonts.regular,
    fontSize: 27,
    lineHeight: 29,
    color: colors.forest,
  },
  sheetContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  actionList: {
    gap: 7,
  },
  actionOption: {
    minHeight: 54,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.outlineSoft,
    backgroundColor: colors.paper,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  actionOptionSelected: {
    borderColor: colors.forest,
    backgroundColor: colors.mint,
  },
  actionOptionText: {
    minWidth: 0,
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 20,
    color: colors.ink,
  },
  actionOptionTextSelected: {
    fontFamily: fonts.medium,
    color: colors.forest,
  },
  sheetDivider: {
    height: 1,
    backgroundColor: colors.outlineSoft,
  },
  editDetailsAction: {
    minHeight: 52,
    paddingHorizontal: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  editDetailsText: {
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 20,
    color: colors.forest,
  },
  backToActions: {
    minHeight: 44,
    alignSelf: "flex-start",
    justifyContent: "center",
  },
  backToActionsText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 19,
    color: colors.forest,
  },
  detailActionHeading: {
    minHeight: 48,
    paddingHorizontal: 13,
    borderRadius: 13,
    backgroundColor: colors.softMint,
    justifyContent: "center",
  },
  detailActionTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    lineHeight: 21,
    color: colors.forest,
  },
  sheetError: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.coralDark,
  },
});

const recoveryStyles = StyleSheet.create({
  hero: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 22,
    gap: 6,
  },
  heroEyebrow: {
    fontFamily: fonts.bold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.2,
    color: colors.waterBright,
  },
  heroTitle: {
    fontFamily: fonts.bold,
    fontSize: 30,
    lineHeight: 35,
    letterSpacing: -0.45,
    color: colors.white,
    maxWidth: 350,
  },
  heroSummary: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 21,
    color: colors.mint,
    marginTop: 3,
  },
  content: {
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 32,
    gap: 18,
    backgroundColor: colors.canvas,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    flexGrow: 1,
  },
  weekMapGroup: {
    gap: 9,
  },
  weekMap: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 22,
    marginHorizontal: -14,
    paddingHorizontal: 13,
    paddingVertical: 14,
    gap: 11,
  },
  sectionEyebrow: {
    fontFamily: fonts.bold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.9,
    color: colors.forest,
  },
  weekMapHeader: {
    minHeight: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  dayRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 2,
  },
  dayItemSlot: {
    minWidth: 0,
    minHeight: 144,
    flexBasis: 0,
  },
  dayItemSlotSelected: {
    zIndex: 1,
  },
  dayItem: {
    flex: 1,
    width: "100%",
    minHeight: 144,
    alignItems: "center",
    paddingHorizontal: 0,
    paddingTop: 7,
    paddingBottom: 8,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.outlineSoft,
    backgroundColor: colors.paper,
    gap: 1,
    position: "relative",
  },
  dayItemSelected: {
    borderWidth: 2,
    borderColor: colors.forest,
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingHorizontal: 3,
    paddingTop: 6,
    elevation: 3,
    shadowColor: colors.deepForest,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
  },
  attentionMark: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.soil,
  },
  dayHeading: {
    width: "100%",
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  dayName: {
    fontFamily: fonts.bold,
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 0.45,
    color: colors.textMuted,
  },
  dayNameSelected: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.6,
    color: colors.forest,
  },
  dayNumber: {
    fontFamily: fonts.number,
    fontSize: 14,
    lineHeight: 17,
    color: colors.ink,
  },
  dayNumberSelected: {
    fontSize: 18,
    lineHeight: 20,
  },
  plantStage: {
    width: "100%",
    height: 66,
    alignItems: "center",
    justifyContent: "flex-end",
    position: "relative",
  },
  plantGuide: {
    position: "absolute",
    bottom: 3,
    width: 2,
    height: 58,
    borderRadius: 2,
    backgroundColor: colors.outlineSoft,
  },
  plantGround: {
    position: "absolute",
    bottom: 2,
    width: 24,
    height: 2,
    borderRadius: 2,
    backgroundColor: colors.outlineSoft,
  },
  plantStem: {
    position: "absolute",
    bottom: 3,
    width: 2,
    borderRadius: 2,
  },
  plantLeaf: {
    position: "absolute",
    width: 9,
    height: 6,
    borderRadius: 7,
    top: 5,
  },
  plantLeafLeft: {
    right: 1,
    transform: [{ rotate: "28deg" }],
  },
  plantLeafRight: {
    left: 1,
    top: 14,
    transform: [{ rotate: "-28deg" }],
  },
  zeroBud: {
    position: "absolute",
    bottom: 3,
    width: 7,
    height: 4,
    borderRadius: 5,
    backgroundColor: colors.outline,
  },
  dayLoad: {
    fontFamily: fonts.number,
    fontSize: 10,
    lineHeight: 13,
    color: colors.textMuted,
  },
  dayLoadSelected: {
    fontSize: 13,
    lineHeight: 16,
    color: colors.ink,
  },
  capacityLegend: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "flex-end",
    columnGap: 8,
    rowGap: 3,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  legendText: {
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 15,
    color: colors.textMuted,
  },
  attentionSummary: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    color: colors.forest,
    textAlign: "center",
  },
  selectedArea: {
    gap: 12,
    marginTop: -6,
  },
  selectedContext: {
    minHeight: 170,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderTopWidth: 4,
    borderColor: colors.outlineSoft,
    backgroundColor: colors.paper,
  },
  selectedHeading: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  selectedDate: {
    fontFamily: fonts.bold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.15,
    color: colors.ink,
    flex: 1,
    paddingTop: 9,
  },
  capacitySummaryRow: {
    minHeight: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  capacityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  capacitySummary: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.ink,
  },
  descriptorPill: {
    width: "100%",
    minHeight: 25,
    paddingHorizontal: 9,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
  descriptorText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    lineHeight: 15,
    color: colors.forest,
  },
  loadBlock: {
    width: "100%",
    alignItems: "center",
    flexShrink: 0,
  },
  loadStateBlock: {
    width: 84,
    alignItems: "stretch",
    gap: 4,
    flexShrink: 0,
    paddingTop: 9,
  },
  selectedLoad: {
    fontFamily: fonts.number,
    fontSize: 25,
    lineHeight: 28,
    color: colors.ink,
    textAlign: "center",
  },
  loadLabel: {
    fontFamily: fonts.bold,
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 0.9,
    color: colors.textMuted,
    textAlign: "center",
  },
  selectedStatus: {
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  selectedStatusAttention: {
    backgroundColor: colors.surfaceMuted,
  },
  selectedStatusProtected: {
    backgroundColor: colors.softMint,
  },
  statusCopy: {
    flex: 1,
    gap: 1,
  },
  statusTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.forest,
  },
  statusBody: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
  },
  recommendationCard: {
    gap: 11,
    borderLeftWidth: 6,
  },
  recommendationHeading: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  recommendationHeadingCopy: {
    flex: 1,
    gap: 4,
  },
  recommendationTitle: {
    fontFamily: fonts.bold,
    fontSize: 22,
    lineHeight: 27,
    color: colors.ink,
  },
  durationPill: {
    minHeight: 28,
    maxWidth: 92,
    paddingHorizontal: 9,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.paper,
  },
  durationText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    lineHeight: 15,
    color: colors.forest,
    textAlign: "center",
  },
  recommendationBody: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
  helpBlock: {
    gap: 2,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.outlineSoft,
  },
  helpLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.8,
    color: colors.textMuted,
  },
  helpValue: {
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.ink,
  },
  whyButton: {
    minHeight: 46,
    paddingHorizontal: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  whyButtonText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    lineHeight: 19,
    color: colors.forest,
  },
  whyPanel: {
    borderRadius: 13,
    padding: 12,
    gap: 7,
    backgroundColor: colors.paper,
  },
  whyEyebrow: {
    fontFamily: fonts.bold,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.8,
    color: colors.fern,
  },
  whyText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.ink,
  },
  evidenceText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
    fontStyle: "italic",
  },
  disclosureChevron: {
    fontFamily: fonts.bold,
    fontSize: 17,
    lineHeight: 20,
    color: colors.forest,
  },
  philosophy: {
    paddingHorizontal: 5,
    paddingTop: 17,
    borderTopWidth: 1,
    borderColor: colors.outlineSoft,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
  },
  philosophyCopy: {
    flex: 1,
    gap: 3,
  },
  philosophyTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    lineHeight: 21,
    color: colors.ink,
  },
  philosophyBody: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
  },
  pressed: {
    opacity: 0.72,
  },
});

const dashboardHeroStyles = StyleSheet.create({
  hero: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 6,
    gap: 6,
  },
  heroTopRow: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  date: {
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.8,
    color: colors.mint,
    opacity: 0.7,
    flexShrink: 1,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 30,
    lineHeight: 35,
    letterSpacing: -0.45,
    color: colors.white,
    maxWidth: 340,
    paddingTop: 4,
  },
  periodSwitchRow: {
    paddingHorizontal: 20,
    paddingTop: 8,
    alignItems: "flex-end",
  },
  periodSwitch: {
    flexDirection: "row",
    padding: 3,
    gap: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(217, 230, 196, 0.28)",
    backgroundColor: "rgba(8, 38, 29, 0.58)",
  },
  periodOption: {
    minWidth: 54,
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  periodOptionSelected: {
    backgroundColor: colors.mint,
  },
  periodOptionPressed: {
    opacity: 0.76,
  },
  periodText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.mint,
  },
  periodTextSelected: {
    color: colors.forest,
  },
});

const dashboardSectionStyles = StyleSheet.create({
  contentWithPetClearance: {
    paddingBottom: 104,
  },
  weeklyNote: {
    gap: 5,
    paddingVertical: 11,
    paddingHorizontal: 13,
  },
  editNote: {
    minHeight: 28,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  editNotePressed: {
    opacity: 0.64,
  },
  editNoteText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.forest,
    textDecorationLine: "underline",
  },
  noteText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
  flashcardSection: {
    gap: 8,
  },
  flashcardHeader: {
    minHeight: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  flashcardCountBadge: {
    minHeight: 26,
    paddingHorizontal: 9,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.paper,
  },
  flashcardCountBadgeText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 16,
    color: colors.amber,
  },
  flashcardSurface: {
    padding: 14,
    gap: 10,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.amber,
    backgroundColor: colors.surfaceMuted,
  },
  flashcardTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    lineHeight: 22,
    color: colors.ink,
  },
  flashcardBody: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
  flashcardList: {
    gap: 7,
  },
  flashcardRow: {
    minHeight: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  flashcardModule: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 19,
    color: colors.ink,
  },
  flashcardModuleCount: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  flashcardMore: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  planActions: {
    gap: 8,
    paddingTop: 4,
  },
  planActionButtons: {
    gap: 10,
  },
});
