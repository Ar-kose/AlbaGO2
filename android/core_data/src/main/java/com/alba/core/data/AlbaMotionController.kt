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
import com.alba.core.motion.SquatDetectorV1
import com.alba.core.network.ActiveGamesResponse
import com.alba.core.network.AlbaApiFactory
import com.alba.core.network.AlbaApiService
import com.alba.core.network.CreateGameSessionRequest
import com.alba.core.network.CreateWorkoutSessionRequest
import com.alba.core.network.UpdateGameSessionRequest
import com.alba.core.network.UpdateWorkoutSessionRequest
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
import com.alba.core.runtime.GameRuntime
import com.alba.core.runtime.GameSessionResult
import com.alba.core.runtime.GameSessionStatus
import com.alba.core.runtime.GameTaskDefinition
import com.alba.core.runtime.GameTemplate
import com.alba.core.runtime.InteractionRule
import com.alba.core.runtime.MotionRule
import com.alba.core.runtime.ProgramStepDefinition
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
    private val poseEstimator: PoseEstimator = MediaPipePoseEstimator(appContext)
    private val sessionRepository = InMemorySessionRepository()
    private val workoutEngine = WorkoutSessionEngine(sessionRepository)
    private val debugStore = MotionDebugStore(appContext)
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private val detectors: Map<MotionType, MotionDetector> = mapOf(
        MotionType.SQUAT to SquatDetectorV1(),
        MotionType.JUMPING_JACK to JumpingJackDetectorV1(),
        MotionType.JUMP_ROPE to JumpRopeDetectorV1()
    )

    private var apiBaseUrl: String = debugStore.readBackendBaseUrlOverride() ?: debugConfig.defaultBackendBaseUrl
    private var api: AlbaApiService = AlbaApiFactory.create(apiBaseUrl)
    private var timerJob: Job? = null
    private var workoutRemoteId: String? = null
    private var gameRemoteId: String? = null
    private var currentWorkoutCreateRequest: CreateWorkoutSessionRequest? = null
    private var currentGameCreateRequest: CreateGameSessionRequest? = null
    private var gameRuntime: GameRuntime? = null
    private var lastFrameTimestampMs: Long = 0L
    private var gameResultSynced = false
    private val gameMotionCounts = mutableMapOf<MotionType, Int>()

    private val _uiState = MutableStateFlow(
        MotionUiState(
            appName = debugConfig.appName,
            appVersion = debugConfig.appVersion,
            buildType = debugConfig.buildType,
            detectorVersion = detectors.getValue(MotionType.SQUAT).version,
            backendBaseUrlOverride = debugStore.readBackendBaseUrlOverride(),
            effectiveBackendBaseUrl = apiBaseUrl
        )
    )
    val uiState: StateFlow<MotionUiState> = _uiState.asStateFlow()

    init {
        scope.launch {
            frameSource.frames.collect { processFrame(it) }
        }
        scope.launch {
            retryPendingSyncs()
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
        val definition = _uiState.value.availableGames.firstOrNull { it.gameId == gameId && it.isPlayablePublicGame() } ?: return
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
        val startedAtIso = Instant.ofEpochMilli(startedAtMs).toString()
        currentWorkoutCreateRequest = CreateWorkoutSessionRequest(
            clientSessionKey = sessionKey,
            motionType = motionType.name,
            startedAt = startedAtIso
        )
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
            createWorkoutSessionRemote(currentWorkoutCreateRequest!!)
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
        val createRequest = CreateGameSessionRequest(
            clientSessionKey = sessionKey,
            gameDefinitionId = definition.gameId,
            workoutSessionId = workoutRemoteId
                ?: _uiState.value.workout.remoteSessionId
                ?: _uiState.value.workout.sessionId
                ?: "local-workout",
            startedAt = Instant.now().toString()
        )
        currentGameCreateRequest = createRequest
        gameRemoteId = null
        gameResultSynced = false
        gameMotionCounts.clear()
        val runtime = GameRuntime(definition)
        val state = runtime.start(System.currentTimeMillis())
        gameRuntime = runtime
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
                status = state.status,
                score = state.score,
                combo = state.combo,
                comboMax = state.comboMax,
                accuracy = state.accuracy,
                remainingMs = state.remainingMs,
                motionCounts = emptyMap(),
                sceneState = state.sceneState
            ),
            backendStatus = "Starting ${definition.title}"
        )
        scope.launch {
            createGameSessionRemote(createRequest)
        }
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
                sceneState = state.sceneState
            )
        )
        maybeSyncFinishedGame(force = true)
    }

    fun refreshActiveGameDefinition() {
        scope.launch {
            refreshActiveGames()
        }
    }

    fun saveBackendBaseUrlOverride(rawValue: String) {
        val normalized = rawValue.trim()
        if (normalized.isBlank()) {
            resetBackendBaseUrlOverride()
            return
        }
        debugStore.saveBackendBaseUrlOverride(normalized)
        recreateApiClient(normalized)
        _uiState.value = _uiState.value.copy(
            backendBaseUrlOverride = normalized,
            effectiveBackendBaseUrl = normalized,
            backendStatus = "Backend override saved"
        )
        scope.launch {
            retryPendingSyncs()
            refreshActiveGames()
        }
    }

    fun resetBackendBaseUrlOverride() {
        debugStore.saveBackendBaseUrlOverride(null)
        recreateApiClient(debugConfig.defaultBackendBaseUrl)
        _uiState.value = _uiState.value.copy(
            backendBaseUrlOverride = null,
            effectiveBackendBaseUrl = debugConfig.defaultBackendBaseUrl,
            backendStatus = "Backend override reset"
        )
        scope.launch {
            retryPendingSyncs()
            refreshActiveGames()
        }
    }

    fun retryPendingSync() {
        scope.launch {
            retryPendingSyncs()
        }
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

    private suspend fun retryPendingSyncs() {
        debugStore.readPendingWorkoutSyncs().forEach { item ->
            if (syncWorkoutItem(item)) {
                debugStore.removePendingWorkoutSync(item.clientSessionKey)
            }
        }
        debugStore.readPendingGameSyncs().forEach { item ->
            if (syncGameItem(item)) {
                debugStore.removePendingGameSync(item.clientSessionKey)
            }
        }
    }

    private suspend fun refreshActiveGames() {
        _uiState.value = _uiState.value.copy(backendStatus = "Oyunlar yükleniyor")
        val response = runCatching { api.getActiveGames(appVersion = debugConfig.appVersion) }
        val parseErrors = mutableListOf<String>()
        val remoteGames = response.getOrNull()?.items
            ?.mapNotNull { dto ->
                dto.toDomainGameDefinitionOrNull()
                    ?.takeIf { it.isPlayablePublicGame() }
                    ?: run {
                        parseErrors += dto.id
                        null
                    }
            }
            ?.sortedBy { publicTemplates.indexOf(it.template) }
            .orEmpty()
        val cachedGames = debugStore.readCachedAvailableGames()
            .filter { it.isPlayablePublicGame() }
            .sortedBy { publicTemplates.indexOf(it.template) }
        val definitions = when {
            remoteGames.isNotEmpty() -> {
                debugStore.cacheAvailableGames(remoteGames)
                remoteGames
            }

            cachedGames.isNotEmpty() -> cachedGames
            debugConfig.isDebugBuild -> fallbackDemoGames()
            else -> emptyList()
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
                response.isSuccess && remoteGames.isNotEmpty() -> "Bağlı"
                cachedGames.isNotEmpty() -> "Önbellekten yüklendi"
                definitions.isNotEmpty() -> "Yerel demo oyunlar açıldı"
                else -> "Oyun kataloğu yüklenemedi"
            },
            lastError = response.exceptionOrNull()?.message
                ?: parseErrors.takeIf { it.isNotEmpty() }?.joinToString(
                    prefix = "Geçersiz oyun tanımları atlandı: "
                )
        )
    }

    private suspend fun createWorkoutSessionRemote(request: CreateWorkoutSessionRequest) {
        runCatching {
            api.createWorkoutSession(request)
        }.onSuccess {
            workoutRemoteId = it.id
            _uiState.value = _uiState.value.copy(
                workout = _uiState.value.workout.copy(remoteSessionId = it.id),
                backendStatus = "Workout session created",
                lastError = null
            )
        }.onFailure {
            _uiState.value = _uiState.value.copy(
                backendStatus = "Workout running in offline mode",
                lastError = it.message
            )
        }
    }

    private suspend fun syncFinishedWorkout(summary: WorkoutSessionSummary) {
        val createRequest = currentWorkoutCreateRequest ?: return
        val pendingItem = PendingWorkoutSyncItem(
            clientSessionKey = createRequest.clientSessionKey,
            createRequest = createRequest,
            updateRequest = UpdateWorkoutSessionRequest(
                endedAt = Instant.now().toString(),
                durationSec = (summary.elapsedMs / 1000).toInt(),
                totalScore = summary.totalScore,
                status = "FINISHED",
                motionSummary = mapOf(
                    "clientSessionKey" to createRequest.clientSessionKey,
                    "reps" to summary.totalReps,
                    "averageQuality" to summary.averageQuality,
                    "motionType" to summary.motionType.name,
                    "detectorVersion" to detectors.getValue(summary.motionType).version,
                    "motionCounts" to summary.motionCounts.mapKeys { it.key.name }
                )
            )
        )
        if (!syncWorkoutItem(pendingItem)) {
            debugStore.enqueuePendingWorkoutSync(pendingItem)
            _uiState.value = _uiState.value.copy(backendStatus = "Queued workout sync for retry")
        } else {
            debugStore.removePendingWorkoutSync(createRequest.clientSessionKey)
        }
    }

    private suspend fun syncWorkoutItem(item: PendingWorkoutSyncItem): Boolean {
        return runCatching {
            val remoteSession = if (workoutRemoteId != null) {
                null
            } else {
                api.createWorkoutSession(item.createRequest)
            }
            val remoteId = workoutRemoteId ?: remoteSession?.id
            if (remoteId == null) {
                false
            } else {
                workoutRemoteId = remoteId
                _uiState.value = _uiState.value.copy(
                    workout = _uiState.value.workout.copy(remoteSessionId = remoteId)
                )
                api.updateWorkoutSession(remoteId, item.updateRequest)
                _uiState.value = _uiState.value.copy(
                    backendStatus = "Workout synced",
                    lastError = null
                )
                true
            }
        }.getOrElse {
            _uiState.value = _uiState.value.copy(
                backendStatus = "Workout sync failed",
                lastError = it.message
            )
            false
        }
    }

    private suspend fun createGameSessionRemote(request: CreateGameSessionRequest) {
        runCatching {
            api.createGameSession(request)
        }.onSuccess {
            gameRemoteId = it.id
            _uiState.value = _uiState.value.copy(
                game = _uiState.value.game.copy(
                    remoteSessionId = it.id,
                    syncMessage = "Game session created"
                ),
                backendStatus = "Game session created",
                lastError = null
            )
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
        val runtime = gameRuntime ?: return
        val createRequest = currentGameCreateRequest ?: return
        val result = runtime.buildResult(
            clientSessionKey = createRequest.clientSessionKey,
            motionCounts = gameMotionCounts.toMap(),
            endedAtMs = System.currentTimeMillis()
        )
        if (!force && _uiState.value.game.status != GameSessionStatus.FINISHED) {
            _uiState.value = _uiState.value.copy(
                game = _uiState.value.game.copy(
                    status = GameSessionStatus.FINISHED,
                    completed = true
                )
            )
        }
        scope.launch {
            syncFinishedGame(result)
        }
    }

    private suspend fun syncFinishedGame(result: GameSessionResult) {
        val createRequest = currentGameCreateRequest ?: return
        val pendingItem = PendingGameSyncItem(
            clientSessionKey = createRequest.clientSessionKey,
            createRequest = createRequest.copy(
                workoutSessionId = workoutRemoteId ?: createRequest.workoutSessionId
            ),
            updateRequest = UpdateGameSessionRequest(
                endedAt = Instant.ofEpochMilli(result.endedAtMs).toString(),
                score = result.score,
                result = if (result.score > 0) "COMPLETED" else "ENDED",
                gameVersion = result.gameVersion,
                clientIntegrityHash = "debug-${Random.nextInt(1000, 9999)}",
                resultPayload = mapOf(
                    "gameId" to result.gameId,
                    "gameVersion" to result.gameVersion,
                    "score" to result.score,
                    "durationSec" to result.durationSec,
                    "motionCounts" to result.motionCounts.mapKeys { it.key.name },
                    "comboMax" to result.comboMax,
                    "accuracy" to result.accuracy,
                    "startedAt" to Instant.ofEpochMilli(result.startedAtMs).toString(),
                    "endedAt" to Instant.ofEpochMilli(result.endedAtMs).toString(),
                    "clientSessionKey" to result.clientSessionKey
                )
            )
        )
        if (!syncGameItem(pendingItem)) {
            debugStore.enqueuePendingGameSync(pendingItem)
            _uiState.value = _uiState.value.copy(
                game = _uiState.value.game.copy(syncMessage = "Queued game sync"),
                backendStatus = "Queued game sync for retry"
            )
        } else {
            debugStore.removePendingGameSync(createRequest.clientSessionKey)
            _uiState.value = _uiState.value.copy(
                game = _uiState.value.game.copy(
                    elapsedMs = result.durationSec * 1000L,
                    motionCounts = result.motionCounts,
                    comboMax = result.comboMax,
                    accuracy = result.accuracy
                )
            )
        }
        gameResultSynced = true
    }

    private suspend fun syncGameItem(item: PendingGameSyncItem): Boolean {
        return runCatching {
            val remoteSession = if (gameRemoteId != null) {
                null
            } else {
                api.createGameSession(
                    item.createRequest.copy(
                        workoutSessionId = workoutRemoteId ?: item.createRequest.workoutSessionId
                    )
                )
            }
            val remoteId = gameRemoteId ?: remoteSession?.id
            if (remoteId == null) {
                false
            } else {
                gameRemoteId = remoteId
                _uiState.value = _uiState.value.copy(
                    game = _uiState.value.game.copy(
                        remoteSessionId = remoteId,
                        syncMessage = "Game synced"
                    )
                )
                api.updateGameSession(remoteId, item.updateRequest)
                _uiState.value = _uiState.value.copy(
                    backendStatus = "Game synced",
                    lastError = null
                )
                true
            }
        }.getOrElse {
            _uiState.value = _uiState.value.copy(
                game = _uiState.value.game.copy(syncMessage = "Game sync failed"),
                backendStatus = "Game sync failed",
                lastError = it.message
            )
            false
        }
    }

    private fun recreateApiClient(baseUrl: String) {
        apiBaseUrl = baseUrl
        api = AlbaApiFactory.create(baseUrl)
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

    private fun ActiveGamesResponse.GameDefinitionDto.toDomainGameDefinitionOrNull(): GameDefinition? {
        val parsedTemplate = enumValueOrNull<GameTemplate>(template) ?: return null
        val parsedStatus = enumValueOrNull<PublishStatus>(status) ?: return null
        val parsedCategory = enumValueOrNull<GameCategory>(category) ?: GameCategory.FUN
        val parsedOrientation = enumValueOrNull<GameOrientation>(orientation) ?: GameOrientation.PORTRAIT
        val parsedCameraRequirement = enumValueOrNull<CameraRequirement>(cameraRequirement) ?: CameraRequirement.FULL_BODY
        val parsedMotions = supportedMotions.mapNotNull { enumValueOrNull<MotionType>(it) }
        if (parsedMotions.isEmpty()) return null
        val parsedLevels = levels.mapNotNull { level ->
            val parsedRules = level.motionRules.mapNotNull rules@{ rule ->
                val motion = enumValueOrNull<MotionType>(rule.motion) ?: return@rules null
                val event = enumValueOrNull<MotionEventType>(rule.event) ?: return@rules null
                MotionRule(
                    motion = motion,
                    event = event,
                    points = rule.points,
                    cooldownMs = rule.cooldownMs
                )
            }
            val parsedTasks = level.tasks?.mapNotNull tasks@{ task ->
                val motion = enumValueOrNull<MotionType>(task.motion) ?: return@tasks null
                GameTaskDefinition(
                    motion = motion,
                    targetCount = task.targetCount,
                    pointsPerRep = task.pointsPerRep
                )
            }.orEmpty()
            val parsedProgramSteps = level.programSteps?.mapNotNull steps@{ step ->
                val type = enumValueOrNull<ProgramStepType>(step.type) ?: return@steps null
                ProgramStepDefinition(
                    stepId = step.stepId,
                    type = type,
                    title = step.title,
                    description = step.description,
                    motion = enumValueOrNull<MotionType>(step.motion),
                    targetCount = step.targetCount,
                    holdSec = step.holdSec,
                    durationSec = step.durationSec,
                    successMessage = step.successMessage,
                    nextOnComplete = step.nextOnComplete ?: true
                )
            }.orEmpty()
            val parsedInteractions = level.interactionRules?.mapNotNull interactions@{ rule ->
                val action = enumValueOrNull<RuleActionType>(rule.action) ?: return@interactions null
                InteractionRule(
                    input = rule.input,
                    event = enumValueOrNull<MotionEventType>(rule.event),
                    motion = enumValueOrNull<MotionType>(rule.motion),
                    targetObjectType = rule.targetObjectType,
                    keypoints = rule.keypoints.orEmpty(),
                    action = action,
                    points = rule.points ?: 0,
                    cooldownMs = rule.cooldownMs ?: 0L
                )
            }.orEmpty()
            if (parsedRules.isEmpty()) {
                null
            } else {
                GameLevelDefinition(
                    levelId = level.levelId,
                    durationSec = level.durationSec,
                    targetScore = level.targetScore,
                    difficulty = level.difficulty,
                    motionRules = parsedRules,
                    rewards = level.rewardRules.map { reward ->
                        RewardRule(
                            rewardType = reward.rewardType,
                            amount = reward.amount,
                            minimumScore = reward.minimumScore
                        )
                    },
                    config = level.config ?: emptyMap(),
                    sceneConfig = level.sceneConfig ?: emptyMap(),
                    interactionRules = parsedInteractions,
                    tasks = parsedTasks,
                    programSteps = parsedProgramSteps
                )
            }
        }
        if (parsedLevels.isEmpty()) return null
        return GameDefinition(
            gameId = id,
            version = version,
            template = parsedTemplate,
            title = title,
            description = description,
            status = parsedStatus,
            minAppVersion = minAppVersion,
            category = parsedCategory,
            tags = tags.orEmpty(),
            orientation = parsedOrientation,
            cameraRequirement = parsedCameraRequirement,
            supportedMotions = parsedMotions,
            levels = parsedLevels,
            assets = AssetManifest(
                background = assets.background,
                character = assets.character,
                soundtrack = assets.soundtrack,
                items = assets.items?.map { item ->
                    GameAsset(
                        id = item.id,
                        key = item.key,
                        kind = item.kind,
                        format = item.format,
                        uri = item.uri,
                        mimeType = item.mimeType,
                        width = item.width,
                        height = item.height,
                        sha256 = item.sha256,
                        bytes = item.bytes,
                        createdAt = item.createdAt
                    )
                }.orEmpty()
            )
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
            GameTemplate.SCENE_PLAY
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
