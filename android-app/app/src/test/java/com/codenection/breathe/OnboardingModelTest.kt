package com.codenection.breathe

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class OnboardingModelTest {
    @Test
    fun errandsFeedTimeAndPhysicalWithoutAddingAFifthDimension() {
        val entries = mapOf("errands" to RoutineEntry(durationHours = 2.0, timesPerWeek = 2))

        assertEquals(4.0, baselineLoad(entries, CapacityKind.Time), 0.001)
        assertEquals(2.0, baselineLoad(entries, CapacityKind.Physical), 0.001)
        assertEquals(1.2, baselineLoad(entries, CapacityKind.Mental), 0.001)
        assertEquals(0.4, baselineLoad(entries, CapacityKind.Social), 0.001)
    }

    @Test
    fun feelQuestionsSkipDimensionsWithoutAHeavySelectedItem() {
        val classesAndStudy = listOf("classes", "study")

        assertTrue(shouldAskFeelQuestion(classesAndStudy, CapacityKind.Time))
        assertTrue(shouldAskFeelQuestion(classesAndStudy, CapacityKind.Mental))
        assertFalse(shouldAskFeelQuestion(classesAndStudy, CapacityKind.Physical))
        assertFalse(shouldAskFeelQuestion(classesAndStudy, CapacityKind.Social))
        assertTrue(shouldAskFeelQuestion(listOf("sport"), CapacityKind.Physical))
        assertTrue(shouldAskFeelQuestion(listOf("club"), CapacityKind.Social))
        assertEquals(
            listOf(CapacityKind.Mental, CapacityKind.Time),
            requiredFeelKinds(classesAndStudy),
        )
        assertEquals(
            listOf(CapacityKind.Mental, CapacityKind.Physical, CapacityKind.Social, CapacityKind.Time),
            requiredFeelKinds(listOf("classes", "sport", "club")),
        )
    }

    @Test
    fun limitsUseTheCalibratedDefaultsFromTheHandoff() {
        assertEquals(10.0, inferredLimit(load = 7.0, answerIndex = 1), 0.001)
        assertEquals(39.0, timeLimit(committedHours = 34.0, answerIndex = 1), 0.001)
        assertEquals(listOf(3, 5, 9, 14), recoveryHourValues)
    }

    @Test
    fun timetableReconciliationKeepsBothValuesAndCanUndo() {
        val imported = TimetableReconciliation(originalHours = 10.0, importedHours = 18.0)

        assertEquals(18.0, imported.resolvedHours, 0.001)
        assertEquals(10.0, imported.copy(applied = false).resolvedHours, 0.001)
    }
}
