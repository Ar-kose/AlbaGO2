package com.alba.core.motion

import com.alba.core.pose.BodyBox
import com.alba.core.pose.PoseFrame
import com.alba.core.pose.PoseKeypoint
import kotlin.math.cos
import kotlin.math.sin
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test

class MotionDetectorsTest {

    @Test
    fun squatDetectorCountsARepOnlyAfterFullReturnToStanding() {
        val detector = SquatDetectorV1()

        detector.onPoseFrame(squatFrame(timestampMs = 0, kneeAngle = 172.0))
        detector.onPoseFrame(squatFrame(timestampMs = 700, kneeAngle = 145.0))
        detector.onPoseFrame(squatFrame(timestampMs = 1_400, kneeAngle = 98.0))
        detector.onPoseFrame(squatFrame(timestampMs = 1_900, kneeAngle = 138.0))
        val event = detector.onPoseFrame(squatFrame(timestampMs = 2_400, kneeAngle = 171.0))

        assertNotNull(event)
        assertEquals(MotionEventType.REP_COUNTED, event?.type)
        assertEquals("COUNTED", event?.metadata?.get("phase"))
        assertEquals(1, event?.count)
    }

    @Test
    fun squatDetectorRejectsHalfRep() {
        val detector = SquatDetectorV1()

        detector.onPoseFrame(squatFrame(timestampMs = 0, kneeAngle = 171.0))
        detector.onPoseFrame(squatFrame(timestampMs = 700, kneeAngle = 138.0))
        val event = detector.onPoseFrame(squatFrame(timestampMs = 1_400, kneeAngle = 168.0))

        assertNotNull(event)
        assertEquals(MotionEventType.BAD_FORM, event?.type)
        assertEquals("insufficient_depth", event?.metadata?.get("badFormReason"))
    }

    @Test
    fun jumpingJackCountsOnlyAfterClosedOpenClosedCycle() {
        val detector = JumpingJackDetectorV1()

        detector.onPoseFrame(jumpingJackFrame(timestampMs = 0, isOpen = false))
        detector.onPoseFrame(jumpingJackFrame(timestampMs = 600, isOpen = true))
        detector.onPoseFrame(jumpingJackFrame(timestampMs = 1_000, isOpen = true))
        detector.onPoseFrame(jumpingJackFrame(timestampMs = 1_300, isOpen = false, closedReturn = false))
        val event = detector.onPoseFrame(jumpingJackFrame(timestampMs = 1_700, isOpen = false))

        assertNotNull(event)
        assertEquals(MotionEventType.REP_COUNTED, event?.type)
        assertEquals(1, event?.count)
    }

    @Test
    fun lowVisibilityProducesOutOfFrameEvent() {
        val detector = JumpingJackDetectorV1()
        val event = detector.onPoseFrame(
            PoseFrame(
                timestampMs = 1,
                keypoints = emptyList(),
                bodyBox = null,
                visibilityScore = 0.2f,
                modelVersion = "test",
                imageWidth = 0,
                imageHeight = 0
            )
        )

        assertEquals(MotionEventType.USER_OUT_OF_FRAME, event?.type)
    }

    @Test
    fun jumpRopeCountsLandingAfterCalibrationAndAirborneCycle() {
        val detector = JumpRopeDetectorV1()
        repeat(8) { index ->
            detector.onPoseFrame(jumpRopeFrame(timestampMs = index * 120L, ankleY = 0.86f, hipY = 0.58f))
        }

        val airborne = detector.onPoseFrame(jumpRopeFrame(timestampMs = 1_200, ankleY = 0.78f, hipY = 0.53f))
        val landing = detector.onPoseFrame(jumpRopeFrame(timestampMs = 1_420, ankleY = 0.855f, hipY = 0.575f))

        assertNull(airborne)
        assertNotNull(landing)
        assertEquals(MotionEventType.REP_COUNTED, landing?.type)
    }

    private fun squatFrame(timestampMs: Long, kneeAngle: Double): PoseFrame {
        val leftKnee = PoseKeypoint("left_knee", 0.42f, 0.66f, 0.96f)
        val leftAnkle = PoseKeypoint("left_ankle", 0.42f, 0.90f, 0.96f)
        val rightKnee = PoseKeypoint("right_knee", 0.58f, 0.66f, 0.96f)
        val rightAnkle = PoseKeypoint("right_ankle", 0.58f, 0.90f, 0.96f)

        val leftHip = hipForAngle("left_hip", leftKnee, kneeAngle, mirrored = false)
        val rightHip = hipForAngle("right_hip", rightKnee, kneeAngle, mirrored = true)

        return PoseFrame(
            timestampMs = timestampMs,
            visibilityScore = 0.95f,
            modelVersion = "test",
            imageWidth = 1,
            imageHeight = 1,
            bodyBox = BodyBox(0f, 0f, 1f, 1f),
            keypoints = listOf(
                leftHip,
                leftKnee,
                leftAnkle,
                rightHip,
                rightKnee,
                rightAnkle,
                PoseKeypoint("left_shoulder", 0.36f, 0.24f, 0.95f),
                PoseKeypoint("right_shoulder", 0.64f, 0.24f, 0.95f)
            )
        )
    }

    private fun jumpingJackFrame(timestampMs: Long, isOpen: Boolean, closedReturn: Boolean = true): PoseFrame {
        val wristY = if (isOpen) 0.16f else if (closedReturn) 0.44f else 0.32f
        val ankleSpread = if (isOpen) 0.46f else if (closedReturn) 0.18f else 0.26f
        return PoseFrame(
            timestampMs = timestampMs,
            visibilityScore = 0.96f,
            modelVersion = "test",
            imageWidth = 1,
            imageHeight = 1,
            bodyBox = BodyBox(0f, 0f, 1f, 1f),
            keypoints = listOf(
                PoseKeypoint("left_shoulder", 0.40f, 0.30f, 0.96f),
                PoseKeypoint("right_shoulder", 0.60f, 0.30f, 0.96f),
                PoseKeypoint("left_wrist", 0.34f, wristY, 0.96f),
                PoseKeypoint("right_wrist", 0.66f, wristY, 0.96f),
                PoseKeypoint("left_ankle", 0.50f - ankleSpread / 2f, 0.90f, 0.96f),
                PoseKeypoint("right_ankle", 0.50f + ankleSpread / 2f, 0.90f, 0.96f)
            )
        )
    }

    private fun jumpRopeFrame(timestampMs: Long, ankleY: Float, hipY: Float): PoseFrame {
        return PoseFrame(
            timestampMs = timestampMs,
            visibilityScore = 0.93f,
            modelVersion = "test",
            imageWidth = 1,
            imageHeight = 1,
            bodyBox = BodyBox(0f, 0f, 1f, 1f),
            keypoints = listOf(
                PoseKeypoint("left_shoulder", 0.38f, 0.24f, 0.95f),
                PoseKeypoint("right_shoulder", 0.62f, 0.24f, 0.95f),
                PoseKeypoint("left_hip", 0.44f, hipY, 0.95f),
                PoseKeypoint("right_hip", 0.56f, hipY, 0.95f),
                PoseKeypoint("left_ankle", 0.44f, ankleY, 0.95f),
                PoseKeypoint("right_ankle", 0.56f, ankleY, 0.95f)
            )
        )
    }

    private fun hipForAngle(
        name: String,
        knee: PoseKeypoint,
        targetAngleDegrees: Double,
        mirrored: Boolean
    ): PoseKeypoint {
        val radius = 0.22f
        val radians = Math.toRadians(targetAngleDegrees)
        val directionX = sin(radians).toFloat() * if (mirrored) -1f else 1f
        val directionY = cos(radians).toFloat()
        return PoseKeypoint(
            name = name,
            x = knee.x + radius * directionX,
            y = knee.y + radius * directionY,
            confidence = 0.96f
        )
    }
}
