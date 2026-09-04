import { useCallback, useEffect, useMemo, useState } from "react";
import { BackHandler } from "react-native";

import {
  AddCommitmentOnboardingScreen,
  AnythingElseScreen,
  CommitmentForm,
  FeelQuestionsScreen,
  ImportTimetableScreen,
  RoutineChecklistScreen,
  RoutineHoursScreen,
  SetupChoiceScreen,
  WelcomeScreen,
} from "@/screens/OnboardingScreens";
import { HomeScreen, PlanScreen } from "@/screens/PlanningScreens";
import { RebalanceScreen, SimulatorScreen, TestCommitmentScreen } from "@/screens/RebalanceScreens";
import { CheckInScreen, RebalancedWeekScreen, RecoveryScreen } from "@/screens/RecoveryScreens";
import {
  AppScreen,
  CapacityKind,
  Commitment,
  MainTab,
  RoutineEntry,
  sampleCommitments,
  weekendHackathon,
} from "@/models/margin";

const tabScreens: Record<MainTab, AppScreen> = {
  today: "today",
  plan: "plan",
  "check-in": "check-in",
  recovery: "recovery",
};

export function MarginApp() {
  const [screen, setScreen] = useState<AppScreen>("welcome");
  const [previousScreen, setPreviousScreen] = useState<AppScreen>("welcome");
  const [specificSetupScreen, setSpecificSetupScreen] = useState<AppScreen>("setup-choice");
  const [selectedRoutineIds, setSelectedRoutineIds] = useState<string[]>(["classes"]);
  const [routineEntries, setRoutineEntries] = useState<Record<string, RoutineEntry>>({ classes: { durationHours: 2, timesPerWeek: 5 } });
  const [feelAnswers, setFeelAnswers] = useState<Partial<Record<CapacityKind, number>>>({});
  const [recoveryChoice, setRecoveryChoice] = useState<number>();
  const [feelIndex, setFeelIndex] = useState(0);
  const [commitments, setCommitments] = useState<Commitment[]>(sampleCommitments);
  const [editingId, setEditingId] = useState<string>();

  const navigate = useCallback((next: AppScreen) => {
    setScreen((current) => {
      setPreviousScreen(current);
      return next;
    });
  }, []);

  const goBack = useCallback((): boolean => {
    if (screen === "welcome" || screen === "today") return false;
    if (screen === "feel-questions" && feelIndex > 0) {
      setFeelIndex((current) => current - 1);
      return true;
    }
    const target: Partial<Record<AppScreen, AppScreen>> = {
      "routine-checklist": "welcome",
      "routine-hours": "routine-checklist",
      "feel-questions": "routine-hours",
      "setup-choice": "feel-questions",
      "import-timetable": "setup-choice",
      "add-onboarding": "setup-choice",
      "anything-else": specificSetupScreen,
      plan: "today",
      add: "plan",
      rebalance: "today",
      "test-commitment": previousScreen === "rebalance" ? "rebalance" : "today",
      simulator: "test-commitment",
      "check-in": "today",
      recovery: "today",
      rebalanced: "today",
    };
    const next = target[screen];
    if (!next) return false;
    setScreen(next);
    return true;
  }, [feelIndex, previousScreen, screen, specificSetupScreen]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", goBack);
    return () => subscription.remove();
  }, [goBack]);

  const selectTab = (tab: MainTab) => navigate(tabScreens[tab]);
  const updateEntry = useCallback((id: string, entry: RoutineEntry) => {
    setRoutineEntries((current) => ({ ...current, [id]: entry }));
  }, []);
  const updateClassHours = useCallback((hours: number) => {
    const exactEntry = hours === 18
      ? { durationHours: 3, timesPerWeek: 6 }
      : { durationHours: 2, timesPerWeek: Math.max(1, Math.round(hours / 2)) };
    updateEntry("classes", exactEntry);
  }, [updateEntry]);
  const toggleRoutine = (id: string) => {
    setSelectedRoutineIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    setRoutineEntries((current) => {
      if (id in current) {
        const next = { ...current };
        delete next[id];
        return next;
      }
      return { ...current, [id]: { durationHours: 1, timesPerWeek: 1 } };
    });
  };
  const saveCommitment = (commitment: Commitment) => {
    setCommitments((current) => {
      const existingIndex = current.findIndex((item) => item.id === commitment.id);
      if (existingIndex < 0) return [commitment, ...current];
      return current.map((item) => item.id === commitment.id ? commitment : item);
    });
    setEditingId(undefined);
    navigate("plan");
  };
  const editingCommitment = useMemo(() => commitments.find((item) => item.id === editingId), [commitments, editingId]);

  if (screen === "welcome") return <WelcomeScreen onStart={() => navigate("routine-checklist")} />;
  if (screen === "routine-checklist") return <RoutineChecklistScreen selectedIds={selectedRoutineIds} onToggle={toggleRoutine} onBack={goBack} onContinue={() => navigate("routine-hours")} />;
  if (screen === "routine-hours") return <RoutineHoursScreen selectedIds={selectedRoutineIds} entries={routineEntries} onEntryChange={updateEntry} onBack={goBack} onContinue={() => { setFeelIndex(0); navigate("feel-questions"); }} />;
  if (screen === "feel-questions") return <FeelQuestionsScreen selectedIds={selectedRoutineIds} entries={routineEntries} answers={feelAnswers} recoveryChoice={recoveryChoice} index={feelIndex} onAnswer={(kind, answer) => setFeelAnswers((current) => ({ ...current, [kind]: answer }))} onRecovery={setRecoveryChoice} onIndexChange={setFeelIndex} onBack={goBack} onContinue={() => navigate("setup-choice")} />;
  if (screen === "setup-choice") return <SetupChoiceScreen onBack={goBack} onImport={() => { setSpecificSetupScreen("import-timetable"); navigate("import-timetable"); }} onManual={() => { setSpecificSetupScreen("add-onboarding"); navigate("add-onboarding"); }} onSkip={() => navigate("today")} />;
  if (screen === "import-timetable") return <ImportTimetableScreen originalHours={routineEntries.classes ? routineEntries.classes.durationHours * routineEntries.classes.timesPerWeek : 0} onClassHoursChanged={updateClassHours} onBack={goBack} onContinue={() => navigate("anything-else")} />;
  if (screen === "add-onboarding") return <AddCommitmentOnboardingScreen onBack={goBack} onContinue={(commitment) => { setCommitments((current) => current.some((item) => item.name === commitment.name) ? current : [commitment, ...current]); navigate("anything-else"); }} />;
  if (screen === "anything-else") return <AnythingElseScreen onBack={goBack} onContinue={() => navigate("today")} />;
  if (screen === "today") return <HomeScreen onTab={selectTab} onRebalance={() => navigate("rebalance")} onSeePlan={() => navigate("plan")} onTest={() => navigate("test-commitment")} />;
  if (screen === "plan") return <PlanScreen commitments={commitments} onTab={selectTab} onAdd={() => { setEditingId(undefined); navigate("add"); }} onEdit={(item) => { setEditingId(item.id); navigate("add"); }} onRemove={(item) => setCommitments((current) => current.filter((candidate) => candidate.id !== item.id))} />;
  if (screen === "add") return <CommitmentForm key={editingCommitment?.id ?? "new"} eyebrow={editingCommitment ? "Edit commitment" : "Add commitment"} title={editingCommitment ? "Adjust what this asks of you" : "What needs your attention?"} body="Rate the cost, not how important it sounds." initial={editingCommitment} submitText={editingCommitment ? "Save changes" : "Add to this week"} onBack={goBack} onSubmit={saveCommitment} />;
  if (screen === "rebalance") return <RebalanceScreen onBack={goBack} onApply={() => navigate("rebalanced")} onTest={() => navigate("test-commitment")} />;
  if (screen === "test-commitment") return <TestCommitmentScreen onBack={goBack} onTest={() => navigate("simulator")} />;
  if (screen === "simulator") return <SimulatorScreen onBack={goBack} onDecline={() => navigate("today")} onReschedule={() => navigate("test-commitment")} onAddAnyway={() => { setCommitments((current) => current.some((item) => item.id === weekendHackathon.id) ? current : [weekendHackathon, ...current]); navigate("plan"); }} onMakeRoom={() => navigate("rebalance")} />;
  if (screen === "check-in") return <CheckInScreen onTab={selectTab} onSaved={() => navigate("recovery")} />;
  if (screen === "recovery") return <RecoveryScreen onTab={selectTab} onBlockTime={() => navigate("rebalanced")} />;
  return <RebalancedWeekScreen onReturn={() => navigate("today")} />;
}
