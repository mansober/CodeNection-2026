package com.codenection.breathe.ui

import androidx.compose.foundation.background
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Slider
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
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.codenection.breathe.CapacityKind
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
                Text("MARGIN", color = Forest, fontSize = 13.sp, fontWeight = FontWeight.Black, letterSpacing = 2.sp)
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
                        Text(label.take(1), color = if (index < 2) Color.White else Ink, fontWeight = FontWeight.Black)
                    }
                }
            }
            Spacer(Modifier.weight(1f))
            PrimaryButton("Build my week", onStart)
            Spacer(Modifier.height(12.dp))
            Text("Takes about two minutes. You can change everything later.", color = TextMuted, fontSize = 12.sp, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
        }
    }
}

@Composable
fun SetupChoiceScreen(onBack: () -> Unit, onImport: () -> Unit, onManual: () -> Unit, onDescribe: () -> Unit) {
    Scaffold(containerColor = Canvas) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState())) {
            PageHeader("Set up · 1 of 2", "How should we add your week?", "Choose the quickest starting point. You can mix methods later.", onBack)
            Column(Modifier.padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                ChoiceRow("01", "Import my timetable", "Start with a screenshot or calendar file.", onImport, accent = true)
                ChoiceRow("02", "Add one by one", "Best when your week has a few commitments.", onManual)
                ChoiceRow("03", "Describe my week", "Write naturally and review what Margin finds.", onDescribe)
                Spacer(Modifier.height(16.dp))
                RuleSection {
                    Text("Nothing is added without your review.", color = TextMuted, style = MaterialTheme.typography.bodyMedium)
                }
            }
        }
    }
}

private enum class ImportState { Idle, Loading, Done, Error }

@Composable
fun ImportTimetableScreen(onBack: () -> Unit, onContinue: () -> Unit) {
    var state by remember { mutableStateOf(ImportState.Idle) }
    var filename by remember { mutableStateOf("") }
    LaunchedEffect(state) {
        if (state == ImportState.Loading) {
            delay(850)
            state = ImportState.Done
        }
    }
    Scaffold(containerColor = Canvas) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState())) {
            PageHeader("Import timetable", "Bring in the fixed parts first", "Upload a timetable screenshot or an .ics calendar file.", onBack)
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
                            Text("6", color = Forest, fontSize = 42.sp, fontWeight = FontWeight.Black)
                            Text("weekly classes found", color = TextMuted)
                        }
                        ImportState.Error -> Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(18.dp)) {
                            Text("We could not read that file", color = Coral, fontWeight = FontWeight.Bold)
                            Text("Try a clearer screenshot or use the demo timetable.", color = TextMuted, textAlign = TextAlign.Center)
                        }
                        ImportState.Idle -> Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("TIMETABLE", color = Forest, fontWeight = FontWeight.Black, letterSpacing = 1.5.sp)
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
                    PrimaryButton("Review my limits", onContinue)
                } else {
                    PrimaryButton("Read timetable", onClick = {
                        state = if (filename.isBlank()) ImportState.Error else ImportState.Loading
                    }, enabled = state != ImportState.Loading)
                    TextButton(
                        onClick = {
                            filename = "semester-timetable.png"
                            state = ImportState.Loading
                        },
                        modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp),
                    ) { Text("Use demo timetable", color = Forest, fontWeight = FontWeight.Bold) }
                }
            }
        }
    }
}

@Composable
fun AddCommitmentOnboardingScreen(onBack: () -> Unit, onContinue: () -> Unit) {
    CommitmentForm(
        eyebrow = "Add manually",
        title = "Start with one commitment",
        body = "A rough estimate is enough. Margin turns it into four kinds of load.",
        initialName = "Robotics Club practice",
        onBack = onBack,
        buttonText = "Add and review limits",
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
    var flexibility by remember { mutableStateOf("Somewhat") }
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
                FormChoice("FLEXIBILITY", listOf("Fixed", "Somewhat", "Flexible"), flexibility) { flexibility = it }
                FormChoice("DURATION", listOf("This week", "Every week", "Until a date"), duration) { duration = it }
                SectionLabel("How much does it take?")
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
fun DescribeWeekScreen(onBack: () -> Unit, onContinue: () -> Unit) {
    var text by remember { mutableStateOf("I have three lectures, robotics practice Tuesday night, a midterm Thursday, and a club social on Saturday. The midterm feels intense.") }
    var parsed by remember { mutableStateOf(false) }
    Scaffold(containerColor = Canvas) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState())) {
            PageHeader("Describe your week", "Write it how you would say it", "Mention what happens, roughly when, and what feels difficult.", onBack)
            Column(Modifier.padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                OutlinedTextField(
                    value = text,
                    onValueChange = { text = it; parsed = false },
                    modifier = Modifier.fillMaxWidth().height(190.dp),
                    placeholder = { Text("I have two shifts, a quiz...") },
                    shape = RoundedCornerShape(10.dp),
                )
                if (!parsed) {
                    PrimaryButton("Find my commitments", { parsed = true }, enabled = text.isNotBlank())
                } else {
                    Text("MARGIN FOUND 4 GROUPS", color = Forest, fontSize = 11.sp, fontWeight = FontWeight.Black, letterSpacing = 1.sp)
                    RuleSection {
                        Column(verticalArrangement = Arrangement.spacedBy(11.dp)) {
                            ParsedLine("3 lectures", "recurring · fixed")
                            ParsedLine("Robotics practice", "Tuesday · moderate")
                            ParsedLine("Data Structures midterm", "Thursday · high mental load")
                            ParsedLine("Club social", "Saturday · flexible")
                        }
                    }
                    AlertNote("Difficulty cue noticed", "“Feels intense” increased the midterm's mental estimate. You can adjust it next.")
                    PrimaryButton("Review my limits", onContinue)
                    TextButton(onClick = { parsed = false }, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) { Text("Edit description", color = Forest) }
                }
            }
        }
    }
}

@Composable
private fun ParsedLine(title: String, detail: String) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(title, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
        Text(detail, color = TextMuted, fontSize = 12.sp)
    }
}

@Composable
fun CheckLimitsScreen(onBack: () -> Unit, onContinue: () -> Unit) {
    var time by remember { mutableFloatStateOf(42f) }
    var mental by remember { mutableFloatStateOf(22f) }
    var physical by remember { mutableFloatStateOf(18f) }
    var social by remember { mutableFloatStateOf(16f) }
    Scaffold(containerColor = Canvas) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState())) {
            PageHeader("Set up · 2 of 2", "Check your limits", "Use a normal week, not your most productive week.", onBack)
            Column(Modifier.padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
                AlertNote("These are boundaries, not grades", "They help Margin spot trade-offs. You can change them any time.")
                LimitSlider(CapacityKind.Time, time, "${time.toInt()} h") { time = it }
                LimitSlider(CapacityKind.Mental, mental, "${mental.toInt()} pts") { mental = it }
                LimitSlider(CapacityKind.Physical, physical, "${physical.toInt()} pts") { physical = it }
                LimitSlider(CapacityKind.Social, social, "${social.toInt()} pts") { social = it }
                PrimaryButton("See my week", onContinue)
                TextButton(onClick = onContinue, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) { Text("Use student defaults", color = Forest) }
                Spacer(Modifier.height(20.dp))
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
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            choices.forEach { ChoicePill(it, selected == it, { onSelect(it) }, Modifier.weight(1f)) }
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

@Composable
private fun LimitSlider(kind: CapacityKind, value: Float, display: String, onValue: (Float) -> Unit) {
    Column(Modifier.background(Paper, RoundedCornerShape(4.dp)).padding(14.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(kind.label, fontWeight = FontWeight.Bold)
            Text(display, color = Forest, fontWeight = FontWeight.Bold)
        }
        Slider(value, onValue, valueRange = if (kind == CapacityKind.Time) 20f..70f else 8f..35f)
    }
}
