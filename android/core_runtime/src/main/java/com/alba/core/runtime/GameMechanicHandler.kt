package com.alba.core.runtime

import com.alba.core.motion.MotionEvent

// Her oyun ailesi icin implement edilen handler interface'i
interface GameMechanicHandler {
    val mechanicKind: String

    fun tick(state: GenericSceneState, settings: GameSettings, nowMs: Long, deltaMs: Long): GenericSceneState
    fun onMotionEvent(state: GenericSceneState, event: MotionEvent, settings: GameSettings, nowMs: Long): GenericSceneState
    fun createInitialState(settings: GameSettings): GenericSceneState
}

// Handler factory — mechanic kind string'inden dogru handler'i olusturur
object HandlerFactory {
    private val handlers: Map<String, GameMechanicHandler> = mapOf(
        "MOTION_ARCADE" to MotionArcadeHandler(),
        "POSE_CONTACT" to PoseContactHandler(),
        "QUIZ" to QuizHandler(),
        "STUDY" to StudyHandler(),
        "HOLD" to HoldHandler(),
        "RHYTHM" to RhythmHandler(),
        "PROGRAM" to ProgramHandler()
    )

    fun create(mechanicKind: String): GameMechanicHandler {
        return handlers[mechanicKind] ?: MotionArcadeHandler()
    }
}
