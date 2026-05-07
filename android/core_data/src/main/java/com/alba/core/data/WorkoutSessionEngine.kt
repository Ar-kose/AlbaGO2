package com.alba.core.data

import com.alba.core.motion.MotionEvent
import com.alba.core.motion.MotionEventType
import com.alba.core.motion.MotionType

enum class WorkoutSessionState {
    READY,
    COUNTDOWN,
    ACTIVE,
    PAUSED,
    FINISHED
}

data class WorkoutSession(
    val sessionId: String,
    val motionType: MotionType,
    val startedAtMs: Long,
    val state: WorkoutSessionState = WorkoutSessionState.READY,
    val elapsedMs: Long = 0L,
    val totalReps: Int = 0,
    val totalScore: Int = 0,
    val lastQualityScore: Float = 0f,
    val averageQuality: Float = 0f,
    val motionCounts: Map<MotionType, Int> = emptyMap()
)

data class WorkoutSessionSummary(
    val sessionId: String,
    val motionType: MotionType,
    val status: WorkoutSessionState,
    val elapsedMs: Long,
    val totalReps: Int,
    val totalScore: Int,
    val averageQuality: Float,
    val motionCounts: Map<MotionType, Int>
)

interface SessionRepository {
    fun upsert(session: WorkoutSession)
    fun read(sessionId: String): WorkoutSession?
    fun all(): List<WorkoutSession>
}

class InMemorySessionRepository : SessionRepository {
    private val sessions = linkedMapOf<String, WorkoutSession>()

    override fun upsert(session: WorkoutSession) {
        sessions[session.sessionId] = session
    }

    override fun read(sessionId: String): WorkoutSession? = sessions[sessionId]

    override fun all(): List<WorkoutSession> = sessions.values.toList()
}

class WorkoutSessionEngine(
    private val repository: SessionRepository
) {
    private var qualitySamples = mutableListOf<Float>()

    fun start(sessionId: String, motionType: MotionType, nowMs: Long): WorkoutSession {
        qualitySamples = mutableListOf()
        return WorkoutSession(
            sessionId = sessionId,
            motionType = motionType,
            startedAtMs = nowMs,
            state = WorkoutSessionState.COUNTDOWN
        ).also(repository::upsert)
    }

    fun activate(sessionId: String): WorkoutSession? = transition(sessionId, WorkoutSessionState.ACTIVE)

    fun pause(sessionId: String): WorkoutSession? = transition(sessionId, WorkoutSessionState.PAUSED)

    fun resume(sessionId: String): WorkoutSession? = transition(sessionId, WorkoutSessionState.ACTIVE)

    fun finish(sessionId: String, nowMs: Long): WorkoutSessionSummary? {
        val session = repository.read(sessionId) ?: return null
        val finished = session.copy(
            state = WorkoutSessionState.FINISHED,
            elapsedMs = nowMs - session.startedAtMs,
            averageQuality = averageQuality()
        )
        repository.upsert(finished)
        return summary(finished)
    }

    fun onMotionEvent(sessionId: String, event: MotionEvent, scoreDelta: Int = 0): WorkoutSession? {
        val session = repository.read(sessionId) ?: return null
        if (session.state != WorkoutSessionState.ACTIVE) return session
        if (event.type == MotionEventType.REP_COUNTED) {
            qualitySamples.add(event.qualityScore)
        }
        val nextCounts = session.motionCounts.toMutableMap().apply {
            if (event.type == MotionEventType.REP_COUNTED) {
                this[event.motionType] = event.count
            }
        }
        val updated = session.copy(
            totalReps = maxOf(session.totalReps, event.count),
            totalScore = session.totalScore + scoreDelta,
            lastQualityScore = event.qualityScore,
            averageQuality = averageQuality(),
            elapsedMs = event.timestampMs - session.startedAtMs,
            motionCounts = nextCounts
        )
        repository.upsert(updated)
        return updated
    }

    fun summary(session: WorkoutSession): WorkoutSessionSummary {
        return WorkoutSessionSummary(
            sessionId = session.sessionId,
            motionType = session.motionType,
            status = session.state,
            elapsedMs = session.elapsedMs,
            totalReps = session.totalReps,
            totalScore = session.totalScore,
            averageQuality = session.averageQuality,
            motionCounts = session.motionCounts
        )
    }

    private fun averageQuality(): Float {
        return if (qualitySamples.isEmpty()) 0f else qualitySamples.average().toFloat()
    }

    private fun transition(sessionId: String, state: WorkoutSessionState): WorkoutSession? {
        val session = repository.read(sessionId) ?: return null
        val updated = session.copy(state = state)
        repository.upsert(updated)
        return updated
    }
}
