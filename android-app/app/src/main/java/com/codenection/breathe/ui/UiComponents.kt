package com.codenection.breathe.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.selection.selectable
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.codenection.breathe.CapacityValue
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
fun MarginMark(modifier: Modifier = Modifier, light: Boolean = false) {
    val color = if (light) Canvas else Forest
    Box(modifier = modifier.size(34.dp).clearAndSetSemantics { }) {
        Box(Modifier.width(4.dp).height(34.dp).background(color))
        Box(Modifier.width(25.dp).height(4.dp).background(color))
        Box(Modifier.align(Alignment.BottomStart).width(15.dp).height(4.dp).background(color))
    }
}

@Composable
fun PageHeader(
    eyebrow: String,
    title: String,
    body: String? = null,
    onBack: (() -> Unit)? = null,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 12.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            if (onBack != null) {
                TextButton(onClick = onBack, modifier = Modifier.width(68.dp).heightIn(min = 48.dp)) {
                    Text("Back", color = Ink, fontWeight = FontWeight.SemiBold)
                }
            } else {
                MarginMark(Modifier.size(28.dp))
                Spacer(Modifier.width(14.dp))
            }
            Text(
                eyebrow.uppercase(),
                color = Forest,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.4.sp,
            )
        }
        Row(modifier = Modifier.padding(top = 10.dp)) {
            Box(
                Modifier
                    .padding(top = 5.dp)
                    .width(3.dp)
                    .height(if (body == null) 42.dp else 78.dp)
                    .background(Coral),
            )
            Column(Modifier.padding(start = 15.dp)) {
                Text(title, style = MaterialTheme.typography.headlineMedium)
                if (body != null) {
                    Spacer(Modifier.height(7.dp))
                    Text(body, color = TextMuted, style = MaterialTheme.typography.bodyMedium)
                }
            }
        }
    }
}

@Composable
fun PrimaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    Button(
        onClick = onClick,
        modifier = modifier.fillMaxWidth().height(54.dp),
        enabled = enabled,
        shape = RoundedCornerShape(10.dp),
        colors = ButtonDefaults.buttonColors(containerColor = Forest, disabledContainerColor = OutlineSoft),
    ) {
        Text(text, fontWeight = FontWeight.Bold)
    }
}

@Composable
fun SecondaryButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier) {
    OutlinedButton(
        onClick = onClick,
        modifier = modifier.fillMaxWidth().height(52.dp),
        shape = RoundedCornerShape(10.dp),
        border = BorderStroke(1.dp, Ink),
    ) {
        Text(text, color = Ink, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
fun SectionLabel(text: String, action: String? = null, onAction: (() -> Unit)? = null) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(text.uppercase(), color = TextMuted, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.2.sp)
        if (action != null && onAction != null) {
            TextButton(onClick = onAction, modifier = Modifier.heightIn(min = 48.dp)) {
                Text(action, color = Forest, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
fun RuleSection(content: @Composable () -> Unit) {
    Column(Modifier.fillMaxWidth()) {
        HorizontalDivider(color = OutlineSoft)
        Box(Modifier.padding(vertical = 14.dp)) { content() }
        HorizontalDivider(color = OutlineSoft)
    }
}

@Composable
fun ChoiceRow(
    number: String,
    title: String,
    body: String,
    onClick: () -> Unit,
    accent: Boolean = false,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .background(if (accent) Mint else Paper)
            .clickable(role = Role.Button, onClick = onClick)
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(number, color = if (accent) Forest else Coral, fontSize = 13.sp, fontWeight = FontWeight.Bold)
        Spacer(Modifier.width(16.dp))
        Column(Modifier.weight(1f)) {
            Text(title, fontWeight = FontWeight.Bold, color = Ink)
            Spacer(Modifier.height(3.dp))
            Text(body, color = TextMuted, style = MaterialTheme.typography.bodyMedium)
        }
    }
}

@Composable
fun CapacityBar(value: CapacityValue, compact: Boolean = false) {
    val overloaded = value.percent > 100
    Column(
        Modifier
            .fillMaxWidth()
            .semantics {
                contentDescription = "${value.kind.label}, ${value.percent} percent of capacity"
                stateDescription = if (overloaded) "Over limit" else "Within limit"
            },
    ) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(value.kind.shortLabel, color = TextMuted, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
            Text(
                if (overloaded) "${value.percent}%  OVER" else "${value.percent}%",
                color = if (overloaded) Coral else Ink,
                fontWeight = FontWeight.Bold,
                fontSize = if (compact) 13.sp else 15.sp,
            )
        }
        Spacer(Modifier.height(if (compact) 6.dp else 8.dp))
        LinearProgressIndicator(
            progress = { value.progress },
            modifier = Modifier.fillMaxWidth().height(if (compact) 6.dp else 8.dp),
            color = if (overloaded) Coral else value.kind.color,
            trackColor = OutlineSoft,
            drawStopIndicator = {},
        )
    }
}

@Composable
fun AlertNote(title: String, body: String, modifier: Modifier = Modifier) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .background(SoftCoral, RoundedCornerShape(4.dp))
            .padding(14.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text("!", color = Coral, fontWeight = FontWeight.Black)
        Column {
            Text(title, color = Ink, fontWeight = FontWeight.Bold)
            Text(body, color = Ink, style = MaterialTheme.typography.bodyMedium)
        }
    }
}

@Composable
fun ChoicePill(text: String, selected: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Surface(
        modifier = modifier
            .heightIn(min = 48.dp)
            .selectable(selected = selected, role = Role.RadioButton, onClick = onClick)
            .semantics { stateDescription = if (selected) "Selected" else "Not selected" },
        shape = RoundedCornerShape(23.dp),
        color = if (selected) Ink else Color.Transparent,
        border = BorderStroke(1.dp, if (selected) Ink else OutlineStrong),
    ) {
        Box(Modifier.padding(horizontal = 14.dp), contentAlignment = Alignment.Center) {
            Text(text, color = if (selected) Canvas else Ink, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}

enum class MainTab(val label: String, val mark: String) {
    Home("Home", "H"),
    Add("Add", "+"),
    See("See", "S"),
    FiveD("5D", "5"),
}

@Composable
fun AppBottomBar(selected: MainTab, onSelect: (MainTab) -> Unit) {
    Surface(color = Paper) {
        Column {
            HorizontalDivider(color = OutlineSoft)
            Row(
                modifier = Modifier.fillMaxWidth().height(74.dp).padding(horizontal = 8.dp),
                horizontalArrangement = Arrangement.SpaceAround,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                MainTab.entries.forEach { tab ->
                    val isSelected = tab == selected
                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .height(64.dp)
                            .selectable(selected = isSelected, role = Role.Tab) { onSelect(tab) }
                            .padding(top = 12.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Box(
                            modifier = Modifier
                                .width(28.dp)
                                .height(3.dp)
                                .background(if (isSelected) Forest else Color.Transparent, RoundedCornerShape(2.dp)),
                        )
                        Spacer(Modifier.height(9.dp))
                        Text(
                            tab.label,
                            color = if (isSelected) Forest else TextMuted,
                            fontSize = 12.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun EmptyWeek(onAdd: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxWidth().padding(vertical = 40.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        MarginMark()
        Spacer(Modifier.height(18.dp))
        Text("Your week has room", style = MaterialTheme.typography.titleLarge)
        Spacer(Modifier.height(6.dp))
        Text("Add one commitment to start seeing its cost.", color = TextMuted, textAlign = TextAlign.Center)
        Spacer(Modifier.height(18.dp))
        Button(onClick = onAdd, modifier = Modifier.heightIn(min = 48.dp), shape = RoundedCornerShape(10.dp)) {
            Text("Add a commitment")
        }
    }
}
