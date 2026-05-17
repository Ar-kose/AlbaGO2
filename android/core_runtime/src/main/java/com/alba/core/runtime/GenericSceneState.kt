package com.alba.core.runtime

// Tum oyun tipleri icin TEK scene state
// Her handler kendi alanlarini kullanir, digerleri null/default kalir

data class GenericSceneState(
    // --- Ortak (tum oyunlar) ---
    val lives: Int = 3,
    val score: Int = 0,
    val combo: Int = 0,
    val elapsedMs: Long = 0L,
    val lastBadFormMs: Long = 0L,
    val completed: Boolean = false,
    val failed: Boolean = false,
    val feedback: FeedbackState? = null,

    // --- MotionArcade / PoseContact ---
    val activeObjects: List<ActiveObject> = emptyList(),
    val lastSpawnMs: Long = 0L,
    val spawnIndex: Int = 0,

    // --- Quiz ---
    val currentQuestionIndex: Int = 0,
    val answeredQuestionIds: Set<String> = emptySet(),
    val correctAnswers: Int = 0,
    val wrongAnswers: Int = 0,

    // --- Study ---
    val currentCardIndex: Int = 0,
    val flippedCardIds: Set<String> = emptySet(),
    val matchedPairIds: Set<String> = emptySet(),

    // --- Hold ---
    val holdStartMs: Long? = null,
    val holdAccumulatedMs: Long = 0L,
    val holdQuality: Float = 1.0f,

    // --- Rhythm ---
    val lastNoteIndex: Int = -1,
    val notesHit: Int = 0,
    val notesMissed: Int = 0,

    // --- Program ---
    val activeStepIndex: Int = 0,
    val stepRepCount: Int = 0,
    val completedSteps: Int = 0,
    val stepStartMs: Long = 0L,

    // --- Genel ---
    val lastEvent: String? = null,
    val lastMotion: String? = null
)

data class ActiveObject(
    val id: String,
    val objectConfig: MotionArcadeObject,
    val spawnedAtMs: Long,
    val hitAtMs: Long? = null,
    val lane: Int = 0,
    val active: Boolean = true
) {
    val isHit: Boolean get() = hitAtMs != null
    val isExpired: Boolean get() = false // hesaplama tick'te yapilir
}

data class FeedbackState(
    val text: String,
    val kind: FeedbackKind,
    val expiresAtMs: Long
)

enum class FeedbackKind {
    POSITIVE,
    NEGATIVE,
    INFO
}
