package com.codenection.breathe.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.codenection.breathe.ui.theme.Amber
import com.codenection.breathe.ui.theme.Canvas as CanvasColor
import com.codenection.breathe.ui.theme.Coral
import com.codenection.breathe.ui.theme.DeepForest
import com.codenection.breathe.ui.theme.Forest
import com.codenection.breathe.ui.theme.Ink
import com.codenection.breathe.ui.theme.Mint
import com.codenection.breathe.ui.theme.OutlineSoft
import com.codenection.breathe.ui.theme.Paper
import com.codenection.breathe.ui.theme.SoftCoral
import com.codenection.breathe.ui.theme.TextMuted
import com.codenection.breathe.ui.theme.Violet

@Composable
fun CheckInScreen(onTab: (MainTab) -> Unit, onSaved: () -> Unit) {
    var stress by remember { mutableIntStateOf(2) }
    var note by remember { mutableStateOf("") }
    val causes = listOf("Deadlines", "Sleep", "Money", "Conflict", "Too many plans")
    var selectedCauses by remember { mutableStateOf(setOf("Deadlines", "Too many plans")) }

    Scaffold(containerColor = CanvasColor, bottomBar = { AppBottomBar(MainTab.CheckIn, onTab) }) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState())) {
            PageHeader("Check-in", "How are you holding up?", "A quick check helps the plan fit the person.")
            Column(Modifier.padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
                SectionLabel("Stress right now")
                Surface(color = Paper, shape = RoundedCornerShape(16.dp), border = BorderStroke(1.dp, OutlineSoft)) {
                    Row(Modifier.fillMaxWidth().padding(horizontal = 10.dp, vertical = 18.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                        listOf("Low", "Steady", "Heavy", "High", "Too much").forEachIndexed { index, label ->
                            StressChoice(label, index, stress == index) { stress = index }
                        }
                    }
                }
                SectionLabel("What is feeding it?")
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    causes.chunked(3).forEach { row ->
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            row.forEach { cause ->
                                ChoicePill(
                                    text = cause,
                                    selected = cause in selectedCauses,
                                    onClick = {
                                        selectedCauses = if (cause in selectedCauses) selectedCauses - cause else selectedCauses + cause
                                    },
                                    modifier = Modifier.weight(1f),
                                )
                            }
                            repeat(3 - row.size) { Spacer(Modifier.weight(1f)) }
                        }
                    }
                }
                SectionLabel("Optional note")
                OutlinedTextField(
                    value = note,
                    onValueChange = { note = it },
                    modifier = Modifier.fillMaxWidth().height(104.dp),
                    placeholder = { Text("What happened today?", color = TextMuted) },
                    shape = RoundedCornerShape(12.dp),
                )
                Surface(color = Mint, shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(17.dp)) {
                        Text("Based on this check-in", fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                        Spacer(Modifier.height(4.dp))
                        Text("We will lower your suggested weekly limit.", color = TextMuted)
                    }
                }
                PrimaryButton("Save check-in", onSaved)
                Spacer(Modifier.height(8.dp))
            }
        }
    }
}

@Composable
private fun StressChoice(label: String, index: Int, selected: Boolean, onClick: () -> Unit) {
    val color = when (index) {
        0 -> Forest
        1 -> TextMuted
        2 -> Amber
        3 -> Coral
        else -> Color(0xFFB54132)
    }
    Column(
        modifier = Modifier.size(width = 60.dp, height = 72.dp).clickable(role = Role.RadioButton, onClick = onClick)
            .semantics { contentDescription = "$label stress${if (selected) ", selected" else ""}" },
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.SpaceBetween,
    ) {
        Box(
            Modifier.size(if (selected) 42.dp else 36.dp).background(color.copy(alpha = .14f), CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Canvas(Modifier.size(25.dp)) {
                val sw = 1.8.dp.toPx()
                drawCircle(color, radius = size.minDimension * .42f, style = Stroke(sw))
                drawCircle(color, radius = 1.2.dp.toPx(), center = Offset(size.width * .38f, size.height * .42f))
                drawCircle(color, radius = 1.2.dp.toPx(), center = Offset(size.width * .62f, size.height * .42f))
                drawArc(color, if (index < 2) 20f else 205f, 140f, false, Offset(size.width * .31f, size.height * .52f), size.copy(width = size.width * .38f, height = size.height * .22f), style = Stroke(sw, cap = StrokeCap.Round))
            }
        }
        Text(label, color = if (selected) Ink else TextMuted, fontSize = 9.sp, fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal, textAlign = TextAlign.Center)
    }
}

@Composable
fun RecoveryScreen(onTab: (MainTab) -> Unit, onBlockTime: () -> Unit) {
    var chosen by remember { mutableStateOf<String?>(null) }
    Scaffold(containerColor = CanvasColor, bottomBar = { AppBottomBar(MainTab.Recover, onTab) }) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState())) {
            PageHeader("Recovery", "Less input. More recovery.", "Pick one thing your body can feel today.")
            Column(Modifier.padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Surface(color = DeepForest, shape = RoundedCornerShape(20.dp), modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(20.dp)) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Best fit for today", color = Mint, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                            MarginMark(Modifier.size(30.dp), light = true)
                        }
                        Text("Walk somewhere green", color = Color.White, style = MaterialTheme.typography.titleLarge)
                        Text("25 minutes after your 2 pm class", color = Mint, fontSize = 13.sp)
                        Spacer(Modifier.height(16.dp))
                        Surface(
                            modifier = Modifier.heightIn(min = 48.dp).clickable(role = Role.Button, onClick = onBlockTime),
                            color = Paper,
                            shape = RoundedCornerShape(10.dp),
                        ) { Box(Modifier.padding(horizontal = 24.dp), contentAlignment = Alignment.Center) { Text("Block the time", fontWeight = FontWeight.SemiBold) } }
                    }
                }
                SectionLabel("Other options")
                RecoveryOption("Protect tonight", "Stop study at 10:30 pm", Amber, chosen == "tonight") { chosen = "tonight" }
                RecoveryOption("Ask for company", "Invite one friend for dinner", Violet, chosen == "company") { chosen = "company" }
                RecoveryOption("Clear one obligation", "Move one optional task", Coral, chosen == "clear") { chosen = "clear" }
                Surface(color = Color(0xFFF4E8D6), shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(17.dp)) {
                        Text("If nothing feels doable", fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                        Text("Choose 5 quiet minutes. That still counts.", color = TextMuted)
                    }
                }
                Spacer(Modifier.height(8.dp))
            }
        }
    }
}

@Composable
private fun RecoveryOption(title: String, body: String, color: Color, selected: Boolean, onClick: () -> Unit) {
    Surface(
        modifier = Modifier.fillMaxWidth().heightIn(min = 82.dp).clickable(role = Role.Button, onClick = onClick),
        color = Paper,
        shape = RoundedCornerShape(12.dp),
        border = BorderStroke(1.dp, if (selected) Forest else OutlineSoft),
    ) {
        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(44.dp).background(color.copy(alpha = .15f), RoundedCornerShape(10.dp)), contentAlignment = Alignment.Center) {
                Box(Modifier.size(13.dp).background(color, CircleShape))
            }
            Column(Modifier.weight(1f).padding(horizontal = 14.dp)) {
                Text(title, fontWeight = FontWeight.Bold)
                Text(body, color = TextMuted, fontSize = 13.sp)
            }
            Text(if (selected) "Added" else "Add", color = Forest, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
fun RebalancedWeekScreen(onReturn: () -> Unit) {
    Scaffold(containerColor = CanvasColor) { padding ->
        Column(
            Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState()).padding(horizontal = 20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Spacer(Modifier.height(66.dp))
            Box(Modifier.size(104.dp).background(Mint, CircleShape), contentAlignment = Alignment.Center) {
                Text("✓", color = Forest, fontSize = 54.sp, fontWeight = FontWeight.Medium)
            }
            Spacer(Modifier.height(18.dp))
            Text("Your week can breathe.", style = MaterialTheme.typography.headlineMedium, textAlign = TextAlign.Center)
            Text("The plan now matches the space you have.", color = TextMuted, textAlign = TextAlign.Center)
            Spacer(Modifier.height(30.dp))
            Surface(color = DeepForest, shape = RoundedCornerShape(18.dp), modifier = Modifier.fillMaxWidth()) {
                Column(Modifier.padding(24.dp)) {
                    Text("Capacity", color = Mint, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                    Text("90%  →  76%", color = Color.White, fontSize = 38.sp, fontWeight = FontWeight.Bold)
                }
            }
            Spacer(Modifier.height(28.dp))
            ChangeRow("Laundry", "Moved to Sunday morning", "Moved")
            ChangeRow("Study group", "Shortened to 45 minutes", "Shorter")
            ChangeRow("Recovery block", "Friday · 2:30 pm · 25 minutes", "Added")
            Spacer(Modifier.height(30.dp))
            PrimaryButton("Return to today", onReturn)
            Spacer(Modifier.height(16.dp))
            Text("Prototype content for flow testing.", color = TextMuted, fontSize = 11.sp)
        }
    }
}

@Composable
private fun ChangeRow(title: String, detail: String, state: String) {
    HorizontalDivider(color = OutlineSoft)
    Row(Modifier.fillMaxWidth().padding(vertical = 17.dp), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(title, fontWeight = FontWeight.Bold)
            Text(detail, color = TextMuted, fontSize = 13.sp)
        }
        Text(state, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
    }
}
