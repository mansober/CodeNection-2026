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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.codenection.breathe.sampleCapacities
import com.codenection.breathe.ui.theme.Canvas
import com.codenection.breathe.ui.theme.CoralOnDark
import com.codenection.breathe.ui.theme.Coral
import com.codenection.breathe.ui.theme.Forest
import com.codenection.breathe.ui.theme.Ink
import com.codenection.breathe.ui.theme.Mint
import com.codenection.breathe.ui.theme.OutlineSoft
import com.codenection.breathe.ui.theme.OutlineStrong
import com.codenection.breathe.ui.theme.Paper
import com.codenection.breathe.ui.theme.SoftCoral
import com.codenection.breathe.ui.theme.TextMuted

private data class RebalanceItem(val name: String, val reason: String, val suggested: String)

private val rebalanceItems = listOf(
    RebalanceItem("Data Structures midterm", "Fixed and high impact", "Do"),
    RebalanceItem("Robotics Club practice", "Can move by one day", "Delay"),
    RebalanceItem("Robotics Club poster", "Clear handoff available", "Delegate"),
    RebalanceItem("Optional club social", "Lowest priority this week", "Drop"),
    RebalanceItem("Friday evening", "Recovery has been squeezed out", "Decompress"),
)

private val fiveDs = listOf("Do", "Delay", "Delegate", "Drop", "Decompress")

@Composable
fun FiveDScreen(onTab: (MainTab) -> Unit, onTest: () -> Unit) {
    val assignments = remember { mutableStateMapOf<String, String>().apply { rebalanceItems.forEach { put(it.name, it.suggested) } } }
    var applied by remember { mutableStateOf(false) }
    Scaffold(containerColor = Canvas, bottomBar = { AppBottomBar(MainTab.FiveD, onTab) }) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState())) {
            PageHeader("5D rebalance", "Make room without guessing", "These are starting points. Change any assignment before applying.")
            Column(Modifier.padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                BeforeAfterSummary(applied)
                if (applied) {
                    Surface(color = Mint, shape = RoundedCornerShape(4.dp), modifier = Modifier.fillMaxWidth()) {
                        Row(Modifier.padding(15.dp), verticalAlignment = Alignment.CenterVertically) {
                            Text("✓", color = Forest, fontWeight = FontWeight.Black, fontSize = 20.sp)
                            Column(Modifier.padding(start = 12.dp)) {
                                Text("Changes applied", fontWeight = FontWeight.Bold)
                                Text("Saturday afternoon is open again.", color = TextMuted, fontSize = 13.sp)
                            }
                        }
                    }
                }
                SectionLabel("Your plan")
                rebalanceItems.forEachIndexed { index, item ->
                    RebalanceRow(item, assignments[item.name] ?: item.suggested) { assignments[item.name] = it; applied = false }
                    if (index != rebalanceItems.lastIndex) HorizontalDivider(color = OutlineSoft)
                }
                RuleSection {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("DECOMPRESS IDEAS", color = Forest, fontSize = 11.sp, fontWeight = FontWeight.Black)
                        Text("Friday: phone-free dinner and a 30-minute walk", fontWeight = FontWeight.SemiBold)
                        Text("Sunday: slow breakfast before opening your laptop", fontWeight = FontWeight.SemiBold)
                    }
                }
                PrimaryButton(if (applied) "Plan is applied" else "Apply these changes", { applied = true }, enabled = !applied)
                TextButton(onClick = onTest, modifier = Modifier.fillMaxWidth()) {
                    Text("Test another commitment", color = Forest, fontWeight = FontWeight.Bold)
                }
                Spacer(Modifier.height(18.dp))
            }
        }
    }
}

@Composable
private fun BeforeAfterSummary(applied: Boolean) {
    Surface(color = Ink, shape = RoundedCornerShape(18.dp), modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(19.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Column {
                    Text("BEFORE", color = Canvas.copy(alpha = 0.65f), fontSize = 10.sp, fontWeight = FontWeight.Black)
                    Text("112%", color = CoralOnDark, fontSize = 31.sp, fontWeight = FontWeight.Black)
                    Text("mental", color = Canvas.copy(alpha = 0.7f), fontSize = 12.sp)
                }
                Text("→", color = Color.White, fontSize = 25.sp, modifier = Modifier.padding(top = 18.dp))
                Column(horizontalAlignment = Alignment.End) {
                    Text(if (applied) "APPLIED" else "PROJECTED", color = Canvas.copy(alpha = 0.65f), fontSize = 10.sp, fontWeight = FontWeight.Black)
                    Text("94%", color = Color.White, fontSize = 31.sp, fontWeight = FontWeight.Black)
                    Text("mental", color = Canvas.copy(alpha = 0.7f), fontSize = 12.sp)
                }
            }
            HorizontalDivider(color = Color.White.copy(alpha = 0.2f), modifier = Modifier.padding(vertical = 12.dp))
            Text(if (applied) "Outcome: Saturday is yours again" else "Projected outcome: Saturday opens up", color = Color.White, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun RebalanceRow(item: RebalanceItem, selected: String, onSelect: (String) -> Unit) {
    Column(Modifier.fillMaxWidth().padding(vertical = 5.dp)) {
        Text(item.name, fontWeight = FontWeight.Bold)
        Text(item.reason, color = TextMuted, fontSize = 13.sp)
        Spacer(Modifier.height(10.dp))
        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(7.dp)) {
            fiveDs.forEach { ChoicePill(it, it == selected, { onSelect(it) }) }
        }
    }
}

@Composable
fun TestCommitmentScreen(onBack: () -> Unit, onTest: () -> Unit) {
    var title by remember { mutableStateOf("Weekend Hackathon") }
    var category by remember { mutableStateOf("Club") }
    var roughTime by remember { mutableStateOf("Friday evening to Sunday") }
    Scaffold(containerColor = Canvas) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState())) {
            PageHeader("Test a commitment", "What would saying yes cost?", "This stays hypothetical until you choose to add it.", onBack)
            Column(Modifier.padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
                TestField("COMMITMENT", title) { title = it }
                Text("CATEGORY", color = TextMuted, fontSize = 11.sp, fontWeight = FontWeight.Black, letterSpacing = 1.sp)
                Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                    listOf("Class", "Club", "Job", "Sport", "Social").forEach { ChoicePill(it, category == it, { category = it }) }
                }
                TestField("ROUGH DURATION", roughTime) { roughTime = it }
                RuleSection {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("MARGIN'S ESTIMATE", color = Forest, fontSize = 11.sp, fontWeight = FontWeight.Black)
                        Text("High mental effort · High time cost", fontWeight = FontWeight.Bold)
                        Text("Based on a multi-day event with team work and a deadline.", color = TextMuted, fontSize = 13.sp)
                    }
                }
                PrimaryButton("Test against my week", onTest, enabled = title.isNotBlank() && roughTime.isNotBlank())
                Text("Nothing will be added yet.", color = TextMuted, fontSize = 12.sp, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
            }
        }
    }
}

@Composable
fun SimulatorScreen(
    onBack: () -> Unit,
    onDecline: () -> Unit,
    onReschedule: () -> Unit,
    onAddAnyway: () -> Unit,
    onMakeRoom: () -> Unit,
) {
    Scaffold(containerColor = Canvas) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState())) {
            PageHeader("Testing · not added", "Weekend Hackathon", "Friday evening to Sunday", onBack)
            Column(Modifier.padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(17.dp)) {
                Surface(color = Ink, shape = RoundedCornerShape(18.dp), modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(18.dp)) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                            Text("NOW", color = Canvas.copy(alpha = 0.65f), fontSize = 10.sp, fontWeight = FontWeight.Black)
                            Spacer(Modifier.width(32.dp))
                            Text("IF YES", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Black)
                        }
                        SimulationRow("Time", 64, 88)
                        SimulationRow("Mental", 112, 138, danger = true)
                        SimulationRow("Physical", 41, 67)
                        SimulationRow("Social", 58, 72)
                    }
                }
                AlertNote("Your Friday recovery disappears", "Mental load reaches 138%, and the next unplanned break moves to Sunday night.")
                SectionLabel("Choose what happens next")
                DecisionButton("Decline", "Keep this week as it is", onDecline, primary = true)
                DecisionButton("Reschedule", "Try a different date or shorter duration", onReschedule)
                DecisionButton("Add anyway", "Add it with the overload visible", onAddAnyway, warning = true)
                TextButton(onClick = onMakeRoom, modifier = Modifier.fillMaxWidth().height(52.dp)) {
                    Text("Show me how to make room", color = Forest, fontWeight = FontWeight.Bold)
                }
                Spacer(Modifier.height(18.dp))
            }
        }
    }
}

@Composable
private fun SimulationRow(label: String, now: Int, after: Int, danger: Boolean = false) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 12.dp)
            .semantics { contentDescription = "$label changes from $now percent to $after percent" },
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, color = Color.White, modifier = Modifier.weight(1f), fontWeight = FontWeight.SemiBold)
        Text("$now%", color = Canvas.copy(alpha = 0.7f), modifier = Modifier.width(48.dp), textAlign = TextAlign.End)
        Text("→", color = Canvas.copy(alpha = 0.5f), modifier = Modifier.width(38.dp), textAlign = TextAlign.Center)
        Text("$after%", color = if (danger) CoralOnDark else Color.White, modifier = Modifier.width(52.dp), textAlign = TextAlign.End, fontWeight = FontWeight.Black)
    }
}

@Composable
private fun DecisionButton(title: String, detail: String, onClick: () -> Unit, primary: Boolean = false, warning: Boolean = false) {
    val container = when {
        primary -> Forest
        warning -> SoftCoral
        else -> Paper
    }
    val content = when {
        primary -> Color.White
        warning -> Ink
        else -> Ink
    }
    Surface(
        modifier = Modifier.fillMaxWidth().clickable(role = Role.Button, onClick = onClick),
        color = container,
        shape = RoundedCornerShape(10.dp),
        border = if (!primary) BorderStroke(1.dp, if (warning) Coral else OutlineStrong) else null,
    ) {
        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(title, color = content, fontWeight = FontWeight.Bold)
                Text(detail, color = if (primary) Color.White.copy(alpha = 0.75f) else TextMuted, fontSize = 13.sp)
            }
        }
    }
}

@Composable
private fun TestField(label: String, value: String, onValue: (String) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(7.dp)) {
        Text(label, color = TextMuted, fontSize = 11.sp, fontWeight = FontWeight.Black, letterSpacing = 1.sp)
        OutlinedTextField(value, onValue, Modifier.fillMaxWidth(), shape = RoundedCornerShape(10.dp), singleLine = true)
    }
}
