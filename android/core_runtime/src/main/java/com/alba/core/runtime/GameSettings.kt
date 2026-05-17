package com.alba.core.runtime

// Birlesik oyun konfigürasyonu — backend game-settings.ts'in Kotlin aynasi
// Tum oyun tipleri icin tek config modeli

// ============================================================================
// SEVIYE 1: ORTAK OYUN AYARLARI
// ============================================================================

data class CommonGameSettings(
    val templateId: String = "",
    val title: String = "",
    val description: String = "",
    val category: String = "FUN",
    val lives: LivesSettings = LivesSettings(),
    val duration: DurationSettings = DurationSettings(),
    val scoring: ScoringSettings = ScoringSettings(),
    val completion: CompletionSettings = CompletionSettings(),
    val presentation: PresentationSettings = PresentationSettings(),
    val feedback: FeedbackSettings = FeedbackSettings()
)

data class LivesSettings(
    val mode: String = "LIMITED",       // NONE | LIMITED | UNLIMITED
    val count: Int = 3,
    val gracePeriodSec: Int = 20,
    val loseOnBadForm: Boolean = false,
    val loseOnExpire: Boolean = true,
    val loseOnOutOfFrame: Boolean = false
)

data class DurationSettings(
    val mode: String = "TIMED",          // TIMED | UNTIL_COMPLETE | ENDLESS
    val sec: Int = 60,
    val countdownSec: Int = 3
)

data class ScoringSettings(
    val targetScore: Int = 100,
    val pointsPerCorrect: Int = 10,
    val penaltyPerWrong: Int = 5,
    val comboEnabled: Boolean = false,
    val comboMultiplier: Float = 0.1f,
    val maxComboMultiplier: Float = 3.0f,
    val streakBonus: Int = 0
)

data class CompletionSettings(
    val primary: String = "DURATION",    // DURATION | SCORE_TARGET | ALL_TASKS_DONE | LIVES_DEPLETED | MANUAL
    val allowEarlyFinish: Boolean = false,
    val showResultScreen: Boolean = true
)

data class PresentationSettings(
    val orientation: String = "LANDSCAPE",
    val cameraRequirement: String = "FULL_BODY",
    val showTimer: Boolean = true,
    val showScore: Boolean = true,
    val showLives: Boolean = true,
    val showCombo: Boolean = true
)

data class FeedbackSettings(
    val visualEffectOnCorrect: Boolean = true,
    val visualEffectOnWrong: Boolean = true,
    val vibrateOnCorrect: Boolean = true,
    val vibrateOnWrong: Boolean = true,
    val soundOnCorrect: Boolean = false,
    val soundOnWrong: Boolean = false,
    val showPromptText: Boolean = true,
    val promptUpdateStrategy: String = "ON_CHANGE"
)

// ============================================================================
// SEVIYE 2: OYUN MEKANIGI (7 aile)
// ============================================================================

sealed class GameMechanicConfig {
    abstract val kind: String
}

// --- Aile 1: Motion Arcade ---
data class MotionArcadeObject(
    val id: String,
    val label: String,
    val assetKey: String,
    val requiredMotion: String,
    val points: Int,
    val lifeMs: Long? = null,
    val lane: Int? = null,
    val probability: Float? = null,
    val isPenalty: Boolean? = false
)

data class MotionArcadeMechanic(
    override val kind: String = "MOTION_ARCADE",
    val spawn: SpawnConfig = SpawnConfig(),
    val objects: List<MotionArcadeObject> = emptyList(),
    val match: MatchConfig = MatchConfig(),
    val onExpire: ExpireConfig = ExpireConfig(),
    val penaltyObjects: PenaltyObjectsConfig? = null,
    val objectDefaults: ObjectDefaults = ObjectDefaults()
) : GameMechanicConfig()

data class SpawnConfig(
    val strategy: String = "RANDOM",     // RANDOM | SEQUENCE | WAVE
    val intervalMs: Long = 2000,
    val maxActive: Int = 1,
    val initialDelayMs: Long = 0,
    val waveSize: Int? = null,
    val waveCooldownMs: Long? = null
)

data class MatchConfig(
    val strategy: String = "BY_MOTION",
    val matchWindowMs: Long = 200
)

data class ExpireConfig(
    val action: String = "NONE",         // NONE | MISS_PENALTY | LOSE_LIFE
    val penaltyPoints: Int = 0,
    val showFeedback: Boolean = false
)

data class PenaltyObjectsConfig(
    val enabled: Boolean = false,
    val objects: List<MotionArcadeObject> = emptyList(),
    val penaltyPoints: Int = 10,
    val penaltyAction: String = "DEDUCT_SCORE"
)

data class ObjectDefaults(
    val lifeMs: Long = 3000,
    val hitRadius: Float = 0.15f,
    val fadeOutMs: Long = 200,
    val hitCooldownMs: Long = 300
)

// --- Aile 2: Pose Contact ---
data class PoseContactTarget(
    val targetId: String,
    val x: Float,
    val y: Float,
    val radius: Float,
    val hitBy: List<String>,
    val assetKey: String,
    val points: Int
)

data class PoseContactMechanic(
    override val kind: String = "POSE_CONTACT",
    val targets: List<PoseContactTarget> = emptyList(),
    val spawn: PoseSpawnConfig = PoseSpawnConfig(),
    val hitDetection: HitDetectionConfig = HitDetectionConfig()
) : GameMechanicConfig()

data class PoseSpawnConfig(
    val intervalMs: Long = 1500,
    val visibleMs: Long = 2000,
    val maxActiveTargets: Int = 2,
    val activateMode: String = "RANDOM"
)

data class HitDetectionConfig(
    val minConfidence: Float = 0.5f,
    val hitRadius: Float = 0.15f,
    val hitCooldownMs: Long = 300,
    val loseLifeOnTimeout: Boolean = false
)

// --- Aile 3: Quiz ---
data class QuizQuestion(
    val id: String,
    val prompt: String,
    val choices: List<String>,
    val correctIndex: Int,
    val points: Int,
    val timeLimitSec: Int? = null,
    val explanation: String? = null
)

data class QuizMechanic(
    override val kind: String = "QUIZ",
    val questions: List<QuizQuestion> = emptyList(),
    val display: QuizDisplayConfig = QuizDisplayConfig()
) : GameMechanicConfig()

data class QuizDisplayConfig(
    val shuffleQuestions: Boolean = true,
    val shuffleChoices: Boolean = true,
    val showCorrectAnswer: Boolean = true,
    val showProgressBar: Boolean = true,
    val allowSkip: Boolean = false,
    val autoAdvance: Boolean = true,
    val autoAdvanceDelayMs: Long = 1500
)

// --- Aile 4: Study ---
data class StudyCard(
    val id: String,
    val frontText: String = "",
    val backText: String = "",
    val imageAssetKey: String? = null,
    val audioAssetKey: String? = null
)

data class StudyPair(
    val id: String,
    val left: StudyItem = StudyItem(),
    val right: StudyItem = StudyItem()
)

data class StudyItem(
    val text: String? = null,
    val imageAssetKey: String? = null,
    val audioAssetKey: String? = null
)

data class StudyMechanic(
    override val kind: String = "STUDY",
    val studyType: String = "FLASHCARD",
    val cards: List<StudyCard>? = null,
    val pairs: List<StudyPair>? = null,
    val display: StudyDisplayConfig = StudyDisplayConfig()
) : GameMechanicConfig()

data class StudyDisplayConfig(
    val shuffleItems: Boolean = true,
    val showProgress: Boolean = true,
    val gridColumns: Int? = null,
    val revealDelayMs: Long? = null,
    val allowFlipBack: Boolean = false
)

// --- Aile 5: Hold ---
data class HoldMechanic(
    override val kind: String = "HOLD",
    val pose: String = "PLANK",
    val targetHoldSec: Int = 30,
    val graceMs: Long = 500,
    val minConfidence: Float = 0.6f,
    val customPoseDescription: String? = null,
    val display: HoldDisplayConfig = HoldDisplayConfig()
) : GameMechanicConfig()

data class HoldDisplayConfig(
    val showProgressBar: Boolean = true,
    val showQualityScore: Boolean = true,
    val countdownStyle: String = "PROGRESS_BAR"
)

// --- Aile 6: Rhythm ---
data class RhythmNote(
    val noteId: String,
    val motion: String,
    val timingMs: Long,
    val windowMs: Long = 200,
    val points: Int = 10
)

data class RhythmMechanic(
    override val kind: String = "RHYTHM",
    val bpm: Int = 120,
    val notes: List<RhythmNote> = emptyList(),
    val display: RhythmDisplayConfig = RhythmDisplayConfig()
) : GameMechanicConfig()

data class RhythmDisplayConfig(
    val noteSpeed: Float = 1.0f,
    val showBeatIndicator: Boolean = true
)

// --- Aile 7: Program ---
data class ProgramStep(
    val stepId: String,
    val type: String,
    val title: String,
    val description: String? = null,
    val motion: String? = null,
    val targetCount: Int? = null,
    val pointsPerRep: Int? = null,
    val holdSec: Int? = null,
    val durationSec: Int? = null,
    val nextOnComplete: Boolean = true,
    val autoAdvance: Boolean = true
)

data class ProgramMechanic(
    override val kind: String = "PROGRAM",
    val steps: List<ProgramStep> = emptyList(),
    val display: ProgramDisplayConfig = ProgramDisplayConfig()
) : GameMechanicConfig()

data class ProgramDisplayConfig(
    val showStepIndicator: Boolean = true,
    val showRepCounter: Boolean = true,
    val showRestTimer: Boolean = false
)

// ============================================================================
// TAM GAME SETTINGS
// ============================================================================

data class GameSettings(
    val schemaVersion: String = "1.0",
    val common: CommonGameSettings = CommonGameSettings(),
    val mechanic: GameMechanicConfig = MotionArcadeMechanic()
)

// ============================================================================
// TEMPLATE -> AILE ESLESTIRMESI
// ============================================================================

object TemplateFamily {
    private val map: Map<String, String> = mapOf(
        "SCENE_PLAY" to "MOTION_ARCADE",
        "FRUIT_SLASH" to "MOTION_ARCADE",
        "DODGE_RUN" to "MOTION_ARCADE",
        "REACTION" to "MOTION_ARCADE",
        "AVOID_OBSTACLE" to "MOTION_ARCADE",
        "TARGET_HIT" to "MOTION_ARCADE",
        "ENDLESS_RUNNER" to "MOTION_ARCADE",
        "CATCH_FALLING" to "MOTION_ARCADE",
        "WHACK_A_MOLE" to "POSE_CONTACT",
        "POSE_CONTACT_TARGETS" to "POSE_CONTACT",
        "CAMERA_ARCADE_OVERLAY" to "POSE_CONTACT",
        "COLLECT_ITEMS" to "POSE_CONTACT",
        "QUIZ" to "QUIZ",
        "TRUE_FALSE" to "QUIZ",
        "FLASHCARD" to "STUDY",
        "MEMORY_MATCH" to "STUDY",
        "MATCH_PAIRS" to "STUDY",
        "POSE_HOLD" to "HOLD",
        "RHYTHM_MOTION" to "RHYTHM",
        "FIT_CHALLENGE" to "PROGRAM",
        "REP_COUNTER" to "PROGRAM",
        "MOTION_SEQUENCE" to "PROGRAM",
        "INTERVAL_WORKOUT" to "PROGRAM",
        "PROGRAM_FLOW" to "PROGRAM",
        "HYBRID_SCENE" to "PROGRAM"
    )

    fun getKind(template: String): String = map[template] ?: "PROGRAM"
}
