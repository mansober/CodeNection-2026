package com.codenection.breathe.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas as DrawCanvas
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
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
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
import com.codenection.breathe.ui.theme.SoftMint
import com.codenection.breathe.ui.theme.SoftCoral
import com.codenection.breathe.ui.theme.TextMuted

@Composable
fun MarginMark(modifier: Modifier = Modifier, light: Boolean = false) {
    val color = if (light) Canvas else Forest
    DrawCanvas(modifier = modifier.size(34.dp).clearAndSetSemantics { }) {
        val leaf = Path().apply {
            moveTo(size.width * .18f, size.height * .70f)
            cubicTo(size.width * .24f, size.height * .26f, size.width * .62f, size.height * .13f, size.width * .82f, size.height * .16f)
            cubicTo(size.width * .78f, size.height * .58f, size.width * .55f, size.height * .82f, size.width * .18f, size.height * .70f)
        }
        drawPath(leaf, color = color, style = Stroke(width = 2.2.dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round))
        drawLine(color, start = center.copy(x = size.width * .20f, y = size.height * .78f), end = center.copy(x = size.width * .68f, y = size.height * .32f), strokeWidth = 2.2.dp.toPx(), cap = StrokeCap.Round)
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
            .padding(horizontal = 20.dp, vertical = 10.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            if (onBack != null) {
                TextButton(onClick = onBack, modifier = Modifier.heightIn(min = 48.dp)) {
                    Text("‹  Back", color = Ink, fontWeight = FontWeight.Medium)
                }
            } else {
                Box(
                    modifier = Modifier.size(34.dp).background(SoftMint, RoundedCornerShape(9.dp)),
                    contentAlignment = Alignment.Center,
                ) {
                    MarginMark(Modifier.size(21.dp))
                }
                Spacer(Modifier.width(10.dp))
            }
            Text(
                eyebrow,
                color = TextMuted,
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
                letterSpacing = .35.sp,
            )
        }
        Column(Modifier.padding(top = 6.dp)) {
            Text(title, style = MaterialTheme.typography.headlineMedium)
            if (body != null) {
                Spacer(Modifier.height(5.dp))
                Text(body, color = TextMuted, style = MaterialTheme.typography.bodyMedium)
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
        shape = RoundedCornerShape(12.dp),
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
        shape = RoundedCornerShape(12.dp),
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
        Text(text, color = Ink, style = MaterialTheme.typography.titleMedium)
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
        shape = RoundedCornerShape(10.dp),
        color = if (selected) Forest else Paper,
        border = BorderStroke(1.dp, if (selected) Forest else OutlineSoft),
    ) {
        Box(Modifier.padding(horizontal = 14.dp), contentAlignment = Alignment.Center) {
            Text(text, color = if (selected) Color.White else Ink, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}

enum class MainTab(val label: String) {
    Today("Today"),
    Plan("Plan"),
    CheckIn("Check-in"),
    Recover("Recover"),
}

@Composable
fun AppBottomBar(selected: MainTab, onSelect: (MainTab) -> Unit) {
    Box(Modifier.fillMaxWidth().background(Canvas).padding(horizontal = 20.dp, vertical = 7.dp)) {
        Surface(color = Paper, shape = RoundedCornerShape(16.dp), border = BorderStroke(1.dp, OutlineSoft)) {
            Row(
                modifier = Modifier.fillMaxWidth().height(70.dp).padding(horizontal = 6.dp),
                horizontalArrangement = Arrangement.SpaceAround,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                MainTab.entries.forEach { tab ->
                    val isSelected = tab == selected
                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .height(62.dp)
                            .selectable(selected = isSelected, role = Role.Tab) { onSelect(tab) }
                            .padding(vertical = 4.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Surface(
                            modifier = Modifier.size(width = 52.dp, height = 34.dp),
                            color = if (isSelected) Mint else Canvas,
                            shape = RoundedCornerShape(10.dp),
                            border = BorderStroke(1.dp, if (isSelected) Forest.copy(alpha = .22f) else OutlineSoft),
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                NavGlyph(tab, if (isSelected) Forest else TextMuted)
                            }
                        }
                        Text(
                            tab.label,
                            color = if (isSelected) Forest else TextMuted,
                            fontSize = 11.sp,
                            fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                            lineHeight = 13.sp,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun NavGlyph(tab: MainTab, color: Color) {
    DrawCanvas(Modifier.size(20.dp).clearAndSetSemantics { }) {
        val sw = 1.7.dp.toPx()
        val line = Stroke(width = sw, cap = StrokeCap.Round, join = StrokeJoin.Round)
        when (tab) {
            MainTab.Today -> {
                drawRect(color, topLeft = center.copy(x = size.width * .20f, y = size.height * .36f), size = size.copy(width = size.width * .60f, height = size.height * .46f), style = line)
                drawLine(color, center.copy(x = size.width * .38f, y = size.height * .36f), center.copy(x = size.width * .38f, y = size.height * .23f), sw)
                drawLine(color, center.copy(x = size.width * .62f, y = size.height * .36f), center.copy(x = size.width * .62f, y = size.height * .23f), sw)
                drawLine(color, center.copy(x = size.width * .38f, y = size.height * .23f), center.copy(x = size.width * .62f, y = size.height * .23f), sw)
            }
            MainTab.Plan -> {
                drawRect(color, topLeft = center.copy(x = size.width * .16f, y = size.height * .24f), size = size.copy(width = size.width * .68f, height = size.height * .60f), style = line)
                drawLine(color, center.copy(x = size.width * .16f, y = size.height * .42f), center.copy(x = size.width * .84f, y = size.height * .42f), sw)
                drawLine(color, center.copy(x = size.width * .34f, y = size.height * .16f), center.copy(x = size.width * .34f, y = size.height * .32f), sw)
                drawLine(color, center.copy(x = size.width * .66f, y = size.height * .16f), center.copy(x = size.width * .66f, y = size.height * .32f), sw)
            }
            MainTab.CheckIn -> {
                drawCircle(color, radius = size.minDimension * .36f, style = line)
                drawCircle(color, radius = sw * .55f, center = center.copy(x = size.width * .38f, y = size.height * .43f))
                drawCircle(color, radius = sw * .55f, center = center.copy(x = size.width * .62f, y = size.height * .43f))
                drawArc(color, startAngle = 25f, sweepAngle = 130f, useCenter = false, topLeft = center.copy(x = size.width * .31f, y = size.height * .48f), size = size.copy(width = size.width * .38f, height = size.height * .25f), style = line)
            }
            MainTab.Recover -> {
                val path = Path().apply {
                    moveTo(size.width * .28f, size.height * .74f)
                    cubicTo(size.width * .20f, size.height * .38f, size.width * .55f, size.height * .16f, size.width * .78f, size.height * .20f)
                    cubicTo(size.width * .80f, size.height * .52f, size.width * .60f, size.height * .78f, size.width * .28f, size.height * .74f)
                }
                drawPath(path, color, style = line)
                drawLine(color, center.copy(x = size.width * .28f, y = size.height * .82f), center.copy(x = size.width * .68f, y = size.height * .34f), sw, StrokeCap.Round)
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
