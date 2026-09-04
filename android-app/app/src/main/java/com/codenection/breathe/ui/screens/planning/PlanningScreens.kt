package com.codenection.breathe.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Slider
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.codenection.breathe.CapacityKind
import com.codenection.breathe.Commitment
import com.codenection.breathe.sampleCapacities
import com.codenection.breathe.ui.theme.Canvas
import com.codenection.breathe.ui.theme.Coral
import com.codenection.breathe.ui.theme.Forest
import com.codenection.breathe.ui.theme.Ink
import com.codenection.breathe.ui.theme.Mint
import com.codenection.breathe.ui.theme.OutlineSoft
import com.codenection.breathe.ui.theme.OutlineStrong
import com.codenection.breathe.ui.theme.Paper
import com.codenection.breathe.ui.theme.SoftCoral
import com.codenection.breathe.ui.theme.TextMuted

@Composable
fun HomeScreen(
    threshold: String,
    onThresholdChange: (String) -> Unit,
    onTab: (MainTab) -> Unit,
    onRebalance: () -> Unit,
    onSeeAll: () -> Unit,
    onTest: () -> Unit,
    onAdd: () -> Unit,
) {
    Scaffold(containerColor = Canvas, bottomBar = { AppBottomBar(MainTab.Today, onTab) }) { padding ->
        Column(
            Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState()).padding(horizontal = 20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Spacer(Modifier.height(10.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column {
                    Text("Good morning", color = TextMuted, style = MaterialTheme.typography.bodyMedium)
                    Text("How full is this week?", style = MaterialTheme.typography.headlineMedium)
                    Text("Sample week · Sep 7–13", color = TextMuted, fontSize = 11.sp, fontWeight = FontWeight.Medium)
                }
                TextButton(onClick = onAdd, modifier = Modifier.heightIn(min = 48.dp)) {
                    Text("Add", color = Forest, fontWeight = FontWeight.Bold)
                }
            }
            OverallLoadPanel(onRebalance)
            Column(verticalArrangement = Arrangement.spacedBy(15.dp)) {
                SectionLabel("Where the pressure sits")
                sampleCapacities.forEach { value ->
                    CapacityBar(value, compact = true)
                    if (value.kind == CapacityKind.Time) Text("Two deadlines land on Friday", color = TextMuted, fontSize = 11.sp)
                    if (value.kind == CapacityKind.Mental) Text("Focus has been low since Tuesday", color = TextMuted, fontSize = 11.sp)
                }
            }
            Surface(color = Mint, shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth()) {
                Row(Modifier.padding(15.dp), verticalAlignment = Alignment.Top) {
                    MarginMark(Modifier.size(27.dp))
                    Column(Modifier.padding(start = 12.dp)) {
                        Text("A small reset would help", fontWeight = FontWeight.Bold)
                        Text("Block 20 minutes outside after class.", color = TextMuted, fontSize = 13.sp)
                        TextButton(onClick = { onTab(MainTab.Recover) }, modifier = Modifier.heightIn(min = 48.dp)) {
                            Text("Add recovery block", color = Ink, fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
            }
            Button(onClick = onRebalance, modifier = Modifier.fillMaxWidth().height(54.dp), shape = RoundedCornerShape(10.dp)) {
                Text("Rebalance this week", fontWeight = FontWeight.Bold)
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                TextButton(onClick = onSeeAll, modifier = Modifier.weight(1f).heightIn(min = 48.dp)) { Text("View plan", color = Forest, fontWeight = FontWeight.SemiBold) }
                TextButton(onClick = onTest, modifier = Modifier.weight(1f).heightIn(min = 48.dp)) { Text("Test a yes", color = Forest, fontWeight = FontWeight.SemiBold) }
            }
            TextButton(
                onClick = { onThresholdChange(if (threshold == "90%") "100%" else "90%") },
                modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp),
            ) { Text("Nudge at $threshold", color = TextMuted, fontSize = 12.sp) }
            Spacer(Modifier.height(18.dp))
        }
    }
}

@Composable
private fun OverallLoadPanel(onRebalance: () -> Unit) {
    Surface(
        color = com.codenection.breathe.ui.theme.DeepForest,
        shape = RoundedCornerShape(18.dp),
        modifier = Modifier.fillMaxWidth().semantics {
            contentDescription = "Demo overall load, 81 out of 100. One capacity is over its limit."
        },
    ) {
        Column(Modifier.padding(20.dp)) {
            Text("TOTAL CAPACITY", color = Canvas.copy(alpha = 0.78f), fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Bottom) {
                Text("90%", color = Color.White, fontSize = 52.sp, fontWeight = FontWeight.Bold)
                Spacer(Modifier.weight(1f))
                Box(Modifier.size(64.dp).background(Forest.copy(alpha = .45f), CircleShape), contentAlignment = Alignment.Center) {
                    Text("✓", color = Color.White, fontSize = 30.sp, fontWeight = FontWeight.Medium)
                }
            }
            Text("You are carrying more than fits.", color = Canvas.copy(alpha = .84f), fontSize = 13.sp)
        }
    }
}

@Composable
private fun ForecastLine(label: String, title: String, detail: String) {
    Row(Modifier.fillMaxWidth()) {
        Text(label, color = Forest, fontSize = 10.sp, fontWeight = FontWeight.Black, modifier = Modifier.padding(top = 3.dp))
        Column(Modifier.padding(start = 18.dp)) {
            Text(title, fontWeight = FontWeight.Bold)
            Text(detail, color = TextMuted, fontSize = 13.sp)
        }
    }
}

@Composable
fun AddTabScreen(
    initialCommitment: Commitment? = null,
    onTab: (MainTab) -> Unit,
    onSaved: (Commitment) -> Unit,
    onTest: () -> Unit,
) {
    val formKey = initialCommitment?.name ?: "new"
    var name by remember(formKey) { mutableStateOf(initialCommitment?.name.orEmpty()) }
    var category by remember(formKey) { mutableStateOf(initialCommitment?.category ?: "Class") }
    var flexibility by remember(formKey) { mutableStateOf(initialCommitment?.flexibility ?: "Fixed") }
    var duration by remember(formKey) { mutableStateOf(if (initialCommitment == null) "This week" else "Every week") }
    var time by remember(formKey) { mutableFloatStateOf(initialCommitment?.time?.div(4f)?.coerceIn(1f, 5f) ?: 3f) }
    var mental by remember(formKey) { mutableFloatStateOf(initialCommitment?.mental?.div(5f)?.coerceIn(1f, 5f) ?: 3f) }
    var physical by remember(formKey) { mutableFloatStateOf(initialCommitment?.physical?.div(4f)?.coerceIn(1f, 5f) ?: 2f) }
    var social by remember(formKey) { mutableFloatStateOf(initialCommitment?.social?.div(5f)?.coerceIn(1f, 5f) ?: 2f) }

    Scaffold(containerColor = Canvas) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState())) {
            PageHeader(if (initialCommitment == null) "Add commitment" else "Edit commitment", if (initialCommitment == null) "What needs your attention?" else "Adjust what this asks of you", "Rate the cost, not how important it sounds.", onBack = { onTab(MainTab.Plan) })
            Column(Modifier.padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(17.dp)) {
                DashboardField("COMMITMENT", name, "e.g. Lab report") { name = it }
                InlineChoice("CATEGORY", listOf("Class", "Club", "Job", "Sport", "Social"), category) { category = it }
                InlineChoice("FLEXIBILITY", listOf("Fixed", "Somewhat", "Flexible"), flexibility) { flexibility = it }
                InlineChoice("DURATION", listOf("This week", "Every week", "Until date"), duration) { duration = it }
                SectionLabel("What will it draw on?")
                CompactSlider("Time", time) { time = it }
                CompactSlider("Mental", mental) { mental = it }
                CompactSlider("Physical", physical) { physical = it }
                CompactSlider("Social", social) { social = it }
                Surface(color = Color(0xFFF4E8D6), shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth()) {
                    Row(Modifier.padding(17.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                        Column { Text("Load preview", fontSize = 11.sp, fontWeight = FontWeight.SemiBold); Text("76%  →  82%", fontSize = 20.sp, fontWeight = FontWeight.Bold) }
                        Text("Within your limit", color = TextMuted, fontSize = 12.sp, modifier = Modifier.align(Alignment.Bottom))
                    }
                }
                PrimaryButton(if (initialCommitment == null) "Add to this week" else "Save changes", onClick = {
                    onSaved(Commitment(name.trim(), category, initialCommitment?.schedule ?: "New commitment", flexibility, (time * 4).toInt(), (mental * 5).toInt(), (physical * 4).toInt(), (social * 5).toInt()))
                }, enabled = name.isNotBlank())
                if (initialCommitment == null) {
                    Surface(
                        modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp).clickable(role = Role.Button, onClick = onTest),
                        color = Color.Transparent,
                        border = BorderStroke(1.dp, OutlineStrong),
                        shape = RoundedCornerShape(4.dp),
                    ) {
                        Row(Modifier.padding(15.dp), verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text("Not sure yet?", fontWeight = FontWeight.Bold)
                                Text("Test the impact first. Nothing gets added.", color = TextMuted, fontSize = 13.sp)
                            }
                            Text("Test impact", color = Forest, fontWeight = FontWeight.Bold)
                        }
                    }
                }
                Spacer(Modifier.height(20.dp))
            }
        }
    }
}

@Composable
fun SeeScreen(
    commitments: List<Commitment>,
    onTab: (MainTab) -> Unit,
    onRemove: (Commitment) -> Unit,
    onAdd: () -> Unit,
    onEdit: (Commitment) -> Unit,
) {
    var expanded by remember { mutableStateOf<String?>(null) }
    Scaffold(containerColor = Canvas, bottomBar = { AppBottomBar(MainTab.Plan, onTab) }) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState())) {
            PageHeader("Plan", "What is taking up your week?", "Tap an item to inspect or change it.")
            Column(Modifier.padding(horizontal = 20.dp)) {
                if (commitments.isEmpty()) {
                    EmptyWeek(onAdd)
                } else {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("${commitments.size} COMMITMENTS", color = TextMuted, fontSize = 11.sp, fontWeight = FontWeight.Black, letterSpacing = 1.sp)
                        Text("MENTAL IS HIGHEST", color = Coral, fontSize = 11.sp, fontWeight = FontWeight.Black)
                    }
                    Spacer(Modifier.height(8.dp))
                    commitments.forEachIndexed { index, item ->
                        CommitmentRow(
                            item = item,
                            expanded = expanded == item.name,
                            onToggle = { expanded = if (expanded == item.name) null else item.name },
                            onRemove = {
                                expanded = null
                                onRemove(item)
                            },
                            onEdit = { onEdit(item) },
                        )
                        if (index != commitments.lastIndex) HorizontalDivider(color = OutlineSoft)
                    }
                    Spacer(Modifier.height(22.dp))
                    SecondaryButton("Add another commitment", onAdd)
                    Spacer(Modifier.height(22.dp))
                }
            }
        }
    }
}

@Composable
private fun CommitmentRow(item: Commitment, expanded: Boolean, onToggle: () -> Unit, onRemove: () -> Unit, onEdit: () -> Unit) {
    Column(
        Modifier.fillMaxWidth().clickable(role = Role.Button, onClick = onToggle).padding(vertical = 16.dp)
            .semantics { contentDescription = "${item.name}, ${item.category}, ${item.schedule}. ${if (expanded) "Details expanded" else "Details collapsed"}." },
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(38.dp).background(if (item.mental >= 25) SoftCoral else Mint, RoundedCornerShape(4.dp)), contentAlignment = Alignment.Center) {
                Text(item.category.take(1), color = if (item.mental >= 25) Coral else Forest, fontWeight = FontWeight.Black)
            }
            Column(Modifier.weight(1f).padding(horizontal = 12.dp)) {
                Text(item.name, fontWeight = FontWeight.Bold)
                Text("${item.category} · ${item.schedule}", color = TextMuted, fontSize = 13.sp)
            }
            Text(if (expanded) "Collapse" else "Details", color = Forest, fontSize = 12.sp, fontWeight = FontWeight.Bold)
        }
        if (expanded) {
            Spacer(Modifier.height(14.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                LoadNumber("TIME", item.time)
                LoadNumber("MENTAL", item.mental)
                LoadNumber("PHYSICAL", item.physical)
                LoadNumber("SOCIAL", item.social)
            }
            Text("Flexibility: ${item.flexibility}", color = TextMuted, fontSize = 13.sp, modifier = Modifier.padding(top = 12.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                TextButton(onClick = onEdit) { Text("Edit", color = Forest) }
                TextButton(onClick = onRemove) { Text("Remove", color = Coral) }
            }
        }
    }
}

@Composable
private fun LoadNumber(label: String, value: Int) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(label, color = TextMuted, fontSize = 10.sp, fontWeight = FontWeight.Black)
        Text(value.toString(), fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun DashboardField(label: String, value: String, placeholder: String, onValue: (String) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(7.dp)) {
        Text(label, color = TextMuted, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
        OutlinedTextField(
            value,
            onValue,
            Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(10.dp),
            singleLine = true,
            placeholder = { Text(placeholder, color = TextMuted) },
        )
    }
}

@Composable
private fun InlineChoice(label: String, choices: List<String>, selected: String, onSelect: (String) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(label, color = TextMuted, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
        Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(7.dp)) {
            choices.forEach { ChoicePill(it, it == selected, { onSelect(it) }) }
        }
    }
}

@Composable
private fun CompactSlider(label: String, value: Float, onValue: (Float) -> Unit) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Text(label, modifier = Modifier.weight(0.3f), fontWeight = FontWeight.SemiBold)
        Slider(value, onValue, Modifier.weight(0.55f), valueRange = 1f..5f, steps = 3)
        Text("${value.toInt()}/5", modifier = Modifier.weight(0.15f), color = Forest, fontWeight = FontWeight.Bold)
    }
}
