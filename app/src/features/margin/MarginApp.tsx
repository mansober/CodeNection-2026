import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, AppState, BackHandler, Text, View } from "react-native";
import { AnythingElseScreen, CommitmentForm, FeelQuestionsScreen, ImportTimetableScreen, RoutineChecklistScreen, RoutineHoursScreen, SetupChoiceScreen, WelcomeScreen } from "@/screens/OnboardingScreens";
import { AuthScreen } from "@/screens/AuthScreen";
import { WhatIfForm, WhatIfResult } from "@/screens/WhatIfScreens";
import { CurrentHomeScreen, CurrentPlanScreen, CurrentRecoveryScreen, Period, PlanFilter } from "@/screens/CurrentPlanningScreens";
import { CurrentCheckIn } from "@/screens/CurrentCheckIn";
import { FlashcardScreen } from "@/screens/FlashcardScreen";
import { AssignmentsScreen, ProfileScreen, ScheduleScreen } from "@/screens/SecondaryScreens";
import { InlineNotice, PageHeader, ScrollPage } from "@/components/MarginUI";
import { AppScreen, Commitment, MainTab, QuickAddAction, RoutineEntry, weeklyHours } from "@/models/margin";
import { Module, PlannerState, dateKey, loadFor, loadPercent, prettyDate, routinePlan, scheduledCommitments, shiftDate, weekStart } from "@/models/planner";
import { StreakPetContext } from "@/components/StreakPet";
import { claimLegacyPlan, deleteSavedPlan, readSavedPlan, writeSavedPlan } from "@/models/storage";
import { colors } from "@/theme/tokens";
import { screenStyles as s } from "@/screens/screenStyles";
import {
  ApiError,
  cloudSyncEnabled,
  deleteAccount,
  loadCloudState,
  refreshCurrentUser,
  restoreAuthSession,
  saveAccountExport,
  signIn,
  signOut,
  signUp,
  type AuthSession,
} from "@/services/api";
import {
  applyPlanningAction,
  clearPlanningSyncQueue,
  initializePlanningState,
  loadPlannerViews,
  planningStateSignature,
  previewCommitment,
  queuePlanningStateSync,
  type PlannerViews,
  type WhatIfComparison,
} from "@/services/planningApi";

const initialState: PlannerState = {
  routineEntries: { classes: { durationHours: 2, timesPerWeek: 5, condition: "Typical" }, study: { durationHours: 1, timesPerWeek: 5, condition: "Typical" } },
  feelAnswers: {}, commitments: [], modules: [], materials: [], checks: {}, recoveryResults: {}, overrides: {}, weeklyNote: "",
};
const mainTabs: Record<MainTab, AppScreen> = { today: "today", plan: "plan", recovery: "recovery", profile: "profile" };

function syncFailureMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 0) return "The backend is unreachable. Your changes are saved on this device and will retry automatically.";
  if (error instanceof ApiError && error.status === 429) return "The backend is busy. Your changes are saved on this device and will retry automatically.";
  if (error instanceof Error) return error.message;
  return "The backend could not save this change. Your local copy is unchanged.";
}

function isRetryableSyncFailure(error: unknown) {
  return !(error instanceof ApiError) || error.status === 0 || error.status === 408 || error.status === 429 || error.status >= 500;
}

export function MarginApp() {
  const [account, setAccount] = useState<AuthSession | null | undefined>(() => cloudSyncEnabled ? undefined : null);
  const [connectionError, setConnectionError] = useState("");

  useEffect(() => {
    let active = true;
    if (!cloudSyncEnabled) return () => { active = false; };
    restoreAuthSession().then(restored => {
      if (active) setAccount(restored);
    }).catch(error => {
      if (!active) return;
      setConnectionError(error instanceof Error ? error.message : "Santai is currently unreachable");
      setAccount(null);
    });
    return () => { active = false; };
  }, []);

  const handleSignIn = async (email: string, password: string) => {
    const authenticated = await signIn(email, password);
    setConnectionError("");
    setAccount(authenticated);
  };
  const handleSignUp = async (email: string, password: string) => {
    const authenticated = await signUp(email, password);
    setConnectionError("");
    setAccount(authenticated);
  };
  const handleSignOut = useCallback(async () => {
    try {
      clearPlanningSyncQueue();
      await signOut();
    } catch {
      // Local sign-out still completes when the server is temporarily offline.
    } finally {
      setAccount(null);
    }
  }, []);
  const handleAuthenticationLost = useCallback(() => setAccount(null), []);

  if (account === undefined) {
    return <ScrollPage><PageHeader eyebrow="Santai" title="Opening Santai" /><View style={s.content}><ActivityIndicator color={colors.forest} /></View></ScrollPage>;
  }
  if (account === null) {
    return <AuthScreen configured={cloudSyncEnabled} connectionError={connectionError} onSignIn={handleSignIn} onSignUp={handleSignUp} />;
  }
  return <PlannerApp key={account.user.id} account={account} onSignOut={handleSignOut} onAuthenticationLost={handleAuthenticationLost} />;
}

function PlannerApp({ account, onSignOut, onAuthenticationLost }: { account: AuthSession; onSignOut: () => Promise<void>; onAuthenticationLost: () => void }) {
  const [state, setState] = useState<PlannerState>(initialState);
  const stateRef = useRef(state);
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [syncError, setSyncError] = useState("");
  const lastDomainSignature = useRef("");
  const lastPlanRevision = useRef(account.user.planRevision);
  const [domainRevision, setDomainRevision] = useState(0);
  const [plannerViews, setPlannerViews] = useState<PlannerViews>();
  const [screen, setScreen] = useState<AppScreen>("welcome");
  const [editingBaseline, setEditingBaseline] = useState(false);
  const [baselineBack, setBaselineBack] = useState<AppScreen>("welcome");
  const [draft, setDraft] = useState<Commitment>();
  const [whatIfComparison, setWhatIfComparison] = useState<WhatIfComparison>();
  const [whatIfLoading, setWhatIfLoading] = useState(false);
  const [feelIndex, setFeelIndex] = useState(0);
  const [editing, setEditing] = useState<Commitment>();
  const [period, setPeriod] = useState<Period>("Daily");
  const [filter, setFilter] = useState<PlanFilter>("All");
  const [today, setToday] = useState(dateKey());
  const [selectedDate, setSelectedDate] = useState(dateKey());
  const [checkInVisible, setCheckInVisible] = useState(false);
  const [checkInSaved, setCheckInSaved] = useState(false);
  const [secondaryBack, setSecondaryBack] = useState<AppScreen>("today");
  const [scheduleBack, setScheduleBack] = useState<AppScreen>("today");
  const [flashcardBack, setFlashcardBack] = useState<AppScreen>("today");
  const [assignmentBack, setAssignmentBack] = useState<AppScreen>("today");
  const [moduleFocusId, setModuleFocusId] = useState<string>();
  const [materialFocusId, setMaterialFocusId] = useState<string>();
  const [importReturn, setImportReturn] = useState<AppScreen>("schedule");
  const [addOnboardingBack, setAddOnboardingBack] = useState<AppScreen>("setup-choice");
  const [noteReturn, setNoteReturn] = useState<AppScreen>("today");
  const patch = (values: Partial<PlannerState>) => setState(current => ({ ...current, ...values }));
  const navigate = (next: AppScreen) => setScreen(next);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => {
    let active = true;
    readSavedPlan(account.user.id, account.migrateLegacyPlan).then(async savedPlan => {
      if (!active) return;
      let restored = initialState;
      if (savedPlan.value) {
        const saved = JSON.parse(savedPlan.value) as Partial<PlannerState>;
        restored = { ...initialState, ...saved };
        if (savedPlan.fromLegacyStorage) claimLegacyPlan(savedPlan.value, account.user.id);
      }
      const localWasUnsynced = !!savedPlan.lastSyncedSignature
        && planningStateSignature(restored) !== savedPlan.lastSyncedSignature;
      const localCandidate = restored;
      try {
        // Read the former aggregate snapshot only as a migration source. All active
        // planner reads and writes below use the normalized backend resources.
        const remote = await loadCloudState(
          restored,
          account.preferRemotePlan,
          savedPlan.value !== null,
        );
        if (remote && !localWasUnsynced) restored = remote.state;
        else if (localWasUnsynced) restored = localCandidate;
        restored = await initializePlanningState(restored, localWasUnsynced);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          if (active) onAuthenticationLost();
          return;
        }
        if (active) setSyncError("Backend sync is paused. Your plan is still saved on this device.");
      }
      if (!active) return;
      lastDomainSignature.current = planningStateSignature(restored);
      writeSavedPlan(JSON.stringify(restored), account.user.id, lastDomainSignature.current);
      setState(restored);
      if (restored.registeredOn) setScreen("today");
      setLoaded(true);
    }).catch(() => { if (active) { setStorageError("Your saved plan could not be read. Close and reopen Santai to retry; the saved file has not been overwritten."); } });
    return () => { active = false; };
  }, [account.migrateLegacyPlan, account.preferRemotePlan, account.user.id, onAuthenticationLost]);
  useEffect(() => {
    if (!loaded) return;
    Promise.resolve().then(() => writeSavedPlan(JSON.stringify(state), account.user.id, lastDomainSignature.current)).then(() => setStorageError("")).catch(() => setStorageError("Your latest changes could not be saved on this device. Keep the app open and free up storage."));
  }, [state, loaded, account.user.id]);
  useEffect(() => {
    if (!loaded || !cloudSyncEnabled) return;
    const signature = planningStateSignature(state);
    if (signature === lastDomainSignature.current) return;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let retryDelay = 2000;
    const attempt = () => {
      queuePlanningStateSync(state).then(normalized => {
        if (cancelled) return;
        const normalizedSignature = planningStateSignature(normalized);
        lastDomainSignature.current = normalizedSignature;
        writeSavedPlan(JSON.stringify(normalized), account.user.id, normalizedSignature);
        setState(current => planningStateSignature(current) === signature ? normalized : current);
        setDomainRevision(value => value + 1);
        setSyncError("");
      }).catch(error => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 401) {
          onAuthenticationLost();
          return;
        }
        if (error instanceof ApiError && error.status === 409) {
          clearPlanningSyncQueue();
          initializePlanningState(stateRef.current).then(refreshed => {
            if (cancelled) return;
            const refreshedSignature = planningStateSignature(refreshed);
            lastDomainSignature.current = refreshedSignature;
            writeSavedPlan(JSON.stringify(refreshed), account.user.id, refreshedSignature);
            setState(refreshed);
            setDomainRevision(value => value + 1);
            setSyncError("A newer backend change was loaded so another device's work was not overwritten.");
          }).catch(refreshError => {
            if (!cancelled) setSyncError(syncFailureMessage(refreshError));
          });
          return;
        }
        setSyncError(syncFailureMessage(error));
        if (!isRetryableSyncFailure(error)) return;
        retryTimer = setTimeout(attempt, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 30000);
      });
    };
    const timer = setTimeout(attempt, 600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [state, loaded, account.user.id, onAuthenticationLost]);
  useEffect(() => {
    if (!loaded || !cloudSyncEnabled) return;
    let active = true;
    const start = screen === "plan" ? weekStart(selectedDate) : screen === "recovery" ? today : weekStart(today);
    const end = shiftDate(start, 6);
    loadPlannerViews(stateRef.current, start, end).then(views => {
      if (!active) return;
      setPlannerViews(views);
      setSyncError("");
    }).catch(error => {
      if (!active) return;
      if (error instanceof ApiError && error.status === 401) {
        onAuthenticationLost();
        return;
      }
      setSyncError(syncFailureMessage(error));
    });
    return () => { active = false; };
  }, [loaded, screen, selectedDate, today, domainRevision, account.user.id, onAuthenticationLost]);
  useEffect(() => {
    if (!loaded || !cloudSyncEnabled) return;
    let active = true;
    let refreshing = false;
    const checkForRemoteChanges = async () => {
      if (refreshing || planningStateSignature(stateRef.current) !== lastDomainSignature.current) return;
      refreshing = true;
      try {
        const user = await refreshCurrentUser();
        if (!active || user.planRevision === lastPlanRevision.current) return;
        const refreshed = await initializePlanningState(stateRef.current);
        if (!active) return;
        lastPlanRevision.current = user.planRevision;
        lastDomainSignature.current = planningStateSignature(refreshed);
        setState(refreshed);
        setDomainRevision(value => value + 1);
      } catch (error) {
        if (active && error instanceof ApiError && error.status === 401) onAuthenticationLost();
      } finally {
        refreshing = false;
      }
    };
    const timer = setInterval(checkForRemoteChanges, 5000);
    return () => { active = false; clearInterval(timer); };
  }, [loaded, account.user.id, onAuthenticationLost]);
  useEffect(() => {
    const refresh = () => setToday(dateKey());
    const timer = setInterval(refresh, 30000);
    const sub = AppState.addEventListener("change", status => { if (status === "active") refresh(); });
    return () => { clearInterval(timer); sub.remove(); };
  }, []);
  useEffect(() => {
    if (!checkInSaved) return;
    const timer = setTimeout(() => setCheckInSaved(false), 3200);
    return () => clearTimeout(timer);
  }, [checkInSaved]);
  const checkInEligible = plannerViews?.dashboard.checkInEligible ?? (!!state.registeredOn && today > state.registeredOn);
  const currentCheck = state.checks[today];
  useEffect(() => {
    if (screen !== "preparing") return;
    const timer = setTimeout(() => { setState(current => ({ ...current, registeredOn: current.registeredOn ?? dateKey() })); setScreen("today"); }, 1000);
    return () => clearTimeout(timer);
  }, [screen]);

  const goBack = useCallback((): boolean => {
    if (checkInVisible) { setCheckInVisible(false); return true; }
    if (screen === "welcome" || screen === "today") return false;
    if (screen === "profile" || screen === "recovery" || screen === "plan") { setScreen("today"); return true; }
    if (screen === "feel-questions" && feelIndex > 0) { setFeelIndex(i => i - 1); return true; }
    const target: Partial<Record<AppScreen, AppScreen>> = { "routine-checklist": baselineBack, "routine-hours": "routine-checklist", "feel-questions": "routine-hours", "setup-choice": "feel-questions", "import-timetable": importReturn, "add-onboarding": addOnboardingBack, "anything-else": "setup-choice", simulator: "test-commitment", add: secondaryBack, flashcards: flashcardBack, schedule: scheduleBack, assignments: assignmentBack, "weekly-note": noteReturn };
    setScreen(target[screen] ?? "today"); return true;
  }, [screen, feelIndex, checkInVisible, baselineBack, importReturn, addOnboardingBack, secondaryBack, scheduleBack, flashcardBack, assignmentBack, noteReturn]);
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
  const localPlanDays = Array.from({ length: 7 }, (_, i) => makeDay(shiftDate(weekStart(selectedDate), i)));
  const localRecoveryDays = Array.from({ length: 7 }, (_, i) => makeDay(shiftDate(today, i)));
  const localCurrentDay = makeDay(today);
  const planDays = plannerViews?.days[0]?.date === weekStart(selectedDate) ? plannerViews.days : localPlanDays;
  const recoveryDays = plannerViews?.days[0]?.date === today ? plannerViews.days : localRecoveryDays;
  const currentDay = plannerViews?.dashboard.day ?? localCurrentDay;
  const backendDashboardWeek = plannerViews?.days[0]?.date === weekStart(today) ? plannerViews.days : undefined;
  const dashboardDays = period === "Daily" ? [currentDay] : backendDashboardWeek ?? Array.from({ length: 7 }, (_, i) => makeDay(shiftDate(weekStart(today), i)));
  const capacities = currentDay.capacities.map(v => ({ ...v, used: Math.round(dashboardDays.reduce((sum, day) => sum + day.capacities.find(c => c.kind === v.kind)!.used, 0) / dashboardDays.length) }));
  const overall = loadPercent(capacities);
  const energy = plannerViews?.dashboard.energy ?? Math.max(0, Math.min(100, Math.round(100 - currentDay.capacities.reduce((sum, v) => sum + Math.min(100, v.used / v.limit * 100), 0) / 4) + (state.recoveryResults[today]?.done ? 10 : 0)));
  const flashcardGroups = state.modules.map(module => ({
    name: module.name,
    count: state.materials.filter(material => material.moduleId === module.id).reduce((total, material) => total + material.cards.length, 0),
  })).filter(group => group.count > 0);
  const localStreak = useMemo(() => {
    let count = 0; let cursor = state.checks[today] ? today : shiftDate(today, -1);
    while (state.checks[cursor]) { count++; cursor = shiftDate(cursor, -1); }
    return count;
  }, [state.checks, today]);
  const streak = plannerViews?.dashboard.streak ?? localStreak;
  const selectTab = (tab: MainTab) => { if (tab === "plan") setFilter("All"); navigate(mainTabs[tab]); };
  const showPlan = (next: PlanFilter) => { setFilter(next); setScreen("plan"); };
  const menu = { period, onPeriod: setPeriod };
  const saveCommitment = (item: Commitment) => setState(current => item.routineId ? { ...current, overrides: { ...current.overrides, [item.id]: item } } : { ...current, overrides: Object.fromEntries(Object.entries(current.overrides).filter(([id, value]) => id !== item.id && value.sourceId !== item.id)), commitments: [...current.commitments.filter(v => v.id !== item.id), item] });
  const onAction = (item: Commitment, action: string, date: string, duration: number, helper: string) => {
    setState(current => {
      const original = item.routineId
        ? routinePlan(current.routineEntries, current.modules, item.originalDate ?? item.startDate ?? today, current.checks[item.originalDate ?? item.startDate ?? today]).find(v => v.routineId === item.routineId) ?? item
        : item.sourceId
          ? current.commitments.find(v => v.serverId === item.sourceId || v.assignmentId === item.sourceId)
            ?? scheduledCommitments(current.commitments, item.originalDate ?? item.startDate ?? today).find(v => v.id === item.id) ?? item
          : current.commitments.find(v => v.id === item.id) ?? item;
      if (!item.startDate && !item.dueDate && !item.sourceId && !item.routineId) {
        const ratio = action === "Make it lighter" ? Math.min(1, duration / Math.max(0.25, original.durationHours ?? original.time / 5)) : 1;
        const updated: Commitment = { ...original, action, helper: helper.trim(), durationHours: action === "Make it lighter" ? duration : original.durationHours, time: original.time * ratio, mental: original.mental * ratio, physical: original.physical * ratio, social: original.social * ratio };
        if (action === "Move to another day") { updated.startDate = date; updated.endDate = date; updated.scheduleType = "Fixed"; updated.weekdays = undefined; updated.schedule = prettyDate(date); }
        return { ...current, commitments: current.commitments.map(v => v.id === item.id ? updated : v) };
      }
      if (action === "Keep as planned") { const next = { ...current.overrides }; delete next[item.id]; return { ...current, overrides: next }; }
      const ratio = action === "Make it lighter" ? Math.min(1, duration / Math.max(0.25, original.durationHours ?? original.time / 5)) : 1;
      const nextDate = action === "Move to another day" ? date : item.startDate ?? today;
      const updated = { ...original, occurrenceKey: item.occurrenceKey, serverId: item.serverId ?? original.serverId, sourceId: item.sourceId, action, originalDate: item.originalDate ?? original.startDate, startDate: nextDate, schedule: prettyDate(nextDate), helper: helper.trim(), durationHours: action === "Make it lighter" ? duration : original.durationHours, time: original.time * ratio, mental: original.mental * ratio, physical: original.physical * ratio, social: original.social * ratio };
      return { ...current, overrides: { ...current.overrides, [item.id]: updated } };
    });
    setPlannerViews(undefined);
    applyPlanningAction(state, item, action, date, duration, helper).then(() => {
      setDomainRevision(value => value + 1);
      setSyncError("");
    }).catch(error => {
      if (error instanceof ApiError && error.status === 401) onAuthenticationLost();
      else setSyncError(error instanceof Error ? error.message : "The planning action could not reach the backend.");
    });
  };
  const saveModules = (modules: Module[]) => {
    setState(current => {
      const assignments = modules.filter(m => m.assignment).map(m => ({ id: "assignment-" + m.id, moduleId: m.id, name: m.name + " assignment", category: "Assignment", schedule: prettyDate(m.assignment!.start), startDate: m.assignment!.start, dueDate: m.assignment!.due || undefined, durationHours: 1, time: 5, mental: 15, physical: 0, social: 0, flexibility: "Somewhat flexible" }));
      const removed = current.modules.filter(existing => existing.serverId && !modules.some(module => module.id === existing.id)).map(existing => ({
        serverId: existing.serverId!,
        serverVersion: existing.serverVersion ?? 1,
        assignmentId: existing.assignment?.serverId,
        assignmentVersion: existing.assignment?.serverVersion,
      }));
      const pendingModuleDeletes = [...(current.pendingModuleDeletes ?? []), ...removed].filter((deletion, index, all) => all.findIndex(item => item.serverId === deletion.serverId) === index);
      const removedAssignments = current.modules.flatMap(existing => {
        const replacement = modules.find(module => module.id === existing.id);
        return existing.assignment?.serverId && replacement && !replacement.assignment
          ? [{ serverId: existing.assignment.serverId, serverVersion: existing.assignment.serverVersion ?? 1 }]
          : [];
      });
      const pendingAssignmentDeletes = [...(current.pendingAssignmentDeletes ?? []), ...removedAssignments]
        .filter((deletion, index, all) => all.findIndex(item => item.serverId === deletion.serverId) === index);
      return { ...current, modules, pendingModuleDeletes, pendingAssignmentDeletes, routineEntries: modules.length && !current.routineEntries.classes ? { ...current.routineEntries, classes: { durationHours: 2, timesPerWeek: 5, condition: "Typical" } } : current.routineEntries, overrides: Object.fromEntries(Object.entries(current.overrides).filter(([id]) => !id.startsWith("assignment-"))), commitments: [...current.commitments.filter(c => !c.id.startsWith("assignment-")), ...assignments] };
    });
  };
  const testCommitment = (item: Commitment) => {
    setDraft(item);
    setWhatIfComparison(undefined);
    setWhatIfLoading(true);
    navigate("simulator");
    previewCommitment(state, item).then(comparison => {
      setWhatIfComparison(comparison);
      setSyncError("");
    }).catch(error => {
      if (error instanceof ApiError && error.status === 401) onAuthenticationLost();
      else setSyncError(error instanceof Error ? error.message : "The preview could not reach the backend.");
    }).finally(() => setWhatIfLoading(false));
  };
  const removeAccount = async () => {
    clearPlanningSyncQueue();
    await deleteAccount();
    deleteSavedPlan(account.user.id, state.materials.map(material => material.uri).filter(Boolean));
    onAuthenticationLost();
  };
  const quickAdd = (action: QuickAddAction) => {
    const origin = screen === "profile" || screen === "recovery" || screen === "plan" ? screen : "today";
    if (action === "commitment") { setSecondaryBack(origin); setEditing(undefined); navigate("add"); }
    else if (action === "assignment") { setAssignmentBack(origin); setModuleFocusId(undefined); navigate("assignments"); }
    else if (action === "timetable") { setScheduleBack(origin); setImportReturn("schedule"); navigate("import-timetable"); }
    else if (action === "materials") { setFlashcardBack(origin); setMaterialFocusId(undefined); navigate("flashcards"); }
    else { setNoteReturn(screen); navigate("weekly-note"); }
  };
  const selectedIds = Object.keys(state.routineEntries);
  const baselineHours = selectedIds.reduce((total, id) => total + weeklyHours(state.routineEntries[id]), 0);
  const updateEntry = (id: string, entry: RoutineEntry) => setState(current => ({ ...current, routineEntries: { ...current.routineEntries, [id]: entry } }));

  if (!loaded) return <ScrollPage><PageHeader eyebrow="Santai" title={storageError ? "Your plan needs attention" : "Opening your plan"} /><View style={s.content}>{storageError ? <Text style={s.body}>{storageError}</Text> : <ActivityIndicator color={colors.forest} />}</View></ScrollPage>;
  let page;
  if (screen === "welcome") page = <WelcomeScreen onStart={() => { setEditingBaseline(false); setBaselineBack("welcome"); navigate("routine-checklist"); }} />;
  else if (screen === "routine-checklist") page = <RoutineChecklistScreen selectedIds={selectedIds} onToggle={id => setState(current => { const entries = { ...current.routineEntries }; if (entries[id]) delete entries[id]; else entries[id] = { durationHours: 1, timesPerWeek: 1, condition: "Typical" }; return { ...current, routineEntries: entries }; })} onBack={goBack} onContinue={() => navigate("routine-hours")} />;
  else if (screen === "routine-hours") page = <RoutineHoursScreen selectedIds={selectedIds} entries={state.routineEntries} onEntryChange={updateEntry} onBack={goBack} onContinue={() => { setFeelIndex(0); navigate("feel-questions"); }} />;
  else if (screen === "feel-questions") page = <FeelQuestionsScreen selectedIds={selectedIds} entries={state.routineEntries} answers={state.feelAnswers} recoveryChoice={state.recoveryChoice} index={feelIndex} onAnswer={(kind, value) => patch({ feelAnswers: { ...state.feelAnswers, [kind]: value } })} onRecovery={value => patch({ recoveryChoice: value })} onIndexChange={setFeelIndex} onBack={goBack} onContinue={() => { if (editingBaseline) { setEditingBaseline(false); navigate("profile"); } else navigate("setup-choice"); }} />;
  else if (screen === "setup-choice") page = <SetupChoiceScreen baselineHours={baselineHours} activityCount={selectedIds.length} recoveryChoice={state.recoveryChoice} onBack={goBack} onImport={() => { setImportReturn("setup-choice"); navigate("import-timetable"); }} onManual={() => { setAddOnboardingBack("setup-choice"); navigate("add-onboarding"); }} onSkip={() => { setState(current => ({ ...current, registeredOn: current.registeredOn ?? dateKey() })); navigate("today"); }} />;
  else if (screen === "import-timetable") page = <ImportTimetableScreen initial={state.modules} eyebrow={importReturn === "setup-choice" ? "Setup · Upcoming · Optional" : undefined} submitText={importReturn === "setup-choice" ? "Save & return" : "Save timetable"} onBack={goBack} onContinue={modules => { saveModules(modules); navigate(importReturn); }} />;
  else if (screen === "add-onboarding") page = <CommitmentForm eyebrow="Setup · Upcoming · Optional" title="Add Commitment" body="Add it to your week and estimate what it will take." submitText="Add & return" onBack={goBack} onManageModules={() => { setAssignmentBack("add-onboarding"); setModuleFocusId(undefined); navigate("assignments"); }} onSubmit={item => { saveCommitment(item); navigate(addOnboardingBack); }} onAddAnother={saveCommitment} secondaryAction={{ text: "Return without adding another", onPress: () => navigate(addOnboardingBack) }} />;
  else if (screen === "anything-else") page = <AnythingElseScreen initialNote={state.weeklyNote} onBack={goBack} onContinue={note => { patch({ weeklyNote: note }); navigate("preparing"); }} />;
  else if (screen === "preparing") page = <ScrollPage><PageHeader eyebrow="Your plan" title="Making room for your week" body="Putting your routine, assignments and personal limits together." /><View style={s.content}><ActivityIndicator size="large" color={colors.forest} /><Text style={s.body}>Your first check-in will be available tomorrow.</Text></View></ScrollPage>;
  else if (screen === "today") page = <><CurrentHomeScreen {...menu} capacities={capacities} overall={overall} energy={energy} streak={streak} onTab={selectTab} onQuickAdd={quickAdd} onWeeklyNote={() => { setNoteReturn("today"); navigate("weekly-note"); }} onRebalance={() => { setPeriod("Weekly"); showPlan("All"); }} onTest={() => navigate("test-commitment")} onFlashcards={() => { setFlashcardBack("today"); setMaterialFocusId(undefined); navigate("flashcards"); }} flashcardGroups={flashcardGroups} hasMaterials={state.materials.length > 0} weeklyNote={state.weeklyNote} />{checkInVisible && checkInEligible && <CurrentCheckIn key={today + (currentCheck?.savedAt ?? "")} initial={currentCheck} modules={state.modules} hasSport={!!state.routineEntries.sport} sportPlanned={routinePlan(state.routineEntries, state.modules, today).some(item => item.routineId === "sport")} onClose={() => setCheckInVisible(false)} onPlan={() => { setCheckInVisible(false); setAssignmentBack("today"); setModuleFocusId(undefined); navigate("assignments"); }} onSave={(check, goToPlan) => { patch({ checks: { ...state.checks, [today]: check } }); setCheckInVisible(false); setCheckInSaved(true); if (goToPlan) showPlan("All"); }} />}</>;
  else if (screen === "plan") page = <CurrentPlanScreen {...menu} filter={filter} unscheduled={plannerViews?.days[0]?.date === weekStart(selectedDate) ? plannerViews.unscheduled : state.commitments.filter(item => !item.startDate && !item.dueDate)} days={planDays} selectedDate={selectedDate} onDate={setSelectedDate} onTab={selectTab} onQuickAdd={quickAdd} onAdd={() => { setSecondaryBack("plan"); setEditing(undefined); navigate("add"); }} onEdit={item => { setSecondaryBack("plan"); setEditing(item.sourceId ? state.commitments.find(v => v.serverId === item.sourceId || v.id === item.sourceId) ?? item : item); navigate("add"); }} onAction={onAction} />;
  else if (screen === "add") page = <CommitmentForm key={editing?.id ?? "new"} eyebrow="Your plan" title={editing ? "Edit Commitment" : "Add Commitment"} body="Add it to your week and estimate what it will take." initial={editing} defaultDate={selectedDate} submitText={editing ? "Save changes" : "Add & continue"} onBack={goBack} onManageModules={() => { setAssignmentBack("add"); setModuleFocusId(undefined); navigate("assignments"); }} onSubmit={item => { saveCommitment(item); showPlan("All"); }} onAddAnother={saveCommitment} />;
  else if (screen === "flashcards") page = <FlashcardScreen modules={state.modules} materials={state.materials} initialModuleId={materialFocusId} onSave={materials => patch({ materials })} onBack={goBack} />;
  else if (screen === "recovery") page = <CurrentRecoveryScreen days={recoveryDays} suggestions={plannerViews?.recovery} results={state.recoveryResults} onResult={(key, value) => patch({ recoveryResults: { ...state.recoveryResults, [key]: value } })} onPlan={date => { setSelectedDate(date); showPlan("All"); }} onTab={selectTab} onQuickAdd={quickAdd} />;
  else if (screen === "profile") page = <ProfileScreen email={account.user.email} onSignOut={onSignOut} onExport={saveAccountExport} onDeleteAccount={removeAccount} streak={streak} commitments={state.commitments} modules={state.modules} routines={state.routineEntries} answers={state.feelAnswers} onTab={selectTab} onQuickAdd={quickAdd} onBaseline={() => { setEditingBaseline(true); setBaselineBack("profile"); setFeelIndex(0); navigate("routine-checklist"); }} />;
  else if (screen === "schedule") page = <ScheduleScreen modules={state.modules} commitments={state.commitments} onBack={goBack} onImport={() => { setImportReturn("schedule"); navigate("import-timetable"); }} onModules={() => { if (scheduleBack !== "assignments") setAssignmentBack("schedule"); setModuleFocusId(undefined); navigate("assignments"); }} onModule={moduleId => { if (scheduleBack !== "assignments") setAssignmentBack("schedule"); setModuleFocusId(moduleId); navigate("assignments"); }} />;
  else if (screen === "assignments") page = <AssignmentsScreen modules={state.modules} materials={state.materials} initialModuleId={moduleFocusId} onBack={goBack} onSave={saveModules} onImport={() => { setImportReturn("assignments"); navigate("import-timetable"); }} onTimetable={() => { if (assignmentBack !== "schedule") setScheduleBack("assignments"); navigate("schedule"); }} onAddMaterial={moduleId => { setFlashcardBack("assignments"); setMaterialFocusId(moduleId); navigate("flashcards"); }} />;
  else if (screen === "weekly-note") page = <AnythingElseScreen standalone initialNote={state.weeklyNote} onBack={goBack} onContinue={note => { patch({ weeklyNote: note }); navigate(noteReturn); }} />;
  else if (screen === "test-commitment") page = <WhatIfForm draft={draft} date={today} onBack={() => navigate("today")} onTest={testCommitment} />;
  else if (screen === "simulator" && draft) page = <WhatIfResult draft={draft} capacities={makeDay(draft.startDate ?? today).capacities} comparison={whatIfComparison} loading={whatIfLoading} onBack={() => navigate("test-commitment")} onConfirm={() => { saveCommitment(draft); setSelectedDate(draft.startDate ?? today); setDraft(undefined); setWhatIfComparison(undefined); showPlan("All"); }} onDecline={() => { setDraft(undefined); setWhatIfComparison(undefined); navigate("today"); }} onPlan={() => showPlan("All")} />;
  else page = <WhatIfForm draft={draft} date={today} onBack={() => navigate("today")} onTest={testCommitment} />;
  return <StreakPetContext.Provider value={{ streak, hidden: screen === "profile", checkIn: screen === "today" && checkInEligible ? { label: currentCheck ? "Update today’s check-in" : "Complete today’s check-in", onPress: () => setCheckInVisible(true) } : undefined }}><View style={{ flex: 1 }}>{storageError ? <InlineNotice title="Saving needs attention" body={storageError} tone="amber" /> : syncError ? <InlineNotice title="Backend sync paused" body={syncError} tone="amber" /> : null}{page}{checkInSaved ? <View pointerEvents="none" accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ position: "absolute", top: 18, left: 20, right: 20, zIndex: 100 }}><InlineNotice title="Check-in saved" body="Today’s Plan and capacity are up to date." /></View> : null}</View></StreakPetContext.Provider>;
}
