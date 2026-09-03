package com.codenection.breathe.ui

import androidx.activity.compose.BackHandler
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import com.codenection.breathe.Commitment
import com.codenection.breathe.sampleCommitments
import com.codenection.breathe.upsertCommitment
import com.codenection.breathe.weekendHackathon

enum class AppScreen {
    Welcome,
    SetupChoice,
    ImportTimetable,
    AddOnboarding,
    DescribeWeek,
    CheckLimits,
    Home,
    Add,
    See,
    FiveD,
    TestCommitment,
    Simulator,
}

@Composable
fun BreatheApp() {
    var screenName by rememberSaveable { mutableStateOf(AppScreen.Welcome.name) }
    var previousName by rememberSaveable { mutableStateOf(AppScreen.Welcome.name) }
    var nudgeThreshold by rememberSaveable { mutableStateOf("90%") }
    var editingCommitmentName by rememberSaveable { mutableStateOf<String?>(null) }
    val commitments = remember { mutableStateListOf<Commitment>().also { it.addAll(sampleCommitments) } }
    val screen = AppScreen.valueOf(screenName)

    fun navigate(destination: AppScreen) {
        previousName = screenName
        screenName = destination.name
    }

    fun selectTab(tab: MainTab) {
        if (tab == MainTab.Add) editingCommitmentName = null
        navigate(
            when (tab) {
                MainTab.Home -> AppScreen.Home
                MainTab.Add -> AppScreen.Add
                MainTab.See -> AppScreen.See
                MainTab.FiveD -> AppScreen.FiveD
            },
        )
    }

    BackHandler(enabled = screen != AppScreen.Welcome) {
        navigate(
            when (screen) {
                AppScreen.SetupChoice -> AppScreen.Welcome
                AppScreen.ImportTimetable,
                AppScreen.AddOnboarding,
                AppScreen.DescribeWeek -> AppScreen.SetupChoice
                AppScreen.CheckLimits -> AppScreen.SetupChoice
                AppScreen.Home -> AppScreen.Welcome
                AppScreen.Add -> {
                    editingCommitmentName = null
                    if (previousName == AppScreen.See.name) AppScreen.See else AppScreen.Home
                }
                AppScreen.See,
                AppScreen.FiveD -> AppScreen.Home
                AppScreen.TestCommitment -> AppScreen.Add
                AppScreen.Simulator -> AppScreen.TestCommitment
                AppScreen.Welcome -> AppScreen.Welcome
            },
        )
    }

    when (screen) {
        AppScreen.Welcome -> WelcomeScreen(onStart = { navigate(AppScreen.SetupChoice) })
        AppScreen.SetupChoice -> SetupChoiceScreen(
            onBack = { navigate(AppScreen.Welcome) },
            onImport = { navigate(AppScreen.ImportTimetable) },
            onManual = { navigate(AppScreen.AddOnboarding) },
            onDescribe = { navigate(AppScreen.DescribeWeek) },
        )
        AppScreen.ImportTimetable -> ImportTimetableScreen(
            onBack = { navigate(AppScreen.SetupChoice) },
            onContinue = { navigate(AppScreen.CheckLimits) },
        )
        AppScreen.AddOnboarding -> AddCommitmentOnboardingScreen(
            onBack = { navigate(AppScreen.SetupChoice) },
            onContinue = { navigate(AppScreen.CheckLimits) },
        )
        AppScreen.DescribeWeek -> DescribeWeekScreen(
            onBack = { navigate(AppScreen.SetupChoice) },
            onContinue = { navigate(AppScreen.CheckLimits) },
        )
        AppScreen.CheckLimits -> CheckLimitsScreen(
            onBack = { navigate(AppScreen.SetupChoice) },
            onContinue = { navigate(AppScreen.Home) },
        )
        AppScreen.Home -> HomeScreen(
            threshold = nudgeThreshold,
            onThresholdChange = { nudgeThreshold = it },
            onTab = ::selectTab,
            onRebalance = { navigate(AppScreen.FiveD) },
            onSeeAll = { navigate(AppScreen.See) },
            onTest = { navigate(AppScreen.TestCommitment) },
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
            onTab = ::selectTab,
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
    }
}
