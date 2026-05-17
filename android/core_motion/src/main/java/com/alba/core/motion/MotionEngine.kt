package com.alba.core.motion

import com.alba.core.pose.PoseFrame
import com.alba.core.pose.PoseKeypoint
import kotlin.math.atan2
import kotlin.math.pow
import kotlin.math.sqrt

enum class MotionType {
    SQUAT,
    JUMPING_JACK,
    JUMP_ROPE
}

enum class MotionEventType {
    REP_COUNTED,
    BAD_FORM,
    PAUSED,
    RESUMED,
    USER_OUT_OF_FRAME
}

data class MotionEvent(
    val type: MotionEventType,
    val motionType: MotionType,
    val count: Int,
    val confidence: Float,
    val qualityScore: Float,
    val timestampMs: Long,
    val metadata: Map<String, String> = emptyMap()
)

data class MotionDetectorState(
    val phase: String,
    val repCount: Int,
    val isUserVisible: Boolean,
    val lastConfidence: Float
)

interface MotionDetector {
    val motionType: MotionType
    val version: String
    fun reset()
    fun onPoseFrame(frame: PoseFrame): MotionEvent?
    fun getState(): MotionDetectorState
}

data class NormalizedPoseFrame(
    val timestampMs: Long,
    val points: Map<String, PoseKeypoint>,
    val visibilityScore: Float,
    val bodyHeight: Float
)

private data class SideKneeAngles(
    val left: Double?,
    val right: Double?
) {
    fun averaged(): Double? {
        return when {
            left != null && right != null -> (left + right) / 2.0
            left != null -> left
            right != null -> right
            else -> null
        }
    }
}

class KeypointNormalizer(
    private val minimumVisibility: Float = 0.35f
) {
    fun normalize(frame: PoseFrame): NormalizedPoseFrame? {
        val map = frame.keypoints.associateBy { it.name }
        // Use confidence of visible keypoints only, not global visibilityScore
        val visibleKeypoints = frame.keypoints.filter { it.confidence >= 0.10f }
        if (visibleKeypoints.size < 4) return null
        val visibleMap = visibleKeypoints.associateBy { it.name }

        // Top: shoulders > hips > nose
        val shoulders = listOfNotNull(visibleMap["left_shoulder"], visibleMap["right_shoulder"])
        val hips = listOfNotNull(visibleMap["left_hip"], visibleMap["right_hip"])
        val topCandidates = shoulders.ifEmpty { hips }
        val top = when {
            topCandidates.isNotEmpty() -> topCandidates.minOf { it.y }
            visibleMap["nose"] != null -> visibleMap["nose"]!!.y
            else -> return null
        }

        // Bottom: ankles > knees > hips
        val ankles = listOfNotNull(visibleMap["left_ankle"], visibleMap["right_ankle"])
        val knees = listOfNotNull(visibleMap["left_knee"], visibleMap["right_knee"])
        val bottomCandidates = ankles.ifEmpty { knees.ifEmpty { hips } }
        if (bottomCandidates.isEmpty()) return null
        val bottom = bottomCandidates.maxOf { it.y }

        val bodyHeight = (bottom - top).coerceAtLeast(0.001f)
        return NormalizedPoseFrame(
            timestampMs = frame.timestampMs,
            points = map,
            visibilityScore = frame.visibilityScore,
            bodyHeight = bodyHeight
        )
    }
}

abstract class BaseDetector(
    override val motionType: MotionType,
    override val version: String
) : MotionDetector {
    protected val normalizer = KeypointNormalizer()
    protected var repCount: Int = 0
    protected var phase: String = "IDLE"
    protected var lastConfidence: Float = 0f
    protected var userVisible: Boolean = false
    protected var cycleStartedAtMs: Long = 0L
    protected var lastRepTimestampMs: Long = Long.MIN_VALUE

    override fun reset() {
        repCount = 0
        phase = "IDLE"
        lastConfidence = 0f
        userVisible = false
        cycleStartedAtMs = 0L
        lastRepTimestampMs = Long.MIN_VALUE
        onReset()
    }

    override fun getState(): MotionDetectorState = MotionDetectorState(
        phase = phase,
        repCount = repCount,
        isUserVisible = userVisible,
        lastConfidence = lastConfidence
    )

    protected open fun onReset() = Unit

    protected fun changePhase(nextPhase: String, timestampMs: Long, startCycle: Boolean = false) {
        if (phase != nextPhase) {
            phase = nextPhase
            if (startCycle) {
                cycleStartedAtMs = timestampMs
            }
        } else if (startCycle && cycleStartedAtMs == 0L) {
            cycleStartedAtMs = timestampMs
        }
    }

    protected fun userOutOfFrame(frame: PoseFrame): MotionEvent {
        userVisible = false
        phase = "OUT_OF_FRAME"
        return MotionEvent(
            type = MotionEventType.USER_OUT_OF_FRAME,
            motionType = motionType,
            count = repCount,
            confidence = frame.visibilityScore,
            qualityScore = 0f,
            timestampMs = frame.timestampMs,
            metadata = baseMetadata(frame.timestampMs, extra = mapOf("phase" to "OUT_OF_FRAME"))
        )
    }

    protected fun repEvent(
        frame: PoseFrame,
        quality: Float,
        repDurationMs: Long,
        extraMetadata: Map<String, String> = emptyMap()
    ): MotionEvent {
        repCount += 1
        lastRepTimestampMs = frame.timestampMs
        phase = "COUNTED"
        return MotionEvent(
            type = MotionEventType.REP_COUNTED,
            motionType = motionType,
            count = repCount,
            confidence = frame.visibilityScore,
            qualityScore = quality.coerceIn(0f, 1f),
            timestampMs = frame.timestampMs,
            metadata = baseMetadata(
                frame.timestampMs,
                repDurationMs = repDurationMs,
                extra = extraMetadata + ("phase" to "COUNTED")
            )
        )
    }

    protected fun badFormEvent(
        frame: PoseFrame,
        reason: String,
        quality: Float = 0f
    ): MotionEvent {
        return MotionEvent(
            type = MotionEventType.BAD_FORM,
            motionType = motionType,
            count = repCount,
            confidence = frame.visibilityScore,
            qualityScore = quality.coerceIn(0f, 1f),
            timestampMs = frame.timestampMs,
            metadata = baseMetadata(
                frame.timestampMs,
                repDurationMs = repDuration(frame.timestampMs),
                extra = mapOf(
                    "phase" to phase,
                    "badFormReason" to reason
                )
            )
        )
    }

    protected fun repDuration(timestampMs: Long): Long {
        return if (cycleStartedAtMs == 0L) 0L else (timestampMs - cycleStartedAtMs).coerceAtLeast(0L)
    }

    protected fun cooledDown(timestampMs: Long, cooldownMs: Long): Boolean {
        if (lastRepTimestampMs == Long.MIN_VALUE) {
            return true
        }
        return timestampMs - lastRepTimestampMs >= cooldownMs
    }

    private fun baseMetadata(
        timestampMs: Long,
        repDurationMs: Long = repDuration(timestampMs),
        extra: Map<String, String>
    ): Map<String, String> {
        return buildMap {
            put("detectorVersion", version)
            put("phase", phase)
            put("repDurationMs", repDurationMs.toString())
            putAll(extra)
        }
    }
}

class SquatDetectorV1 : BaseDetector(MotionType.SQUAT, "squat_detector_v1") {
    private var bottomReached = false
    private var lowestAngleInCycle = 180.0

    override fun onReset() {
        bottomReached = false
        lowestAngleInCycle = 180.0
    }

    override fun onPoseFrame(frame: PoseFrame): MotionEvent? {
        val normalized = normalizer.normalize(frame) ?: run {
            if (phase != "OUT_OF_FRAME") android.util.Log.d("AlbaGoMotion", "[Squat] normalizer FAIL vs=${"%.2f".format(frame.visibilityScore)} kps=${frame.keypoints.size}")
            return userOutOfFrame(frame)
        }
        val kneeAngles = normalized.extractKneeAngles() ?: run {
            android.util.Log.d("AlbaGoMotion", "[Squat] kneeAngles FAIL hips=(${normalized.points["left_hip"]?.confidence},${normalized.points["right_hip"]?.confidence}) knees=(${normalized.points["left_knee"]?.confidence},${normalized.points["right_knee"]?.confidence}) ankles=(${normalized.points["left_ankle"]?.confidence},${normalized.points["right_ankle"]?.confidence})")
            return userOutOfFrame(frame)
        }
        val kneeAngle = kneeAngles.averaged() ?: return userOutOfFrame(frame)
        userVisible = true
        lastConfidence = normalized.visibilityScore
        lowestAngleInCycle = minOf(lowestAngleInCycle, kneeAngle)

        val nowMs = frame.timestampMs
        val repDurationMs = repDuration(nowMs)
        if (phase != "STANDING" || kneeAngle < 160.0) {
            android.util.Log.d("AlbaGoMotion", "[Squat] phase=$phase kneeAngle=${"%.0f".format(kneeAngle)} bottom=$bottomReached lowest=${"%.0f".format(lowestAngleInCycle)} elapsed=${repDurationMs}ms")
        }

        when {
            kneeAngle >= 160.0 -> {
                if (phase == "GOING_UP" && bottomReached) {
                    if (repDurationMs in MIN_REP_DURATION_MS..MAX_REP_DURATION_MS && cooledDown(nowMs, REP_COOLDOWN_MS)) {
                        val quality = depthQuality(lowestAngleInCycle)
                        android.util.Log.d("AlbaGoMotion", "[Squat] REP! quality=$quality lowest=${"%.0f".format(lowestAngleInCycle)} duration=${repDurationMs}ms")
                        bottomReached = false
                        lowestAngleInCycle = 180.0
                        return repEvent(frame, quality = quality, repDurationMs = repDurationMs)
                    }
                    bottomReached = false
                    lowestAngleInCycle = 180.0
                } else if ((phase == "GOING_DOWN" || phase == "BOTTOM") && !bottomReached) {
                    changePhase("STANDING", nowMs)
                    lowestAngleInCycle = 180.0
                    return badFormEvent(frame, reason = "insufficient_depth")
                }
                changePhase("STANDING", nowMs)
                lowestAngleInCycle = 180.0
            }

            kneeAngle in 125.0..159.0 -> {
                when (phase) {
                    "STANDING", "COUNTED", "IDLE", "OUT_OF_FRAME" -> {
                        bottomReached = false
                        lowestAngleInCycle = kneeAngle
                        changePhase("GOING_DOWN", nowMs, startCycle = true)
                    }

                    "BOTTOM" -> changePhase("GOING_UP", nowMs)
                    "GOING_UP" -> {
                        // Continue standing up; count only once fully upright.
                    }
                }
            }

            kneeAngle in 75.0..124.0 -> {
                if (phase == "STANDING" || phase == "COUNTED" || phase == "IDLE" || phase == "OUT_OF_FRAME") {
                    lowestAngleInCycle = kneeAngle
                    changePhase("GOING_DOWN", nowMs, startCycle = true)
                }
                bottomReached = true
                changePhase("BOTTOM", nowMs)
            }

            kneeAngle < 75.0 -> {
                if (phase == "STANDING" || phase == "COUNTED" || phase == "IDLE" || phase == "OUT_OF_FRAME") {
                    changePhase("GOING_DOWN", nowMs, startCycle = true)
                }
                bottomReached = true
                changePhase("BOTTOM", nowMs)
            }
        }

        if (repDurationMs > MAX_REP_DURATION_MS && phase !in setOf("STANDING", "COUNTED", "OUT_OF_FRAME")) {
            bottomReached = false
            lowestAngleInCycle = 180.0
            changePhase("STANDING", nowMs)
            return badFormEvent(frame, reason = "rep_timeout")
        }
        return null
    }

    private fun NormalizedPoseFrame.extractKneeAngles(): SideKneeAngles? {
        // Use raw keypoint positions regardless of confidence — MediaPipe
        // confidence is unreliable on some devices.
        val leftHip = points["left_hip"]
        val leftKnee = points["left_knee"]
        val leftAnkle = points["left_ankle"]
        val rightHip = points["right_hip"]
        val rightKnee = points["right_knee"]
        val rightAnkle = points["right_ankle"]

        val left = if (leftHip != null && leftKnee != null && leftAnkle != null) {
            rawKneeAngle(leftHip, leftKnee, leftAnkle)
        } else if (leftHip != null && leftKnee != null) {
            estimateKneeAngleFromThigh(leftHip, leftKnee)
        } else null
        val right = if (rightHip != null && rightKnee != null && rightAnkle != null) {
            rawKneeAngle(rightHip, rightKnee, rightAnkle)
        } else if (rightHip != null && rightKnee != null) {
            estimateKneeAngleFromThigh(rightHip, rightKnee)
        } else null
        return if (left == null && right == null) null else SideKneeAngles(left, right)
    }

    private fun rawKneeAngle(hip: PoseKeypoint, knee: PoseKeypoint, ankle: PoseKeypoint): Double {
        val radians = atan2(ankle.y - knee.y, ankle.x - knee.x) - atan2(hip.y - knee.y, hip.x - knee.x)
        val angle = Math.toDegrees(radians.toDouble())
        val absAngle = kotlin.math.abs(angle)
        return if (absAngle > 180.0) 360.0 - absAngle else absAngle
    }

    private fun estimateKneeAngleFromThigh(hip: PoseKeypoint, knee: PoseKeypoint): Double? {
        val dx = knee.x - hip.x
        val dy = hip.y - knee.y
        val thighAngleFromVertical = Math.toDegrees(kotlin.math.atan2(dx.toDouble(), dy.toDouble()).toDouble())
        val absAngle = kotlin.math.abs(thighAngleFromVertical)
        return (170.0 - absAngle * 1.5).coerceIn(75.0, 175.0)
    }

    private fun depthQuality(lowestAngle: Double): Float {
        val idealBottom = 95.0
        return (1f - (kotlin.math.abs(lowestAngle - idealBottom) / 45.0).toFloat()).coerceIn(0.35f, 1f)
    }

    private companion object {
        const val MIN_REP_DURATION_MS = 600L
        const val MAX_REP_DURATION_MS = 5_000L
        const val REP_COOLDOWN_MS = 250L
    }
}

class JumpingJackDetectorV1 : BaseDetector(MotionType.JUMPING_JACK, "jumping_jack_detector_v1") {
    private var openReached = false
    private var peakFeetSpread = 0f

    override fun onReset() {
        openReached = false
        peakFeetSpread = 0f
    }

    override fun onPoseFrame(frame: PoseFrame): MotionEvent? {
        val normalized = normalizer.normalize(frame) ?: return userOutOfFrame(frame)
        userVisible = true
        lastConfidence = normalized.visibilityScore

        val leftWrist = normalized.points["left_wrist"] ?: return userOutOfFrame(frame)
        val rightWrist = normalized.points["right_wrist"] ?: return userOutOfFrame(frame)
        val leftAnkle = normalized.points["left_ankle"] ?: return userOutOfFrame(frame)
        val rightAnkle = normalized.points["right_ankle"] ?: return userOutOfFrame(frame)
        val leftShoulder = normalized.points["left_shoulder"] ?: return userOutOfFrame(frame)
        val rightShoulder = normalized.points["right_shoulder"] ?: return userOutOfFrame(frame)

        val shoulderLine = ((leftShoulder.y + rightShoulder.y) / 2f)
        val feetSpreadRatio = distance(leftAnkle, rightAnkle) / normalized.bodyHeight
        peakFeetSpread = maxOf(peakFeetSpread, feetSpreadRatio)
        val handsAboveShoulders = leftWrist.y < shoulderLine && rightWrist.y < shoulderLine
        val handsBelowShoulders = leftWrist.y > shoulderLine && rightWrist.y > shoulderLine
        val isOpen = handsAboveShoulders && feetSpreadRatio > 0.38f
        val isClosed = handsBelowShoulders && feetSpreadRatio < 0.22f
        val nowMs = frame.timestampMs
        val repDurationMs = repDuration(nowMs)

        when {
            isClosed -> {
                if (openReached && phase == "CLOSING" && repDurationMs in MIN_REP_DURATION_MS..MAX_REP_DURATION_MS && cooledDown(nowMs, REP_COOLDOWN_MS)) {
                    val quality = ((peakFeetSpread - 0.38f) / 0.32f).coerceIn(0.4f, 1f)
                    openReached = false
                    peakFeetSpread = 0f
                    return repEvent(frame, quality = quality, repDurationMs = repDurationMs)
                }
                openReached = false
                peakFeetSpread = 0f
                changePhase("CLOSED_STANCE", nowMs)
            }

            isOpen -> {
                if (phase == "CLOSED_STANCE" || phase == "COUNTED" || phase == "IDLE" || phase == "OUT_OF_FRAME") {
                    changePhase("OPENING", nowMs, startCycle = true)
                }
                openReached = true
                changePhase("OPEN_STANCE", nowMs)
            }

            else -> {
                when (phase) {
                    "CLOSED_STANCE", "COUNTED", "IDLE", "OUT_OF_FRAME" -> {
                        openReached = false
                        peakFeetSpread = feetSpreadRatio
                        changePhase("OPENING", nowMs, startCycle = true)
                    }

                    "OPEN_STANCE" -> changePhase("CLOSING", nowMs)
                }
            }
        }

        if (repDurationMs > MAX_REP_DURATION_MS && phase !in setOf("CLOSED_STANCE", "COUNTED", "OUT_OF_FRAME")) {
            openReached = false
            peakFeetSpread = 0f
            changePhase("CLOSED_STANCE", nowMs)
            return badFormEvent(frame, reason = "rep_timeout")
        }
        return null
    }

    private companion object {
        const val MIN_REP_DURATION_MS = 500L
        const val MAX_REP_DURATION_MS = 3_500L
        const val REP_COOLDOWN_MS = 200L
    }
}

class JumpRopeDetectorV1 : BaseDetector(MotionType.JUMP_ROPE, "jump_rope_detector_v1") {
    private val baselineSamples = mutableListOf<Float>()
    private val baselineHipSamples = mutableListOf<Float>()
    private var baselineAnkleY: Float? = null
    private var baselineHipY: Float? = null
    private var jumpStartedAtMs: Long = 0L

    override fun onReset() {
        baselineSamples.clear()
        baselineHipSamples.clear()
        baselineAnkleY = null
        baselineHipY = null
        jumpStartedAtMs = 0L
    }

    override fun onPoseFrame(frame: PoseFrame): MotionEvent? {
        val normalized = normalizer.normalize(frame) ?: return userOutOfFrame(frame)
        userVisible = true
        lastConfidence = normalized.visibilityScore

        val leftAnkle = normalized.points["left_ankle"] ?: return userOutOfFrame(frame)
        val rightAnkle = normalized.points["right_ankle"] ?: return userOutOfFrame(frame)
        val leftHip = normalized.points["left_hip"] ?: return userOutOfFrame(frame)
        val rightHip = normalized.points["right_hip"] ?: return userOutOfFrame(frame)

        val averageAnkleY = (leftAnkle.y + rightAnkle.y) / 2f
        val averageHipY = (leftHip.y + rightHip.y) / 2f
        val nowMs = frame.timestampMs

        if (baselineAnkleY == null || baselineHipY == null) {
            baselineSamples += averageAnkleY
            baselineHipSamples += averageHipY
            changePhase("CALIBRATING", nowMs)
            if (baselineSamples.size >= 8) {
                baselineAnkleY = baselineSamples.average().toFloat()
                baselineHipY = baselineHipSamples.average().toFloat()
                baselineSamples.clear()
                baselineHipSamples.clear()
                changePhase("IDLE", nowMs)
            }
            return null
        }

        val ankleLift = ((baselineAnkleY!! - averageAnkleY) / normalized.bodyHeight)
        val hipLift = ((baselineHipY!! - averageHipY) / normalized.bodyHeight)
        when {
            phase != "AIRBORNE" && ankleLift >= MIN_ANKLE_LIFT_RATIO && hipLift >= MIN_HIP_LIFT_RATIO && cooledDown(nowMs, REP_COOLDOWN_MS) -> {
                jumpStartedAtMs = nowMs
                changePhase("AIRBORNE", nowMs, startCycle = true)
            }

            phase == "AIRBORNE" && ankleLift <= LANDING_THRESHOLD_RATIO -> {
                val jumpDuration = nowMs - jumpStartedAtMs
                if (jumpDuration >= MIN_JUMP_DURATION_MS) {
                    val quality = ((ankleLift + MIN_ANKLE_LIFT_RATIO) / 0.09f).coerceIn(0.35f, 1f)
                    return repEvent(frame, quality = quality, repDurationMs = jumpDuration)
                }
                changePhase("IDLE", nowMs)
            }

            phase == "COUNTED" && ankleLift <= LANDING_THRESHOLD_RATIO -> changePhase("IDLE", nowMs)
            ankleLift < MIN_ANKLE_LIFT_RATIO -> changePhase("IDLE", nowMs)
        }
        return null
    }

    private companion object {
        const val MIN_ANKLE_LIFT_RATIO = 0.045f
        const val MIN_HIP_LIFT_RATIO = 0.02f
        const val LANDING_THRESHOLD_RATIO = 0.015f
        const val MIN_JUMP_DURATION_MS = 180L
        const val REP_COOLDOWN_MS = 250L
    }
}

private fun calculateAngleIfVisible(
    a: PoseKeypoint?,
    b: PoseKeypoint?,
    c: PoseKeypoint?,
    minimumConfidence: Float = 0.10f
): Double? {
    if (a == null || b == null || c == null) return null
    if (a.confidence < minimumConfidence || b.confidence < minimumConfidence || c.confidence < minimumConfidence) {
        return null
    }
    val radians = atan2(c.y - b.y, c.x - b.x) - atan2(a.y - b.y, a.x - b.x)
    val angle = Math.toDegrees(radians.toDouble())
    val absAngle = kotlin.math.abs(angle)
    return if (absAngle > 180.0) 360.0 - absAngle else absAngle
}

private fun distance(a: PoseKeypoint, b: PoseKeypoint): Float {
    return sqrt((a.x - b.x).pow(2) + (a.y - b.y).pow(2))
}
