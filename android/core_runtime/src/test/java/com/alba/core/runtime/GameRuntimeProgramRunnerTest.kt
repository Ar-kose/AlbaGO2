package com.alba.core.runtime

import com.alba.core.motion.MotionEvent
import com.alba.core.motion.MotionEventType
import com.alba.core.motion.MotionType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class GameRuntimeProgramRunnerTest {

    private fun createDefinitionWithSteps(steps: List<ProgramStepDefinition>): GameDefinition {
        return GameDefinition(
            gameId = "test_program",
            version = 1,
            template = GameTemplate.SCENE_PLAY,
            title = "Program Test",
            status = PublishStatus.PUBLISHED,
            minAppVersion = "0.1.0",
            supportedMotions = listOf(MotionType.SQUAT, MotionType.JUMPING_JACK, MotionType.JUMP_ROPE),
            levels = listOf(
                GameLevelDefinition(
                    levelId = "level_1",
                    durationSec = 120,
                    targetScore = 100,
                    difficulty = "easy",
                    motionRules = listOf(
                        MotionRule(MotionType.SQUAT, MotionEventType.REP_COUNTED, 10, 0),
                        MotionRule(MotionType.JUMPING_JACK, MotionEventType.REP_COUNTED, 12, 0),
                        MotionRule(MotionType.SQUAT, MotionEventType.BAD_FORM, -5, 0)
                    ),
                    programSteps = steps,
                    sceneConfig = mapOf(
                        "objects" to emptyList<Map<String, Any>>(),
                        "maxObjects" to 1,
                        "spawnRateMs" to 1800
                    ),
                    rewards = emptyList(),
                    interactionRules = emptyList(),
                    tasks = emptyList()
                )
            ),
            assets = AssetManifest(
                background = "bg",
                character = "char"
            )
        )
    }

    private fun makeRepEvent(motion: MotionType, timestampMs: Long = 1000L): MotionEvent {
        return MotionEvent(
            type = MotionEventType.REP_COUNTED,
            motionType = motion,
            count = 1,
            confidence = 0.9f,
            qualityScore = 0.8f,
            timestampMs = timestampMs,
            metadata = emptyMap()
        )
    }

    private fun makeBadFormEvent(motion: MotionType, timestampMs: Long = 1000L): MotionEvent {
        return MotionEvent(
            type = MotionEventType.BAD_FORM,
            motionType = motion,
            count = 0,
            confidence = 0.3f,
            qualityScore = 0.1f,
            timestampMs = timestampMs,
            metadata = emptyMap()
        )
    }

    private fun makeOutOfFrameEvent(timestampMs: Long = 1000L): MotionEvent {
        return MotionEvent(
            type = MotionEventType.USER_OUT_OF_FRAME,
            motionType = MotionType.SQUAT,
            count = 0,
            confidence = 0f,
            qualityScore = 0f,
            timestampMs = timestampMs,
            metadata = mapOf("phase" to "OUT_OF_FRAME")
        )
    }

    @Test
    fun startsFirstProgramStepAsActive() {
        val definition = createDefinitionWithSteps(
            listOf(
                ProgramStepDefinition("step_1", ProgramStepType.MOTION_REPS, "Squat", motion = MotionType.SQUAT, targetCount = 10),
                ProgramStepDefinition("step_2", ProgramStepType.REST, "Rest", durationSec = 5)
            )
        )
        val runtime = GameRuntime(definition)
        val state = runtime.start(0L)

        assertEquals(2, state.program.steps.size)
        assertEquals(0, state.program.activeIndex)
        assertEquals(ProgramStepStatus.ACTIVE, state.program.steps[0].status)
        assertEquals(ProgramStepStatus.NOT_STARTED, state.program.steps[1].status)
        assertFalse(state.program.completed)
    }

    @Test
    fun motionRepsStepAdvancesOnlyOnMatchingMotion() {
        val definition = createDefinitionWithSteps(
            listOf(
                ProgramStepDefinition("squat", ProgramStepType.MOTION_REPS, "Squat", motion = MotionType.SQUAT, targetCount = 5)
            )
        )
        val runtime = GameRuntime(definition)
        runtime.start(0L)

        // Non-matching motion should not advance
        val wrongEvent = makeRepEvent(MotionType.JUMPING_JACK, 1000L)
        val state1 = runtime.onMotionEvent(wrongEvent)
        assertEquals(0, state1.program.steps[0].progressCount)

        // Matching motion should advance
        val rightEvent = makeRepEvent(MotionType.SQUAT, 2000L)
        val state2 = runtime.onMotionEvent(rightEvent)
        assertEquals(1, state2.program.steps[0].progressCount)
    }

    @Test
    fun motionRepsCompletesAtTargetCount() {
        val definition = createDefinitionWithSteps(
            listOf(
                ProgramStepDefinition("squat", ProgramStepType.MOTION_REPS, "Squat", motion = MotionType.SQUAT, targetCount = 3),
                ProgramStepDefinition("rest", ProgramStepType.REST, "Rest", durationSec = 5)
            )
        )
        val runtime = GameRuntime(definition)
        runtime.start(0L)

        runtime.onMotionEvent(makeRepEvent(MotionType.SQUAT, 1000L))
        runtime.onMotionEvent(makeRepEvent(MotionType.SQUAT, 2000L))
        val state = runtime.onMotionEvent(makeRepEvent(MotionType.SQUAT, 3000L))

        assertEquals(3, state.program.steps[0].progressCount)
        assertEquals(ProgramStepStatus.COMPLETED, state.program.steps[0].status)
        assertEquals(1, state.program.activeIndex)
        assertEquals(ProgramStepStatus.ACTIVE, state.program.steps[1].status)
    }

    @Test
    fun restStepCompletesAfterDurationSec() {
        val definition = createDefinitionWithSteps(
            listOf(
                ProgramStepDefinition("rest_1", ProgramStepType.REST, "Rest", durationSec = 3),
                ProgramStepDefinition("step_2", ProgramStepType.INSTRUCTION, "Done", durationSec = 1)
            )
        )
        val runtime = GameRuntime(definition)
        runtime.start(0L)

        assertEquals(ProgramStepType.REST, runtime.snapshot().program.steps[0].type)

        val state = runtime.tick(4000L)
        assertEquals(ProgramStepStatus.COMPLETED, state.program.steps[0].status)
        assertEquals(ProgramStepStatus.ACTIVE, state.program.steps[1].status)
    }

    @Test
    fun instructionStepAutoAdvancesWhenDurationSecExists() {
        val definition = createDefinitionWithSteps(
            listOf(
                ProgramStepDefinition("instr", ProgramStepType.INSTRUCTION, "Hazir ol", durationSec = 2),
                ProgramStepDefinition("play", ProgramStepType.PLAY_GAME, "Oyna", durationSec = 10)
            )
        )
        val runtime = GameRuntime(definition)
        runtime.start(0L)

        assertEquals(ProgramStepType.INSTRUCTION, runtime.snapshot().program.steps[0].type)

        val state = runtime.tick(3000L)
        assertEquals(ProgramStepStatus.COMPLETED, state.program.steps[0].status)
        assertEquals(ProgramStepStatus.ACTIVE, state.program.steps[1].status)
    }

    @Test
    fun holdPoseCompletesAfterHoldSecOfActiveRuntime() {
        val definition = createDefinitionWithSteps(
            listOf(
                ProgramStepDefinition("hold", ProgramStepType.HOLD_POSE, "Plank", holdSec = 5),
                ProgramStepDefinition("done", ProgramStepType.INSTRUCTION, "Bitti", durationSec = 1)
            )
        )
        val runtime = GameRuntime(definition)
        runtime.start(0L)

        assertEquals(ProgramStepType.HOLD_POSE, runtime.snapshot().program.steps[0].type)

        val state = runtime.tick(6000L)
        assertEquals(ProgramStepStatus.COMPLETED, state.program.steps[0].status)
        assertEquals(1, state.program.activeIndex)
    }

    @Test
    fun userOutOfFramePausesHoldProgression() {
        val definition = createDefinitionWithSteps(
            listOf(
                ProgramStepDefinition("hold", ProgramStepType.HOLD_POSE, "Plank", holdSec = 10)
            )
        )
        val runtime = GameRuntime(definition)
        runtime.start(0L)

        runtime.tick(2000L)

        val pausedState = runtime.onMotionEvent(makeOutOfFrameEvent(2000L))
        assertEquals(GameSessionStatus.PAUSED, pausedState.status)

        runtime.resume(5000L, "Back in frame")

        val state = runtime.tick(10000L)
        val remainingMs = state.program.steps[0].remainingMs ?: 0L
        assertTrue(remainingMs > 0L)
    }

    @Test
    fun lastStepCompletionMarksGameCompleted() {
        val definition = createDefinitionWithSteps(
            listOf(
                ProgramStepDefinition("only_step", ProgramStepType.REST, "Tek adim", durationSec = 1)
            )
        )
        val runtime = GameRuntime(definition)
        runtime.start(0L)

        val state = runtime.tick(2000L)
        assertTrue(state.completed)
        assertTrue(state.program.completed)
    }

    @Test
    fun emptyProgramStepsPreservesCurrentTemplateBehavior() {
        val definition = createDefinitionWithSteps(emptyList())
        val runtime = GameRuntime(definition)
        val state = runtime.start(0L)

        assertEquals(0, state.program.steps.size)
        assertEquals(GameSessionStatus.ACTIVE, state.status)
        assertEquals(GameTemplate.SCENE_PLAY, state.template)
    }

    @Test
    fun fallbackGameDefinitionIsPlayable() {
        val fallbackGame = GameDefinition(
            gameId = "scene_play_fallback",
            version = 1,
            template = GameTemplate.SCENE_PLAY,
            title = "Scene Play Fallback",
            description = "Fallback game used when remote fetch fails",
            status = PublishStatus.PUBLISHED,
            minAppVersion = "0.1.0",
            supportedMotions = listOf(MotionType.SQUAT, MotionType.JUMPING_JACK),
            levels = listOf(
                GameLevelDefinition(
                    levelId = "fallback_level_1",
                    durationSec = 30,
                    targetScore = 100,
                    difficulty = "EASY",
                    motionRules = listOf(
                        MotionRule(MotionType.SQUAT, MotionEventType.REP_COUNTED, 10, 500),
                        MotionRule(MotionType.JUMPING_JACK, MotionEventType.REP_COUNTED, 12, 500),
                        MotionRule(MotionType.SQUAT, MotionEventType.BAD_FORM, -5, 250),
                        MotionRule(MotionType.JUMPING_JACK, MotionEventType.BAD_FORM, -5, 250)
                    ),
                    rewards = listOf(RewardRule("STAR", 3, 100)),
                    sceneConfig = mapOf(
                        "objects" to listOf(
                            mapOf(
                                "objectId" to "test_object",
                                "label" to "Test",
                                "assetKey" to "testCard",
                                "requiredMotion" to "SQUAT",
                                "lifeMs" to 2400,
                                "points" to 10
                            )
                        ),
                        "maxObjects" to 1,
                        "spawnRateMs" to 1800
                    ),
                    programSteps = listOf(
                        ProgramStepDefinition(
                            stepId = "fb_intro",
                            type = ProgramStepType.INSTRUCTION,
                            title = "Hazir ol",
                            durationSec = 2,
                            successMessage = "Hazir"
                        ),
                        ProgramStepDefinition(
                            stepId = "fb_play",
                            type = ProgramStepType.PLAY_GAME,
                            title = "Oyna",
                            durationSec = 30,
                            successMessage = "Oyun tamamlandi"
                        )
                    )
                )
            ),
            assets = AssetManifest(
                background = "local://fallback/bg",
                character = "local://fallback/hero",
                soundtrack = null
            )
        )

        val runtime = GameRuntime(fallbackGame)
        val state = runtime.start(0L)

        assertEquals(GameSessionStatus.ACTIVE, state.status)
        assertEquals("Scene Play Fallback", state.title)
        assertFalse(state.completed)
        assertEquals(2, state.program.steps.size)
        assertEquals(ProgramStepStatus.ACTIVE, state.program.steps[0].status)
        assertEquals(ProgramStepStatus.NOT_STARTED, state.program.steps[1].status)

        val afterIntro = runtime.tick(3000L)
        assertEquals(ProgramStepStatus.COMPLETED, afterIntro.program.steps[0].status)
        assertEquals(ProgramStepStatus.ACTIVE, afterIntro.program.steps[1].status)
        assertEquals("Hazir", afterIntro.lastEffect)

        val repEvent = MotionEvent(
            type = MotionEventType.REP_COUNTED,
            motionType = MotionType.SQUAT,
            count = 1,
            confidence = 0.9f,
            qualityScore = 0.8f,
            timestampMs = 5000L,
            metadata = emptyMap()
        )
        val scoredState = runtime.onMotionEvent(repEvent)
        assertTrue(scoredState.score >= 0)
        assertNotNull(scoredState.lastEffect)
    }

    @Test
    fun nextOnCompleteFalseDoesNotAutoAdvance() {
        val definition = createDefinitionWithSteps(
            listOf(
                ProgramStepDefinition("step_1", ProgramStepType.REST, "Dinlen", durationSec = 2, nextOnComplete = false),
                ProgramStepDefinition("step_2", ProgramStepType.REST, "Ikinci", durationSec = 3)
            )
        )
        val runtime = GameRuntime(definition)
        runtime.start(0L)

        val state = runtime.tick(3000L)
        assertEquals(ProgramStepStatus.COMPLETED, state.program.steps[0].status)
        assertTrue(state.program.completed)
        assertEquals(0, state.program.activeIndex)
    }
}
