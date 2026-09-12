import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, AppState, BackHandler, Text, View } from "react-native";
import { AnythingElseScreen, CommitmentForm, FeelQuestionsScreen, ImportTimetableScreen, RoutineChecklistScreen, RoutineHoursScreen, SetupChoiceScreen, WelcomeScreen } from "@/screens/OnboardingScreens";
import { DistributionScreen } from "@/screens/PlanningScreens";
import { WhatIfForm, WhatIfResult } from "@/screens/WhatIfScreens";
import { CurrentHomeScreen, CurrentPlanScreen, CurrentRecoveryScreen, Period, PlanFilter } from "@/screens/CurrentPlanningScreens";
import { CurrentCheckIn } from "@/screens/CurrentCheckIn";
import { FlashcardScreen } from "@/screens/FlashcardScreen";
import { InlineNotice, PageHeader, ScrollPage } from "@/components/MarginUI";
import { AppScreen, CapacityKind, Commitment, DailyCheckIn, MainTab, RoutineEntry } from "@/models/margin";
import { Material, Module, RecoveryResult, dateKey, fromKey, loadFor, loadPercent, prettyDate, routinePlan, scheduledCommitments, shiftDate, weekStart } from "@/models/planner";
import { readSavedPlan, writeSavedPlan } from "@/models/storage";
import { colors } from "@/theme/tokens";
import { screenStyles as s } from "@/screens/screenStyles";

type PlannerState = {
  routineEntries: Record<string, RoutineEntry>;
  feelAnswers: Partial<Record<CapacityKind, number>>;
  recoveryChoice?: number;
  commitments: Commitment[];
  modules: Module[];
  materials: Material[];
  checks: Record<string, DailyCheckIn>;
  recoveryResults: Record<string, RecoveryResult>;
  overrides: Record<string, Commitment>;
  registeredOn?: string;
  weeklyNote: string;
};
const initialState: PlannerState = {
  routineEntries: { classes: { durationHours: 2, timesPerWeek: 5, condition: "Typical" }, study: { durationHours: 1, timesPerWeek: 5, condition: "Typical" } },
  feelAnswers: {}, commitments: [], modules: [], materials: [], checks: {}, recoveryResults: {}, overrides: {}, weeklyNote: "",
};
const mainTabs: Record<MainTab, AppScreen> = { today: "today", plan: "plan", distribution: "distribution", recovery: "recovery" };

export function MarginApp() {
  const [state, setState] = useState<PlannerState>(initialState);
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [screen, setScreen] = useState<AppScreen>("welcome");
  const [draft, setDraft] = useState<Commitment>();
  const [feelIndex, setFeelIndex] = useState(0);
  const [editing, setEditing] = useState<Commitment>();
  const [period, setPeriod] = useState<Period>("Daily");
  const [filter, setFilter] = useState<PlanFilter>("All");
  const [today, setToday] = useState(dateKey());
  const [selectedDate, setSelectedDate] = useState(dateKey());
  const [checkInVisible, setCheckInVisible] = useState(false);
  const popupDate = useRef("");
  const patch = (values: Partial<PlannerState>) => setState(current => ({ ...current, ...values }));
  const navigate = (next: AppScreen) => setScreen(next);
  useEffect(() => {
    let active = true;
    readSavedPlan().then(raw => {
      if (!active) return;
      if (raw) {
        const saved = JSON.parse(raw) as Partial<PlannerState>;
        setState({ ...initialState, ...saved });
        if (saved.registeredOn) setScreen("today");
      }
      setLoaded(true);
    }).catch(() => { if (active) { setStorageError("Your saved plan could not be read. Close and reopen Santai to retry; the saved file has not been overwritten."); } });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!loaded) return;
    Promise.resolve().then(() => writeSavedPlan(JSON.stringify(state))).then(() => setStorageError("")).catch(() => setStorageError("Your latest changes could not be saved on this device. Keep the app open and free up storage."));
  }, [state, loaded]);
  useEffect(() => {
    const refresh = () => setToday(dateKey());
    const timer = setInterval(refresh, 30000);
    const sub = AppState.addEventListener("change", status => { if (status === "active") refresh(); });
    return () => { clearInterval(timer); sub.remove(); };
  }, []);
  const checkInEligible = !!state.registeredOn && today > state.registeredOn;
  const currentCheck = state.checks[today];
  useEffect(() => {
    if (screen === "today" && checkInEligible && !currentCheck && popupDate.current !== today) { popupDate.current = today; setCheckInVisible(true); }
  }, [screen, today, currentCheck, checkInEligible]);
  useEffect(() => {
    if (screen !== "preparing") return;
    const timer = setTimeout(() => { setState(current => ({ ...current, registeredOn: current.registeredOn ?? dateKey() })); setScreen("today"); }, 1000);
    return () => clearTimeout(timer);
  }, [screen]);

  const goBack = useCallback((): boolean => {
    if (checkInVisible) { setCheckInVisible(false); return true; }
    if (screen === "welcome" || screen === "today") return false;
    if (screen === "feel-questions" && feelIndex > 0) { setFeelIndex(i => i - 1); return true; }
    const target: Partial<Record<AppScreen, AppScreen>> = { "routine-checklist": "welcome", "routine-hours": "routine-checklist", "feel-questions": "routine-hours", "setup-choice": "feel-questions", "import-timetable": state.registeredOn ? "plan" : "setup-choice", "add-onboarding": "setup-choice", "anything-else": "setup-choice", simulator: "test-commitment", add: "plan", flashcards: "today" };
    setScreen(target[screen] ?? "today"); return true;
  }, [screen, feelIndex, checkInVisible, state.registeredOn]);
  useEffect(() => { const sub = BackHandler.addEventListener("hardwareBackPress", goBack); return () => sub.remove(); }, [goBack]);

  const makeDay = (date: string) => {
    const check = state.checks[date];
    let routine = routinePlan(state.routineEntries, state.modules, date, check);
    const plannedAssignments = Object.keys(check?.assignments ?? {});
    if (plannedAssignments.length) {
      const study = routine.find(item => item.routineId === "study");
      if (study) routine = routine.flatMap(item => item !== study ? [item] : plannedAssignments.map(id => ({ ...study, id: study.id + id, name: (state.modules.find(m => m.id === id)?.name ?? "Assignment") + " · " + check!.assignments![id] + "% planned", moduleId: id, time: study.time / plannedAssignments.length, mental: study.mental / plannedAssignments.length, physical: study.physical / plannedAssignments.length, social: study.social / plannedAssignments.length, durationHours: (study.durationHours ?? 1) / plannedAssignments.length })));
    }
    const base = [...routine, ...scheduledCommitments(state.commitments, date)];
    const items = [...base.filter(item => !(item.id in state.overrides)), ...Object.values(state.overrides).filter(item => item.startDate === date)];
    const counted = items.filter(item => item.action !== "Skip this time" && (item.routineId || item.startDate === date));
    const capacities = loadFor(counted, state.feelAnswers, check);
    return { date, items, capacities, load: loadPercent(capacities) };
  };
  const planDays = Array.from({ length: 7 }, (_, i) => makeDay(shiftDate(weekStart(selectedDate), i)));
  const recoveryDays = Array.from({ length: 7 }, (_, i) => makeDay(shiftDate(today, i)));
  const currentDay = makeDay(today);
  const dashboardDays = period === "Daily" ? [currentDay] : Array.from({ length: 7 }, (_, i) => makeDay(shiftDate(weekStart(today), i)));
  const capacities = currentDay.capacities.map(v => ({ ...v, used: Math.round(dashboardDays.reduce((sum, day) => sum + day.capacities.find(c => c.kind === v.kind)!.used, 0) / dashboardDays.length) }));
  const overall = loadPercent(capacities);
  const energy = Math.max(0, Math.min(100, Math.round(100 - currentDay.capacities.reduce((sum, v) => sum + Math.min(100, v.used / v.limit * 100), 0) / 4) + (state.recoveryResults[today]?.done ? 10 : 0)));
  const streak = useMemo(() => {
    let count = 0; let cursor = state.checks[today] ? today : shiftDate(today, -1);
    while (state.checks[cursor]) { count++; cursor = shiftDate(cursor, -1); }
    return count;
  }, [state.checks, today]);
  const selectTab = (tab: MainTab) => { if (tab === "plan") setFilter("All"); navigate(mainTabs[tab]); };
  const showPlan = (next: PlanFilter) => { setFilter(next); setScreen("plan"); };
  const menu = { period, onPeriod: setPeriod, onSchedule: () => showPlan("Schedule"), onAssignments: () => showPlan("Assignments") };
  const saveCommitment = (item: Commitment) => setState(current => item.routineId ? { ...current, overrides: { ...current.overrides, [item.id]: item } } : { ...current, overrides: Object.fromEntries(Object.entries(current.overrides).filter(([id, value]) => id !== item.id && value.sourceId !== item.id)), commitments: [...current.commitments.filter(v => v.id !== item.id), item] });
  const onAction = (item: Commitment, action: string, date: string, duration: number, helper: string) => {
    setState(current => {
      const original = item.sourceId ? scheduledCommitments(current.commitments, item.originalDate ?? item.startDate ?? today).find(v => v.id === item.id) ?? item : item.routineId ? routinePlan(current.routineEntries, current.modules, item.originalDate ?? item.startDate ?? today, current.checks[item.originalDate ?? item.startDate ?? today]).find(v => v.id === item.id) ?? item : current.commitments.find(v => v.id === item.id) ?? item;
      if (action === "Keep as planned") { const next = { ...current.overrides }; delete next[item.id]; return { ...current, overrides: next }; }
      const ratio = action === "Make it lighter" ? Math.min(1, duration / Math.max(0.25, original.durationHours ?? original.time / 5)) : 1;
      const nextDate = action === "Move to another day" ? date : item.startDate ?? today;
      const updated = { ...original, action, originalDate: original.startDate, startDate: nextDate, schedule: prettyDate(nextDate), helper: helper.trim(), durationHours: action === "Make it lighter" ? duration : original.durationHours, time: original.time * ratio, mental: original.mental * ratio, physical: original.physical * ratio, social: original.social * ratio };
      return { ...current, overrides: { ...current.overrides, [item.id]: updated } };
    });
  };
  const saveModules = (modules: Module[]) => {
    setState(current => {
      const assignments = modules.filter(m => m.assignment).map(m => ({ id: "assignment-" + m.id, moduleId: m.id, name: m.name + " assignment", category: "Assignment", schedule: prettyDate(m.assignment!.start), startDate: m.assignment!.start, dueDate: m.assignment!.due || undefined, durationHours: 1, time: 5, mental: 15, physical: 0, social: 0, flexibility: "Somewhat flexible" }));
      return { ...current, modules, routineEntries: modules.length && !current.routineEntries.classes ? { ...current.routineEntries, classes: { durationHours: 2, timesPerWeek: 5, condition: "Typical" } } : current.routineEntries, overrides: Object.fromEntries(Object.entries(current.overrides).filter(([id]) => !id.startsWith("assignment-"))), commitments: [...current.commitments.filter(c => !c.id.startsWith("assignment-")), ...assignments] };
    }); navigate(state.registeredOn ? "add" : "add-onboarding");
  };
  const selectedIds = Object.keys(state.routineEntries);
  const updateEntry = (id: string, entry: RoutineEntry) => setState(current => ({ ...current, routineEntries: { ...current.routineEntries, [id]: entry } }));

  if (!loaded) return <ScrollPage><PageHeader eyebrow="Santai" title={storageError ? "Your plan needs attention" : "Opening your plan"} /><View style={s.content}>{storageError ? <Text style={s.body}>{storageError}</Text> : <ActivityIndicator color={colors.forest} />}</View></ScrollPage>;
  let page;
  if (screen === "welcome") page = <WelcomeScreen onStart={() => navigate("routine-checklist")} />;
  else if (screen === "routine-checklist") page = <RoutineChecklistScreen selectedIds={selectedIds} onToggle={id => setState(current => { const entries = { ...current.routineEntries }; if (entries[id]) delete entries[id]; else entries[id] = { durationHours: 1, timesPerWeek: 1, condition: "Typical" }; return { ...current, routineEntries: entries }; })} onBack={goBack} onContinue={() => navigate("routine-hours")} />;
  else if (screen === "routine-hours") page = <RoutineHoursScreen selectedIds={selectedIds} entries={state.routineEntries} onEntryChange={updateEntry} onBack={goBack} onContinue={() => { setFeelIndex(0); navigate("feel-questions"); }} />;
  else if (screen === "feel-questions") page = <FeelQuestionsScreen selectedIds={selectedIds} entries={state.routineEntries} answers={state.feelAnswers} recoveryChoice={state.recoveryChoice} index={feelIndex} onAnswer={(kind, value) => patch({ feelAnswers: { ...state.feelAnswers, [kind]: value } })} onRecovery={value => patch({ recoveryChoice: value })} onIndexChange={setFeelIndex} onBack={goBack} onContinue={() => navigate("setup-choice")} />;
  else if (screen === "setup-choice") page = <SetupChoiceScreen onBack={goBack} onImport={() => navigate("import-timetable")} onManual={() => navigate("add-onboarding")} onSkip={() => navigate("anything-else")} />;
  else if (screen === "import-timetable") page = <ImportTimetableScreen initial={state.modules} onBack={goBack} onContinue={saveModules} />;
  else if (screen === "add-onboarding") page = <CommitmentForm eyebrow="Specific commitment" title="Add Commitment" body="Add a deadline, competition or another plan." submitText="Add & continue" onBack={goBack} onSubmit={item => { saveCommitment(item); navigate("anything-else"); }} onAddAnother={saveCommitment} secondaryAction={{ text: "Continue without another commitment", onPress: () => navigate("anything-else") }} />;
  else if (screen === "anything-else") page = <AnythingElseScreen initialNote={state.weeklyNote} onBack={goBack} onContinue={note => { patch({ weeklyNote: note }); navigate("preparing"); }} />;
  else if (screen === "preparing") page = <ScrollPage><PageHeader eyebrow="Your plan" title="Making room for your week" body="Putting your routine, assignments and personal limits together." /><View style={s.content}><ActivityIndicator size="large" color={colors.forest} /><Text style={s.body}>Your first check-in will be available tomorrow.</Text></View></ScrollPage>;
  else if (screen === "today") page = <><CurrentHomeScreen {...menu} capacities={capacities} overall={overall} energy={energy} streak={streak} checkInEligible={checkInEligible} checkInSaved={!!currentCheck} onCheckIn={() => setCheckInVisible(true)} onTab={selectTab} onRebalance={() => { setPeriod("Weekly"); showPlan("All"); }} onTest={() => navigate("test-commitment")} onFlashcards={() => navigate("flashcards")} lessonNames={state.modules.filter(m => m.days.includes(fromKey(today).getDay())).map(m => m.name)} hasMaterials={state.materials.length > 0} weeklyNote={state.weeklyNote} />{checkInVisible && checkInEligible && <CurrentCheckIn key={today + (currentCheck?.savedAt ?? "")} initial={currentCheck} modules={state.modules} hasSport={!!state.routineEntries.sport} sportPlanned={routinePlan(state.routineEntries, state.modules, today).some(item => item.routineId === "sport")} onClose={() => setCheckInVisible(false)} onPlan={() => { setCheckInVisible(false); showPlan("Assignments"); }} onSave={(check, goToPlan) => { patch({ checks: { ...state.checks, [today]: check } }); setCheckInVisible(false); if (goToPlan) showPlan("All"); }} />}</>;
  else if (screen === "plan") page = <CurrentPlanScreen {...menu} filter={filter} unscheduled={state.commitments.filter(item => !item.startDate && !item.dueDate)} days={planDays} selectedDate={selectedDate} onDate={setSelectedDate} onTab={selectTab} onAdd={() => { setEditing(undefined); navigate("add"); }} onEdit={item => { setEditing(item.sourceId ? state.commitments.find(v => v.id === item.sourceId) ?? item : item); navigate("add"); }} onAction={onAction} onImport={() => { setEditing(undefined); navigate("import-timetable"); }} />;
  else if (screen === "distribution") page = <DistributionScreen commitments={dashboardDays.flatMap(day => day.items.filter(item => item.action !== "Skip this time" && (item.routineId || item.startDate === day.date)))} onTab={selectTab} />;
  else if (screen === "add") page = <CommitmentForm key={editing?.id ?? "new"} eyebrow="Your plan" title={editing ? "Edit Commitment" : "Add Commitment"} body="Choose how it fits your week and estimate the energy it needs." initial={editing} defaultDate={selectedDate} submitText={editing ? "Save changes" : "Add & continue"} onBack={goBack} onSubmit={item => { saveCommitment(item); showPlan("All"); }} onAddAnother={saveCommitment} />;
  else if (screen === "flashcards") page = <FlashcardScreen modules={state.modules} materials={state.materials} onSave={materials => patch({ materials })} onModule={name => { const existing = state.modules.find(m => m.name.toLowerCase() === name.toLowerCase()); if (existing) return existing.id; const id = "module-" + Date.now(); patch({ modules: [...state.modules, { id, name, days: [] }] }); return id; }} onBack={goBack} />;
  else if (screen === "recovery") page = <CurrentRecoveryScreen days={recoveryDays} results={state.recoveryResults} onResult={(key, value) => patch({ recoveryResults: { ...state.recoveryResults, [key]: value } })} onTab={selectTab} />;
  else if (screen === "test-commitment") page = <WhatIfForm draft={draft} date={today} onBack={() => navigate("today")} onTest={item => { setDraft(item); navigate("simulator"); }} />;
  else if (screen === "simulator" && draft) page = <WhatIfResult draft={draft} capacities={makeDay(draft.startDate ?? today).capacities} onBack={() => navigate("test-commitment")} onConfirm={() => { saveCommitment(draft); setSelectedDate(draft.startDate ?? today); setDraft(undefined); showPlan("All"); }} onDecline={() => { setDraft(undefined); navigate("today"); }} onPlan={() => showPlan("All")} />;
  else page = <WhatIfForm draft={draft} date={today} onBack={() => navigate("today")} onTest={item => { setDraft(item); navigate("simulator"); }} />;
  return <View style={{ flex: 1 }}>{storageError ? <InlineNotice title="Saving needs attention" body={storageError} tone="amber" /> : null}{page}</View>;
}
