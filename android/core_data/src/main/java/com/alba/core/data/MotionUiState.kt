package com.alba.core.data

import com.alba.core.motion.MotionDetectorState
import com.alba.core.motion.MotionEvent
import com.alba.core.motion.MotionType
import com.alba.core.pose.PoseFrame
import com.alba.core.runtime.GameDefinition
import com.alba.core.runtime.GameSceneState
import com.alba.core.runtime.GameSessionStatus
import com.alba.core.runtime.GameTemplate
import com.alba.core.runtime.IdleSceneState

enum class SyncStatus {
    IDLE,
    LOCAL_SAVED,
    SYNCING,
    SYNCED,
    FAILED;

    fun userMessage(): String = when (this) {
        IDLE -> ""
        LOCAL_SAVED -> "Bu cihazda kaydedildi"
        SYNCING -> "Sunucuya kaydediliyor..."
        SYNCED -> "Sunucuya kaydedildi"
        FAILED -> "Sunucu kaydı başarısız"
    }
}

data class WorkoutUiState(
    val sessionId: String? = null,
    val clientSessionKey: String? = null,
    val remoteSessionId: String? = null,
    val state: WorkoutSessionState = WorkoutSessionState.READY,
    val countdownSecondsRemaining: Int? = null,
    val elapsedMs: Long = 0L,
    val totalReps: Int = 0,
    val totalScore: Int = 0,
    val averageQuality: Float = 0f
)

data class GameUiState(
    val sessionId: String? = null,
    val clientSessionKey: String? = null,
    val remoteSessionId: String? = null,
    val gameId: String? = null,
    val template: GameTemplate = GameTemplate.FRUIT_SLASH,
    val title: String = "Oyun",
    val status: GameSessionStatus = GameSessionStatus.READY,
    val score: Int = 0,
    val combo: Int = 0,
    val comboMax: Int = 0,
    val accuracy: Float = 1f,
    val elapsedMs: Long = 0L,
    val remainingMs: Long = 60_000L,
    val motionCounts: Map<MotionType, Int> = emptyMap(),
    val completed: Boolean = false,
    val lastEffect: String? = null,
    val sceneState: GameSceneState = IdleSceneState,
    val syncMessage: String = "Idle",
    val syncStatus: SyncStatus = SyncStatus.IDLE,
    val syncError: String? = null,
    val serverSessionId: String? = null,
    val countdownValue: Int = 0
)

data class MotionUiState(
    val appName: String = "AlbaGo",
    val appVersion: String = "0.1.0",
    val buildType: String = "debug",
    val selectedMotionType: MotionType = MotionType.SQUAT,
    val poseFrame: PoseFrame? = null,
    val fps: Int = 0,
    val inferenceTimeMs: Long = 0L,
    val visibilityScore: Float = 0f,
    val visibleKeypointCount: Int = 0,
    val isUserInFrame: Boolean = false,
    val detectorState: MotionDetectorState = MotionDetectorState(
        phase = "IDLE",
        repCount = 0,
        isUserVisible = false,
        lastConfidence = 0f
    ),
    val detectorVersion: String = "unknown",
    val lastMotionEvent: MotionEvent? = null,
    val motionLog: List<String> = emptyList(),
    val overlayEnabled: Boolean = true,
    val workout: WorkoutUiState = WorkoutUiState(),
    val game: GameUiState = GameUiState(),
    val availableGames: List<GameDefinition> = emptyList(),
    val activeGameDefinition: GameDefinition? = null,
    val activeGameId: String? = null,
    val activeGameTemplate: GameTemplate? = null,
    val activeGameVersion: Int? = null,
    val backendBaseUrlOverride: String? = null,
    val effectiveBackendBaseUrl: String = "",
    val backendStatus: String = "Idle",
    val lastError: String? = null
)
