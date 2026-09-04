package com.codenection.breathe

data class LoadWeights(
    val time: Double,
    val mental: Double,
    val physical: Double,
    val social: Double,
) {
    fun forKind(kind: CapacityKind): Double = when (kind) {
        CapacityKind.Time -> time
        CapacityKind.Mental -> mental
        CapacityKind.Physical -> physical
        CapacityKind.Social -> social
    }
}

data class RoutineItem(
    val id: String,
    val label: String,
    val weights: LoadWeights,
)

data class RoutineEntry(
    val durationHours: Double = 1.0,
    val timesPerWeek: Int = 1,
) {
    val weeklyHours: Double get() = durationHours * timesPerWeek
}

data class TimetableReconciliation(
    val originalHours: Double,
    val importedHours: Double,
    val applied: Boolean = true,
) {
    val resolvedHours: Double get() = if (applied) importedHours else originalHours
}

val routineCatalog = listOf(
    RoutineItem("classes", "Classes / lectures", LoadWeights(1.0, 1.0, 0.1, 0.3)),
    RoutineItem("study", "Assignments & study", LoadWeights(1.0, 1.0, 0.0, 0.0)),
    RoutineItem("sport", "Gym or sport", LoadWeights(1.0, 0.2, 1.0, 0.3)),
    RoutineItem("job", "Part-time job", LoadWeights(1.0, 0.6, 0.6, 0.6)),
    RoutineItem("club", "Club or society", LoadWeights(1.0, 0.5, 0.2, 1.0)),
    RoutineItem("competition", "Competition or team", LoadWeights(1.0, 1.0, 0.7, 0.8)),
    RoutineItem("volunteering", "Volunteering", LoadWeights(1.0, 0.5, 0.5, 0.9)),
    RoutineItem("family", "Family duties", LoadWeights(1.0, 0.6, 0.5, 0.6)),
    RoutineItem("commuting", "Commuting", LoadWeights(1.0, 0.2, 0.5, 0.0)),
    RoutineItem("errands", "Errands & chores", LoadWeights(1.0, 0.3, 0.5, 0.1)),
    RoutineItem("projects", "Personal projects", LoadWeights(1.0, 0.9, 0.0, 0.0)),
)

val routineDurationOptions = listOf(
    "Under 30 min" to 0.25,
    "30 min" to 0.5,
    "1 hr" to 1.0,
    "1.5 hrs" to 1.5,
    "2 hrs" to 2.0,
    "3 hrs" to 3.0,
    "4 hrs" to 4.0,
    "5+ hrs" to 5.0,
)

val routineFrequencyOptions = listOf(
    "Once" to 1,
    "2×" to 2,
    "3×" to 3,
    "4×" to 4,
    "5×" to 5,
    "6×" to 6,
    "Every day" to 7,
)

val utilisationValues = listOf(0.55, 0.70, 0.90, 1.05)
val spareHourValues = listOf(2, 5, 11, 18)
val recoveryHourValues = listOf(3, 5, 9, 14)

fun baselineLoad(
    entries: Map<String, RoutineEntry>,
    kind: CapacityKind,
): Double = entries.entries.sumOf { (id, entry) ->
    val item = routineCatalog.firstOrNull { it.id == id }
    entry.weeklyHours * (item?.weights?.forKind(kind) ?: 0.0)
}

fun committedHoursTotal(entries: Map<String, RoutineEntry>): Double =
    entries.values.sumOf(RoutineEntry::weeklyHours)

fun shouldAskFeelQuestion(selectedIds: Collection<String>, kind: CapacityKind): Boolean {
    if (kind == CapacityKind.Time || kind == CapacityKind.Mental) return true
    return routineCatalog
        .filter { it.id in selectedIds }
        .any { it.weights.forKind(kind) >= 0.4 }
}

fun inferredLimit(load: Double, answerIndex: Int): Double {
    val utilisation = utilisationValues[answerIndex.coerceIn(utilisationValues.indices)]
    return if (utilisation == 0.0) 0.0 else load / utilisation
}

fun timeLimit(committedHours: Double, answerIndex: Int): Double =
    committedHours + spareHourValues[answerIndex.coerceIn(spareHourValues.indices)]
