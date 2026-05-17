package com.alba.core.runtime

import com.alba.core.motion.MotionEvent
import com.alba.core.motion.MotionEventType
import java.util.UUID
import kotlin.math.max

// SCENE_PLAY, FRUIT_SLASH, DODGE_RUN ve diger motion arcade oyunlari icin handler
// 6 eski handler fonksiyonunun (handleScenePlayEvent, handleFruitSlashEvent,
// handleDodgeRunEvent, tickScenePlay, tickFruitSlash, tickDodgeRun) yerini alir

class MotionArcadeHandler : GameMechanicHandler {
    override val mechanicKind = "MOTION_ARCADE"

    companion object {
        const val BAD_FORM_COOLDOWN_MS = 500L
    }

    override fun createInitialState(settings: GameSettings): GenericSceneState {
        val lives = if (settings.common.lives.mode == "LIMITED") settings.common.lives.count
                    else if (settings.common.lives.mode == "UNLIMITED") 999
                    else 0
        return GenericSceneState(lives = lives)
    }

    override fun tick(
        state: GenericSceneState,
        settings: GameSettings,
        nowMs: Long,
        deltaMs: Long
    ): GenericSceneState {
        if (state.completed || state.failed) return state

        var s = state.copy(elapsedMs = state.elapsedMs + deltaMs)
        val mechanic = settings.mechanic as? MotionArcadeMechanic ?: return s

        // 1. Sure kontrolu
        val dur = settings.common.duration
        if (dur.mode == "TIMED") {
            val totalMs = dur.sec * 1000L
            if (s.elapsedMs >= totalMs) {
                return s.copy(
                    completed = true,
                    feedback = FeedbackState("Sure doldu!", FeedbackKind.INFO, nowMs + 2000)
                )
            }
        }

        // 2. Suresi dolan nesneleri temizle
        s = expireObjects(s, mechanic, settings, nowMs)

        // 3. Can kontrolu (grace period haric)
        val lives = settings.common.lives
        if (!isGraceActive(s, settings) && lives.mode == "LIMITED" && s.lives <= 0) {
            return s.copy(failed = true)
        }

        // 4. Yeni nesne spawn et
        s = spawnObjects(s, mechanic, nowMs)

        // 5. Feedback temizligi
        s = clearExpiredFeedback(s, nowMs)

        // 6. Skor hedefi kontrolu
        if (settings.common.completion.allowEarlyFinish &&
            settings.common.completion.primary == "SCORE_TARGET" &&
            s.score >= settings.common.scoring.targetScore
        ) {
            s = s.copy(
                completed = true,
                feedback = FeedbackState("Hedef skora ulasildi!", FeedbackKind.POSITIVE, nowMs + 2000)
            )
        }

        return s
    }

    override fun onMotionEvent(
        state: GenericSceneState,
        event: MotionEvent,
        settings: GameSettings,
        nowMs: Long
    ): GenericSceneState {
        if (state.completed || state.failed) return state

        var s = state
        val mechanic = settings.mechanic as? MotionArcadeMechanic ?: return s

        when (event.type) {
            MotionEventType.BAD_FORM -> {
                s = handleBadForm(s, settings, nowMs)
            }

            MotionEventType.USER_OUT_OF_FRAME -> {
                s = handleOutOfFrame(s, settings, nowMs)
            }

            MotionEventType.REP_COUNTED -> {
                s = handleRepCounted(s, event, mechanic, settings, nowMs)
            }

            else -> { /* POSE_STARTED, POSE_HELD, POSE_LOST — MotionArcade'de kullanilmaz */ }
        }

        // Skor hedefi kontrolu
        if (settings.common.completion.allowEarlyFinish &&
            settings.common.completion.primary == "SCORE_TARGET" &&
            s.score >= settings.common.scoring.targetScore
        ) {
            s = s.copy(completed = true)
        }

        return s
    }

    // --- Private helpers ---

    private fun handleBadForm(
        state: GenericSceneState,
        settings: GameSettings,
        nowMs: Long
    ): GenericSceneState {
        if (nowMs - state.lastBadFormMs < BAD_FORM_COOLDOWN_MS) return state

        var s = state.copy(lastBadFormMs = nowMs)
        val lives = settings.common.lives

        // Can eksilt
        if (lives.loseOnBadForm && lives.mode == "LIMITED") {
            s = s.copy(lives = s.lives - 1)
        }

        // Puan cezasi
        val penalty = settings.common.scoring.penaltyPerWrong
        s = s.copy(
            score = max(0, s.score - penalty),
            combo = 0,
            feedback = FeedbackState("Formu duzelt", FeedbackKind.NEGATIVE, nowMs + 1500)
        )

        return s
    }

    private fun handleOutOfFrame(
        state: GenericSceneState,
        settings: GameSettings,
        nowMs: Long
    ): GenericSceneState {
        val lives = settings.common.lives
        if (lives.loseOnOutOfFrame && lives.mode == "LIMITED") {
            return state.copy(lives = state.lives - 1)
        }
        return state
    }

    private fun handleRepCounted(
        state: GenericSceneState,
        event: MotionEvent,
        mechanic: MotionArcadeMechanic,
        settings: GameSettings,
        nowMs: Long
    ): GenericSceneState {
        var s = state

        // Objeyle eslestir
        val matchResult = findMatch(s.activeObjects, event, mechanic)
        if (matchResult != null) {
            val (obj, points) = matchResult
            val calculatedPoints = calculatePoints(obj, s.combo, settings)
            s = s.copy(
                activeObjects = s.activeObjects.filter { it.id != obj.id },
                score = s.score + calculatedPoints,
                combo = s.combo + 1,
                feedback = FeedbackState("+$calculatedPoints", FeedbackKind.POSITIVE, nowMs + 1000),
                lastMotion = event.motionType.name
            )
        } else {
            // Eslesme yok — combo sifirlanir
            s = s.copy(
                combo = 0,
                feedback = FeedbackState("Tekrar dene", FeedbackKind.NEGATIVE, nowMs + 1500)
            )
        }

        return s
    }

    private fun findMatch(
        objects: List<ActiveObject>,
        event: MotionEvent,
        mechanic: MotionArcadeMechanic
    ): Pair<ActiveObject, Int>? {
        val match = mechanic.match
        val motionName = event.motionType.name

        return when (match.strategy) {
            "BY_TARGET_ID" -> {
                val targetId = event.metadata["targetId"] as? String
                objects.firstOrNull { it.id == targetId && !it.isHit }
            }
            "BY_MOTION", "ANY_CORRECT" -> {
                objects.firstOrNull { obj ->
                    !obj.isHit && (match.strategy == "ANY_CORRECT" ||
                        obj.objectConfig.requiredMotion.equals(motionName, ignoreCase = true))
                }
            }
            else -> objects.firstOrNull { obj -> !obj.isHit }
        }?.let { obj -> obj to obj.objectConfig.points }
    }

    private fun calculatePoints(obj: ActiveObject, combo: Int, settings: GameSettings): Int {
        val scoring = settings.common.scoring
        var points = obj.objectConfig.points
        if (scoring.comboEnabled && combo > 0) {
            val multiplier = 1.0f + (combo * scoring.comboMultiplier)
                .coerceAtMost(scoring.maxComboMultiplier - 1.0f)
            points = (points * multiplier).toInt()
        }
        return points
    }

    private fun spawnObjects(
        state: GenericSceneState,
        mechanic: MotionArcadeMechanic,
        nowMs: Long
    ): GenericSceneState {
        if (state.activeObjects.size >= mechanic.spawn.maxActive) return state
        if (nowMs - state.lastSpawnMs < mechanic.spawn.intervalMs) return state

        val objects = mechanic.objects
        if (objects.isEmpty()) return state

        // Ceza nesnelerini de ekle
        val allObjects = if (mechanic.penaltyObjects?.enabled == true && mechanic.penaltyObjects.objects.isNotEmpty()) {
            objects + mechanic.penaltyObjects.objects
        } else {
            objects
        }

        val obj = when (mechanic.spawn.strategy) {
            "SEQUENCE" -> {
                val idx = state.spawnIndex % allObjects.size
                allObjects[idx]
            }
            "WAVE" -> {
                val idx = state.spawnIndex % allObjects.size
                allObjects[idx]
            }
            else -> { // RANDOM
                // Olasilik agirlikli secim
                if (allObjects.any { it.probability != null }) {
                    val totalProb = allObjects.sumOf { (it.probability ?: 1.0f).toDouble() }
                    var r = Math.random() * totalProb
                    var selected = allObjects.first()
                    for (o in allObjects) {
                        r -= (o.probability ?: 1.0f).toDouble()
                        if (r <= 0) { selected = o; break }
                    }
                    selected
                } else {
                    allObjects.random()
                }
            }
        }

        val activeObj = ActiveObject(
            id = UUID.randomUUID().toString(),
            objectConfig = obj,
            spawnedAtMs = nowMs,
            lane = obj.lane ?: 0
        )

        return state.copy(
            activeObjects = state.activeObjects + activeObj,
            lastSpawnMs = nowMs,
            spawnIndex = state.spawnIndex + 1
        )
    }

    private fun expireObjects(
        state: GenericSceneState,
        mechanic: MotionArcadeMechanic,
        settings: GameSettings,
        nowMs: Long
    ): GenericSceneState {
        val defaultLifeMs = mechanic.objectDefaults.lifeMs
        var s = state

        val (expired, active) = s.activeObjects.partition { obj ->
            if (obj.isHit) false
            else {
                val lifeMs = obj.objectConfig.lifeMs ?: defaultLifeMs
                (nowMs - obj.spawnedAtMs) >= lifeMs
            }
        }

        for (obj in expired) {
            when (mechanic.onExpire.action) {
                "LOSE_LIFE" -> {
                    if (settings.common.lives.mode == "LIMITED" && settings.common.lives.loseOnExpire) {
                        s = s.copy(lives = s.lives - 1)
                    }
                }
                "MISS_PENALTY" -> {
                    s = s.copy(score = max(0, s.score - mechanic.onExpire.penaltyPoints))
                    if (mechanic.onExpire.showFeedback) {
                        s = s.copy(feedback = FeedbackState("Kacirdin!", FeedbackKind.NEGATIVE, nowMs + 1000))
                    }
                }
            }
        }

        return s.copy(activeObjects = active)
    }

    private fun isGraceActive(state: GenericSceneState, settings: GameSettings): Boolean {
        return state.elapsedMs < settings.common.lives.gracePeriodSec * 1000L
    }

    private fun clearExpiredFeedback(state: GenericSceneState, nowMs: Long): GenericSceneState {
        val fb = state.feedback
        return if (fb != null && nowMs >= fb.expiresAtMs) {
            state.copy(feedback = null)
        } else {
            state
        }
    }
}
