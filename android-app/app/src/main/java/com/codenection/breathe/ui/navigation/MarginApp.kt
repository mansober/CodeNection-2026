package com.codenection.breathe.ui

import androidx.activity.compose.BackHandler
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import com.codenection.breathe.CapacityKind
import com.codenection.breathe.Commitment
import com.codenection.breathe.RoutineEntry
import com.codenection.breathe.routineCatalog
import com.codenection.breathe.sampleCommitments
import com.codenection.breathe.upsertCommitment
import com.codenection.breathe.weekendHackathon

enum class AppScreen {
    Welcome,
    RoutineChecklist,
    RoutineHours,
    FeelQuestions,
    SetupChoice,
    ImportTimetable,
    AddOnboarding,
    AnythingElse,
    Home,
    Add,
    See,
    FiveD,
    TestCommitment,
    Simulator,
    CheckIn,
    Recovery,
    RebalancedWeek,
}

@Composable
fun MarginApp() {
    var screenName by rememberSaveable { mutableStateOf(AppScreen.Welcome.name) }
    var previousName by rememberSaveable { mutableStateOf(AppScreen.Welcome.name) }
    var nudgeThreshold by rememberSaveable { mutableStateOf("90%") }
    var editingCommitmentName by rememberSaveable { mutableStateOf<String?>(null) }
    val commitments = remember { mutableStateListOf<Commitment>().also { it.addAll(sampleCommitments) } }
    val selectedRoutineIds = remember { mutableStateListOf("classes") }
    val routineEntries = remember {
        mutableStateMapOf("classes" to RoutineEntry(durationHours = 2.0, timesPerWeek = 5))
    }
    val feelAnswers = remember { mutableStateMapOf<CapacityKind, Int>() }
    var recoveryChoice by rememberSaveable { mutableStateOf<Int?>(null) }
    val screen = AppScreen.valueOf(screenName)

    fun navigate(destination: AppScreen) {
        previousName = screenName
        screenName = destination.name
    }

    fun selectTab(tab: MainTab) {
        navigate(
            when (tab) {
                MainTab.Today -> AppScreen.Home
                MainTab.Plan -> AppScreen.See
                MainTab.CheckIn -> AppScreen.CheckIn
                MainTab.Recover -> AppScreen.Recovery
            },
        )
    }

    BackHandler(enabled = screen != AppScreen.Welcome) {
        navigate(
            when (screen) {
                AppScreen.RoutineChecklist -> AppScreen.Welcome
                AppScreen.RoutineHours -> AppScreen.RoutineChecklist
                AppScreen.FeelQuestions -> AppScreen.RoutineHours
                AppScreen.SetupChoice -> AppScreen.FeelQuestions
                AppScreen.ImportTimetable,
                AppScreen.AddOnboarding -> AppScreen.SetupChoice
                AppScreen.AnythingElse -> AppScreen.valueOf(previousName)
                AppScreen.Home -> AppScreen.Welcome
                AppScreen.Add -> {
                    editingCommitmentName = null
                    if (previousName == AppScreen.See.name) AppScreen.See else AppScreen.Home
                }
                AppScreen.See,
                AppScreen.FiveD,
                AppScreen.CheckIn,
                AppScreen.Recovery,
                AppScreen.RebalancedWeek -> AppScreen.Home
                AppScreen.TestCommitment -> AppScreen.Add
                AppScreen.Simulator -> AppScreen.TestCommitment
                AppScreen.Welcome -> AppScreen.Welcome
            },
        )
    }

    when (screen) {
        AppScreen.Welcome -> WelcomeScreen(onStart = { navigate(AppScreen.RoutineChecklist) })
        AppScreen.RoutineChecklist -> RoutineChecklistScreen(
            selectedIds = selectedRoutineIds.toSet(),
            onToggle = { id ->
                if (id in selectedRoutineIds) {
                    selectedRoutineIds.remove(id)
                    routineEntries.remove(id)
                } else {
                    selectedRoutineIds.add(id)
                    routineEntries.putIfAbsent(id, RoutineEntry())
                }
            },
            onBack = { navigate(AppScreen.Welcome) },
            onContinue = { navigate(AppScreen.RoutineHours) },
        )
        AppScreen.RoutineHours -> RoutineHoursScreen(
            selectedItems = routineCatalog.filter { it.id in selectedRoutineIds },
            entries = routineEntries,
            onEntryChange = { id, entry -> routineEntries[id] = entry },
            onBack = { navigate(AppScreen.RoutineChecklist) },
            onContinue = { navigate(AppScreen.FeelQuestions) },
        )
        AppScreen.FeelQuestions -> FeelQuestionsScreen(
            entries = routineEntries.filterKeys { it in selectedRoutineIds },
            answers = feelAnswers,
            recoveryChoice = recoveryChoice,
            onAnswer = { kind, answer -> feelAnswers[kind] = answer },
            onRecovery = { recoveryChoice = it },
            onBack = { navigate(AppScreen.RoutineHours) },
            onContinue = { navigate(AppScreen.SetupChoice) },
        )
        AppScreen.SetupChoice -> SetupChoiceScreen(
            onBack = { navigate(AppScreen.FeelQuestions) },
            onImport = { navigate(AppScreen.ImportTimetable) },
            onManual = { navigate(AppScreen.AddOnboarding) },
            onSkip = { navigate(AppScreen.Home) },
        )
        AppScreen.ImportTimetable -> ImportTimetableScreen(
            originalClassHours = routineEntries["classes"]?.weeklyHours ?: 0.0,
            onClassHoursChanged = { hours ->
                routineEntries["classes"] = if (hours == 18.0) {
                    RoutineEntry(durationHours = 3.0, timesPerWeek = 6)
                } else {
                    RoutineEntry(durationHours = 2.0, timesPerWeek = 5)
                }
            },
            onBack = { navigate(AppScreen.SetupChoice) },
            onContinue = { navigate(AppScreen.AnythingElse) },
        )
        AppScreen.AddOnboarding -> AddCommitmentOnboardingScreen(
            onBack = { navigate(AppScreen.SetupChoice) },
            onContinue = { navigate(AppScreen.AnythingElse) },
        )
        AppScreen.AnythingElse -> AnythingElseScreen(
            onBack = { navigate(AppScreen.valueOf(previousName)) },
            onContinue = { navigate(AppScreen.Home) },
        )
        AppScreen.Home -> HomeScreen(
            threshold = nudgeThreshold,
            onThresholdChange = { nudgeThreshold = it },
            onTab = ::selectTab,
            onRebalance = { navigate(AppScreen.FiveD) },
            onSeeAll = { navigate(AppScreen.See) },
            onTest = { navigate(AppScreen.TestCommitment) },
            onAdd = {
                editingCommitmentName = null
                navigate(AppScreen.Add)
            },
        )
        AppScreen.Add -> AddTabScreen(
            initialCommitment = commitments.firstOrNull { it.name == editingCommitmentName },
            onTab = ::selectTab,
            onSaved = { commitment ->
                val updated = upsertCommitment(commitments, editingCommitmentName, commitment)
                commitments.clear()
                commitments.addAll(updated)
                editingCommitmentName = null
                navigate(AppScreen.See)
            },
            onTest = {
                editingCommitmentName = null
                navigate(AppScreen.TestCommitment)
            },
        )
        AppScreen.See -> SeeScreen(
            commitments = commitments,
            onTab = ::selectTab,
            onRemove = { commitments.remove(it) },
            onAdd = {
                editingCommitmentName = null
                navigate(AppScreen.Add)
            },
            onEdit = {
                editingCommitmentName = it.name
                navigate(AppScreen.Add)
            },
        )
        AppScreen.FiveD -> FiveDScreen(
            onBack = { navigate(AppScreen.Home) },
            onApplied = { navigate(AppScreen.RebalancedWeek) },
            onTest = { navigate(AppScreen.TestCommitment) },
        )
        AppScreen.TestCommitment -> TestCommitmentScreen(
            onBack = {
                val previous = AppScreen.valueOf(previousName)
                navigate(if (previous == AppScreen.Home) AppScreen.Home else AppScreen.Add)
            },
            onTest = { navigate(AppScreen.Simulator) },
        )
        AppScreen.Simulator -> SimulatorScreen(
            onBack = { navigate(AppScreen.TestCommitment) },
            onDecline = { navigate(AppScreen.Home) },
            onReschedule = { navigate(AppScreen.TestCommitment) },
            onAddAnyway = {
                val updated = upsertCommitment(commitments, null, weekendHackathon)
                commitments.clear()
                commitments.addAll(updated)
                navigate(AppScreen.See)
            },
            onMakeRoom = { navigate(AppScreen.FiveD) },
        )
        AppScreen.CheckIn -> CheckInScreen(
            onTab = ::selectTab,
            onSaved = { navigate(AppScreen.Home) },
        )
        AppScreen.Recovery -> RecoveryScreen(
            onTab = ::selectTab,
            onBlockTime = { navigate(AppScreen.RebalancedWeek) },
        )
        AppScreen.RebalancedWeek -> RebalancedWeekScreen(onReturn = { navigate(AppScreen.Home) })
    }
}
