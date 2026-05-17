package com.alba.core.runtime

import com.alba.core.motion.MotionEvent
import java.util.UUID
import kotlin.math.max

class PoseContactHandler : GameMechanicHandler {
    override val mechanicKind = "POSE_CONTACT"

    override fun createInitialState(settings: GameSettings): GenericSceneState {
        val lives = if (settings.common.lives.mode == "LIMITED") settings.common.lives.count else 999
        return GenericSceneState(lives = lives)
    }

    override fun tick(state: GenericSceneState, settings: GameSettings, nowMs: Long, deltaMs: Long): GenericSceneState {
        if (state.completed || state.failed) return state
        var s = state.copy(elapsedMs = state.elapsedMs + deltaMs)

        val mechanic = settings.mechanic as? PoseContactMechanic ?: return s

        // Sure kontrolu
        if (settings.common.duration.mode == "TIMED") {
            if (s.elapsedMs >= settings.common.duration.sec * 1000L) {
                return s.copy(completed = true, feedback = FeedbackState("Sure doldu!", FeedbackKind.INFO, nowMs + 2000))
            }
        }

        // Aktif target'lari yonet
        s = manageTargets(s, mechanic, nowMs)

        // Can kontrolu
        if (s.elapsedMs >= settings.common.lives.gracePeriodSec * 1000L &&
            settings.common.lives.mode == "LIMITED" && s.lives <= 0) {
            return s.copy(failed = true)
        }

        // Feedback temizligi
        val fb = s.feedback
        if (fb != null && nowMs >= fb.expiresAtMs) s = s.copy(feedback = null)

        return s
    }

    override fun onMotionEvent(state: GenericSceneState, event: MotionEvent, settings: GameSettings, nowMs: Long): GenericSceneState {
        if (state.completed || state.failed) return state
        var s = state
        val mechanic = settings.mechanic as? PoseContactMechanic ?: return s

        when (event.type) {
            com.alba.core.motion.MotionEventType.BAD_FORM -> {
                if (nowMs - s.lastBadFormMs < 500L) return s
                s = s.copy(lastBadFormMs = nowMs)
                if (settings.common.lives.mode == "LIMITED") {
                    s = s.copy(lives = s.lives - 1)
                }
            }
            com.alba.core.motion.MotionEventType.USER_OUT_OF_FRAME -> {
                if (settings.common.lives.loseOnOutOfFrame && settings.common.lives.mode == "LIMITED") {
                    s = s.copy(lives = s.lives - 1)
                }
            }
            else -> { /* hedef vuruslari AlbaMotionController.buildGamePoseInteractionEvent ile gelir */ }
        }

        return s
    }

    private fun manageTargets(state: GenericSceneState, mechanic: PoseContactMechanic, nowMs: Long): GenericSceneState {
        var s = state
        // Suresi dolan target'lari deaktive et
        val expiredTargets = s.activeObjects.filter { nowMs - it.spawnedAtMs >= mechanic.spawn.visibleMs }
        for (obj in expiredTargets) {
            if (mechanic.hitDetection.loseLifeOnTimeout) {
                s = s.copy(lives = s.lives - 1)
            }
        }
        s = s.copy(activeObjects = s.activeObjects.filter { nowMs - it.spawnedAtMs < mechanic.spawn.visibleMs })

        // Yeni target spawn et
        if (s.activeObjects.size < mechanic.spawn.maxActiveTargets && nowMs - s.lastSpawnMs >= mechanic.spawn.intervalMs) {
            val inactiveTargets = mechanic.targets.filter { t ->
                s.activeObjects.none { it.id == t.targetId }
            }
            if (inactiveTargets.isNotEmpty()) {
                val target = when (mechanic.spawn.activateMode) {
                    "SEQUENCE" -> inactiveTargets[s.spawnIndex % inactiveTargets.size]
                    "ALL_AT_ONCE" -> {
                        if (s.spawnIndex == 0) {
                            // Tumunu birden spawn et
                            val allObjects = inactiveTargets.map { t ->
                                ActiveObject(
                                    id = t.targetId,
                                    objectConfig = MotionArcadeObject(t.targetId, "", t.assetKey, "", t.points),
                                    spawnedAtMs = nowMs
                                )
                            }
                            return s.copy(activeObjects = s.activeObjects + allObjects, lastSpawnMs = nowMs, spawnIndex = 1)
                        }
                        return s
                    }
                    else -> inactiveTargets.random()
                }
                val activeObj = ActiveObject(
                    id = target.targetId,
                    objectConfig = MotionArcadeObject(target.targetId, "", target.assetKey, "", target.points),
                    spawnedAtMs = nowMs
                )
                s = s.copy(
                    activeObjects = s.activeObjects + activeObj,
                    lastSpawnMs = nowMs,
                    spawnIndex = s.spawnIndex + 1
                )
            }
        }

        return s
    }
}

// --- Quiz Handler ---
class QuizHandler : GameMechanicHandler {
    override val mechanicKind = "QUIZ"

    override fun createInitialState(settings: GameSettings): GenericSceneState = GenericSceneState(lives = 0)

    override fun tick(state: GenericSceneState, settings: GameSettings, nowMs: Long, deltaMs: Long): GenericSceneState {
        if (state.completed || state.failed) return state
        val s = state.copy(elapsedMs = state.elapsedMs + deltaMs)
        val mechanic = settings.mechanic as? QuizMechanic ?: return s

        if (mechanic.questions.isEmpty()) return s.copy(completed = true)

        // Tum sorular cevaplandi mi?
        if (s.answeredQuestionIds.size >= mechanic.questions.size) {
            return s.copy(completed = true, feedback = FeedbackState("Tum sorular tamam!", FeedbackKind.POSITIVE, nowMs + 2000))
        }

        return s
    }

    override fun onMotionEvent(state: GenericSceneState, event: MotionEvent, settings: GameSettings, nowMs: Long): GenericSceneState = state
}

// --- Study Handler ---
class StudyHandler : GameMechanicHandler {
    override val mechanicKind = "STUDY"

    override fun createInitialState(settings: GameSettings): GenericSceneState = GenericSceneState(lives = 0)

    override fun tick(state: GenericSceneState, settings: GameSettings, nowMs: Long, deltaMs: Long): GenericSceneState {
        if (state.completed || state.failed) return state
        val s = state.copy(elapsedMs = state.elapsedMs + deltaMs)
        val mechanic = settings.mechanic as? StudyMechanic ?: return s

        val totalItems = when (mechanic.studyType) {
            "FLASHCARD" -> mechanic.cards?.size ?: 0
            "MEMORY_MATCH", "MATCH_PAIRS" -> mechanic.pairs?.size ?: 0
            else -> 0
        }

        if (totalItems > 0 && state.currentCardIndex >= totalItems) {
            return s.copy(completed = true)
        }

        return s
    }

    override fun onMotionEvent(state: GenericSceneState, event: MotionEvent, settings: GameSettings, nowMs: Long): GenericSceneState = state
}

// --- Hold Handler ---
class HoldHandler : GameMechanicHandler {
    override val mechanicKind = "HOLD"

    override fun createInitialState(settings: GameSettings): GenericSceneState {
        val lives = if (settings.common.lives.mode == "LIMITED") settings.common.lives.count else 0
        return GenericSceneState(lives = lives)
    }

    override fun tick(state: GenericSceneState, settings: GameSettings, nowMs: Long, deltaMs: Long): GenericSceneState {
        if (state.completed || state.failed) return state
        var s = state.copy(elapsedMs = state.elapsedMs + deltaMs)

        val mechanic = settings.mechanic as? HoldMechanic ?: return s

        if (settings.common.duration.mode == "TIMED" && s.elapsedMs >= settings.common.duration.sec * 1000L) {
            return s.copy(completed = true, feedback = FeedbackState("Sure doldu!", FeedbackKind.POSITIVE, nowMs + 2000))
        }

        // Hold aktifse sureyi biriktir
        val holdStart = s.holdStartMs
        if (holdStart != null) {
            val accumulated = s.holdAccumulatedMs + deltaMs
            s = s.copy(holdAccumulatedMs = accumulated)

            if (accumulated >= mechanic.targetHoldSec * 1000L) {
                return s.copy(completed = true, feedback = FeedbackState("Poz tamamlandi!", FeedbackKind.POSITIVE, nowMs + 2000))
            }
        }

        return s
    }

    override fun onMotionEvent(state: GenericSceneState, event: MotionEvent, settings: GameSettings, nowMs: Long): GenericSceneState {
        if (state.completed || state.failed) return state
        val mechanic = settings.mechanic as? HoldMechanic ?: return state

        return when (event.type) {
            com.alba.core.motion.MotionEventType.REP_COUNTED -> {
                // Dogru poz → hold baslat veya devam ettir
                if (state.holdStartMs == null) state.copy(holdStartMs = nowMs)
                else state
            }
            com.alba.core.motion.MotionEventType.BAD_FORM -> {
                // Yanlis form → hold bozuldu
                if (settings.common.lives.loseOnBadForm && settings.common.lives.mode == "LIMITED") {
                    state.copy(lives = state.lives - 1, holdStartMs = null)
                } else state.copy(holdStartMs = null)
            }
            com.alba.core.motion.MotionEventType.PAUSED,
            com.alba.core.motion.MotionEventType.USER_OUT_OF_FRAME -> {
                state.copy(holdStartMs = null)
            }
            else -> state
        }
    }
}

// --- Rhythm Handler ---
class RhythmHandler : GameMechanicHandler {
    override val mechanicKind = "RHYTHM"

    override fun createInitialState(settings: GameSettings): GenericSceneState {
        val lives = if (settings.common.lives.mode == "LIMITED") settings.common.lives.count else 999
        return GenericSceneState(lives = lives)
    }

    override fun tick(state: GenericSceneState, settings: GameSettings, nowMs: Long, deltaMs: Long): GenericSceneState {
        if (state.completed || state.failed) return state
        var s = state.copy(elapsedMs = state.elapsedMs + deltaMs)

        val mechanic = settings.mechanic as? RhythmMechanic ?: return s

        if (settings.common.duration.mode == "TIMED" && s.elapsedMs >= settings.common.duration.sec * 1000L) {
            return s.copy(completed = true)
        }

        // Sureasi gecen notalari kacirilmis say
        if (mechanic.notes.isNotEmpty()) {
            val nextNoteIdx = s.lastNoteIndex + 1
            if (nextNoteIdx < mechanic.notes.size) {
                val nextNote = mechanic.notes[nextNoteIdx]
                if (s.elapsedMs > nextNote.timingMs + nextNote.windowMs) {
                    s = s.copy(lastNoteIndex = nextNoteIdx, notesMissed = s.notesMissed + 1)
                }
            }
            if (s.lastNoteIndex >= mechanic.notes.size - 1 && s.elapsedMs > mechanic.notes.last().timingMs + 500) {
                s = s.copy(completed = true)
            }
        }

        return s
    }

    override fun onMotionEvent(state: GenericSceneState, event: MotionEvent, settings: GameSettings, nowMs: Long): GenericSceneState {
        if (state.completed || state.failed || event.type != com.alba.core.motion.MotionEventType.REP_COUNTED) return state

        val mechanic = settings.mechanic as? RhythmMechanic ?: return state
        val nextIdx = state.lastNoteIndex + 1
        if (nextIdx >= mechanic.notes.size) return state

        val note = mechanic.notes[nextIdx]
        val timingDelta = kotlin.math.abs(state.elapsedMs - note.timingMs)

        if (timingDelta <= note.windowMs && event.motionType.name.equals(note.motion, ignoreCase = true)) {
            val bonus = if (timingDelta <= note.windowMs / 2) (note.points * 1.5).toInt() else note.points
            return state.copy(
                lastNoteIndex = nextIdx,
                notesHit = state.notesHit + 1,
                score = state.score + bonus,
                combo = state.combo + 1,
                feedback = FeedbackState("+$bonus", FeedbackKind.POSITIVE, nowMs + 800)
            )
        }

        return state
    }
}

// --- Program Handler ---
class ProgramHandler : GameMechanicHandler {
    override val mechanicKind = "PROGRAM"

    override fun createInitialState(settings: GameSettings): GenericSceneState = GenericSceneState(lives = 0)

    override fun tick(state: GenericSceneState, settings: GameSettings, nowMs: Long, deltaMs: Long): GenericSceneState {
        if (state.completed || state.failed) return state
        var s = state.copy(elapsedMs = state.elapsedMs + deltaMs)

        val mechanic = settings.mechanic as? ProgramMechanic ?: return s
        if (mechanic.steps.isEmpty()) return s.copy(completed = true)

        val currentStep = mechanic.steps.getOrNull(s.activeStepIndex) ?: return s.copy(completed = true)

        when (currentStep.type) {
            "REST", "INSTRUCTION" -> {
                val stepDuration = (currentStep.durationSec ?: 5) * 1000L
                if (s.elapsedMs - s.stepStartMs >= stepDuration) {
                    s = advanceStep(s, mechanic)
                }
            }
            "PLAY_GAME" -> {
                // PLAY_GAME adimi: bu adimin suresi dolduysa ilerle
                val stepDuration = (currentStep.durationSec ?: 0) * 1000L
                if (stepDuration > 0 && s.elapsedMs - s.stepStartMs >= stepDuration) {
                    s = if (currentStep.nextOnComplete) advanceStep(s, mechanic) else s.copy(completed = true)
                }
            }
        }

        return s
    }

    override fun onMotionEvent(state: GenericSceneState, event: MotionEvent, settings: GameSettings, nowMs: Long): GenericSceneState {
        if (state.completed || state.failed) return state
        val mechanic = settings.mechanic as? ProgramMechanic ?: return state

        val currentStep = mechanic.steps.getOrNull(state.activeStepIndex) ?: return state

        if (currentStep.type == "MOTION_REPS" && event.type == com.alba.core.motion.MotionEventType.REP_COUNTED) {
            if (event.motionType.name.equals(currentStep.motion, ignoreCase = true)) {
                val newRepCount = state.stepRepCount + 1
                val target = currentStep.targetCount ?: Int.MAX_VALUE
                val points = currentStep.pointsPerRep ?: 10
                var s = state.copy(
                    stepRepCount = newRepCount,
                    score = state.score + points,
                    feedback = FeedbackState("+$points", FeedbackKind.POSITIVE, nowMs + 800)
                )

                if (newRepCount >= target) {
                    s = advanceStep(s, mechanic)
                }
                return s
            }
        }

        if (event.type == com.alba.core.motion.MotionEventType.BAD_FORM) {
            val penalty = settings.common.scoring.penaltyPerWrong
            return state.copy(
                score = max(0, state.score - penalty),
                combo = 0,
                feedback = FeedbackState("Formu duzelt", FeedbackKind.NEGATIVE, nowMs + 1500)
            )
        }

        return state
    }

    private fun advanceStep(state: GenericSceneState, mechanic: ProgramMechanic): GenericSceneState {
        val nextIndex = state.activeStepIndex + 1
        return if (nextIndex >= mechanic.steps.size) {
            state.copy(completed = true, completedSteps = state.completedSteps + 1)
        } else {
            state.copy(
                activeStepIndex = nextIndex,
                stepRepCount = 0,
                stepStartMs = state.elapsedMs,
                completedSteps = state.completedSteps + 1
            )
        }
    }
}
