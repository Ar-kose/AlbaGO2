package com.alba.core.runtime

import com.alba.core.motion.MotionEvent
import com.alba.core.motion.MotionEventType
import com.alba.core.motion.MotionType
import java.util.UUID
import kotlin.math.max
import kotlin.random.Random

enum class GameTemplate {
    TARGET_HIT,
    ENDLESS_RUNNER,
    FRUIT_SLASH,
    DODGE_RUN,
    FIT_CHALLENGE,
    SCENE_PLAY
}

enum class PublishStatus {
    DRAFT,
    REVIEW,
    SCHEDULED,
    PUBLISHED,
    ARCHIVED
}

enum class GameOrientation {
    PORTRAIT,
    LANDSCAPE
}

enum class CameraRequirement {
    FULL_BODY,
    UPPER_BODY,
    HAND_TARGET
}

enum class GameCategory {
    SPORT,
    FUN,
    EDUCATION
}

enum class ProgramStepType {
    PLAY_GAME,
    MOTION_REPS,
    HOLD_POSE,
    REST,
    INSTRUCTION
}

enum class ProgramStepStatus {
    NOT_STARTED,
    ACTIVE,
    COMPLETED,
    BLOCKED
}

data class ProgramRuntimeStepState(
    val stepId: String,
    val type: ProgramStepType,
    val title: String,
    val status: ProgramStepStatus = ProgramStepStatus.NOT_STARTED,
    val progressCount: Int = 0,
    val targetCount: Int? = null,
    val startedAtMs: Long? = null,
    val remainingMs: Long? = null,
    val completedAtMs: Long? = null,
    val message: String? = null
)

data class ProgramRuntimeState(
    val activeIndex: Int = 0,
    val steps: List<ProgramRuntimeStepState> = emptyList(),
    val completed: Boolean = false
)

enum class RuleActionType {
    ADD_SCORE,
    REMOVE_OBJECT,
    RESET_COMBO,
    DECREASE_LIFE,
    PROGRESS_TASK,
    PAUSE_GAME,
    SHOW_EFFECT,
    COMPLETE_LEVEL,
    MULTIPLY_SCORE,
    START_COMBO,
    PLAY_SOUND,
    SPAWN_TARGET,
    GRANT_REWARD_REQUEST
}

data class RuleAction(
    val type: RuleActionType,
    val amount: Int = 0,
    val payload: String? = null
)

data class MotionRule(
    val motion: MotionType,
    val event: MotionEventType,
    val points: Int,
    val cooldownMs: Long,
    val actions: List<RuleAction> = listOf(RuleAction(RuleActionType.ADD_SCORE))
)

data class RewardRule(
    val rewardType: String,
    val amount: Int,
    val minimumScore: Int
)

data class GameTaskDefinition(
    val motion: MotionType,
    val targetCount: Int,
    val pointsPerRep: Int
)

data class ProgramStepDefinition(
    val stepId: String,
    val type: ProgramStepType,
    val title: String,
    val description: String? = null,
    val motion: MotionType? = null,
    val targetCount: Int? = null,
    val holdSec: Int? = null,
    val durationSec: Int? = null,
    val successMessage: String? = null,
    val nextOnComplete: Boolean = true
)

data class InteractionRule(
    val input: String,
    val event: MotionEventType? = null,
    val motion: MotionType? = null,
    val targetObjectType: String? = null,
    val keypoints: List<String> = emptyList(),
    val action: RuleActionType,
    val points: Int = 0,
    val cooldownMs: Long = 0L
)

data class GameLevelDefinition(
    val levelId: String,
    val durationSec: Int,
    val targetScore: Int,
    val difficulty: String,
    val motionRules: List<MotionRule>,
    val rewards: List<RewardRule>,
    val config: Map<String, Any> = emptyMap(),
    val sceneConfig: Map<String, Any> = emptyMap(),
    val interactionRules: List<InteractionRule> = emptyList(),
    val tasks: List<GameTaskDefinition> = emptyList(),
    val programSteps: List<ProgramStepDefinition> = emptyList()
)

data class GameAsset(
    val id: String? = null,
    val key: String,
    val kind: String,
    val format: String,
    val uri: String,
    val mimeType: String? = null,
    val width: Int? = null,
    val height: Int? = null,
    val sha256: String? = null,
    val bytes: Int? = null,
    val createdAt: String? = null
)

data class AssetManifest(
    val background: String,
    val character: String,
    val soundtrack: String? = null,
    val items: List<GameAsset> = emptyList()
)

data class GameDefinition(
    val gameId: String,
    val version: Int,
    val template: GameTemplate,
    val title: String,
    val description: String = "",
    val status: PublishStatus,
    val minAppVersion: String,
    val category: GameCategory = GameCategory.FUN,
    val tags: List<String> = emptyList(),
    val orientation: GameOrientation = GameOrientation.PORTRAIT,
    val cameraRequirement: CameraRequirement = CameraRequirement.FULL_BODY,
    val supportedMotions: List<MotionType>,
    val levels: List<GameLevelDefinition>,
    val assets: AssetManifest
)

enum class GameSessionStatus {
    READY,
    ACTIVE,
    PAUSED,
    FINISHED
}

sealed interface GameSceneState

data object IdleSceneState : GameSceneState

data class FruitTarget(
    val id: String,
    val label: String,
    val assetKey: String,
    val requiredMotion: MotionType,
    val lane: Int,
    val spawnedAtMs: Long,
    val lifeMs: Long,
    val hitRadius: Float,
    val penaltyObject: Boolean
)

data class FruitSlashSceneState(
    val targets: List<FruitTarget> = emptyList(),
    val slicedCount: Int = 0,
    val missedCount: Int = 0,
    val penaltyCount: Int = 0,
    val nextSpawnAtMs: Long = 0L
) : GameSceneState

enum class DodgeObstacleType {
    DUCK,
    JUMP,
    BOOST
}

data class DodgeObstacle(
    val id: String,
    val type: DodgeObstacleType,
    val assetKey: String,
    val requiredMotion: MotionType,
    val spawnedAtMs: Long,
    val travelMs: Long
)

data class DodgeRunSceneState(
    val obstacles: List<DodgeObstacle> = emptyList(),
    val lives: Int = 3,
    val distance: Int = 0,
    val energy: Int = 0,
    val dodgedCount: Int = 0,
    val missedCount: Int = 0,
    val nextSpawnAtMs: Long = 0L,
    val prompt: String = "Hazır"
) : GameSceneState

data class FitChallengeTaskProgress(
    val motion: MotionType,
    val targetCount: Int,
    val pointsPerRep: Int,
    val currentCount: Int = 0
)

data class FitChallengeSceneState(
    val tasks: List<FitChallengeTaskProgress> = emptyList(),
    val activeTaskIndex: Int = 0,
    val completedTasks: Int = 0,
    val qualityScore: Int = 100
) : GameSceneState

data class ScenePlayObject(
    val id: String,
    val objectType: String,
    val label: String,
    val assetKey: String,
    val requiredMotion: MotionType,
    val points: Int,
    val spawnedAtMs: Long,
    val lifeMs: Long,
    val hitRadius: Float,
    val penaltyObject: Boolean = false
)

data class ScenePlaySceneState(
    val objects: List<ScenePlayObject> = emptyList(),
    val lives: Int = 3,
    val clearedCount: Int = 0,
    val missedCount: Int = 0,
    val prompt: String = "Hazir",
    val nextSpawnAtMs: Long = 0L
) : GameSceneState

data class GameRuntimeState(
    val template: GameTemplate = GameTemplate.TARGET_HIT,
    val title: String = "",
    val description: String = "",
    val score: Int = 0,
    val combo: Int = 0,
    val comboMax: Int = 0,
    val accuracy: Float = 1f,
    val elapsedMs: Long = 0L,
    val remainingMs: Long = 0L,
    val status: GameSessionStatus = GameSessionStatus.READY,
    val completed: Boolean = false,
    val grantedRewards: List<RewardRule> = emptyList(),
    val lastEffect: String? = null,
    val validMotionCount: Int = 0,
    val invalidMotionCount: Int = 0,
    val sceneState: GameSceneState = IdleSceneState,
    val program: ProgramRuntimeState = ProgramRuntimeState()
)

data class GameSessionResult(
    val gameId: String,
    val gameVersion: Int,
    val score: Int,
    val durationSec: Int,
    val motionCounts: Map<MotionType, Int>,
    val comboMax: Int,
    val accuracy: Float,
    val startedAtMs: Long,
    val endedAtMs: Long,
    val clientSessionKey: String
)

class GameDefinitionValidator {
    fun validate(definition: GameDefinition, appVersion: String): List<String> {
        val errors = mutableListOf<String>()
        if (definition.status != PublishStatus.PUBLISHED) {
            errors += "game_must_be_published"
        }
        if (compareVersions(appVersion, definition.minAppVersion) < 0) {
            errors += "min_app_version_not_met"
        }
        if (definition.assets.background.isBlank() || definition.assets.character.isBlank()) {
            errors += "missing_required_assets"
        }
        if (definition.levels.isEmpty()) {
            errors += "at_least_one_level_required"
        }
        definition.levels.forEach { level ->
            if (level.motionRules.isEmpty()) {
                errors += "missing_motion_rules:${level.levelId}"
            }
            when (definition.template) {
                GameTemplate.FRUIT_SLASH -> {
                    if (level.config.longValue("spawnRateMs") <= 0L) {
                        errors += "missing_spawn_rate:${level.levelId}"
                    }
                    if (level.sceneConfig.floatValue("defaultHitRadius") <= 0f) {
                        errors += "missing_hit_radius:${level.levelId}"
                    }
                }

                GameTemplate.DODGE_RUN -> {
                    if (level.config.longValue("obstacleSpawnMs") <= 0L) {
                        errors += "missing_obstacle_spawn:${level.levelId}"
                    }
                    if (level.config.intValue("lives") <= 0) {
                        errors += "missing_lives:${level.levelId}"
                    }
                    if (level.sceneConfig.longValue("travelMs") <= 0L) {
                        errors += "missing_travel_ms:${level.levelId}"
                    }
                }

                GameTemplate.FIT_CHALLENGE -> {
                    if (level.tasks.isEmpty()) {
                        errors += "missing_tasks:${level.levelId}"
                    }
                }

                GameTemplate.SCENE_PLAY -> {
                    val objects = level.sceneConfig["objects"] as? List<*>
                    if (objects.isNullOrEmpty()) {
                        errors += "missing_scene_objects:${level.levelId}"
                    }
                    if (level.interactionRules.isEmpty()) {
                        errors += "missing_interaction_rules:${level.levelId}"
                    }
                }

                else -> Unit
            }
        }
        return errors
    }

    private fun compareVersions(left: String, right: String): Int {
        val leftParts = left.split(".").map { it.toIntOrNull() ?: 0 }
        val rightParts = right.split(".").map { it.toIntOrNull() ?: 0 }
        val maxSize = maxOf(leftParts.size, rightParts.size)
        for (index in 0 until maxSize) {
            val l = leftParts.getOrElse(index) { 0 }
            val r = rightParts.getOrElse(index) { 0 }
            if (l != r) return l.compareTo(r)
        }
        return 0
    }
}

class GameRuntime(
    private val definition: GameDefinition,
    private val level: GameLevelDefinition = definition.levels.firstOrNull() ?: definition.safeFallbackLevel()
) {
    private var state = GameRuntimeState(
        template = definition.template,
        title = definition.title,
        description = definition.description,
        remainingMs = level.durationSec * 1000L
    )
    private val lastRuleExecutionMs = mutableMapOf<MotionRule, Long>()
    private var startedAtMs: Long = 0L
    private var pausedAtMs: Long? = null
    private var accumulatedPausedMs: Long = 0L

    fun start(nowMs: Long): GameRuntimeState {
        startedAtMs = nowMs
        pausedAtMs = null
        accumulatedPausedMs = 0L
        val program = initProgram(nowMs)
        state = GameRuntimeState(
            template = definition.template,
            title = definition.title,
            description = definition.description,
            remainingMs = level.durationSec * 1000L,
            status = GameSessionStatus.ACTIVE,
            sceneState = initialSceneState(nowMs),
            program = program
        )
        return state
    }

    private fun initProgram(nowMs: Long): ProgramRuntimeState {
        val steps = level.programSteps
        if (steps.isEmpty()) return ProgramRuntimeState()
        val runtimeSteps = steps.mapIndexed { index, step ->
            ProgramRuntimeStepState(
                stepId = step.stepId,
                type = step.type,
                title = step.title,
                status = if (index == 0) ProgramStepStatus.ACTIVE else ProgramStepStatus.NOT_STARTED,
                targetCount = step.targetCount,
                startedAtMs = if (index == 0) nowMs else null
            )
        }
        return ProgramRuntimeState(
            activeIndex = 0,
            steps = runtimeSteps,
            completed = false
        )
    }

    fun snapshot(): GameRuntimeState = state

    fun pause(nowMs: Long, reason: String = "Game paused"): GameRuntimeState {
        if (state.status != GameSessionStatus.ACTIVE) {
            return state
        }
        pausedAtMs = nowMs
        state = state.copy(
            status = GameSessionStatus.PAUSED,
            lastEffect = reason
        )
        return state
    }

    fun resume(nowMs: Long, reason: String = "Back in frame"): GameRuntimeState {
        if (state.status != GameSessionStatus.PAUSED) {
            return state
        }
        val pauseStart = pausedAtMs ?: nowMs
        accumulatedPausedMs += (nowMs - pauseStart).coerceAtLeast(0L)
        pausedAtMs = null
        state = state.copy(
            status = GameSessionStatus.ACTIVE,
            lastEffect = reason
        )
        return state
    }

    fun tick(nowMs: Long): GameRuntimeState {
        val elapsed = effectiveElapsed(nowMs)
        val remaining = (level.durationSec * 1000L - elapsed).coerceAtLeast(0L)
        var nextState = state.copy(
            elapsedMs = elapsed,
            remainingMs = remaining
        )

        if (state.status == GameSessionStatus.ACTIVE) {
            nextState = tickProgram(nextState, nowMs)
            val activeStep = getActiveProgramStep(nextState.program)
            val shouldTickTemplate = activeStep == null || activeStep.type == ProgramStepType.PLAY_GAME
            if (shouldTickTemplate) {
                nextState = when (definition.template) {
                    GameTemplate.FRUIT_SLASH -> tickFruitSlash(nextState, nowMs)
                    GameTemplate.DODGE_RUN -> tickDodgeRun(nextState, nowMs)
                    GameTemplate.FIT_CHALLENGE -> nextState
                    GameTemplate.SCENE_PLAY -> tickScenePlay(nextState, nowMs)
                    GameTemplate.TARGET_HIT,
                    GameTemplate.ENDLESS_RUNNER -> nextState
                }
            }
        }

        state = nextState
        if (state.completed || state.remainingMs == 0L) {
            finish(nowMs)
        }
        return state
    }

    private fun tickProgram(currentState: GameRuntimeState, nowMs: Long): GameRuntimeState {
        val program = currentState.program
        if (program.steps.isEmpty() || program.completed) return currentState

        val activeStep = program.steps.getOrNull(program.activeIndex) ?: return currentState
        if (activeStep.status != ProgramStepStatus.ACTIVE) return currentState

        val stepElapsed = activeStep.startedAtMs?.let { nowMs - it } ?: 0L

        val stepCompleted = when (activeStep.type) {
            ProgramStepType.REST -> {
                val durationMs = (level.programSteps.getOrNull(program.activeIndex)?.durationSec ?: 0) * 1000L
                stepElapsed >= durationMs
            }
            ProgramStepType.INSTRUCTION -> {
                val durationSec = level.programSteps.getOrNull(program.activeIndex)?.durationSec ?: 3
                stepElapsed >= durationSec * 1000L
            }
            ProgramStepType.HOLD_POSE -> {
                val holdMs = (level.programSteps.getOrNull(program.activeIndex)?.holdSec ?: 0) * 1000L
                stepElapsed >= holdMs
            }
            ProgramStepType.PLAY_GAME -> {
                val durationSec = level.programSteps.getOrNull(program.activeIndex)?.durationSec
                if (durationSec != null) stepElapsed >= durationSec * 1000L
                else currentState.completed // no duration -> wait for game completion or level end
            }
            ProgramStepType.MOTION_REPS -> false // completed via onMotionEvent
        }

        if (stepCompleted) {
            return advanceProgramStep(currentState, nowMs)
        }

        val remainingMs = when (activeStep.type) {
            ProgramStepType.REST -> {
                val dur = (level.programSteps.getOrNull(program.activeIndex)?.durationSec ?: 0) * 1000L
                (dur - stepElapsed).coerceAtLeast(0L)
            }
            ProgramStepType.HOLD_POSE -> {
                val hold = (level.programSteps.getOrNull(program.activeIndex)?.holdSec ?: 0) * 1000L
                (hold - stepElapsed).coerceAtLeast(0L)
            }
            ProgramStepType.INSTRUCTION -> {
                val dur = (level.programSteps.getOrNull(program.activeIndex)?.durationSec ?: 3) * 1000L
                (dur - stepElapsed).coerceAtLeast(0L)
            }
            else -> null
        }

        val updatedStep = activeStep.copy(remainingMs = remainingMs)
        val updatedSteps = program.steps.toMutableList()
        updatedSteps[program.activeIndex] = updatedStep
        return currentState.copy(program = program.copy(steps = updatedSteps))
    }

    private fun advanceProgramStep(currentState: GameRuntimeState, nowMs: Long): GameRuntimeState {
        val program = currentState.program
        val activeStep = program.steps.getOrNull(program.activeIndex) ?: return currentState

        val completedStep = activeStep.copy(
            status = ProgramStepStatus.COMPLETED,
            completedAtMs = nowMs
        )
        val updatedSteps = program.steps.toMutableList()
        updatedSteps[program.activeIndex] = completedStep

        val stepDef = level.programSteps.getOrNull(program.activeIndex)
        val nextOnComplete = stepDef?.nextOnComplete ?: true
        val isLastStep = program.activeIndex >= program.steps.lastIndex

        if (isLastStep || !nextOnComplete) {
            val nextProgram = program.copy(
                steps = updatedSteps,
                completed = true
            )
            val nextState = currentState.copy(
                program = nextProgram,
                lastEffect = stepDef?.successMessage ?: completedStep.title + " tamamlandi"
            )
            return if (isLastStep) nextState.copy(completed = true) else nextState
        }

        val nextIndex = program.activeIndex + 1
        val nextStep = updatedSteps[nextIndex].copy(
            status = ProgramStepStatus.ACTIVE,
            startedAtMs = nowMs
        )
        updatedSteps[nextIndex] = nextStep

        val nextProgram = program.copy(
            activeIndex = nextIndex,
            steps = updatedSteps
        )
        return currentState.copy(
            program = nextProgram,
            lastEffect = stepDef?.successMessage ?: completedStep.title + " tamamlandi"
        )
    }

    private fun getActiveProgramStep(program: ProgramRuntimeState): ProgramRuntimeStepState? {
        return program.steps.getOrNull(program.activeIndex)
    }

    fun finish(nowMs: Long): GameRuntimeState {
        val elapsed = effectiveElapsed(nowMs)
        val rewards = level.rewards.filter { state.score >= it.minimumScore }
        state = state.copy(
            elapsedMs = elapsed,
            remainingMs = 0L,
            status = GameSessionStatus.FINISHED,
            completed = true,
            grantedRewards = rewards
        )
        return state
    }

    fun onMotionEvent(event: MotionEvent): GameRuntimeState {
        if (event.type == MotionEventType.USER_OUT_OF_FRAME) {
            val activeStep = getActiveProgramStep(state.program)
            if (activeStep?.type == ProgramStepType.HOLD_POSE) {
                return pause(event.timestampMs, "Pozisyon beklemede")
            }
            return pause(event.timestampMs, "Kadraja geri don")
        }
        if (state.status != GameSessionStatus.ACTIVE) {
            return state
        }

        // Program runner gets first chance for MOTION_REPS
        val activeStep = getActiveProgramStep(state.program)
        if (activeStep != null && activeStep.type == ProgramStepType.MOTION_REPS) {
            state = handleProgramMotionReps(event, activeStep)
            return state
        }

        state = when (definition.template) {
            GameTemplate.FRUIT_SLASH -> handleFruitSlashEvent(event)
            GameTemplate.DODGE_RUN -> handleDodgeRunEvent(event)
            GameTemplate.FIT_CHALLENGE -> handleFitChallengeEvent(event)
            GameTemplate.SCENE_PLAY -> handleScenePlayEvent(event)
            GameTemplate.TARGET_HIT,
            GameTemplate.ENDLESS_RUNNER -> handleLegacyEvent(event)
        }
        return state
    }

    private fun handleProgramMotionReps(event: MotionEvent, activeStep: ProgramRuntimeStepState): GameRuntimeState {
        if (event.type != MotionEventType.REP_COUNTED) {
            if (event.type == MotionEventType.BAD_FORM) {
                return invalidate("Bad form", penalty = pointsFor(event.motionType, MotionEventType.BAD_FORM), currentState = state)
            }
            return state.copy(lastEffect = "Hareket sayilamiyor")
        }

        val stepDef = level.programSteps.getOrNull(state.program.activeIndex) ?: return state
        if (stepDef.motion != event.motionType) {
            return state.copy(lastEffect = "Aktif hareket: ${stepDef.motion?.name?.replace("_", " ") ?: "bekleniyor"}")
        }

        val newCount = activeStep.progressCount + 1
        val targetCount = stepDef.targetCount ?: 1
        val completed = newCount >= targetCount

        val motionPoints = pointsFor(event.motionType, MotionEventType.REP_COUNTED)
        val points = motionPoints.takeIf { it > 0 } ?: 0

        val updatedStep = activeStep.copy(
            progressCount = newCount,
            message = if (completed) stepDef.successMessage ?: "${stepDef.title} tamamlandi" else null
        )
        val updatedSteps = state.program.steps.toMutableList()
        updatedSteps[state.program.activeIndex] = updatedStep
        var nextState = scoreRep(
            points = points,
            effect = if (completed) stepDef.successMessage ?: "${stepDef.title} tamamlandi" else "Tekrar: $newCount/$targetCount",
            currentState = state.copy(program = state.program.copy(steps = updatedSteps))
        )

        if (completed) {
            nextState = advanceProgramStep(nextState, event.timestampMs)
        }

        state = nextState
        return state
    }

    fun buildResult(clientSessionKey: String, motionCounts: Map<MotionType, Int>, endedAtMs: Long): GameSessionResult {
        val finishedAt = max(endedAtMs, startedAtMs)
        return GameSessionResult(
            gameId = definition.gameId,
            gameVersion = definition.version,
            score = state.score,
            durationSec = (effectiveElapsed(finishedAt) / 1000L).toInt(),
            motionCounts = motionCounts,
            comboMax = state.comboMax,
            accuracy = state.accuracy,
            startedAtMs = startedAtMs,
            endedAtMs = finishedAt,
            clientSessionKey = clientSessionKey
        )
    }

    private fun handleLegacyEvent(event: MotionEvent): GameRuntimeState {
        val rules = level.motionRules.filter { it.motion == event.motionType && it.event == event.type }
        var nextState = state
        if (rules.isEmpty()) {
            return if (event.type == MotionEventType.BAD_FORM) invalidate("Bad form", penalty = 0, currentState = state) else state
        }
        rules.forEach { rule ->
            if (!canApplyRule(rule, event.timestampMs)) return@forEach
            markRuleApplied(rule, event.timestampMs)
            nextState = when (event.type) {
                MotionEventType.REP_COUNTED -> scoreRep(
                    points = rule.points,
                    effect = rule.actions.firstOrNull { it.type == RuleActionType.SHOW_EFFECT }?.payload ?: "Perfect rep",
                    currentState = nextState
                )

                MotionEventType.BAD_FORM -> invalidate("Bad form", penalty = rule.points, currentState = nextState)
                else -> nextState
            }
        }
        return nextState.copy(
            completed = nextState.completed || nextState.score >= level.targetScore
        )
    }

    private fun handleFruitSlashEvent(event: MotionEvent): GameRuntimeState {
        val currentScene = state.sceneState as? FruitSlashSceneState ?: FruitSlashSceneState()
        return when (event.type) {
            MotionEventType.BAD_FORM -> invalidate(
                effect = "Combo reset",
                penalty = pointsFor(event.motionType, MotionEventType.BAD_FORM),
                currentState = state.copy(sceneState = currentScene)
            )

            MotionEventType.REP_COUNTED -> {
                val explicitTargetId = event.metadata["targetId"]
                val selectedTarget = explicitTargetId
                    ?.let { targetId -> currentScene.targets.firstOrNull { it.id == targetId } }
                    ?: currentScene.targets.firstOrNull { !it.penaltyObject && it.requiredMotion == event.motionType }
                    ?: currentScene.targets.firstOrNull { it.requiredMotion == event.motionType }

                if (selectedTarget?.penaltyObject == true) {
                    val nextTargets = currentScene.targets.filterNot { it.id == selectedTarget.id }
                    invalidate(
                        effect = "Oops! Penalty object",
                        penalty = -level.config.intValue("penaltyPoints", 10),
                        currentState = state.copy(
                            sceneState = currentScene.copy(
                                targets = nextTargets,
                                penaltyCount = currentScene.penaltyCount + 1
                            )
                        )
                    )
                } else {
                    if (selectedTarget == null) {
                        scoreRep(
                            points = pointsFor(event.motionType, MotionEventType.REP_COUNTED),
                            effect = "Instant fruit sliced",
                            currentState = state.copy(
                                sceneState = currentScene.copy(
                                    slicedCount = currentScene.slicedCount + 1
                                )
                            )
                        )
                    } else {
                        val nextTargets = currentScene.targets.filterNot { it.id == selectedTarget.id }
                        scoreRep(
                            points = pointsFor(selectedTarget.requiredMotion, MotionEventType.REP_COUNTED),
                            effect = "${selectedTarget.label} sliced",
                            currentState = state.copy(
                                sceneState = currentScene.copy(
                                    targets = nextTargets,
                                    slicedCount = currentScene.slicedCount + 1
                                )
                            )
                        )
                    }
                }
            }

            else -> state
        }
    }

    private fun handleDodgeRunEvent(event: MotionEvent): GameRuntimeState {
        val currentScene = state.sceneState as? DodgeRunSceneState ?: initialDodgeScene()
        return when (event.type) {
            MotionEventType.BAD_FORM -> {
                val penalty = pointsFor(event.motionType, MotionEventType.BAD_FORM)
                val nextLives = max(0, currentScene.lives - 1)
                val nextState = invalidate(
                    effect = "Wrong move",
                    penalty = penalty,
                    currentState = state.copy(
                        sceneState = currentScene.copy(
                            lives = nextLives,
                            prompt = "Tekrar dene"
                        )
                    )
                )
                nextState.copy(completed = nextLives == 0)
            }

            MotionEventType.REP_COUNTED -> {
                val obstacle = currentScene.obstacles.firstOrNull()
                if (obstacle == null) {
                    val nextEnergy = if (event.motionType == MotionType.JUMP_ROPE) currentScene.energy + 1 else currentScene.energy
                    scoreRep(
                        points = pointsFor(event.motionType, MotionEventType.REP_COUNTED),
                        effect = "Rhythm bonus",
                        currentState = state.copy(
                            sceneState = currentScene.copy(
                                distance = currentScene.distance + 5,
                                energy = nextEnergy,
                                dodgedCount = currentScene.dodgedCount + 1
                            )
                        )
                    )
                } else if (obstacle.requiredMotion == event.motionType) {
                    val nextObstacles = currentScene.obstacles.drop(1)
                    val nextEnergy = if (event.motionType == MotionType.JUMP_ROPE) currentScene.energy + 1 else currentScene.energy
                    scoreRep(
                        points = pointsFor(event.motionType, MotionEventType.REP_COUNTED),
                        effect = "Obstacle cleared",
                        currentState = state.copy(
                            sceneState = currentScene.copy(
                                obstacles = nextObstacles,
                                dodgedCount = currentScene.dodgedCount + 1,
                                energy = nextEnergy,
                                prompt = promptForObstacle(nextObstacles.firstOrNull())
                            )
                        )
                    )
                } else {
                    state.copy(lastEffect = "Prepare for ${promptForObstacle(obstacle)}")
                }
            }

            else -> state
        }
    }

    private fun handleFitChallengeEvent(event: MotionEvent): GameRuntimeState {
        val currentScene = state.sceneState as? FitChallengeSceneState ?: initialFitScene()
        return when (event.type) {
            MotionEventType.BAD_FORM -> {
                val nextQuality = max(0, currentScene.qualityScore - 6)
                invalidate(
                    effect = "Form quality down",
                    penalty = pointsFor(event.motionType, MotionEventType.BAD_FORM),
                    currentState = state.copy(
                        sceneState = currentScene.copy(qualityScore = nextQuality)
                    )
                )
            }

            MotionEventType.REP_COUNTED -> {
                val activeTask = currentScene.tasks.getOrNull(currentScene.activeTaskIndex) ?: return state.copy(completed = true)
                if (activeTask.motion != event.motionType) {
                    return state.copy(lastEffect = "Active task: ${activeTask.motion.name.replace("_", " ")}")
                }

                val updatedTasks = currentScene.tasks.toMutableList()
                val progressedTask = activeTask.copy(currentCount = minOf(activeTask.targetCount, activeTask.currentCount + 1))
                updatedTasks[currentScene.activeTaskIndex] = progressedTask
                val taskCompleted = progressedTask.currentCount >= progressedTask.targetCount
                val nextIndex = if (taskCompleted) currentScene.activeTaskIndex + 1 else currentScene.activeTaskIndex
                val nextScene = currentScene.copy(
                    tasks = updatedTasks,
                    activeTaskIndex = minOf(nextIndex, updatedTasks.lastIndex.coerceAtLeast(0)),
                    completedTasks = if (taskCompleted) currentScene.completedTasks + 1 else currentScene.completedTasks
                )
                val nextState = scoreRep(
                    points = progressedTask.pointsPerRep,
                    effect = if (taskCompleted) "Task complete" else "Goal progress",
                    currentState = state.copy(sceneState = nextScene)
                )
                nextState.copy(completed = nextScene.completedTasks >= updatedTasks.size)
            }

            else -> state
        }
    }

    private fun handleScenePlayEvent(event: MotionEvent): GameRuntimeState {
        val currentScene = state.sceneState as? ScenePlaySceneState ?: initialScenePlay(event.timestampMs)
        return when (event.type) {
            MotionEventType.BAD_FORM -> {
                val nextLives = max(0, currentScene.lives - level.config.intValue("damageOnMiss", 1))
                val nextState = invalidate(
                    effect = "Formu duzelt",
                    penalty = pointsFor(event.motionType, MotionEventType.BAD_FORM),
                    currentState = state.copy(
                        sceneState = currentScene.copy(
                            lives = nextLives,
                            prompt = "Tekrar dene"
                        )
                    )
                )
                nextState.copy(completed = nextLives == 0)
            }

            MotionEventType.REP_COUNTED -> {
                val activeObject = currentScene.objects.firstOrNull()
                if (activeObject == null) {
                    return state.copy(lastEffect = "Yeni komut bekleniyor")
                }
                if (activeObject.requiredMotion != event.motionType) {
                    return state.copy(lastEffect = "Komut: ${activeObject.label}")
                }
                val nextObjects = currentScene.objects.drop(1)
                val nextState = if (activeObject.penaltyObject) {
                    invalidate(
                        effect = "Ceza objesi",
                        penalty = -activeObject.points,
                        currentState = state.copy(
                            sceneState = currentScene.copy(
                                objects = nextObjects,
                                prompt = promptForSceneObject(nextObjects.firstOrNull())
                            )
                        )
                    )
                } else {
                    scoreRep(
                        points = pointsForSceneObject(activeObject),
                        effect = "${activeObject.label} tamam",
                        currentState = state.copy(
                            sceneState = currentScene.copy(
                                objects = nextObjects,
                                clearedCount = currentScene.clearedCount + 1,
                                prompt = promptForSceneObject(nextObjects.firstOrNull())
                            )
                        )
                    )
                }
                nextState.copy(completed = nextState.score >= level.targetScore)
            }

            else -> state
        }
    }

    private fun initialSceneState(nowMs: Long): GameSceneState {
        return when (definition.template) {
            GameTemplate.FRUIT_SLASH -> FruitSlashSceneState(
                targets = listOf(
                    createFruitTarget(
                        nowMs = nowMs,
                        motion = MotionType.JUMPING_JACK,
                        lane = 0,
                        label = "Melon"
                    ),
                    createFruitTarget(
                        nowMs = nowMs + 120L,
                        motion = MotionType.SQUAT,
                        lane = 2,
                        label = "Berry"
                    )
                ),
                nextSpawnAtMs = nowMs + 900L
            )
            GameTemplate.DODGE_RUN -> initialDodgeScene(nowMs)
            GameTemplate.FIT_CHALLENGE -> initialFitScene()
            GameTemplate.SCENE_PLAY -> initialScenePlay(nowMs)
            GameTemplate.TARGET_HIT,
            GameTemplate.ENDLESS_RUNNER -> IdleSceneState
        }
    }

    private fun initialDodgeScene(nowMs: Long = startedAtMs): DodgeRunSceneState {
        return DodgeRunSceneState(
            lives = level.config.intValue("lives", 3),
            nextSpawnAtMs = nowMs + 600L,
            prompt = "Hazır"
        )
    }

    private fun initialFitScene(): FitChallengeSceneState {
        return FitChallengeSceneState(
            tasks = level.tasks.map {
                FitChallengeTaskProgress(
                    motion = it.motion,
                    targetCount = it.targetCount,
                    pointsPerRep = it.pointsPerRep
                )
            }
        )
    }

    private fun initialScenePlay(nowMs: Long = startedAtMs): ScenePlaySceneState {
        return ScenePlaySceneState(
            lives = level.config.intValue("lives", 3),
            nextSpawnAtMs = nowMs,
            prompt = "Hazir"
        )
    }

    private fun tickFruitSlash(currentState: GameRuntimeState, nowMs: Long): GameRuntimeState {
        val scene = currentState.sceneState as? FruitSlashSceneState ?: FruitSlashSceneState()
        var nextTargets = scene.targets.filterNot { nowMs - it.spawnedAtMs > it.lifeMs }
        val missedDelta = scene.targets.size - nextTargets.size
        var nextScene = scene.copy(
            targets = nextTargets,
            missedCount = scene.missedCount + max(0, missedDelta)
        )

        val maxObjects = level.sceneConfig.intValue("maxObjects", 5)
        if (nowMs >= scene.nextSpawnAtMs && nextTargets.size < maxObjects) {
            val spawnRateMs = level.config.longValue("spawnRateMs", 900L)
            val includePenalty = level.config.booleanValue("penaltyObjects", true)
            val penaltySpawn = includePenalty && Random.nextInt(100) < 18
            val motion = if (Random.nextBoolean()) MotionType.JUMPING_JACK else MotionType.SQUAT
            val label = when {
                penaltySpawn -> "Bomb"
                motion == MotionType.JUMPING_JACK -> "Melon"
                else -> "Berry"
            }
            nextTargets = nextTargets + createFruitTarget(
                nowMs = nowMs,
                motion = motion,
                lane = Random.nextInt(0, 3),
                label = label,
                penaltyObject = penaltySpawn
            )
            nextScene = nextScene.copy(
                targets = nextTargets,
                nextSpawnAtMs = nowMs + spawnRateMs
            )
        }

        return currentState.copy(sceneState = nextScene)
    }

    private fun tickDodgeRun(currentState: GameRuntimeState, nowMs: Long): GameRuntimeState {
        val scene = currentState.sceneState as? DodgeRunSceneState ?: initialDodgeScene(nowMs)
        val travelMs = level.sceneConfig.longValue("travelMs", 2100L)
        val expired = scene.obstacles.filter { nowMs - it.spawnedAtMs > it.travelMs }
        var nextLives = max(0, scene.lives - expired.size * level.config.intValue("damageOnMiss", 1))
        var nextScene = scene.copy(
            obstacles = scene.obstacles.filterNot { nowMs - it.spawnedAtMs > it.travelMs },
            lives = nextLives,
            missedCount = scene.missedCount + expired.size,
            distance = scene.distance + level.config.intValue("baseDistancePerTick", 2),
            prompt = promptForObstacle(scene.obstacles.firstOrNull())
        )

        if (nowMs >= scene.nextSpawnAtMs && nextScene.obstacles.size < 3) {
            val obstacleType = randomObstacleType()
            val requiredMotion = when (obstacleType) {
                DodgeObstacleType.DUCK -> MotionType.SQUAT
                DodgeObstacleType.JUMP -> MotionType.JUMPING_JACK
                DodgeObstacleType.BOOST -> MotionType.JUMP_ROPE
            }
            val nextObstacle = DodgeObstacle(
                id = UUID.randomUUID().toString(),
                type = obstacleType,
                assetKey = assetKeyForObstacle(obstacleType),
                requiredMotion = requiredMotion,
                spawnedAtMs = nowMs,
                travelMs = travelMs
            )
            nextScene = nextScene.copy(
                obstacles = nextScene.obstacles + nextObstacle,
                nextSpawnAtMs = nowMs + level.config.longValue("obstacleSpawnMs", 1400L),
                prompt = promptForObstacle(nextObstacle)
            )
        }

        val effect = if (expired.isNotEmpty()) "Obstacle missed" else currentState.lastEffect
        val nextState = currentState.copy(
            sceneState = nextScene,
            lastEffect = effect
        )
        return nextState.copy(completed = nextLives == 0)
    }

    private fun tickScenePlay(currentState: GameRuntimeState, nowMs: Long): GameRuntimeState {
        val scene = currentState.sceneState as? ScenePlaySceneState ?: initialScenePlay(nowMs)
        val expired = scene.objects.filter { nowMs - it.spawnedAtMs > it.lifeMs }
        var nextLives = max(0, scene.lives - expired.size * level.config.intValue("damageOnMiss", 1))
        var nextObjects = scene.objects.filterNot { nowMs - it.spawnedAtMs > it.lifeMs }
        var nextScene = scene.copy(
            objects = nextObjects,
            lives = nextLives,
            missedCount = scene.missedCount + expired.size,
            prompt = promptForSceneObject(nextObjects.firstOrNull())
        )

        val maxObjects = level.sceneConfig.intValue("maxObjects", 1).coerceAtLeast(1)
        if (nowMs >= scene.nextSpawnAtMs && nextObjects.size < maxObjects) {
            val spawned = createScenePlayObject(nowMs)
            nextObjects = nextObjects + spawned
            nextScene = nextScene.copy(
                objects = nextObjects,
                nextSpawnAtMs = nowMs + level.config.longValue("spawnRateMs", 1800L),
                prompt = promptForSceneObject(spawned)
            )
        }

        return currentState.copy(
            sceneState = nextScene,
            lastEffect = if (expired.isNotEmpty()) "Komut kacirildi" else currentState.lastEffect,
            completed = nextLives == 0
        )
    }

    private fun promptForObstacle(obstacle: DodgeObstacle?): String {
        return when (obstacle?.type) {
            DodgeObstacleType.DUCK -> "Squat yap"
            DodgeObstacleType.JUMP -> "Zıplama zamanı"
            DodgeObstacleType.BOOST -> "Jump rope ile boost"
            null -> "Hazır"
        }
    }

    private fun promptForSceneObject(sceneObject: ScenePlayObject?): String {
        return sceneObject?.let { "${it.label}: ${it.requiredMotion.name.replace("_", " ")}" } ?: "Hazir"
    }

    private fun scoreRep(points: Int, effect: String, currentState: GameRuntimeState): GameRuntimeState {
        val validCount = currentState.validMotionCount + 1
        val combo = currentState.combo + 1
        return currentState.copy(
            score = currentState.score + points,
            combo = combo,
            comboMax = max(currentState.comboMax, combo),
            accuracy = accuracy(validCount, currentState.invalidMotionCount),
            lastEffect = effect,
            validMotionCount = validCount
        )
    }

    private fun invalidate(effect: String, penalty: Int, currentState: GameRuntimeState): GameRuntimeState {
        val invalidCount = currentState.invalidMotionCount + 1
        return currentState.copy(
            score = max(0, currentState.score + penalty),
            combo = 0,
            accuracy = accuracy(currentState.validMotionCount, invalidCount),
            lastEffect = effect,
            invalidMotionCount = invalidCount
        )
    }

    private fun canApplyRule(rule: MotionRule, nowMs: Long): Boolean {
        val lastRun = lastRuleExecutionMs[rule] ?: Long.MIN_VALUE
        return nowMs - lastRun >= rule.cooldownMs
    }

    private fun markRuleApplied(rule: MotionRule, nowMs: Long) {
        lastRuleExecutionMs[rule] = nowMs
    }

    private fun pointsFor(motionType: MotionType, eventType: MotionEventType): Int {
        return level.motionRules.firstOrNull { it.motion == motionType && it.event == eventType }?.points ?: 0
    }

    private fun effectiveElapsed(nowMs: Long): Long {
        val activeReference = pausedAtMs ?: nowMs
        return (activeReference - startedAtMs - accumulatedPausedMs).coerceAtLeast(0L)
    }

    private fun accuracy(valid: Int, invalid: Int): Float {
        val total = valid + invalid
        return if (total == 0) 1f else valid.toFloat() / total.toFloat()
    }

    private fun randomObstacleType(): DodgeObstacleType {
        return when (Random.nextInt(3)) {
            0 -> DodgeObstacleType.DUCK
            1 -> DodgeObstacleType.JUMP
            else -> DodgeObstacleType.BOOST
        }
    }

    private fun createFruitTarget(
        nowMs: Long,
        motion: MotionType,
        lane: Int,
        label: String,
        penaltyObject: Boolean = false
    ): FruitTarget {
        return FruitTarget(
            id = UUID.randomUUID().toString(),
            label = label,
            assetKey = when {
                penaltyObject -> "bomb"
                motion == MotionType.SQUAT -> "bonus"
                else -> "fruit"
            },
            requiredMotion = motion,
            lane = lane.coerceIn(0, level.sceneConfig.intValue("laneCount", 3).coerceAtLeast(1) - 1),
            spawnedAtMs = nowMs,
            lifeMs = level.sceneConfig.longValue("defaultObjectLifeMs", 2600L),
            hitRadius = level.sceneConfig.floatValue("defaultHitRadius", 0.18f),
            penaltyObject = penaltyObject
        )
    }

    private fun createScenePlayObject(nowMs: Long): ScenePlayObject {
        val definitions = level.sceneConfig.sceneObjectDefinitions()
        val selected = definitions.randomOrNull() ?: emptyMap()
        val requiredMotion = selected.stringValue("requiredMotion").toMotionTypeOrNull() ?: MotionType.SQUAT
        val objectType = selected.stringValue("objectType", "prompt")
        return ScenePlayObject(
            id = UUID.randomUUID().toString(),
            objectType = objectType,
            label = selected.stringValue("label", objectType),
            assetKey = selected.stringValue("assetKey", objectType),
            requiredMotion = requiredMotion,
            points = selected.intValue("points", pointsFor(requiredMotion, MotionEventType.REP_COUNTED).takeIf { it > 0 } ?: 10),
            spawnedAtMs = nowMs,
            lifeMs = selected.longValue("lifeMs", level.sceneConfig.longValue("defaultObjectLifeMs", 2400L)),
            hitRadius = selected.floatValue("hitRadius", level.sceneConfig.floatValue("defaultHitRadius", 0.2f)),
            penaltyObject = selected.booleanValue("isPenalty", false)
        )
    }

    private fun pointsForSceneObject(sceneObject: ScenePlayObject): Int {
        return level.interactionRules.firstOrNull {
            it.input == "MOTION_EVENT" &&
                it.event == MotionEventType.REP_COUNTED &&
                it.motion == sceneObject.requiredMotion &&
                (it.targetObjectType == null || it.targetObjectType == sceneObject.objectType)
        }?.points?.takeIf { it != 0 } ?: sceneObject.points
    }

    private fun assetKeyForObstacle(type: DodgeObstacleType): String {
        return when (type) {
            DodgeObstacleType.DUCK -> "lowObstacle"
            DodgeObstacleType.JUMP -> "jumpObstacle"
            DodgeObstacleType.BOOST -> "boostOrb"
        }
    }
}

private fun GameDefinition.safeFallbackLevel(): GameLevelDefinition {
    return GameLevelDefinition(
        levelId = "${gameId}_safe_level",
        durationSec = 60,
        targetScore = 0,
        difficulty = "SAFE",
        motionRules = emptyList(),
        rewards = emptyList(),
        config = emptyMap(),
        sceneConfig = emptyMap(),
        interactionRules = emptyList(),
        tasks = emptyList()
    )
}

private fun Map<String, Any>.intValue(key: String, default: Int = 0): Int {
    val value = this[key] ?: return default
    return when (value) {
        is Number -> value.toInt()
        is String -> value.toIntOrNull() ?: default
        else -> default
    }
}

private fun Map<String, Any>.longValue(key: String, default: Long = 0L): Long {
    val value = this[key] ?: return default
    return when (value) {
        is Number -> value.toLong()
        is String -> value.toLongOrNull() ?: default
        else -> default
    }
}

private fun Map<String, Any>.floatValue(key: String, default: Float = 0f): Float {
    val value = this[key] ?: return default
    return when (value) {
        is Number -> value.toFloat()
        is String -> value.toFloatOrNull() ?: default
        else -> default
    }
}

private fun Map<String, Any>.booleanValue(key: String, default: Boolean = false): Boolean {
    val value = this[key] ?: return default
    return when (value) {
        is Boolean -> value
        is String -> value.equals("true", ignoreCase = true)
        else -> default
    }
}

private fun Map<String, Any>.stringValue(key: String, default: String = ""): String {
    val value = this[key] ?: return default
    return value.toString().takeIf { it.isNotBlank() } ?: default
}

private fun Map<String, Any>.sceneObjectDefinitions(): List<Map<String, Any>> {
    val rawObjects = this["objects"] as? List<*> ?: return emptyList()
    return rawObjects.mapNotNull { raw ->
        @Suppress("UNCHECKED_CAST")
        raw as? Map<String, Any>
    }
}

private fun String.toMotionTypeOrNull(): MotionType? {
    return MotionType.values().firstOrNull { it.name.equals(this, ignoreCase = true) }
}
