package com.codenection.breathe

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class CapacityCalculatorTest {
    @Test
    fun percentage_isClampedToSafeDisplayRange() {
        assertEquals(0, capacityPercent(0, 0))
        assertEquals(50, capacityPercent(10, 20))
        assertEquals(150, capacityPercent(40, 20))
        assertEquals(150, capacityPercent(100, 20))
    }

    @Test
    fun upsertCommitment_addsNewCommitmentOnlyOnce() {
        val original = sampleCommitments.take(1)
        val first = upsertCommitment(original, null, weekendHackathon)
        val second = upsertCommitment(first, null, weekendHackathon)

        assertEquals(original.size + 1, second.size)
        assertEquals(1, second.count { it.name == weekendHackathon.name })
    }

    @Test
    fun upsertCommitment_replacesEditedCommitmentInPlace() {
        val original = sampleCommitments.take(2)
        val old = original.first()
        val replacement = old.copy(name = "Updated commitment", mental = 10)
        val updated = upsertCommitment(original, old.name, replacement)

        assertEquals(original.size, updated.size)
        assertEquals(replacement, updated.first())
        assertFalse(updated.any { it.name == old.name })
        assertTrue(updated.any { it.name == replacement.name })
    }
}
