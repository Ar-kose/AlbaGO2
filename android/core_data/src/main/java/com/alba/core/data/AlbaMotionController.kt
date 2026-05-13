package com.alba.core.data

import android.content.Context
import androidx.camera.view.PreviewView
import androidx.lifecycle.LifecycleOwner
import com.alba.core.camera.CameraFrame
import com.alba.core.camera.CameraFrameSource
import com.alba.core.camera.CameraXFrameSource
import com.alba.core.motion.JumpingJackDetectorV1
import com.alba.core.motion.JumpRopeDetectorV1
import com.alba.core.motion.MotionDetector
import com.alba.core.motion.MotionDetectorState
import com.alba.core.motion.MotionEvent
import com.alba.core.motion.MotionEventType
import com.alba.core.motion.MotionType
import com.alba.core.network.AlbaSupabase
import com.alba.core.network.SupabaseAuth
import com.alba.core.network.SupabaseData
import com.alba.core.network.GameRow
import com.alba.core.network.GameSessionSubmitRequest
import com.alba.core.network.GameVersionRow
import com.alba.core.network.GameLevelRow
import com.alba.core.network.GameInteractionRuleRow
import com.alba.core.network.GameMotionRuleRow
import com.alba.core.network.WorkoutSessionRow
import com.alba.core.network.GameSessionRow
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import com.alba.core.motion.SquatDetectorV1
import com.alba.core.data.local.AlbaDatabase
import com.alba.core.data.local.GameSessionRepository
import com.alba.core.data.local.GameSessionSyncWorker

import com.alba.core.pose.MediaPipePoseEstimator
import com.alba.core.pose.PoseEstimationResult
import com.alba.core.pose.PoseEstimator
import com.alba.core.pose.PoseFrame
import com.alba.core.runtime.AssetManifest
import com.alba.core.runtime.CameraRequirement
import com.alba.core.runtime.FruitSlashSceneState
import com.alba.core.runtime.FruitTarget
import com.alba.core.runtime.GameAsset
import com.alba.core.runtime.GameCategory
import com.alba.core.runtime.GameDefinition
import com.alba.core.runtime.GameLevelDefinition
import com.alba.core.runtime.GameOrientation
import com.alba.core.runtime.IdleSceneState
import com.alba.core.runtime.GameRuntime
import com.alba.core.runtime.GameSessionResult
import com.alba.core.runtime.GameSessionStatus
import com.alba.core.runtime.GameTaskDefinition
import com.alba.core.runtime.GameTemplate
import com.alba.core.runtime.DodgeRunSceneState
import com.alba.core.runtime.FitChallengeSceneState
import com.alba.core.runtime.InteractionRule
import com.alba.core.runtime.MotionRule
import com.alba.core.runtime.ProgramStepDefinition
import com.alba.core.runtime.ScenePlaySceneState
import com.alba.core.runtime.ProgramStepType
import com.alba.core.runtime.PublishStatus
import com.alba.core.runtime.RewardRule
import com.alba.core.runtime.RuleActionType
import java.time.Instant
import java.util.UUID
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlin.random.Random

data class MotionDebugConfig(
    val appName: String,
    val appVersion: String,
    val buildType: String,
    val defaultBackendBaseUrl: String,
    val isDebugBuild: Boolean
)

class AlbaMotionController(
    context: Context,
    private val debugConfig: MotionDebugConfig
) : AutoCloseable {
    private val appContext = context.applicationContext
    private val frameSource: CameraFrameSource = CameraXFrameSource(appContext)
    private val sessionRepo: GameSessionRepository by lazy {
        GameSessionRepository(AlbaDatabase.getInstance(appContext))
    }

    val gameSessionRepo: GameSessionRepository get() = sessionRepo
    private val poseEstimator: PoseEstimator = MediaPipePoseEstimator(appContext)
    private val sessionRepository = InMemorySessionRepository()
    private val workoutEngine = WorkoutSessionEngine(sessionRepository)
    private val debugStore = MotionDebugStore(appContext)
    private val initialBackendBaseUrlOverride = debugStore.readBackendBaseUrlOverride()
        ?.let(::normalizeBackendBaseUrl)
    private val initialBackendBaseUrl = initialBackendBaseUrlOverride
        ?: normalizeBackendBaseUrl(debugConfig.defaultBackendBaseUrl)
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private val detectors: Map<MotionType, MotionDetector> = mapOf(
        MotionType.SQUAT to SquatDetectorV1(),
        MotionType.JUMPING_JACK to JumpingJackDetectorV1(),
        MotionType.JUMP_ROPE to JumpRopeDetectorV1()
    )

    private var timerJob: Job? = null
    private var workoutRemoteId: String? = null
    private var gameRemoteId: String? = null
    private var currentProfileId: String? = null
    private var gameRuntime: GameRuntime? = null
    private var lastFrameTimestampMs: Long = 0L
    private var gameResultSynced = false
    private var gameSyncInFlight = false
    private var pendingGameResult: GameSessionResult? = null
    private val gameMotionCounts = mutableMapOf<MotionType, Int>()

    private val _uiState = MutableStateFlow(
        MotionUiState(
            appName = debugConfig.appName,
            appVersion = debugConfig.appVersion,
            buildType = debugConfig.buildType,
            detectorVersion = detectors.getValue(MotionType.SQUAT).version,
            backendBaseUrlOverride = initialBackendBaseUrlOverride,
            effectiveBackendBaseUrl = initialBackendBaseUrl
        )
    )
    val uiState: StateFlow<MotionUiState> = _uiState.asStateFlow()

    init {
        AlbaSupabase.init(initialBackendBaseUrl)
        scope.launch {
            frameSource.frames.collect { processFrame(it) }
        }
        scope.launch {
            refreshActiveGames()
        }
        timerJob = scope.launch {
            while (true) {
                tick()
                delay(250)
            }
        }
    }

    fun bindCamera(lifecycleOwner: LifecycleOwner, previewView: PreviewView) {
        frameSource.bind(lifecycleOwner, previewView)
    }

    fun unbindCamera() {
        frameSource.unbind()
    }

    fun selectMotionType(type: MotionType) {
        detectors[type]?.reset()
        _uiState.value = _uiState.value.copy(
            selectedMotionType = type,
            detectorVersion = detectors.getValue(type).version,
            detectorState = MotionDetectorState("IDLE", 0, false, 0f),
            lastMotionEvent = null
        )
    }

    fun selectGameDefinition(gameId: String) {
        var definition = _uiState.value.availableGames.firstOrNull { it.gameId == gameId && it.isPlayablePublicGame() }
        if (definition == null) {
            // Fallback: search hardcoded demo games when backend returns UUID-based IDs
            definition = fallbackDemoGames().firstOrNull { it.gameId == gameId }
        }
        if (definition == null) return
        _uiState.value = _uiState.value.copy(
            activeGameDefinition = definition,
            activeGameId = definition.gameId,
            activeGameTemplate = definition.template,
            activeGameVersion = definition.version,
            selectedMotionType = definition.supportedMotions.firstOrNull() ?: _uiState.value.selectedMotionType
        )
    }

    fun beginWorkout() {
        val motionType = _uiState.value.selectedMotionType
        val sessionKey = "workout-${UUID.randomUUID()}"
        val startedAtMs = System.currentTimeMillis()
        workoutRemoteId = null
        workoutEngine.start(sessionKey, motionType, startedAtMs)
        _uiState.value = _uiState.value.copy(
            workout = WorkoutUiState(
                sessionId = sessionKey,
                clientSessionKey = sessionKey,
                remoteSessionId = null,
                state = WorkoutSessionState.COUNTDOWN,
                countdownSecondsRemaining = 3
            ),
            backendStatus = "Preparing AlbaGo workout session"
        )
        scope.launch {
            createWorkoutSessionRemote(sessionKey, motionType, startedAtMs)
            for (remaining in 3 downTo 1) {
                _uiState.value = _uiState.value.copy(
                    workout = _uiState.value.workout.copy(
                        state = WorkoutSessionState.COUNTDOWN,
                        countdownSecondsRemaining = remaining
                    )
                )
                delay(1000)
            }
            workoutEngine.activate(sessionKey)
            _uiState.value = _uiState.value.copy(
                workout = _uiState.value.workout.copy(
                    state = WorkoutSessionState.ACTIVE,
                    countdownSecondsRemaining = null
                )
            )
        }
    }

    fun pauseWorkout() {
        val sessionId = _uiState.value.workout.sessionId ?: return
        workoutEngine.pause(sessionId)
        _uiState.value = _uiState.value.copy(
            workout = _uiState.value.workout.copy(state = WorkoutSessionState.PAUSED)
        )
    }

    fun resumeWorkout() {
        val sessionId = _uiState.value.workout.sessionId ?: return
        workoutEngine.resume(sessionId)
        _uiState.value = _uiState.value.copy(
            workout = _uiState.value.workout.copy(state = WorkoutSessionState.ACTIVE)
        )
    }

    fun finishWorkout() {
        val sessionId = _uiState.value.workout.sessionId ?: return
        val summary = workoutEngine.finish(sessionId, System.currentTimeMillis()) ?: return
        _uiState.value = _uiState.value.copy(
            workout = _uiState.value.workout.copy(
                remoteSessionId = workoutRemoteId,
                state = WorkoutSessionState.FINISHED,
                countdownSecondsRemaining = null,
                elapsedMs = summary.elapsedMs,
                totalReps = summary.totalReps,
                totalScore = summary.totalScore,
                averageQuality = summary.averageQuality
            )
        )
        scope.launch {
            syncFinishedWorkout(summary)
        }
    }

    fun startGame() {
        val definition = _uiState.value.activeGameDefinition
            ?.takeIf { it.isPlayablePublicGame() }
            ?: _uiState.value.availableGames.firstOrNull { it.isPlayablePublicGame() }
            ?: fallbackDemoGames().firstOrNull()
            ?: run {
                _uiState.value = _uiState.value.copy(
                    backendStatus = "Oyun kataloğu yüklenemedi",
                    lastError = "Başlatılabilir demo oyun bulunamadı"
                )
                return
            }
        definition.supportedMotions.forEach { motionType ->
            detectors[motionType]?.reset()
        }
        val sessionKey = "game-${UUID.randomUUID()}"
        gameRemoteId = null
        gameResultSynced = false
        gameSyncInFlight = false
        pendingGameResult = null
        gameMotionCounts.clear()
        val runtime = GameRuntime(definition)
        gameRuntime = runtime
        // P32: Body gate + countdown only for camera-requiring games
        val requiresCamera = definition.cameraRequirement != CameraRequirement.HAND_TARGET
        val initialStatus = if (requiresCamera) GameSessionStatus.WAITING_FOR_BODY else GameSessionStatus.ACTIVE
        val initialState = if (requiresCamera) null else runtime.start(System.currentTimeMillis())
        _uiState.value = _uiState.value.copy(
            activeGameDefinition = definition,
            activeGameId = definition.gameId,
            activeGameTemplate = definition.template,
            activeGameVersion = definition.version,
            selectedMotionType = definition.supportedMotions.firstOrNull() ?: _uiState.value.selectedMotionType,
            game = GameUiState(
                sessionId = sessionKey,
                clientSessionKey = sessionKey,
                remoteSessionId = null,
                gameId = definition.gameId,
                template = definition.template,
                title = definition.title,
                status = initialStatus,
                score = initialState?.score ?: 0,
                combo = initialState?.combo ?: 0,
                comboMax = initialState?.comboMax ?: 0,
                accuracy = initialState?.accuracy ?: 1f,
                remainingMs = initialState?.remainingMs ?: (definition.levels.firstOrNull()?.durationSec ?: 60) * 1000L,
                motionCounts = emptyMap(),
                sceneState = initialState?.sceneState ?: IdleSceneState,
                syncMessage = "Idle",
                syncStatus = SyncStatus.IDLE,
                syncError = null,
                serverSessionId = null
            ),
            backendStatus = "Starting ${definition.title}"
        )
        scope.launch {
            createGameSessionRemote(sessionKey, definition.gameId)
        }
    }

    fun finalizeGameStart() {
        val runtime = gameRuntime ?: return
        if (_uiState.value.game.status != GameSessionStatus.WAITING_FOR_BODY) return
        val state = runtime.start(System.currentTimeMillis())
        _uiState.value = _uiState.value.copy(
            game = _uiState.value.game.copy(
                status = state.status,
                score = state.score,
                combo = state.combo,
                comboMax = state.comboMax,
                accuracy = state.accuracy,
                remainingMs = state.remainingMs,
                sceneState = state.sceneState
            )
        )
    }

    fun finishGame() {
        val runtime = gameRuntime ?: return
        val state = runtime.finish(System.currentTimeMillis())
        _uiState.value = _uiState.value.copy(
            game = _uiState.value.game.copy(
                remoteSessionId = gameRemoteId,
                status = state.status,
                score = state.score,
                combo = state.combo,
                comboMax = state.comboMax,
                accuracy = state.accuracy,
                elapsedMs = state.elapsedMs,
                remainingMs = state.remainingMs,
                completed = state.completed,
                lastEffect = state.lastEffect,
                sceneState = state.sceneState,
                syncStatus = SyncStatus.SYNCING,
                syncMessage = "Game sync queued",
                syncError = null
            )
        )
        maybeSyncFinishedGame(force = true)
    }

    fun refreshActiveGameDefinition() {
        scope.launch {
            refreshActiveGames()
        }
    }

    fun retryPendingSync() {
        scope.launch {
            val pending = pendingGameResult
            if (pending != null && !gameResultSynced) {
                syncFinishedGame(pending)
            } else {
                refreshActiveGames()
            }
        }
    }

    fun saveBackendBaseUrlOverride(value: String?) {
        val normalizedOverride = value
            ?.let(::normalizeBackendBaseUrl)
            ?.takeIf { it.isNotBlank() && it != normalizeBackendBaseUrl(debugConfig.defaultBackendBaseUrl) }
        val effectiveUrl = normalizedOverride ?: normalizeBackendBaseUrl(debugConfig.defaultBackendBaseUrl)
        debugStore.saveBackendBaseUrlOverride(normalizedOverride)
        AlbaSupabase.setBackendBaseUrl(effectiveUrl)
        _uiState.value = _uiState.value.copy(
            backendBaseUrlOverride = normalizedOverride,
            effectiveBackendBaseUrl = effectiveUrl,
            backendStatus = "Backend URL updated",
            lastError = null
        )
    }

    fun resetBackendBaseUrlOverride() {
        saveBackendBaseUrlOverride(null)
    }

    fun clearMotionLog() {
        _uiState.value = _uiState.value.copy(motionLog = emptyList())
    }

    fun toggleOverlay() {
        _uiState.value = _uiState.value.copy(overlayEnabled = !_uiState.value.overlayEnabled)
    }

    fun injectMockRep(motionType: MotionType) {
        injectMockMotionEvent(
            MotionEvent(
                type = MotionEventType.REP_COUNTED,
                motionType = motionType,
                count = gameMotionCounts.getOrDefault(motionType, 0) + 1,
                confidence = 0.98f,
                qualityScore = 0.94f,
                timestampMs = System.currentTimeMillis(),
                metadata = mapOf(
                    "source" to "qa_mock",
                    "phase" to "COUNTED",
                    "detectorVersion" to "qa_mock_v1"
                )
            )
        )
    }

    fun injectMockBadForm() {
        injectMockMotionEvent(
            MotionEvent(
                type = MotionEventType.BAD_FORM,
                motionType = _uiState.value.selectedMotionType,
                count = gameMotionCounts.getOrDefault(_uiState.value.selectedMotionType, 0),
                confidence = 0.82f,
                qualityScore = 0.18f,
                timestampMs = System.currentTimeMillis(),
                metadata = mapOf(
                    "source" to "qa_mock",
                    "phase" to "BAD_FORM",
                    "badFormReason" to "manual_qa"
                )
            )
        )
    }

    fun injectMockOutOfFrame() {
        injectMockMotionEvent(
            MotionEvent(
                type = MotionEventType.USER_OUT_OF_FRAME,
                motionType = _uiState.value.selectedMotionType,
                count = gameMotionCounts.getOrDefault(_uiState.value.selectedMotionType, 0),
                confidence = 0.1f,
                qualityScore = 0f,
                timestampMs = System.currentTimeMillis(),
                metadata = mapOf(
                    "source" to "qa_mock",
                    "phase" to "OUT_OF_FRAME"
                )
            )
        )
    }

    private suspend fun processFrame(frame: CameraFrame) {
        val poseResult = runCatching { poseEstimator.estimate(frame) ?: emptyPoseResult(frame) }.getOrElse {
            _uiState.value = _uiState.value.copy(lastError = it.message ?: "Pose estimation failed")
            return
        }
        val poseFrame = poseResult.poseFrame
        val visibleKeypointCount = poseFrame.keypoints.count { it.confidence >= MIN_VISIBLE_KEYPOINT_CONFIDENCE }
        val fps = if (lastFrameTimestampMs == 0L) {
            0
        } else {
            (1000f / (frame.timestampMs - lastFrameTimestampMs).coerceAtLeast(1)).toInt()
        }
        lastFrameTimestampMs = frame.timestampMs

        val activeMotionTypes = activeMotionTypes()
        val detectorStates = mutableMapOf<MotionType, MotionDetectorState>()
        val events = mutableListOf<MotionEvent>()
        activeMotionTypes.forEach { motionType ->
            val activeDetector = detectors.getValue(motionType)
            val detectorEvent = activeDetector.onPoseFrame(poseFrame)
            detectorStates[motionType] = activeDetector.getState()
            if (detectorEvent != null) {
                events += detectorEvent
            }
        }
        val hasFruitContactPose = hasFruitContactPose(poseFrame)
        if (hasFruitContactPose && _uiState.value.activeGameTemplate == GameTemplate.FRUIT_SLASH) {
            events.removeAll { it.type == MotionEventType.USER_OUT_OF_FRAME }
        }
        if (events.none { it.type == MotionEventType.REP_COUNTED }) {
            buildGamePoseInteractionEvent(poseFrame)?.let { events += it }
        }
        val primaryDetector = detectors.getValue(_uiState.value.selectedMotionType)
        val detector = primaryDetector
        val event = events.lastOrNull()
        val isVisible = poseFrame.visibilityScore >= MIN_VISIBILITY_SCORE && visibleKeypointCount >= MIN_VISIBLE_KEYPOINT_COUNT
        val isGameVisible = isVisible || hasFruitContactPose

        var workoutState = _uiState.value.workout
        var gameState = _uiState.value.game
        if (!isVisible && workoutState.state == WorkoutSessionState.ACTIVE) {
            pauseWorkout()
            workoutState = _uiState.value.workout
        } else if (isVisible && workoutState.state == WorkoutSessionState.PAUSED) {
            resumeWorkout()
            workoutState = _uiState.value.workout
        }

        if (!isGameVisible && gameRuntime != null && gameState.status == GameSessionStatus.ACTIVE) {
            val pausedState = gameRuntime?.pause(frame.timestampMs, "Kadraja geri don") ?: gameRuntime!!.snapshot()
            gameState = gameStateFromRuntime(pausedState, gameState.clientSessionKey, gameRemoteId)
        } else if (isGameVisible && gameRuntime != null && gameState.status == GameSessionStatus.PAUSED) {
            val resumedState = gameRuntime?.resume(frame.timestampMs, "Devam") ?: gameRuntime!!.snapshot()
            gameState = gameStateFromRuntime(resumedState, gameState.clientSessionKey, gameRemoteId)
        }

        if (events.isNotEmpty()) {
            var nextMotionLog = _uiState.value.motionLog
            events.forEach { motionEvent ->
                nextMotionLog = appendMotionLog(motionEvent, nextMotionLog)
                if (motionEvent.type == MotionEventType.REP_COUNTED) {
                    val workoutSessionId = workoutState.sessionId
                    val scoreDelta = scoreDeltaFor(motionEvent.motionType)
                    if (gameRuntime != null && gameState.status == GameSessionStatus.ACTIVE) {
                        gameMotionCounts[motionEvent.motionType] =
                            gameMotionCounts.getOrDefault(motionEvent.motionType, 0) + 1
                    }
                    if (workoutSessionId != null) {
                        val workoutSession = workoutEngine.onMotionEvent(workoutSessionId, motionEvent, scoreDelta)
                        if (workoutSession != null) {
                            workoutState = workoutState.copy(
                                elapsedMs = workoutSession.elapsedMs,
                                totalReps = workoutSession.totalReps,
                                totalScore = workoutSession.totalScore,
                                averageQuality = workoutSession.averageQuality
                            )
                        }
                    }
                }
                gameRuntime?.let { runtime ->
                    val runtimeState = runtime.onMotionEvent(motionEvent)
                    gameState = gameStateFromRuntime(runtimeState, gameState.clientSessionKey, gameRemoteId)
                }
            }

            _uiState.value = _uiState.value.copy(motionLog = nextMotionLog)
        }

        _uiState.value = _uiState.value.copy(
            poseFrame = poseFrame,
            fps = fps,
            inferenceTimeMs = poseResult.inferenceTimeMs,
            visibilityScore = poseFrame.visibilityScore,
            visibleKeypointCount = visibleKeypointCount,
            isUserInFrame = isVisible,
            detectorState = detectorStates[_uiState.value.selectedMotionType] ?: detector.getState(),
            detectorVersion = detector.version,
            lastMotionEvent = event ?: _uiState.value.lastMotionEvent,
            workout = workoutState.copy(remoteSessionId = workoutRemoteId),
            game = gameState.copy(remoteSessionId = gameRemoteId),
            activeGameId = _uiState.value.activeGameDefinition?.gameId,
            activeGameTemplate = _uiState.value.activeGameDefinition?.template,
            activeGameVersion = _uiState.value.activeGameDefinition?.version
        )
    }

    private fun injectMockMotionEvent(event: MotionEvent) {
        var workoutState = _uiState.value.workout
        var gameState = _uiState.value.game
        val nextMotionLog = appendMotionLog(event, _uiState.value.motionLog)

        if (event.type == MotionEventType.REP_COUNTED) {
            if (gameRuntime != null && gameState.status == GameSessionStatus.ACTIVE) {
                gameMotionCounts[event.motionType] = gameMotionCounts.getOrDefault(event.motionType, 0) + 1
            }
            workoutState.sessionId?.let { workoutSessionId ->
                val workoutSession = workoutEngine.onMotionEvent(workoutSessionId, event, scoreDeltaFor(event.motionType))
                if (workoutSession != null) {
                    workoutState = workoutState.copy(
                        elapsedMs = workoutSession.elapsedMs,
                        totalReps = workoutSession.totalReps,
                        totalScore = workoutSession.totalScore,
                        averageQuality = workoutSession.averageQuality
                    )
                }
            }
        }

        gameRuntime?.let { runtime ->
            val runtimeState = runtime.onMotionEvent(event)
            gameState = gameStateFromRuntime(runtimeState, gameState.clientSessionKey, gameRemoteId)
        }

        _uiState.value = _uiState.value.copy(
            isUserInFrame = event.type != MotionEventType.USER_OUT_OF_FRAME,
            selectedMotionType = event.motionType,
            detectorState = _uiState.value.detectorState.copy(
                phase = event.metadata["phase"] ?: event.type.name,
                repCount = gameMotionCounts.getOrDefault(event.motionType, _uiState.value.detectorState.repCount),
                lastConfidence = event.confidence,
                isUserVisible = event.type != MotionEventType.USER_OUT_OF_FRAME
            ),
            lastMotionEvent = event,
            motionLog = nextMotionLog,
            workout = workoutState.copy(remoteSessionId = workoutRemoteId),
            game = gameState.copy(remoteSessionId = gameRemoteId),
            backendStatus = "QA mock ${event.motionType.name} ${event.type.name}"
        )
    }

    private fun tick() {
        val nowMs = System.currentTimeMillis()
        val workoutSessionId = _uiState.value.workout.sessionId
        if (workoutSessionId != null) {
            sessionRepository.read(workoutSessionId)?.let { session ->
                if (session.state == WorkoutSessionState.ACTIVE) {
                    _uiState.value = _uiState.value.copy(
                        workout = _uiState.value.workout.copy(elapsedMs = nowMs - session.startedAtMs)
                    )
                }
            }
        }
        gameRuntime?.let { runtime ->
            val status = _uiState.value.game.status
            if (status != GameSessionStatus.ACTIVE && status != GameSessionStatus.PAUSED) return@let
            val state = runtime.tick(nowMs)
            _uiState.value = _uiState.value.copy(
                game = gameStateFromRuntime(state, _uiState.value.game.clientSessionKey, gameRemoteId)
            )
            if (state.status == GameSessionStatus.FINISHED && !gameResultSynced) {
                maybeSyncFinishedGame(force = false)
            }
        }
    }

    private fun appendMotionLog(event: MotionEvent, currentLog: List<String>): List<String> {
        val line = "${event.motionType.name}:${event.type.name} c=${event.count} q=${"%.2f".format(event.qualityScore)}"
        return (currentLog + line).takeLast(12)
    }

    private fun activeMotionTypes(): List<MotionType> {
        val gameStatus = _uiState.value.game.status
        return if ((gameStatus == GameSessionStatus.ACTIVE || gameStatus == GameSessionStatus.PAUSED) &&
            _uiState.value.activeGameDefinition != null
        ) {
            _uiState.value.activeGameDefinition!!.supportedMotions
        } else {
            listOf(_uiState.value.selectedMotionType)
        }
    }

    private fun buildGamePoseInteractionEvent(poseFrame: PoseFrame): MotionEvent? {
        val runtime = gameRuntime ?: return null
        if (_uiState.value.game.status != GameSessionStatus.ACTIVE) return null
        if (_uiState.value.activeGameTemplate != GameTemplate.FRUIT_SLASH) return null
        val scene = runtime.snapshot().sceneState as? FruitSlashSceneState ?: return null
        if (scene.targets.isEmpty()) return null

        val contactPoints = poseFrame.keypoints
            .filter {
                it.name in FRUIT_CONTACT_KEYPOINTS &&
                    it.confidence >= MIN_FRUIT_CONTACT_KEYPOINT_CONFIDENCE
            }
        if (contactPoints.isEmpty()) return null

        val nowMs = poseFrame.timestampMs
        val target = scene.targets.firstOrNull { candidate ->
            val center = fruitTargetCenter(candidate, nowMs)
            val radiusSquared = candidate.hitRadius * candidate.hitRadius
            contactPoints.any { point ->
                val directHit = squaredDistance(point.x, point.y, center.first, center.second) <= radiusSquared
                val mirroredHit = squaredDistance(1f - point.x, point.y, center.first, center.second) <= radiusSquared
                directHit || mirroredHit
            }
        } ?: return null

        return MotionEvent(
            type = MotionEventType.REP_COUNTED,
            motionType = target.requiredMotion,
            count = gameMotionCounts.getOrDefault(target.requiredMotion, 0) + 1,
            confidence = poseFrame.visibilityScore,
            qualityScore = 0.86f,
            timestampMs = nowMs,
            metadata = mapOf(
                "source" to "fruit_pose_contact",
                "phase" to "FRUIT_CONTACT",
                "detectorVersion" to "fruit_pose_contact_v1",
                "targetId" to target.id,
                "targetLabel" to target.label
            )
        )
    }

    private fun hasFruitContactPose(poseFrame: PoseFrame): Boolean {
        if (_uiState.value.activeGameTemplate != GameTemplate.FRUIT_SLASH) return false
        val status = _uiState.value.game.status
        if (status != GameSessionStatus.ACTIVE && status != GameSessionStatus.PAUSED) return false
        return poseFrame.keypoints.any {
            it.name in FRUIT_CONTACT_KEYPOINTS &&
                it.confidence >= MIN_FRUIT_CONTACT_KEYPOINT_CONFIDENCE
        }
    }

    private fun fruitTargetCenter(target: FruitTarget, nowMs: Long): Pair<Float, Float> {
        val travel = ((nowMs - target.spawnedAtMs).toFloat() / target.lifeMs.toFloat()).coerceIn(0f, 1f)
        val x = ((target.lane.coerceIn(0, 2) + 0.5f) / 3f).coerceIn(0.08f, 0.92f)
        val y = (0.22f + 0.58f * travel).coerceIn(0.16f, 0.86f)
        return x to y
    }

    private fun squaredDistance(x1: Float, y1: Float, x2: Float, y2: Float): Float {
        val dx = x1 - x2
        val dy = y1 - y2
        return dx * dx + dy * dy
    }


    private suspend fun refreshActiveGames() {
        _uiState.value = _uiState.value.copy(backendStatus = "Oyunlar yükleniyor")
        var hasError = false
        val gameIds = mutableListOf<String>()
        val definitions = try {
            val games = SupabaseData.getActiveGames()
            games.mapNotNull { game ->
                gameIds.add(game.id)
                val version = SupabaseData.getGameWithVersions(game.id).second.firstOrNull() ?: return@mapNotNull null
                supabaseGameToDefinition(game, version)
                    ?.takeIf { it.isPlayablePublicGame() }
            }.sortedBy { publicTemplates.indexOf(it.template) }
        } catch (e: Exception) {
            hasError = true
            val cachedGames = debugStore.readCachedAvailableGames()
                .filter { it.isPlayablePublicGame() }
                .sortedBy { publicTemplates.indexOf(it.template) }
            when {
                cachedGames.isNotEmpty() -> cachedGames
                debugConfig.isDebugBuild -> fallbackDemoGames()
                else -> emptyList()
            }
        }

        if (definitions.isNotEmpty() && !hasError) {
            debugStore.cacheAvailableGames(definitions)
        }

        val currentSelectionId = _uiState.value.activeGameId
        val selectedDefinition = definitions.firstOrNull { it.gameId == currentSelectionId && it.isPlayablePublicGame() }
            ?: definitions.firstOrNull { it.isPlayablePublicGame() }

        _uiState.value = _uiState.value.copy(
            availableGames = definitions,
            activeGameDefinition = selectedDefinition,
            activeGameId = selectedDefinition?.gameId,
            activeGameTemplate = selectedDefinition?.template,
            activeGameVersion = selectedDefinition?.version,
            backendStatus = when {
                !hasError && definitions.isNotEmpty() -> "Bagli"
                definitions.isNotEmpty() -> "Onbellekten yuklendi"
                else -> "Cevrimdisi — veri yuklenemedi"
            },
            lastError = if (hasError) "Supabase bağlantısı başarısız, önbellek kullanılıyor" else null
        )
    }

    private suspend fun supabaseGameToDefinition(
        game: GameRow,
        version: GameVersionRow
    ): GameDefinition? {
        val parsedTemplate = enumValueOrNull<GameTemplate>(game.config?.get("template")?.jsonPrimitive?.content ?: game.gameKey) ?: return null
        val parsedStatus = enumValueOrNull<PublishStatus>(version.status) ?: return null
        val parsedCategory = enumValueOrNull<GameCategory>(game.category) ?: GameCategory.FUN
        val parsedOrientation = enumValueOrNull<GameOrientation>(game.orientation) ?: GameOrientation.PORTRAIT
        val parsedMotions = version.supportedMotions?.mapNotNull { enumValueOrNull<MotionType>(it) } ?: emptyList()
        if (parsedMotions.isEmpty()) return null

        val levels = try {
            val levelRows = SupabaseData.getGameLevels(version.id)
            levelRows.mapNotNull { level ->
                supabaseLevelToDefinition(level)
            }
        } catch (e: Exception) {
            emptyList()
        }
        if (levels.isEmpty()) return null

        val rawAssets = game.metadata?.get("assets")?.jsonObject
        val assets = AssetManifest(
            cover = rawAssets?.get("cover")?.jsonPrimitive?.content?.takeIf { it.isNotBlank() },
            background = rawAssets?.get("background")?.jsonPrimitive?.content ?: "local://${game.gameKey}/background",
            character = rawAssets?.get("character")?.jsonPrimitive?.content ?: "local://${game.gameKey}/hero",
            soundtrack = rawAssets?.get("soundtrack")?.jsonPrimitive?.content,
            items = rawAssets?.get("items")?.jsonArray?.mapNotNull { item: JsonElement ->
                val obj = item.jsonObject
                GameAsset(
                    key = obj["key"]?.jsonPrimitive?.content ?: return@mapNotNull null,
                    kind = obj["kind"]?.jsonPrimitive?.content ?: "IMAGE",
                    format = obj["format"]?.jsonPrimitive?.content ?: "PNG",
                    uri = obj["uri"]?.jsonPrimitive?.content ?: return@mapNotNull null
                )
            } ?: emptyList()
        )

        return GameDefinition(
            gameId = game.id,
            version = version.version.toIntOrNull() ?: 1,
            template = parsedTemplate,
            title = game.title,
            description = game.description ?: "",
            status = parsedStatus,
            minAppVersion = version.minAppVersion ?: game.minAppVersion ?: "0.1.0",
            category = parsedCategory,
            tags = game.tags ?: emptyList(),
            orientation = parsedOrientation,
            cameraRequirement = if (game.requiresCamera) CameraRequirement.FULL_BODY else CameraRequirement.HAND_TARGET,
            supportedMotions = parsedMotions,
            levels = levels,
            assets = assets
        )
    }

    private suspend fun supabaseLevelToDefinition(level: GameLevelRow): GameLevelDefinition? {
        val motionRules = try {
            SupabaseData.getGameMotionRules(level.gameVersionId).mapNotNull { rule ->
                val motion = enumValueOrNull<MotionType>(rule.motion) ?: return@mapNotNull null
                val event = enumValueOrNull<MotionEventType>(rule.config?.get("event")?.jsonPrimitive?.content ?: "REP_COUNTED") ?: MotionEventType.REP_COUNTED
                MotionRule(motion, event, (rule.scoring?.get("points")?.jsonPrimitive?.intOrNull ?: 0), rule.cooldownMs.toLong())
            }
        } catch (e: Exception) { emptyList() }

        if (motionRules.isEmpty()) return null

        val rewards = try {
            SupabaseData.getGameRewardRules(level.gameVersionId).map { reward ->
                RewardRule(reward.rewardType, reward.amount, (reward.conditions?.get("minimumScore")?.jsonPrimitive?.intOrNull ?: 0))
            }
        } catch (e: Exception) { emptyList() }

        val programSteps = try {
            SupabaseData.getGameProgramSteps(level.id).mapNotNull { step ->
                val type = enumValueOrNull<ProgramStepType>(step.stepType) ?: return@mapNotNull null
                ProgramStepDefinition(
                    stepId = step.stepKey,
                    type = type,
                    title = step.title,
                    motion = enumValueOrNull<MotionType>(step.motion),
                    targetCount = step.targetCount,
                    holdSec = step.holdSec,
                    durationSec = step.durationSec,
                    successMessage = step.successMessage,
                    nextOnComplete = step.isRequired
                )
            }
        } catch (e: Exception) { emptyList() }

        val interactionRules = try {
            SupabaseData.getGameInteractionRules(level.gameVersionId).mapNotNull { ir ->
                val irJson = ir.interactionPayload ?: return@mapNotNull null
                val actionStr = irJson["action"]?.jsonPrimitive?.content ?: "ADD_SCORE"
                val action = enumValueOrNull<RuleActionType>(actionStr) ?: return@mapNotNull null
                InteractionRule(
                    input = ir.interactionType,
                    event = irJson["event"]?.jsonPrimitive?.content?.let { enumValueOrNull<MotionEventType>(it) },
                    motion = ir.motion?.let { enumValueOrNull<MotionType>(it) },
                    targetObjectType = irJson["targetObjectType"]?.jsonPrimitive?.content,
                    action = action,
                    points = irJson["points"]?.jsonPrimitive?.intOrNull ?: 0,
                    cooldownMs = (irJson["cooldownMs"]?.jsonPrimitive?.intOrNull ?: 0).toLong()
                )
            }
        } catch (e: Exception) { emptyList() }

        val sceneConfigMap = level.sceneConfig?.let { jsonObjectToMap(it) } ?: emptyMap()

        return GameLevelDefinition(
            levelId = level.levelKey,
            durationSec = level.durationSec,
            targetScore = level.targetScore,
            difficulty = level.difficulty,
            motionRules = motionRules,
            rewards = rewards,
            config = emptyMap(),
            sceneConfig = sceneConfigMap,
            interactionRules = interactionRules,
            programSteps = programSteps
        )
    }

    private suspend fun createWorkoutSessionRemote(sessionKey: String, motionType: MotionType, startedAtMs: Long) {
        val profileId = currentProfileId
        if (profileId == null) {
            _uiState.value = _uiState.value.copy(backendStatus = "Profile not initialized, running offline")
            return
        }
        runCatching {
            SupabaseData.createWorkoutSession(
                WorkoutSessionRow(
                    profileId = profileId,
                    status = "active",
                    startedAt = Instant.ofEpochMilli(startedAtMs).toString(),
                    score = 0
                )
            )
        }.onSuccess {
            if (it != null) {
                workoutRemoteId = it.id
                _uiState.value = _uiState.value.copy(
                    workout = _uiState.value.workout.copy(remoteSessionId = it.id),
                    backendStatus = "Workout session created",
                    lastError = null
                )
            }
        }.onFailure {
            _uiState.value = _uiState.value.copy(
                backendStatus = "Workout running in offline mode",
                lastError = it.message
            )
        }
    }

    private suspend fun syncFinishedWorkout(summary: WorkoutSessionSummary) {
        if (workoutRemoteId == null) return
        try {
            SupabaseData.updateWorkoutSession(workoutRemoteId!!, mapOf(
                "ended_at" to Instant.now().toString(),
                "duration_sec" to (summary.elapsedMs / 1000).toInt(),
                "score" to summary.totalScore,
                "status" to "completed",
                "motion_summary" to mapOf(
                    "reps" to summary.totalReps,
                    "averageQuality" to summary.averageQuality,
                    "motionType" to summary.motionType.name
                )
            ))
            _uiState.value = _uiState.value.copy(backendStatus = "Workout synced", lastError = null)
        } catch (e: Exception) {
            _uiState.value = _uiState.value.copy(backendStatus = "Workout sync failed", lastError = e.message)
        }
    }

    private suspend fun createGameSessionRemote(sessionKey: String, gameId: String) {
        val profileId = currentProfileId ?: return
        val version = _uiState.value.activeGameVersion ?: 1
        runCatching {
            SupabaseData.createGameSession(
                GameSessionRow(
                    profileId = profileId,
                    gameId = gameId,
                    gameVersionId = "v$version",
                    status = "active",
                    startedAt = Instant.now().toString(),
                    score = 0
                )
            )
        }.onSuccess {
            if (it != null) {
                gameRemoteId = it.id
                _uiState.value = _uiState.value.copy(
                    game = _uiState.value.game.copy(remoteSessionId = it.id, syncMessage = "Game session created"),
                    backendStatus = "Game session created",
                    lastError = null
                )
            }
        }.onFailure {
            _uiState.value = _uiState.value.copy(
                game = _uiState.value.game.copy(syncMessage = "Game offline mode"),
                backendStatus = "Game running in offline mode",
                lastError = it.message
            )
        }
    }

    private fun maybeSyncFinishedGame(force: Boolean) {
        if (gameResultSynced) return
        if (gameSyncInFlight) return
        val runtime = gameRuntime ?: return
        val result = runtime.buildResult(
            clientSessionKey = _uiState.value.game.clientSessionKey ?: "game-local",
            motionCounts = gameMotionCounts.toMap(),
            endedAtMs = System.currentTimeMillis()
        )
        pendingGameResult = result
        if (!force && _uiState.value.game.status != GameSessionStatus.FINISHED) {
            _uiState.value = _uiState.value.copy(
                game = _uiState.value.game.copy(status = GameSessionStatus.FINISHED, completed = true)
            )
        }
        _uiState.value = _uiState.value.copy(
            game = _uiState.value.game.copy(
                score = result.score,
                comboMax = result.comboMax,
                accuracy = result.accuracy.toFloat(),
                elapsedMs = result.durationSec * 1000L,
                motionCounts = result.motionCounts,
                syncStatus = SyncStatus.LOCAL_SAVED,
                syncMessage = SyncStatus.LOCAL_SAVED.userMessage(),
                syncError = null
            )
        )
        scope.launch { syncFinishedGame(result) }
    }

    private suspend fun syncFinishedGame(result: GameSessionResult) {
        if (gameSyncInFlight) return
        gameSyncInFlight = true
        _uiState.value = _uiState.value.copy(
            game = _uiState.value.game.copy(
                syncStatus = SyncStatus.SYNCING,
                syncMessage = SyncStatus.SYNCING.userMessage(),
                syncError = null
            )
        )

        val request = buildGameSessionSubmitRequest(result)
        val motionMap = result.motionCounts.mapKeys { it.key.name }

        // P18: Save to local Room DB + enqueue WorkManager
        runCatching {
            sessionRepo.saveAndEnqueue(request, request.resultPayload, motionMap)
        }
        GameSessionSyncWorker.enqueue(appContext, request.clientSessionId)

        // Fast path: try direct sync
        val response = SupabaseData.submitGameSessionResult(request)
        response.onSuccess { submitted ->
            gameRemoteId = submitted.id
            pendingGameResult = null
            gameResultSynced = true
            runCatching { sessionRepo.markSynced("local-${request.clientSessionId}", submitted.id) }
            _uiState.value = _uiState.value.copy(
                game = _uiState.value.game.copy(
                    remoteSessionId = submitted.id,
                    serverSessionId = submitted.id,
                    elapsedMs = result.durationSec * 1000L,
                    motionCounts = result.motionCounts,
                    comboMax = result.comboMax,
                    accuracy = result.accuracy,
                    syncStatus = SyncStatus.SYNCED,
                    syncMessage = SyncStatus.SYNCED.userMessage(),
                    syncError = null
                ),
                backendStatus = SyncStatus.SYNCED.userMessage(),
                lastError = null
            )
        }.onFailure { error ->
            android.util.Log.e("AlbaGoSync", "Game sync deferred to worker", error)
            pendingGameResult = result
            _uiState.value = _uiState.value.copy(
                game = _uiState.value.game.copy(
                    elapsedMs = result.durationSec * 1000L,
                    motionCounts = result.motionCounts,
                    comboMax = result.comboMax,
                    accuracy = result.accuracy,
                    syncStatus = SyncStatus.LOCAL_SAVED,
                    syncMessage = "Cihaza kaydedildi — arka planda gonderilecek",
                    syncError = null
                ),
                backendStatus = "Arka plana alindi",
                lastError = null
            )
        }
        gameSyncInFlight = false
    }

    private fun buildGameSessionSubmitRequest(result: GameSessionResult): GameSessionSubmitRequest {
        val definition = _uiState.value.activeGameDefinition
        val runtimeSnapshot = gameRuntime?.snapshot()
        val startedAt = Instant.ofEpochMilli(result.startedAtMs).toString()
        val endedAt = Instant.ofEpochMilli(result.endedAtMs).toString()
        val payload = JsonObject(
            mutableMapOf<String, JsonElement>(
                "gameId" to JsonPrimitive(result.gameId),
                "gameKey" to JsonPrimitive(definition?.gameId ?: result.gameId),
                "gameTitle" to JsonPrimitive(definition?.title ?: _uiState.value.game.title),
                "template" to JsonPrimitive(definition?.template?.name ?: _uiState.value.game.template.name),
                "gameVersion" to JsonPrimitive(result.gameVersion),
                "score" to JsonPrimitive(result.score),
                "comboMax" to JsonPrimitive(result.comboMax),
                "accuracy" to JsonPrimitive(result.accuracy.toDouble()),
                "durationSec" to JsonPrimitive(result.durationSec),
                "startedAt" to JsonPrimitive(startedAt),
                "endedAt" to JsonPrimitive(endedAt),
                "motionSummary" to result.motionCounts.toMotionSummaryJson(),
                "programSteps" to runtimeSnapshot?.program?.steps.orEmpty().toProgramStepsJson(),
                "sceneState" to _uiState.value.game.sceneState.toSceneSummaryJson(),
                "debugSource" to JsonPrimitive("android_game_finish")
            )
        )
        return GameSessionSubmitRequest(
            clientSessionId = result.clientSessionKey,
            gameKey = definition?.gameId ?: result.gameId,
            gameDefinitionId = definition?.gameId,
            gameDefinitionVersion = result.gameVersion,
            deviceId = null,
            startedAt = startedAt,
            endedAt = endedAt,
            durationSec = result.durationSec,
            score = result.score,
            combo = result.comboMax,
            accuracy = result.accuracy.toDouble(),
            calories = 0.0,
            resultPayload = payload
        )
    }

    private fun Map<MotionType, Int>.toMotionSummaryJson(): JsonObject {
        return JsonObject(mapKeys { it.key.name }.mapValues { JsonPrimitive(it.value) })
    }

    private fun List<com.alba.core.runtime.ProgramRuntimeStepState>.toProgramStepsJson(): JsonArray {
        return JsonArray(map { step ->
            JsonObject(
                mapOf(
                    "stepId" to JsonPrimitive(step.stepId),
                    "type" to JsonPrimitive(step.type.name),
                    "title" to JsonPrimitive(step.title),
                    "status" to JsonPrimitive(step.status.name),
                    "progressCount" to JsonPrimitive(step.progressCount),
                    "targetCount" to nullableNumber(step.targetCount),
                    "remainingMs" to nullableNumber(step.remainingMs),
                    "message" to JsonPrimitive(step.message ?: "")
                )
            )
        })
    }

    private fun com.alba.core.runtime.GameSceneState.toSceneSummaryJson(): JsonObject {
        return when (this) {
            is FruitSlashSceneState -> JsonObject(
                mapOf(
                    "type" to JsonPrimitive("FRUIT_SLASH"),
                    "activeTargets" to JsonPrimitive(targets.size),
                    "slicedCount" to JsonPrimitive(slicedCount),
                    "missedCount" to JsonPrimitive(missedCount),
                    "penaltyCount" to JsonPrimitive(penaltyCount)
                )
            )
            is DodgeRunSceneState -> JsonObject(
                mapOf(
                    "type" to JsonPrimitive("DODGE_RUN"),
                    "activeObstacles" to JsonPrimitive(obstacles.size),
                    "lives" to JsonPrimitive(lives),
                    "distance" to JsonPrimitive(distance),
                    "energy" to JsonPrimitive(energy),
                    "dodgedCount" to JsonPrimitive(dodgedCount),
                    "missedCount" to JsonPrimitive(missedCount)
                )
            )
            is FitChallengeSceneState -> JsonObject(
                mapOf(
                    "type" to JsonPrimitive("FIT_CHALLENGE"),
                    "activeTaskIndex" to JsonPrimitive(activeTaskIndex),
                    "completedTasks" to JsonPrimitive(completedTasks),
                    "qualityScore" to JsonPrimitive(qualityScore),
                    "tasks" to JsonArray(tasks.map { task ->
                        JsonObject(
                            mapOf(
                                "motion" to JsonPrimitive(task.motion.name),
                                "targetCount" to JsonPrimitive(task.targetCount),
                                "currentCount" to JsonPrimitive(task.currentCount)
                            )
                        )
                    })
                )
            )
            is ScenePlaySceneState -> JsonObject(
                mapOf(
                    "type" to JsonPrimitive("SCENE_PLAY"),
                    "activeObjects" to JsonPrimitive(objects.size),
                    "lives" to JsonPrimitive(lives),
                    "clearedCount" to JsonPrimitive(clearedCount),
                    "missedCount" to JsonPrimitive(missedCount),
                    "prompt" to JsonPrimitive(prompt)
                )
            )
            else -> JsonObject(mapOf("type" to JsonPrimitive("IDLE")))
        }
    }

    private fun nullableNumber(value: Int?): JsonElement = if (value != null) JsonPrimitive(value) else JsonPrimitive(0)

    private fun nullableNumber(value: Long?): JsonElement = if (value != null) JsonPrimitive(value) else JsonPrimitive(0)

    private fun sanitizeSyncError(error: Throwable): String {
        return (error.message ?: error::class.java.simpleName)
            .replace(Regex("(?i)(token|key|secret)=([^\\s&]+)"), "$1=<redacted>")
            .take(180)
    }

    override fun close() {
        timerJob?.cancel()
        frameSource.unbind()
        poseEstimator.close()
        (scope.coroutineContext[Job] as? Job)?.cancel()
    }

    private fun scoreDeltaFor(motionType: MotionType): Int {
        val activeDefinition = _uiState.value.activeGameDefinition
        val rulePoints = activeDefinition?.levels?.firstOrNull()
            ?.motionRules
            ?.firstOrNull { it.motion == motionType && it.event == MotionEventType.REP_COUNTED }
            ?.points
        return rulePoints ?: when (motionType) {
            MotionType.SQUAT -> 10
            MotionType.JUMPING_JACK -> 15
            MotionType.JUMP_ROPE -> 3
        }
    }

    private fun gameStateFromRuntime(
        runtimeState: com.alba.core.runtime.GameRuntimeState,
        clientSessionKey: String?,
        remoteSessionId: String?
    ): GameUiState {
        return _uiState.value.game.copy(
            clientSessionKey = clientSessionKey,
            remoteSessionId = remoteSessionId,
            gameId = _uiState.value.activeGameDefinition?.gameId,
            template = runtimeState.template,
            title = runtimeState.title,
            status = runtimeState.status,
            score = runtimeState.score,
            combo = runtimeState.combo,
            comboMax = runtimeState.comboMax,
            accuracy = runtimeState.accuracy,
            elapsedMs = runtimeState.elapsedMs,
            remainingMs = runtimeState.remainingMs,
            motionCounts = gameMotionCounts.toMap(),
            completed = runtimeState.completed,
            lastEffect = runtimeState.lastEffect,
            sceneState = runtimeState.sceneState
        )
    }

    private fun GameDefinition.isPlayablePublicGame(): Boolean {
        return template in publicTemplates &&
            status == PublishStatus.PUBLISHED &&
            supportedMotions.isNotEmpty() &&
            levels.any { it.durationSec > 0 && it.motionRules.isNotEmpty() }
    }

    private inline fun <reified T : Enum<T>> enumValueOrNull(rawValue: String?): T? {
        val normalized = rawValue?.trim()?.takeIf { it.isNotBlank() } ?: return null
        return enumValues<T>().firstOrNull { it.name.equals(normalized, ignoreCase = true) }
    }

    private fun fallbackDemoGames(): List<GameDefinition> {
        return listOf(
            GameDefinition(
                gameId = "fruit_slash_demo",
                version = 1,
                template = GameTemplate.FRUIT_SLASH,
                title = "Meyve Kesme",
                description = "Jumping jack ve squat ile ritimli meyve kesme demosu.",
                status = PublishStatus.PUBLISHED,
                minAppVersion = "0.1.0",
                category = GameCategory.FUN,
                tags = listOf("reflex", "arcade"),
                supportedMotions = listOf(MotionType.SQUAT, MotionType.JUMPING_JACK),
                levels = listOf(
                    GameLevelDefinition(
                        levelId = "fruit_slash_level_1",
                        durationSec = 60,
                        targetScore = 420,
                        difficulty = "EASY",
                        motionRules = listOf(
                            MotionRule(MotionType.JUMPING_JACK, MotionEventType.REP_COUNTED, 15, 400),
                            MotionRule(MotionType.SQUAT, MotionEventType.REP_COUNTED, 10, 500),
                            MotionRule(MotionType.SQUAT, MotionEventType.BAD_FORM, -5, 250),
                            MotionRule(MotionType.JUMPING_JACK, MotionEventType.BAD_FORM, -5, 250)
                        ),
                        rewards = listOf(RewardRule("STAR", 3, 420)),
                        config = mapOf(
                            "spawnRateMs" to 900,
                            "comboMultiplier" to true,
                            "penaltyObjects" to true,
                            "penaltyPoints" to 10
                        ),
                        programSteps = listOf(
                            ProgramStepDefinition(
                                stepId = "fruit_step_play",
                                type = ProgramStepType.PLAY_GAME,
                                title = "Meyveleri kes",
                                durationSec = 60,
                                successMessage = "Meyve turu tamamlandi."
                            )
                        )
                    )
                ),
                assets = AssetManifest(
                    background = "local://fruit-slash/background",
                    character = "local://fruit-slash/hero",
                    soundtrack = "local://fruit-slash/theme"
                )
            ),
            GameDefinition(
                gameId = "dodge_run_demo",
                version = 1,
                template = GameTemplate.DODGE_RUN,
                title = "Engelden Kaçış",
                description = "Squat, jumping jack ve jump rope ile kaçış demosu.",
                status = PublishStatus.PUBLISHED,
                minAppVersion = "0.1.0",
                category = GameCategory.FUN,
                tags = listOf("runner", "reaction"),
                supportedMotions = listOf(MotionType.SQUAT, MotionType.JUMPING_JACK, MotionType.JUMP_ROPE),
                levels = listOf(
                    GameLevelDefinition(
                        levelId = "dodge_run_level_1",
                        durationSec = 60,
                        targetScore = 500,
                        difficulty = "MEDIUM",
                        motionRules = listOf(
                            MotionRule(MotionType.SQUAT, MotionEventType.REP_COUNTED, 10, 500),
                            MotionRule(MotionType.JUMPING_JACK, MotionEventType.REP_COUNTED, 15, 450),
                            MotionRule(MotionType.JUMP_ROPE, MotionEventType.REP_COUNTED, 3, 250),
                            MotionRule(MotionType.SQUAT, MotionEventType.BAD_FORM, -5, 250),
                            MotionRule(MotionType.JUMPING_JACK, MotionEventType.BAD_FORM, -5, 250)
                        ),
                        rewards = listOf(RewardRule("ENERGY", 1, 350)),
                        config = mapOf(
                            "lives" to 3,
                            "obstacleSpawnMs" to 1400,
                            "pauseOnOutOfFrame" to true,
                            "baseDistancePerTick" to 2,
                            "damageOnMiss" to 1
                        ),
                        programSteps = listOf(
                            ProgramStepDefinition(
                                stepId = "dodge_step_play",
                                type = ProgramStepType.PLAY_GAME,
                                title = "Engelleri gec",
                                durationSec = 60,
                                successMessage = "Kacis parkuru tamamlandi."
                            )
                        )
                    )
                ),
                assets = AssetManifest(
                    background = "local://dodge-run/background",
                    character = "local://dodge-run/runner",
                    soundtrack = "local://dodge-run/theme"
                )
            ),
            GameDefinition(
                gameId = "fit_challenge_demo",
                version = 1,
                template = GameTemplate.FIT_CHALLENGE,
                title = "Spor Mücadelesi",
                description = "Görev tabanlı egzersiz demosu.",
                status = PublishStatus.PUBLISHED,
                minAppVersion = "0.1.0",
                category = GameCategory.SPORT,
                tags = listOf("playlist", "fitness"),
                supportedMotions = listOf(MotionType.SQUAT, MotionType.JUMPING_JACK, MotionType.JUMP_ROPE),
                levels = listOf(
                    GameLevelDefinition(
                        levelId = "fit_challenge_level_1",
                        durationSec = 120,
                        targetScore = 620,
                        difficulty = "CHALLENGE",
                        motionRules = listOf(
                            MotionRule(MotionType.SQUAT, MotionEventType.REP_COUNTED, 10, 500),
                            MotionRule(MotionType.JUMPING_JACK, MotionEventType.REP_COUNTED, 12, 400),
                            MotionRule(MotionType.JUMP_ROPE, MotionEventType.REP_COUNTED, 3, 220),
                            MotionRule(MotionType.SQUAT, MotionEventType.BAD_FORM, -3, 250),
                            MotionRule(MotionType.JUMPING_JACK, MotionEventType.BAD_FORM, -3, 250),
                            MotionRule(MotionType.JUMP_ROPE, MotionEventType.BAD_FORM, -2, 200)
                        ),
                        rewards = listOf(RewardRule("BADGE", 1, 620)),
                        config = mapOf(
                            "showQualityScore" to true,
                            "advanceAutomatically" to true
                        ),
                        tasks = listOf(
                            GameTaskDefinition(MotionType.SQUAT, 10, 10),
                            GameTaskDefinition(MotionType.JUMPING_JACK, 10, 12),
                            GameTaskDefinition(MotionType.JUMP_ROPE, 20, 3)
                        ),
                        programSteps = listOf(
                            ProgramStepDefinition(
                                stepId = "fit_step_squat",
                                type = ProgramStepType.MOTION_REPS,
                                title = "Squat seti",
                                motion = MotionType.SQUAT,
                                targetCount = 10,
                                successMessage = "Squat seti tamamlandi."
                            ),
                            ProgramStepDefinition(
                                stepId = "fit_step_jumping_jack",
                                type = ProgramStepType.MOTION_REPS,
                                title = "Jumping jack seti",
                                motion = MotionType.JUMPING_JACK,
                                targetCount = 10,
                                successMessage = "Ritim guzel."
                            ),
                            ProgramStepDefinition(
                                stepId = "fit_step_jump_rope",
                                type = ProgramStepType.MOTION_REPS,
                                title = "Jump rope enerjisi",
                                motion = MotionType.JUMP_ROPE,
                                targetCount = 20,
                                successMessage = "Enerji toplandi."
                            ),
                            ProgramStepDefinition(
                                stepId = "fit_step_plank",
                                type = ProgramStepType.HOLD_POSE,
                                title = "Plank tutusu",
                                holdSec = 30,
                                successMessage = "Tebrikler, program tamamlandi."
                            )
                        )
                    )
                ),
                assets = AssetManifest(
                    background = "local://fit-challenge/background",
                    character = "local://fit-challenge/coach",
                    soundtrack = "local://fit-challenge/theme"
                )
            )
        )
    }

    private companion object {
        val publicTemplates = listOf(
            GameTemplate.FRUIT_SLASH,
            GameTemplate.DODGE_RUN,
            GameTemplate.FIT_CHALLENGE,
            GameTemplate.SCENE_PLAY,
            GameTemplate.WHACK_A_MOLE,
            GameTemplate.POSE_CONTACT_TARGETS,
            GameTemplate.POSE_HOLD,
            GameTemplate.RHYTHM_MOTION,
            GameTemplate.REP_COUNTER,
            GameTemplate.MOTION_SEQUENCE,
            GameTemplate.INTERVAL_WORKOUT
        )

        const val MIN_VISIBLE_KEYPOINT_CONFIDENCE = 0.45f
        const val MIN_VISIBILITY_SCORE = 0.45f
        const val MIN_VISIBLE_KEYPOINT_COUNT = 8
        const val MIN_FRUIT_CONTACT_KEYPOINT_CONFIDENCE = 0.15f
        const val FRUIT_CONTACT_RADIUS_SQUARED = 0.0729f
        val FRUIT_CONTACT_KEYPOINTS = setOf(
            "left_wrist",
            "right_wrist",
            "left_index",
            "right_index",
            "left_thumb",
            "right_thumb"
        )
    }
}

private fun jsonObjectToMap(json: JsonObject): Map<String, Any> {
    return json.mapValues { (_, value) -> jsonElementToAny(value) }
}

private fun jsonElementToAny(element: JsonElement): Any {
    return when (element) {
        is JsonPrimitive -> {
            when {
                element.isString -> element.content
                element.intOrNull != null -> element.intOrNull!!
                element.booleanOrNull != null -> element.booleanOrNull!!
                else -> element.content
            }
        }
        is JsonObject -> jsonObjectToMap(element)
        is JsonArray -> element.map { jsonElementToAny(it) }
        else -> element.toString()
    }
}

private fun normalizeBackendBaseUrl(value: String): String {
    return value.trim().trimEnd('/')
}

private fun emptyPoseResult(frame: CameraFrame): PoseEstimationResult {
    return PoseEstimationResult(
        poseFrame = PoseFrame(
            timestampMs = frame.timestampMs,
            keypoints = emptyList(),
            bodyBox = null,
            visibilityScore = 0f,
            modelVersion = "no_pose",
            imageWidth = frame.width,
            imageHeight = frame.height
        ),
        inferenceTimeMs = 0L
    )
}
