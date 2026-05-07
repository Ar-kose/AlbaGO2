package com.alba.core.pose

import android.content.Context
import android.os.SystemClock
import com.alba.core.camera.CameraFrame
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.poselandmarker.PoseLandmarker
import com.google.mediapipe.tasks.vision.poselandmarker.PoseLandmarkerResult

data class PoseKeypoint(
    val name: String,
    val x: Float,
    val y: Float,
    val confidence: Float
)

data class BodyBox(
    val left: Float,
    val top: Float,
    val right: Float,
    val bottom: Float
)

data class PoseFrame(
    val timestampMs: Long,
    val keypoints: List<PoseKeypoint>,
    val bodyBox: BodyBox?,
    val visibilityScore: Float,
    val modelVersion: String,
    val imageWidth: Int,
    val imageHeight: Int
)

data class PoseEstimationResult(
    val poseFrame: PoseFrame,
    val inferenceTimeMs: Long
)

interface PoseEstimator : AutoCloseable {
    val modelName: String
    suspend fun warmUp()
    fun estimate(frame: CameraFrame): PoseEstimationResult?
}

class MediaPipePoseEstimator(
    context: Context,
    override val modelName: String = "pose_landmarker_lite.task"
) : PoseEstimator {
    private val poseLandmarker: PoseLandmarker

    init {
        val baseOptions = BaseOptions.builder()
            .setModelAssetPath(modelName)
            .build()
        val options = PoseLandmarker.PoseLandmarkerOptions.builder()
            .setBaseOptions(baseOptions)
            .setRunningMode(RunningMode.VIDEO)
            .setNumPoses(1)
            .setMinPoseDetectionConfidence(0.5f)
            .setMinPosePresenceConfidence(0.5f)
            .setMinTrackingConfidence(0.5f)
            .build()
        poseLandmarker = PoseLandmarker.createFromOptions(context, options)
    }

    override suspend fun warmUp() = Unit

    override fun estimate(frame: CameraFrame): PoseEstimationResult {
        val startMs = SystemClock.elapsedRealtime()
        val mpImage = BitmapImageBuilder(frame.bitmap).build()
        val result = poseLandmarker.detectForVideo(mpImage, frame.timestampMs)
        val poseFrame = result.toPoseFrame(
            timestampMs = frame.timestampMs,
            modelVersion = modelName,
            width = frame.width,
            height = frame.height
        )
        return PoseEstimationResult(
            poseFrame = poseFrame,
            inferenceTimeMs = SystemClock.elapsedRealtime() - startMs
        )
    }

    override fun close() {
        poseLandmarker.close()
    }
}

private val landmarkNames = listOf(
    "nose",
    "left_eye_inner",
    "left_eye",
    "left_eye_outer",
    "right_eye_inner",
    "right_eye",
    "right_eye_outer",
    "left_ear",
    "right_ear",
    "mouth_left",
    "mouth_right",
    "left_shoulder",
    "right_shoulder",
    "left_elbow",
    "right_elbow",
    "left_wrist",
    "right_wrist",
    "left_pinky",
    "right_pinky",
    "left_index",
    "right_index",
    "left_thumb",
    "right_thumb",
    "left_hip",
    "right_hip",
    "left_knee",
    "right_knee",
    "left_ankle",
    "right_ankle",
    "left_heel",
    "right_heel",
    "left_foot_index",
    "right_foot_index"
)

private fun PoseLandmarkerResult?.toPoseFrame(
    timestampMs: Long,
    modelVersion: String,
    width: Int,
    height: Int
): PoseFrame {
    val landmarks = this?.landmarks()?.firstOrNull().orEmpty()
    val keypoints = landmarks.mapIndexed { index, landmark ->
        PoseKeypoint(
            name = landmarkNames.getOrElse(index) { "point_$index" },
            x = landmark.x(),
            y = landmark.y(),
            confidence = runCatching { landmark.visibility().orElse(0f) }.getOrDefault(0f)
        )
    }
    val bodyBox = if (keypoints.isEmpty()) {
        null
    } else {
        BodyBox(
            left = keypoints.minOf { it.x },
            top = keypoints.minOf { it.y },
            right = keypoints.maxOf { it.x },
            bottom = keypoints.maxOf { it.y }
        )
    }
    val visibilityScore = if (keypoints.isEmpty()) {
        0f
    } else {
        keypoints.map { it.confidence }.average().toFloat()
    }
    return PoseFrame(
        timestampMs = timestampMs,
        keypoints = keypoints,
        bodyBox = bodyBox,
        visibilityScore = visibilityScore,
        modelVersion = modelVersion,
        imageWidth = width,
        imageHeight = height
    )
}
