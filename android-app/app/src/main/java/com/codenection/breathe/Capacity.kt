package com.codenection.breathe

import androidx.compose.ui.graphics.Color

enum class CapacityKind(
    val label: String,
    val shortLabel: String,
    val unit: String,
    val color: Color,
) {
    Time("Time", "TIME", "hours", Color(0xFF0F6B4F)),
    Mental("Mental", "MENTAL", "points", Color(0xFFD45F4E)),
    Physical("Physical", "PHYSICAL", "points", Color(0xFFC68A2E)),
    Social("Social", "SOCIAL", "points", Color(0xFF6F67B6)),
}

data class CapacityValue(
    val kind: CapacityKind,
    val used: Int,
    val limit: Int,
) {
    val percent: Int get() = capacityPercent(used, limit)
    val progress: Float get() = (percent / 100f).coerceIn(0f, 1f)
}

fun capacityPercent(used: Int, limit: Int): Int {
    if (limit <= 0) return 0
    return ((used.toFloat() / limit) * 100).toInt().coerceIn(0, 150)
}

val sampleCapacities = listOf(
    CapacityValue(CapacityKind.Time, used = 96, limit = 100),
    CapacityValue(CapacityKind.Mental, used = 88, limit = 100),
    CapacityValue(CapacityKind.Physical, used = 72, limit = 100),
    CapacityValue(CapacityKind.Social, used = 64, limit = 100),
)

data class Commitment(
    val name: String,
    val category: String,
    val schedule: String,
    val flexibility: String,
    val time: Int,
    val mental: Int,
    val physical: Int,
    val social: Int,
)

val sampleCommitments = listOf(
    Commitment("Robotics Club practice", "Club", "Tue, 7:00 PM", "Somewhat flexible", 16, 18, 10, 14),
    Commitment("Data Structures midterm", "Class", "Thu, 10:00 AM", "Fixed", 18, 34, 4, 2),
    Commitment("Grocery run", "Personal", "Wed, 6:00 PM", "Flexible", 8, 4, 8, 2),
    Commitment("Robotics Club poster design", "Club", "Due Friday", "Flexible", 12, 20, 2, 4),
    Commitment("Optional club social mixer", "Social", "Sat, 8:00 PM", "Flexible", 10, 8, 6, 24),
)

val weekendHackathon = Commitment(
    name = "Weekend Hackathon",
    category = "Club",
    schedule = "Fri–Sun",
    flexibility = "Fixed",
    time = 22,
    mental = 26,
    physical = 18,
    social = 12,
)

fun upsertCommitment(
    commitments: List<Commitment>,
    originalName: String?,
    replacement: Commitment,
): List<Commitment> {
    val updated = commitments.toMutableList()
    val originalIndex = originalName?.let { name -> updated.indexOfFirst { it.name == name } } ?: -1

    if (originalIndex >= 0) {
        updated[originalIndex] = replacement
    } else if (updated.none { it.name == replacement.name }) {
        updated.add(0, replacement)
    }

    return updated
}
