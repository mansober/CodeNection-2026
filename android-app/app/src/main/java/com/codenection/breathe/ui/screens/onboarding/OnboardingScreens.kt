package com.codenection.breathe.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Slider
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.codenection.breathe.CapacityKind
import com.codenection.breathe.RoutineEntry
import com.codenection.breathe.RoutineItem
import com.codenection.breathe.TimetableReconciliation
import com.codenection.breathe.committedHoursTotal
import com.codenection.breathe.recoveryHourValues
import com.codenection.breathe.requiredFeelKinds
import com.codenection.breathe.routineCatalog
import com.codenection.breathe.routineDurationOptions
import com.codenection.breathe.routineFrequencyOptions
import com.codenection.breathe.spareHourValues
import com.codenection.breathe.ui.theme.Canvas
import com.codenection.breathe.ui.theme.Coral
import com.codenection.breathe.ui.theme.Forest
import com.codenection.breathe.ui.theme.Ink
import com.codenection.breathe.ui.theme.Mint
import com.codenection.breathe.ui.theme.OutlineSoft
import com.codenection.breathe.ui.theme.Paper
import com.codenection.breathe.ui.theme.TextMuted
import kotlinx.coroutines.delay

@Composable
fun WelcomeScreen(onStart: () -> Unit) {
    Scaffold(containerColor = Canvas) { padding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 24.dp, vertical = 22.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                MarginMark()
                Spacer(Modifier.size(12.dp))
                Text("MARGIN", color = Forest, fontSize = 13.sp, fontWeight = FontWeight.Bold, letterSpacing = 2.sp)
            }
            Spacer(Modifier.weight(0.7f))
            Text("Know the cost\nbefore you say yes.", style = MaterialTheme.typography.headlineLarge)
            Spacer(Modifier.height(18.dp))
            Text(
                "A weekly capacity planner for classes, clubs, work, and the rest of your life.",
                style = MaterialTheme.typography.bodyLarge,
                color = TextMuted,
            )
            Spacer(Modifier.height(34.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                listOf("TIME", "MENTAL", "PHYSICAL", "SOCIAL").forEachIndexed { index, label ->
                    Box(
                        Modifier
                            .weight(1f)
                            .height(if (index == 1) 86.dp else 62.dp)
                            .background(if (index == 1) Coral else if (index == 0) Forest else OutlineSoft, RoundedCornerShape(4.dp))
                            .padding(7.dp),
                        contentAlignment = Alignment.BottomStart,
                    ) {
                        Text(label.take(1), color = if (index < 2) Color.White else Ink, fontWeight = FontWeight.Bold)
                    }
                }
            }
            Spacer(Modifier.weight(1f))
            PrimaryButton("Build my week", onStart)
            Spacer(Modifier.height(12.dp))
            Text(
                "Takes about two minutes. You can change everything later.",
                color = TextMuted,
                fontSize = 12.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

@Composable
fun RoutineChecklistScreen(
    selectedIds: Set<String>,
    onToggle: (String) -> Unit,
    onBack: () -> Unit,
    onContinue: () -> Unit,
) {
    Scaffold(containerColor = Canvas) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState())) {
            PageHeader(
                "Your baseline · 1 of 3",
                "Which of these are part of your normal week?",
                "Tick everything that usually takes some of your time.",
                onBack,
            )
            Column(Modifier.padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                routineCatalog.forEach { item ->
                    val selected = item.id in selectedIds
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(min = 52.dp)
                            .clickable(role = Role.Checkbox) { onToggle(item.id) },
                        shape = RoundedCornerShape(10.dp),
                        color = if (selected) Mint else Paper,
                        border = BorderStroke(1.dp, if (selected) Forest else OutlineSoft),
                    ) {
                        Row(
                            Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Checkbox(checked = selected, onCheckedChange = { onToggle(item.id) })
                            Spacer(Modifier.width(6.dp))
                            Text(item.label, color = Ink, fontWeight = FontWeight.Medium)
                        }
                    }
                }
                Spacer(Modifier.height(10.dp))
                PrimaryButton("Add hours", onContinue, enabled = selectedIds.isNotEmpty())
                Spacer(Modifier.height(24.dp))
            }
        }
    }
}

@Composable
fun RoutineHoursScreen(
    selectedItems: List<RoutineItem>,
    entries: Map<String, RoutineEntry>,
    onEntryChange: (String, RoutineEntry) -> Unit,
    onBack: () -> Unit,
    onContinue: () -> Unit,
) {
    val total = committedHoursTotal(entries.filterKeys { id -> selectedItems.any { it.id == id } })
    Scaffold(containerColor = Canvas) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState())) {
            PageHeader(
                "Your baseline · 2 of 3",
                "How much of each?",
                "Use what a normal week looks like—not your busiest one.",
                onBack,
            )
            Column(Modifier.padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                selectedItems.forEach { item ->
                    val entry = entries[item.id] ?: RoutineEntry()
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = Paper,
                        border = BorderStroke(1.dp, OutlineSoft),
                    ) {
                        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text(item.label, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                                Text("${formatHours(entry.weeklyHours)} / week", color = Forest, fontWeight = FontWeight.Bold)
                            }
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                RoutineDropdown(
                                    label = "How long each time?",
                                    selected = durationLabel(entry.durationHours),
                                    options = routineDurationOptions.map { it.first },
                                    onSelect = { label ->
                                        val value = routineDurationOptions.first { it.first == label }.second
                                        onEntryChange(item.id, entry.copy(durationHours = value))
                                    },
                                    modifier = Modifier.weight(1f),
                                )
                                RoutineDropdown(
                                    label = "How many times a week?",
                                    selected = frequencyLabel(entry.timesPerWeek),
                                    options = routineFrequencyOptions.map { it.first },
                                    onSelect = { label ->
                                        val value = routineFrequencyOptions.first { it.first == label }.second
                                        onEntryChange(item.id, entry.copy(timesPerWeek = value))
                                    },
                                    modifier = Modifier.weight(1f),
                                )
                            }
                        }
                    }
                }
                Surface(color = Mint, shape = RoundedCornerShape(10.dp)) {
                    Row(
                        Modifier.fillMaxWidth().padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text("Committed in a normal week", fontWeight = FontWeight.SemiBold)
                        Text("${formatHours(total)}", color = Forest, fontSize = 20.sp, fontWeight = FontWeight.Bold)
                    }
                }
                PrimaryButton("Tell us how that feels", onContinue)
                Spacer(Modifier.height(24.dp))
            }
        }
    }
}

@Composable
private fun RoutineDropdown(
    label: String,
    selected: String,
    options: List<String>,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    var expanded by remember { mutableStateOf(false) }
    Column(modifier, verticalArrangement = Arrangement.spacedBy(5.dp)) {
        Text(label, color = TextMuted, fontSize = 10.sp, lineHeight = 13.sp)
        Box {
            Surface(
                modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp).clickable { expanded = true },
                shape = RoundedCornerShape(8.dp),
                color = Canvas,
                border = BorderStroke(1.dp, OutlineSoft),
            ) {
                Row(
                    Modifier.padding(horizontal = 10.dp, vertical = 12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(selected, fontSize = 12.sp, fontWeight = FontWeight.Medium)
                    Text("⌄", color = Forest, fontWeight = FontWeight.Bold)
                }
            }
            DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                options.forEach { option ->
                    DropdownMenuItem(
                        text = { Text(option) },
                        onClick = {
                            onSelect(option)
                            expanded = false
                        },
                    )
                }
            }
        }
    }
}

@Composable
fun FeelQuestionsScreen(
    entries: Map<String, RoutineEntry>,
    answers: Map<CapacityKind, Int>,
    recoveryChoice: Int?,
    currentIndex: Int,
    onAnswer: (CapacityKind, Int) -> Unit,
    onRecovery: (Int) -> Unit,
    onIndexChange: (Int) -> Unit,
    onBack: () -> Unit,
    onContinue: () -> Unit,
) {
    val requiredKinds = requiredFeelKinds(entries.keys)
    val totalPages = requiredKinds.size + 1
    val pageIndex = currentIndex.coerceIn(0, totalPages - 1)
    val currentKind = requiredKinds.getOrNull(pageIndex)
    val isRecoveryPage = currentKind == null
    val pageReady = if (currentKind != null) answers.containsKey(currentKind) else recoveryChoice != null
    val scrollState = rememberScrollState()

    LaunchedEffect(pageIndex) { scrollState.scrollTo(0) }

    Scaffold(containerColor = Canvas) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).verticalScroll(scrollState)) {
            PageHeader(
                "Personal limit ${pageIndex + 1} of $totalPages",
                if (isRecoveryPage) "How much room helps you recover?" else "How does a normal week leave you?",
                "One question at a time, based on the commitments you just entered.",
                onBack = {
                    if (pageIndex > 0) onIndexChange(pageIndex - 1) else onBack()
                },
            )
            Column(Modifier.padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
                LinearProgressIndicator(
                    progress = { (pageIndex + 1).toFloat() / totalPages.toFloat() },
                    modifier = Modifier.fillMaxWidth().height(6.dp),
                    color = currentKind?.color ?: Forest,
                    trackColor = OutlineSoft,
                    drawStopIndicator = {},
                )
                if (currentKind != null) {
                    FeelQuestionCard(
                        kind = currentKind,
                        question = feelQuestion(currentKind, entries),
                        selected = answers[currentKind],
                        onSelect = { onAnswer(currentKind, it) },
                    )
                } else {
                    Surface(color = Mint, shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Text("RECOVERY", color = Forest, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                            Text(
                                "How much completely unplanned time do you need in a week to feel okay?",
                                fontWeight = FontWeight.SemiBold,
                                lineHeight = 22.sp,
                            )
                            listOf("A couple of hours", "Half a day", "A full day", "More than a day").forEachIndexed { index, label ->
                                ChoicePill(
                                    "$label · ${recoveryHourValues[index]} h",
                                    recoveryChoice == index,
                                    { onRecovery(index) },
                                    Modifier.fillMaxWidth(),
                                )
                            }
                        }
                    }
                }
                if (isRecoveryPage) {
                    Text(
                        "The calibration numbers are team-set starting points; we will tune them with student testing.",
                        color = TextMuted,
                        fontSize = 12.sp,
                    )
                }
                PrimaryButton(
                    text = if (isRecoveryPage) "Set my baseline" else "Next question",
                    onClick = {
                        if (isRecoveryPage) onContinue() else onIndexChange(pageIndex + 1)
                    },
                    enabled = pageReady,
                )
                if (!isRecoveryPage) {
                    Text(
                        "Your answer sets your personal limit for ${currentKind.label.lowercase()} load.",
                        color = TextMuted,
                        fontSize = 12.sp,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
                Spacer(Modifier.height(24.dp))
            }
        }
    }
}

@Composable
private fun FeelQuestionCard(
    kind: CapacityKind,
    question: String,
    selected: Int?,
    onSelect: (Int) -> Unit,
) {
    val options = when (kind) {
        CapacityKind.Mental -> listOf(
            "Still sharp",
            "Fine — manageable",
            "Drained, but I recover by morning",
            "Completely done — it carries into the next day",
        )
        CapacityKind.Physical -> listOf(
            "Good — I could do more",
            "Fine",
            "Sore and tired",
            "It wipes me out for days",
        )
        CapacityKind.Social -> listOf(
            "Energised — it gives me more than it takes",
            "Fine either way",
            "A bit worn out",
            "I need real alone time to recover",
        )
        CapacityKind.Time -> listOf(
            "Almost none · ${spareHourValues[0]} h",
            "A few hours · ${spareHourValues[1]} h",
            "A decent amount · ${spareHourValues[2]} h",
            "Plenty · ${spareHourValues[3]} h",
        )
    }
    Surface(color = Paper, shape = RoundedCornerShape(12.dp), border = BorderStroke(1.dp, OutlineSoft), modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(kind.label.uppercase(), color = kind.color, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
            Text(question, fontWeight = FontWeight.SemiBold, lineHeight = 21.sp)
            options.forEachIndexed { index, label ->
                ChoicePill(label, selected == index, { onSelect(index) }, Modifier.fillMaxWidth())
            }
        }
    }
}

@Composable
fun SetupChoiceScreen(
    onBack: () -> Unit,
    onImport: () -> Unit,
    onManual: () -> Unit,
    onSkip: () -> Unit,
) {
    Scaffold(containerColor = Canvas) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState())) {
            PageHeader(
                "Specific commitments",
                "How do you want to add the specific things you're committed to?",
                "Your recurring routine is already saved. Add deadlines, shifts, events, and one-offs here.",
                onBack,
            )
            Column(Modifier.padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                ChoiceRow("01", "Import my timetable", "Paste a subject list or use a timetable file.", onImport, accent = true)
                ChoiceRow("02", "Add them one at a time", "Best for a deadline, shift, event, or competition.", onManual)
                Spacer(Modifier.height(10.dp))
                TextButton(onClick = onSkip, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) {
                    Text("Skip for now — show my baseline", color = Forest, fontWeight = FontWeight.Bold)
                }
                RuleSection {
                    Text("Nothing is added without your review. You can edit every answer later.", color = TextMuted)
                }
            }
        }
    }
}

private enum class ImportState { Idle, Loading, Done, Error }

@Composable
fun ImportTimetableScreen(
    originalClassHours: Double,
    onClassHoursChanged: (Double) -> Unit,
    onBack: () -> Unit,
    onContinue: () -> Unit,
) {
    var state by remember { mutableStateOf(ImportState.Idle) }
    var filename by remember { mutableStateOf("") }
    var reconciliation by remember { mutableStateOf<TimetableReconciliation?>(null) }

    LaunchedEffect(state) {
        if (state == ImportState.Loading) {
            delay(850)
            val update = TimetableReconciliation(originalHours = originalClassHours, importedHours = 18.0)
            reconciliation = update
            onClassHoursChanged(update.importedHours)
            state = ImportState.Done
        }
    }
    Scaffold(containerColor = Canvas) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState())) {
            PageHeader("Import timetable", "Bring in the fixed parts first", "Paste a subject list or upload a timetable image or .ics file.", onBack)
            Column(Modifier.padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(178.dp)
                        .background(Paper, RoundedCornerShape(10.dp))
                        .semantics {
                            liveRegion = LiveRegionMode.Polite
                            contentDescription = when (state) {
                                ImportState.Idle -> "Timetable importer ready. Supported formats: PNG, JPG, or ICS."
                                ImportState.Loading -> "Reading timetable."
                                ImportState.Done -> "Import complete. Six weekly classes found."
                                ImportState.Error -> "Import failed. Try a clearer screenshot or the demo timetable."
                            }
                        },
                    contentAlignment = Alignment.Center,
                ) {
                    when (state) {
                        ImportState.Loading -> Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            CircularProgressIndicator(color = Forest, strokeWidth = 3.dp)
                            Spacer(Modifier.height(12.dp))
                            Text("Reading your timetable", fontWeight = FontWeight.Bold)
                        }
                        ImportState.Done -> Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("6", color = Forest, fontSize = 42.sp, fontWeight = FontWeight.Bold)
                            Text("weekly classes found", color = TextMuted)
                        }
                        ImportState.Error -> Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(18.dp)) {
                            Text("We could not read that file", color = Coral, fontWeight = FontWeight.Bold)
                            Text("Try a clearer screenshot or use the demo timetable.", color = TextMuted, textAlign = TextAlign.Center)
                        }
                        ImportState.Idle -> Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("TIMETABLE", color = Forest, fontWeight = FontWeight.Bold, letterSpacing = 1.5.sp)
                            Text("PNG, JPG, or ICS", color = TextMuted, fontSize = 12.sp)
                        }
                    }
                }
                OutlinedTextField(
                    value = filename,
                    onValueChange = { filename = it },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("File name for prototype") },
                    placeholder = { Text("semester-timetable.png") },
                    shape = RoundedCornerShape(10.dp),
                    singleLine = true,
                )
                if (state == ImportState.Done) {
                    RuleSection {
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("FOUND", color = TextMuted, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            Text("Data Structures · 3 sessions", fontWeight = FontWeight.SemiBold)
                            Text("Artificial Intelligence · 3 sessions", fontWeight = FontWeight.SemiBold)
                        }
                    }
                    val update = reconciliation
                    if (update != null) {
                        Surface(color = Mint, shape = RoundedCornerShape(10.dp)) {
                            Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Text(
                                    if (update.applied) {
                                        "We updated Classes from ${formatHours(update.originalHours)} to ${formatHours(update.importedHours)} from your timetable."
                                    } else {
                                        "Update undone. Classes is back to ${formatHours(update.originalHours)}."
                                    },
                                    fontWeight = FontWeight.SemiBold,
                                )
                                TextButton(
                                    onClick = {
                                        val next = update.copy(applied = !update.applied)
                                        reconciliation = next
                                        onClassHoursChanged(next.resolvedHours)
                                    },
                                    modifier = Modifier.heightIn(min = 48.dp),
                                ) {
                                    Text(if (update.applied) "Undo update" else "Use timetable hours", color = Forest, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                    PrimaryButton("Continue", onContinue)
                } else {
                    PrimaryButton(
                        "Read timetable",
                        onClick = { state = if (filename.isBlank()) ImportState.Error else ImportState.Loading },
                        enabled = state != ImportState.Loading,
                    )
                    TextButton(
                        onClick = {
                            filename = "semester-timetable.png"
                            state = ImportState.Loading
                        },
                        modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp),
                    ) {
                        Text("Use demo timetable", color = Forest, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
fun AddCommitmentOnboardingScreen(onBack: () -> Unit, onContinue: () -> Unit) {
    CommitmentForm(
        eyebrow = "Add manually",
        title = "Add one commitment",
        body = "Add a named deadline, shift, event, or competition. Your recurring routine is already counted.",
        initialName = "Robotics Club practice",
        onBack = onBack,
        buttonText = "Add commitment",
        onSubmit = onContinue,
    )
}

@Composable
fun CommitmentForm(
    eyebrow: String,
    title: String,
    body: String,
    initialName: String,
    onBack: (() -> Unit)?,
    buttonText: String,
    onSubmit: () -> Unit,
) {
    var name by remember { mutableStateOf(initialName) }
    var category by remember { mutableStateOf("Club") }
    var flexibility by remember { mutableStateOf("Somewhat flexible") }
    var duration by remember { mutableStateOf("Every week") }
    var time by remember { mutableFloatStateOf(3f) }
    var mental by remember { mutableFloatStateOf(4f) }
    var physical by remember { mutableFloatStateOf(2f) }
    var social by remember { mutableFloatStateOf(3f) }

    Scaffold(containerColor = Canvas) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState())) {
            PageHeader(eyebrow, title, body, onBack)
            Column(Modifier.padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
                LabeledField("COMMITMENT", name, { name = it }, "e.g. Debate practice")
                FormChoice("CATEGORY", listOf("Class", "Club", "Job", "Sport", "Social"), category) { category = it }
                FormChoice("HOW LOCKED IN IS IT?", listOf("Fixed", "Somewhat flexible", "Flexible"), flexibility) { flexibility = it }
                FormChoice("WHEN DOES IT HAPPEN?", listOf("Just this week", "Every week", "Every week until a date"), duration) { duration = it }
                SectionLabel("How much will it draw on?")
                LoadSlider(CapacityKind.Time, time) { time = it }
                LoadSlider(CapacityKind.Mental, mental) { mental = it }
                LoadSlider(CapacityKind.Physical, physical) { physical = it }
                LoadSlider(CapacityKind.Social, social) { social = it }
                PrimaryButton(buttonText, onSubmit, enabled = name.isNotBlank())
                Spacer(Modifier.height(24.dp))
            }
        }
    }
}

@Composable
fun AnythingElseScreen(onBack: () -> Unit, onContinue: () -> Unit) {
    var text by remember { mutableStateOf("") }
    var reviewed by remember { mutableStateOf(false) }
    Scaffold(containerColor = Canvas) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState())) {
            PageHeader(
                "Optional note",
                "Anything else we should know about your week?",
                "Write naturally. This can add suggestions or flag a conflict, but it never changes your baseline answers.",
                onBack,
            )
            Column(Modifier.padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                OutlinedTextField(
                    value = text,
                    onValueChange = { text = it; reviewed = false },
                    modifier = Modifier.fillMaxWidth().height(190.dp),
                    placeholder = { Text("e.g. I also help at home most Sunday mornings…") },
                    shape = RoundedCornerShape(10.dp),
                )
                if (reviewed) {
                    Surface(color = Mint, shape = RoundedCornerShape(10.dp)) {
                        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                            Text("ONE ADDITION TO REVIEW", color = Forest, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            Text("Sunday family duty · 2 hours suggested", fontWeight = FontWeight.SemiBold)
                            Text("Your routine hours and personal limits were left unchanged.", color = TextMuted, fontSize = 12.sp)
                        }
                    }
                    PrimaryButton("Continue to today", onContinue)
                } else {
                    PrimaryButton("Review additions", { reviewed = true }, enabled = text.isNotBlank())
                }
                TextButton(onClick = onContinue, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) {
                    Text("Skip — go to today", color = Forest, fontWeight = FontWeight.Bold)
                }
                Spacer(Modifier.height(24.dp))
            }
        }
    }
}

@Composable
private fun LabeledField(label: String, value: String, onValue: (String) -> Unit, placeholder: String) {
    Column(verticalArrangement = Arrangement.spacedBy(7.dp)) {
        Text(label, color = TextMuted, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
        OutlinedTextField(value, onValue, Modifier.fillMaxWidth(), placeholder = { Text(placeholder) }, shape = RoundedCornerShape(10.dp), singleLine = true)
    }
}

@Composable
private fun FormChoice(label: String, choices: List<String>, selected: String, onSelect: (String) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(label, color = TextMuted, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
        choices.chunked(2).forEach { rowChoices ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                rowChoices.forEach { choice ->
                    ChoicePill(choice, selected == choice, { onSelect(choice) }, Modifier.weight(1f))
                }
                if (rowChoices.size == 1) Spacer(Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun LoadSlider(kind: CapacityKind, value: Float, onValue: (Float) -> Unit) {
    Column {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(kind.label, fontWeight = FontWeight.SemiBold)
            Text("${value.toInt()} / 5", color = kind.color, fontWeight = FontWeight.Bold)
        }
        Slider(value, onValue, valueRange = 1f..5f, steps = 3)
    }
}

private fun durationLabel(hours: Double): String =
    routineDurationOptions.firstOrNull { it.second == hours }?.first ?: "1 hr"

private fun frequencyLabel(times: Int): String =
    routineFrequencyOptions.firstOrNull { it.second == times }?.first ?: "Once"

private fun formatHours(hours: Double): String =
    if (hours % 1.0 == 0.0) "${hours.toInt()} hrs" else "${"%.1f".format(hours)} hrs"

private fun feelQuestion(kind: CapacityKind, entries: Map<String, RoutineEntry>): String {
    val relevant = entries.entries.mapNotNull { (id, entry) ->
        val item = routineCatalog.firstOrNull { it.id == id } ?: return@mapNotNull null
        val include = when (kind) {
            CapacityKind.Time, CapacityKind.Mental -> item.weights.forKind(kind) > 0.0
            CapacityKind.Physical, CapacityKind.Social -> item.weights.forKind(kind) >= 0.4
        }
        if (include) "${item.label} (${formatHours(entry.weeklyHours)})" else null
    }
    val list = relevant.joinToString(separator = ", ", limit = 3, truncated = "…")
    return when (kind) {
        CapacityKind.Mental -> "You have $list in a normal week. After a week like that, how does your head feel?"
        CapacityKind.Physical -> "You have $list. After a week like that, how does your body feel?"
        CapacityKind.Social -> "You have $list — time around other people. After a week like that, how do you feel?"
        CapacityKind.Time -> "Your week already has about ${formatHours(committedHoursTotal(entries))} committed. On top of that and sleep, how much time is genuinely yours?"
    }
}
