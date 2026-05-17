package com.alba.app

import android.Manifest
import android.app.Application
import android.content.Context
import android.content.Intent
import android.content.pm.ActivityInfo
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.provider.Settings
import androidx.core.app.ActivityCompat
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.view.PreviewView
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.alba.core.data.AlbaMotionController
import com.alba.core.data.MotionDebugConfig
import com.alba.core.data.MotionUiState
import com.alba.core.motion.MotionType
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import com.alba.core.runtime.DodgeObstacle
import com.alba.core.runtime.DodgeObstacleType
import com.alba.core.runtime.DodgeRunSceneState
import com.alba.core.runtime.FitChallengeSceneState
import com.alba.core.runtime.FitChallengeTaskProgress
import com.alba.core.runtime.FruitTarget
import com.alba.core.runtime.FruitSlashSceneState
import com.alba.core.runtime.GameSceneState
import com.alba.core.runtime.GameSessionStatus
import com.alba.core.runtime.GameOrientation
import com.alba.core.runtime.ScenePlayObject
import com.alba.core.runtime.ScenePlaySceneState
import com.alba.app.ui.showcase.CameraPermissionShowcaseScreen
import com.alba.app.ui.showcase.DemoCatalogShowcaseScreen
import com.alba.app.ui.showcase.EducationModeShowcaseScreen
import com.alba.app.ui.showcase.EntertainmentModeShowcaseScreen
import com.alba.app.ui.showcase.HomeShowcaseScreen
import com.alba.app.ui.showcase.NeonGamePrepScreen
import com.alba.app.ui.showcase.ProfileShowcaseScreen
import com.alba.app.ui.showcase.OnboardingBodyTrackingScreen
import com.alba.app.ui.showcase.OnboardingCameraWorldScreen
import com.alba.app.ui.showcase.OnboardingModesScreen
import com.alba.app.ui.showcase.SportModeShowcaseScreen
import com.alba.feature.games.GamesHomeScreen
import com.alba.app.ui.splash.SplashScreen
import com.alba.app.ui.theme.AlbaTheme
import com.alba.app.ui.theme.AlbaColors
import com.alba.feature.workout.WorkoutHomeScreen
import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.widthIn
import androidx.compose.ui.draw.scale
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage

private val HotPink = Color(0xFFFF1593)
private val SoftWhite = Color(0xFFF8F7FF)
private val Panel = Color(0xD90B1020)
private val StrokeLine = Color(0x25FFFFFF)
private val Cyan = Color(0xFF11D7F4)
private val Purple = Color(0xFF9B4DFF)
private val Orange = Color(0xFFFF8A1C)
private val Amber = Color(0xFFFFB020)

class AlbaApplication : Application()

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            AlbaTheme {
                AlbaRoot(
                    initialDestinationName = intent.getStringExtra("albago.startDestination"),
                    autoStartGameId = intent.getStringExtra("albago.autostartGameId"),
                    autoMockMotionName = intent.getStringExtra("albago.mockRep")
                )
            }
        }
    }
}

private enum class AlbaDestination {
    SPLASH,
    ONBOARDING_BODY,
    ONBOARDING_MODES,
    ONBOARDING_CAMERA,
    CAMERA_PERMISSION,
    HOME,
    SPORT_MODE,
    EDUCATION_MODE,
    ENTERTAINMENT_MODE,
    DEMO_CATALOG,
    GAME_PREP,
    MOTION_LAB,
    WORKOUT,
    GAMES,
    PROFILE
}

@Composable
private fun AlbaRoot(
    initialDestinationName: String? = null,
    autoStartGameId: String? = null,
    autoMockMotionName: String? = null
) {
    val context = LocalContext.current
    val controller = remember {
        AlbaMotionController(
            context = context,
            debugConfig = MotionDebugConfig(
                appName = "AlbaGo",
                appVersion = BuildConfig.VERSION_NAME,
                buildType = BuildConfig.BUILD_TYPE,
                defaultBackendBaseUrl = BuildConfig.ALBA_API_BASE_URL,
                isDebugBuild = BuildConfig.DEBUG
            )
        )
    }
    DisposableEffect(Unit) {
        onDispose { controller.close() }
    }

    val onboardingStore = remember { AppOnboardingStore(context) }

    var destination by rememberSaveable {
        mutableStateOf(
            AlbaDestination.values().firstOrNull { it.name == initialDestinationName }
                ?: if (onboardingStore.onboardingCompleted) AlbaDestination.HOME else AlbaDestination.SPLASH
        )
    }
    var previousDestination by rememberSaveable { mutableStateOf<AlbaDestination?>(null) }
    var activeCategory by rememberSaveable { mutableStateOf<String?>(null) }
    val uiState by controller.uiState.collectAsState()
    var autoStarted by rememberSaveable(autoStartGameId) { mutableStateOf(false) }

    fun navigate(next: AlbaDestination) {
        previousDestination = destination
        destination = next
    }

    fun navigateBack() {
        destination = previousDestination ?: AlbaDestination.HOME
        previousDestination = null
    }

    fun navigateToCategoryCatalog(category: String) {
        activeCategory = category
        navigate(AlbaDestination.DEMO_CATALOG)
    }

    // P28: Orientation lock only applied inside GameExperienceShell during active gameplay.
    // This LaunchedEffect is a safety net that resets to PORTRAIT whenever the game is not running.
    LaunchedEffect(uiState.game.status) {
        val activity = context as? ComponentActivity ?: return@LaunchedEffect
        val isGameRunning = uiState.game.status == GameSessionStatus.ACTIVE ||
            uiState.game.status == GameSessionStatus.PAUSED
        if (!isGameRunning) {
            activity.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
        }
    }

    LaunchedEffect(autoStartGameId, autoMockMotionName, uiState.availableGames) {
        if (
            BuildConfig.DEBUG &&
            !autoStarted &&
            !autoStartGameId.isNullOrBlank() &&
            uiState.availableGames.any { it.gameId == autoStartGameId }
        ) {
            navigate(AlbaDestination.GAMES)
            controller.selectGameDefinition(autoStartGameId)
            controller.startGame(autoStartGameId)
            runCatching { autoMockMotionName?.let(MotionType::valueOf) }
                .getOrNull()
                ?.let(controller::injectMockRep)
            autoStarted = true
        }
    }

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        containerColor = AlbaColors.BackgroundDark
    ) { padding ->
        when (destination) {
            AlbaDestination.SPLASH -> SplashScreen(
                onFinished = { navigate(AlbaDestination.ONBOARDING_BODY) }
            )

            AlbaDestination.ONBOARDING_BODY -> OnboardingBodyTrackingScreen(
                onNext = { navigate(AlbaDestination.ONBOARDING_MODES) }
            )

            AlbaDestination.ONBOARDING_MODES -> OnboardingModesScreen(
                onNext = { navigate(AlbaDestination.ONBOARDING_CAMERA) },
                onSport = {
                    onboardingStore.onboardingCompleted = true
                    navigate(AlbaDestination.SPORT_MODE)
                },
                onEducation = {
                    onboardingStore.onboardingCompleted = true
                    navigate(AlbaDestination.EDUCATION_MODE)
                },
                onEntertainment = {
                    onboardingStore.onboardingCompleted = true
                    navigate(AlbaDestination.ENTERTAINMENT_MODE)
                }
            )

            AlbaDestination.ONBOARDING_CAMERA -> OnboardingCameraWorldScreen(
                onNext = { navigate(AlbaDestination.CAMERA_PERMISSION) }
            )

            AlbaDestination.CAMERA_PERMISSION -> CameraPermissionShowcaseScreen(
                onFinished = {
                    onboardingStore.onboardingCompleted = true
                    navigate(AlbaDestination.HOME)
                }
            )

            AlbaDestination.HOME -> HomeShowcaseScreen(
                uiState = uiState,
                onOpenSport = { navigate(AlbaDestination.SPORT_MODE) },
                onOpenEducation = { navigate(AlbaDestination.EDUCATION_MODE) },
                onOpenEntertainment = { navigate(AlbaDestination.ENTERTAINMENT_MODE) },
                onOpenDemos = { navigate(AlbaDestination.ENTERTAINMENT_MODE) },
                onOpenProfile = { navigate(AlbaDestination.PROFILE) },
                onProfile = { navigate(AlbaDestination.PROFILE) }
            )

            AlbaDestination.SPORT_MODE -> SportModeShowcaseScreen(
                onHome = { navigate(AlbaDestination.HOME) },
                onEducation = { navigate(AlbaDestination.EDUCATION_MODE) },
                onEntertainment = { navigate(AlbaDestination.ENTERTAINMENT_MODE) },
                onDemos = { navigateToCategoryCatalog("SPORT") },
                onProfile = { navigate(AlbaDestination.PROFILE) },
                uiState = uiState,
                onGameSelected = { gameId ->
                    controller.selectGameDefinition(gameId)
                    navigate(AlbaDestination.GAME_PREP)
                }
            )

            AlbaDestination.EDUCATION_MODE -> EducationModeShowcaseScreen(
                onHome = { navigate(AlbaDestination.HOME) },
                onSport = { navigate(AlbaDestination.SPORT_MODE) },
                onEntertainment = { navigate(AlbaDestination.ENTERTAINMENT_MODE) },
                onDemos = { navigateToCategoryCatalog("EDUCATION") },
                onProfile = { navigate(AlbaDestination.PROFILE) },
                uiState = uiState,
                onGameSelected = { gameId ->
                    controller.selectGameDefinition(gameId)
                    navigate(AlbaDestination.GAME_PREP)
                }
            )

            AlbaDestination.ENTERTAINMENT_MODE -> EntertainmentModeShowcaseScreen(
                onHome = { navigate(AlbaDestination.HOME) },
                onSport = { navigate(AlbaDestination.SPORT_MODE) },
                onEducation = { navigate(AlbaDestination.EDUCATION_MODE) },
                onDemos = { navigateToCategoryCatalog("FUN") },
                onProfile = { navigate(AlbaDestination.PROFILE) },
                uiState = uiState,
                onGameSelected = { gameId ->
                    controller.selectGameDefinition(gameId)
                    navigate(AlbaDestination.GAME_PREP)
                }
            )

            AlbaDestination.DEMO_CATALOG -> DemoCatalogShowcaseScreen(
                onHome = { navigate(AlbaDestination.HOME) },
                onSport = { navigate(AlbaDestination.SPORT_MODE) },
                onEducation = { navigate(AlbaDestination.EDUCATION_MODE) },
                onEntertainment = { navigate(AlbaDestination.ENTERTAINMENT_MODE) },
                onProfile = { navigate(AlbaDestination.PROFILE) },
                uiState = uiState,
                preselectedCategory = activeCategory,
                onGameSelected = { gameId ->
                    controller.selectGameDefinition(gameId)
                    navigate(AlbaDestination.GAME_PREP)
                }
            )

            AlbaDestination.GAME_PREP -> NeonGamePrepScreen(
                uiState = uiState,
                onStartGame = {
                    val gameId = uiState.activeGameDefinition?.gameId
                    if (gameId != null) {
                        controller.selectGameDefinition(gameId)
                    }
                    controller.startGame(gameId)
                    navigate(AlbaDestination.GAMES)
                },
                onBackToCatalog = {
                    val gameCategory = uiState.activeGameDefinition?.category?.name
                    when (gameCategory) {
                        "SPORT" -> navigate(AlbaDestination.SPORT_MODE)
                        "EDUCATION" -> navigate(AlbaDestination.EDUCATION_MODE)
                        "FUN" -> navigate(AlbaDestination.ENTERTAINMENT_MODE)
                        else -> navigate(AlbaDestination.HOME)
                    }
                },
                onHome = { navigate(AlbaDestination.HOME) },
                onSport = { navigate(AlbaDestination.SPORT_MODE) },
                onEducation = { navigate(AlbaDestination.EDUCATION_MODE) },
                onEntertainment = { navigate(AlbaDestination.ENTERTAINMENT_MODE) },
                onDemos = { navigate(AlbaDestination.DEMO_CATALOG) },
                onProfile = { navigate(AlbaDestination.PROFILE) }
            )

            AlbaDestination.MOTION_LAB -> MotionScreenShell(
                title = "Motion Lab",
                subtitle = "Kamera, iskelet çizimi ve hareket sayımını güvenli alanda test et.",
                contentPadding = padding,
                controller = controller,
                uiState = uiState,
                onNavigateBack = { navigateBack() },
                qaEnabled = BuildConfig.DEBUG
            ) {
                MotionLabPanel(uiState = uiState)
            }

            AlbaDestination.WORKOUT -> MotionScreenShell(
                title = "Egzersiz",
                subtitle = "Kısa bir oturum başlat, tekrarlarını ve skorunu gör.",
                contentPadding = padding,
                controller = controller,
                uiState = uiState,
                onNavigateBack = { navigateBack() },
                qaEnabled = BuildConfig.DEBUG
            ) {
                WorkoutHomeScreen(
                    contentPadding = PaddingValues(0.dp),
                    uiState = uiState,
                    onNavigateBack = { navigateBack() },
                    onStartWorkout = controller::beginWorkout,
                    onPauseWorkout = controller::pauseWorkout,
                    onResumeWorkout = controller::resumeWorkout,
                    onFinishWorkout = controller::finishWorkout,
                    onSelectMotionType = controller::selectMotionType
                )
            }

            AlbaDestination.GAMES -> GameExperienceShell(
                contentPadding = padding,
                controller = controller,
                uiState = uiState,
                onNavigateBack = { navigateBack() },
                qaEnabled = BuildConfig.DEBUG
            ) {
                GamesHomeScreen(
                    contentPadding = PaddingValues(0.dp),
                    uiState = uiState,
                    onNavigateBack = { navigateBack() },
                    onNavigateHome = { navigate(AlbaDestination.HOME) },
                    onStartGame = { gameId ->
                        controller.selectGameDefinition(gameId)
                        controller.startGame(gameId)
                    },
                    onFinishGame = controller::finishGame,
                    onRefreshGames = controller::refreshActiveGameDefinition,
                    onSelectGameDefinition = controller::selectGameDefinition
                )
            }

            AlbaDestination.PROFILE -> ProfileShowcaseScreen(
                uiState = uiState,
                repository = controller.gameSessionRepo,
                onNavigateBack = { navigateBack() },
                onNavigateHome = { navigate(AlbaDestination.HOME) },
                onHome = { navigate(AlbaDestination.HOME) },
                onSport = { navigate(AlbaDestination.SPORT_MODE) },
                onEducation = { navigate(AlbaDestination.EDUCATION_MODE) },
                onEntertainment = { navigate(AlbaDestination.ENTERTAINMENT_MODE) },
                onDemos = { navigate(AlbaDestination.ENTERTAINMENT_MODE) },
                onProfile = { }
            )
        }
    }
}

@Composable
private fun MotionScreenShell(
    title: String,
    subtitle: String,
    contentPadding: PaddingValues,
    controller: AlbaMotionController,
    uiState: MotionUiState,
    onNavigateBack: () -> Unit,
    qaEnabled: Boolean,
    panel: @Composable () -> Unit
) {
    var qaExpanded by rememberSaveable { mutableStateOf(false) }

    BackHandler(onBack = onNavigateBack)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(contentPadding)
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Card(colors = CardDefaults.cardColors(containerColor = Color.White)) {
            Column(
                modifier = Modifier.padding(18.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(title, style = MaterialTheme.typography.headlineSmall)
                        Text(subtitle, color = Color(0xFF475569))
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        if (qaEnabled) {
                            OutlinedButton(onClick = { qaExpanded = !qaExpanded }) {
                                Text(if (qaExpanded) "QA gizle" else "QA göster")
                            }
                        }
                        OutlinedButton(onClick = onNavigateBack) {
                            Text("Geri")
                        }
                    }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Pill(
                        label = "FPS ${uiState.fps}",
                        background = Color(0xFFE0F2FE),
                        foreground = Color(0xFF0369A1)
                    )
                    Pill(
                        label = "Pose ${(uiState.visibilityScore * 100).toInt()}%",
                        background = Color(0xFFDCFCE7),
                        foreground = Color(0xFF15803D)
                    )
                    Pill(
                        label = if (uiState.isUserInFrame) "Kadrajda" else "Kadraja dön",
                        background = if (uiState.isUserInFrame) Color(0xFFF1F5F9) else Color(0xFFFFEDD5),
                        foreground = if (uiState.isUserInFrame) Color(0xFF334155) else Color(0xFFC2410C)
                    )
                }
            }
        }

        MotionCameraStage(
            controller = controller,
            uiState = uiState,
            showHud = qaEnabled && qaExpanded
        )
        panel()
        if (qaEnabled && qaExpanded) {
            MotionQaPanel(
                uiState = uiState,
                controller = controller
            )
        }
    }
}

@Composable
private fun GameExperienceShell(
    contentPadding: PaddingValues,
    controller: AlbaMotionController,
    uiState: MotionUiState,
    onNavigateBack: () -> Unit,
    qaEnabled: Boolean,
    panel: @Composable () -> Unit
) {
    var qaExpanded by rememberSaveable { mutableStateOf(false) }
    val gameRunning = uiState.game.status == GameSessionStatus.ACTIVE || uiState.game.status == GameSessionStatus.PAUSED
    val waitingForBody = uiState.game.status == GameSessionStatus.WAITING_FOR_BODY
    val showCamera = gameRunning || waitingForBody
    Log.d("AlbaGo", "[GameExperienceShell] status=${uiState.game.status} gameRunning=$gameRunning waitingForBody=$waitingForBody showCamera=$showCamera activeDef=${uiState.activeGameDefinition?.gameId}")

    // P32: Countdown state for body gate
    var countdownValue by remember { mutableStateOf(0) }

    // P32: Body gate — collect from controller's StateFlow directly (snapshotFlow
    // can't track plain parameter changes). Hysteresis: require 5 consecutive
    // out-of-frame frames (~150ms) before resetting stability, to filter out
    // single-frame MediaPipe flicker.
    LaunchedEffect(waitingForBody) {
        if (!waitingForBody) {
            countdownValue = 0
            return@LaunchedEffect
        }
        var stabilityJob: Job? = null
        var outOfFrameCount = 0
        controller.uiState.collect { fresh ->
            val inFrame = fresh.isUserInFrame
            if (!inFrame) {
                outOfFrameCount++
                if (countdownValue > 0) return@collect // countdown active, ignore dropouts
                if (outOfFrameCount < 5) return@collect // require sustained out-of-frame
                stabilityJob?.cancel()
                stabilityJob = null
                countdownValue = 0
                return@collect
            }
            outOfFrameCount = 0
            if (countdownValue > 0) return@collect // already counting down
            if (stabilityJob == null) {
                stabilityJob = launch {
                    delay(800L)
                    countdownValue = 3
                }
            }
        }
    }

    // P32: Run countdown ticks
    LaunchedEffect(countdownValue) {
        if (countdownValue <= 0) return@LaunchedEffect
        delay(1000L)
        if (countdownValue > 1) {
            countdownValue = countdownValue - 1
        } else {
            countdownValue = 0
            controller.finalizeGameStart()
        }
    }

    // P28: Apply orientation during gameplay, immersive mode, reset on exit
    val context = LocalContext.current
    DisposableEffect(showCamera, uiState.activeGameDefinition?.orientation) {
        val activity = context as? ComponentActivity
        if (showCamera && activity != null) {
            val orientation = when (uiState.activeGameDefinition?.orientation) {
                GameOrientation.LANDSCAPE -> ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE
                GameOrientation.AUTO -> ActivityInfo.SCREEN_ORIENTATION_FULL_SENSOR
                else -> ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
            }
            activity.requestedOrientation = orientation
            WindowCompat.getInsetsController(activity.window, activity.window.decorView).apply {
                hide(WindowInsetsCompat.Type.systemBars())
                systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
        }
        onDispose {
            activity?.let {
                WindowCompat.getInsetsController(it.window, it.window.decorView).apply {
                    show(WindowInsetsCompat.Type.systemBars())
                }
                it.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
            }
        }
    }

    BackHandler(onBack = onNavigateBack)

    if (showCamera) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black)
        ) {
            MotionCameraStage(
                controller = controller,
                uiState = uiState,
                showHud = qaEnabled && qaExpanded,
                modifier = Modifier.fillMaxSize(),
                rounded = false
            )
            if (waitingForBody) {
                BodyGateOverlay(
                    uiState = uiState,
                    countdownValue = countdownValue,
                    onCancel = onNavigateBack
                )
            } else {
                ImmersiveGameOverlay(
                    uiState = uiState,
                    onFinishGame = controller::finishGame,
                    onNavigateBack = onNavigateBack
                )
            }
            if (qaEnabled && qaExpanded) {
                Box(
                    modifier = Modifier
                        .align(Alignment.Center)
                        .padding(horizontal = 16.dp)
                ) {
                    MotionQaPanel(
                        uiState = uiState,
                        controller = controller
                    )
                }
            }
        }
        return
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AlbaColors.BackgroundDark)
            .padding(contentPadding)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text("Oyunlar", style = MaterialTheme.typography.headlineSmall, color = Color.White)
                Text("Meyve kes, engelden kaç, görevleri tamamla.", color = Color.White.copy(alpha = 0.68f))
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                if (qaEnabled) {
                    OutlinedButton(onClick = { qaExpanded = !qaExpanded }) {
                        Text(if (qaExpanded) "QA gizle" else "QA")
                    }
                }
                OutlinedButton(onClick = onNavigateBack) {
                    Text("Ana ekran")
                }
            }
        }

        if (gameRunning) {
            MotionCameraStage(
                controller = controller,
                uiState = uiState,
                showHud = qaEnabled && qaExpanded
            )
        }
        panel()
        if (qaEnabled && qaExpanded) {
            MotionQaPanel(
                uiState = uiState,
                controller = controller
            )
        }
    }
}

@Composable
private fun BodyGateOverlay(
    uiState: MotionUiState,
    countdownValue: Int,
    onCancel: () -> Unit
) {
    val isUserInFrame = uiState.isUserInFrame
    val title = uiState.game.title.ifBlank { "AlbaGo Oyunu" }

    Box(modifier = Modifier.fillMaxSize()) {
        // Top scrim bar
        Row(
            modifier = Modifier
                .align(Alignment.TopCenter)
                .fillMaxWidth()
                .background(
                    Brush.verticalGradient(
                        listOf(Color(0xCC0B1020), Color(0x880B1020), Color.Transparent)
                    )
                )
                .padding(horizontal = 12.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                onClick = onCancel,
                shape = RoundedCornerShape(12.dp),
                color = Color.White.copy(alpha = 0.14f)
            ) {
                Text(
                    "X",
                    color = Color.White.copy(alpha = 0.78f),
                    fontSize = 18.sp,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.padding(horizontal = 13.dp, vertical = 10.dp)
                )
            }
            Text(
                title,
                color = Color.White.copy(alpha = 0.94f),
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                modifier = Modifier.weight(1f)
            )
        }

        // Center — body gate status
        Column(
            modifier = Modifier.align(Alignment.Center),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            if (countdownValue > 0) {
                // Countdown display
                Surface(
                    shape = RoundedCornerShape(20.dp),
                    color = Color(0xFFFFC857).copy(alpha = 0.22f)
                ) {
                    Text(
                        countdownValue.toString(),
                        color = Color(0xFFFFC857),
                        fontSize = 72.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 36.dp, vertical = 18.dp)
                    )
                }
            } else if (isUserInFrame && countdownValue == 0) {
                // Body detected, stabilizing
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = Color(0xFF53F2B5).copy(alpha = 0.18f)
                ) {
                    Text(
                        "Hazirlan...",
                        color = Color(0xFF53F2B5),
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 24.dp, vertical = 12.dp)
                    )
                }
            } else {
                // Body not detected
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = Color(0xFF0B1020).copy(alpha = 0.80f)
                ) {
                    Column(
                        modifier = Modifier.padding(horizontal = 28.dp, vertical = 18.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Text(
                            "Tum vucudunu kadraja al",
                            color = Color.White.copy(alpha = 0.90f),
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            "Kameradan bir adim uzaklas ve bedenini gorunur tut.",
                            color = Color.White.copy(alpha = 0.65f),
                            fontSize = 13.sp
                        )
                    }
                }
            }
        }

        // Bottom scrim bar
        Row(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .background(
                    Brush.verticalGradient(
                        listOf(Color.Transparent, Color(0x880B1020), Color(0xCC0B1020))
                    )
                )
                .padding(horizontal = 12.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                if (!isUserInFrame) "Kamera bedenini algilayana kadar bekleniyor..."
                else if (countdownValue > 0) "Sayim sirasinda kadrajdan cikma"
                else "Beden algilandi, sabit dur...",
                color = Color.White.copy(alpha = 0.78f),
                fontSize = 13.sp,
                modifier = Modifier.weight(1f)
            )
            Surface(
                onClick = onCancel,
                shape = RoundedCornerShape(12.dp),
                color = Color(0xFFEF4444).copy(alpha = 0.22f)
            ) {
                Text(
                    "Iptal",
                    color = Color(0xFFFCA5A5),
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    modifier = Modifier.padding(horizontal = 18.dp, vertical = 10.dp)
                )
            }
        }
    }
}

@Composable
private fun ImmersiveGameOverlay(
    uiState: MotionUiState,
    onFinishGame: () -> Unit,
    onNavigateBack: () -> Unit
) {
    val title = uiState.game.title.ifBlank { "AlbaGo Oyunu" }
    val remainingSec = (uiState.game.remainingMs / 1000L).coerceAtLeast(0L)
    val prompt = scenePrompt(uiState.game.sceneState, uiState.selectedMotionType)

    Box(modifier = Modifier.fillMaxSize()) {
        // Top bar — scrim overlay for readability
        Row(
            modifier = Modifier
                .align(Alignment.TopCenter)
                .fillMaxWidth()
                .background(
                    Brush.verticalGradient(
                        listOf(Color(0xCC0B1020), Color(0x880B1020), Color.Transparent)
                    )
                )
                .padding(horizontal = 12.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // X exit — 48dp touch target
            Surface(
                onClick = onNavigateBack,
                shape = RoundedCornerShape(12.dp),
                color = Color.White.copy(alpha = 0.14f)
            ) {
                Text(
                    "✕",
                    color = Color.White.copy(alpha = 0.78f),
                    fontSize = 18.sp,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.padding(horizontal = 13.dp, vertical = 10.dp)
                )
            }
            // Game title
            Text(
                title,
                color = Color.White.copy(alpha = 0.94f),
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                modifier = Modifier.weight(1f)
            )
            // Timer chip
            RuntimeChip(
                label = "${remainingSec}s",
                accent = Color(0xFF38BDF8)
            )
            // Score chip
            RuntimeChip(
                label = "Skor ${uiState.game.score}",
                accent = Color(0xFFFFC857)
            )
        }

        // Game objects in center — maximum space with safe zone margins
        GameObjectLayer(
            uiState = uiState,
            modifier = Modifier
                .align(Alignment.Center)
                .fillMaxSize()
                .padding(top = 54.dp, bottom = 54.dp, start = 8.dp, end = 8.dp)
        )

        // Bottom bar — scrim overlay for readability
        Row(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .background(
                    Brush.verticalGradient(
                        listOf(Color.Transparent, Color(0x880B1020), Color(0xCC0B1020))
                    )
                )
                .padding(horizontal = 12.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Combo indicator
            if (uiState.game.combo > 1) {
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = Color(0xFF53F2B5).copy(alpha = 0.20f)
                ) {
                    Text(
                        "x${uiState.game.combo}",
                        color = Color(0xFF53F2B5),
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                    )
                }
            }
            // Instruction text — better contrast
            Text(
                prompt,
                color = Color.White.copy(alpha = 0.85f),
                fontSize = 14.sp,
                maxLines = 1,
                modifier = Modifier.weight(1f)
            )
            // Finish button — 44dp+ height, better contrast
            Surface(
                onClick = onFinishGame,
                shape = RoundedCornerShape(12.dp),
                color = Color(0xFFEF4444).copy(alpha = 0.22f)
            ) {
                Text(
                    "Bitir",
                    color = Color(0xFFFCA5A5),
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    modifier = Modifier.padding(horizontal = 18.dp, vertical = 10.dp)
                )
            }
        }
    }
}

@Composable
private fun RuntimeChip(
    label: String,
    accent: Color
) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = accent.copy(alpha = 0.20f)
    ) {
        Text(
            label,
            color = accent,
            fontWeight = FontWeight.Bold,
            fontSize = 16.sp,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)
        )
    }
}

@Composable
private fun GameObjectLayer(
    uiState: MotionUiState,
    modifier: Modifier = Modifier
) {
    when (val sceneState = uiState.game.sceneState) {
        is FruitSlashSceneState -> FruitSlashObjectLayer(uiState = uiState, sceneState = sceneState, modifier = modifier)
        is DodgeRunSceneState -> DodgeRunObjectLayer(uiState = uiState, sceneState = sceneState, modifier = modifier)
        is FitChallengeSceneState -> FitChallengeObjectLayer(sceneState = sceneState, modifier = modifier)
        is ScenePlaySceneState -> ScenePlayObjectLayer(uiState = uiState, sceneState = sceneState, modifier = modifier)
        else -> Unit
    }
}

@Composable
private fun FruitSlashObjectLayer(
    uiState: MotionUiState,
    sceneState: FruitSlashSceneState,
    modifier: Modifier = Modifier
) {
    BoxWithConstraints(modifier = modifier) {
        if (sceneState.targets.isEmpty()) {
            SceneHintCard(
                modifier = Modifier.align(Alignment.Center),
                title = "Meyveler geliyor",
                body = "Jumping jack veya squat ile kes."
            )
        }

        sceneState.targets.take(5).forEachIndexed { index, target ->
            val laneWidth = maxWidth / 3
            val laneCenter = laneWidth * target.lane.toFloat() + laneWidth / 2
            val ageMs = (System.currentTimeMillis() - target.spawnedAtMs).coerceAtLeast(0L)
            val travel = (ageMs.toFloat() / target.lifeMs.toFloat()).coerceIn(0f, 1f)
            val y = (maxHeight * (0.08f + 0.72f * travel)).coerceAtMost(maxHeight - 88.dp)
            FruitTargetBubble(
                target = target,
                assetUri = resolveAssetUri(uiState, target.assetKey),
                modifier = Modifier
                    .offset(
                        x = (laneCenter - 44.dp).coerceAtLeast(0.dp),
                        y = y + ((index % 2) * 8).dp
                    )
                    .size(88.dp)
            )
        }
    }
}

@Composable
private fun FruitTargetBubble(
    target: FruitTarget,
    assetUri: String?,
    modifier: Modifier = Modifier
) {
    val bubbleColor = when {
        target.penaltyObject -> Color(0xFF2D172B)
        target.requiredMotion == MotionType.SQUAT -> Color(0xFFFF5F7E)
        else -> Color(0xFFFFB84D)
    }
    val accentColor = when {
        target.penaltyObject -> Color(0xFFFF4D6D)
        target.requiredMotion == MotionType.SQUAT -> Color(0xFFFFE0EA)
        else -> Color(0xFFFFF4CC)
    }
    val label = when {
        target.penaltyObject -> "BOMBA"
        target.requiredMotion == MotionType.SQUAT -> "BONUS"
        else -> "MEYVE"
    }

    Surface(
        modifier = modifier,
        shape = CircleShape,
        color = bubbleColor,
        shadowElevation = 10.dp
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .border(3.dp, accentColor.copy(alpha = 0.65f), CircleShape),
            contentAlignment = Alignment.Center
        ) {
            if (assetUri != null) {
                AsyncImage(
                    model = assetUri,
                    contentDescription = label,
                    contentScale = ContentScale.Fit,
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(10.dp)
                )
            } else {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(if (target.penaltyObject) "!" else fruitGlyph(target), color = accentColor, fontWeight = FontWeight.Black)
                    Text(label, color = Color.White, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
private fun ScenePlayObjectLayer(
    uiState: MotionUiState,
    sceneState: ScenePlaySceneState,
    modifier: Modifier = Modifier
) {
    BoxWithConstraints(modifier = modifier) {
        val activeObject = sceneState.objects.firstOrNull()
        if (activeObject == null) {
            SceneHintCard(
                modifier = Modifier.align(Alignment.Center),
                title = sceneState.prompt.ifBlank { "Hazırlan" },
                body = "Doğru hareketi yap ve komutu temizle!"
            )
        } else {
            // Command card with prompt label and required motion
            val motionLabel = when (activeObject.requiredMotion) {
                MotionType.SQUAT -> "Squat"
                MotionType.JUMPING_JACK -> "Jumping Jack"
                MotionType.JUMP_ROPE -> "Jump Rope"
                else -> activeObject.requiredMotion.name.lowercase().replaceFirstChar { it.uppercase() }
            }
            val ageMs = (System.currentTimeMillis() - activeObject.spawnedAtMs).coerceAtLeast(0L)
            val progress = (ageMs.toFloat() / activeObject.lifeMs.toFloat()).coerceIn(0f, 1f)
            val urgency = progress > 0.65f

            Column(
                modifier = Modifier
                    .align(Alignment.Center)
                    .widthIn(max = 280.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Lives indicator
                Row(
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    repeat(sceneState.lives.coerceAtMost(5)) {
                        Surface(
                            modifier = Modifier.size(10.dp),
                            shape = CircleShape,
                            color = HotPink
                        ) {}
                    }
                    repeat((3 - sceneState.lives).coerceAtLeast(0)) {
                        Surface(
                            modifier = Modifier.size(10.dp),
                            shape = CircleShape,
                            color = SoftWhite.copy(alpha = 0.3f)
                        ) {}
                    }
                }

                // Command prompt card
                Surface(
                    modifier = Modifier
                        .animateContentSize()
                        .then(
                            if (urgency) Modifier.scale(1.05f + (progress - 0.65f) * 0.15f)
                            else Modifier
                        ),
                    color = if (urgency) HotPink.copy(alpha = 0.25f) else Panel,
                    shape = RoundedCornerShape(20.dp),
                    border = androidx.compose.foundation.BorderStroke(
                        2.dp,
                        if (urgency) HotPink else Cyan.copy(alpha = 0.6f)
                    )
                ) {
                    Column(
                        modifier = Modifier.padding(horizontal = 32.dp, vertical = 24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            activeObject.label.uppercase(),
                            color = SoftWhite,
                            fontSize = 28.sp,
                            fontWeight = FontWeight.ExtraBold,
                            textAlign = TextAlign.Center
                        )
                        Text(
                            motionLabel,
                            color = if (urgency) HotPink else Cyan,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                // Timer bar
                Box(
                    modifier = Modifier
                        .width(200.dp)
                        .height(4.dp)
                        .background(StrokeLine, RoundedCornerShape(2.dp))
                ) {
                    Box(
                        modifier = Modifier
                            .width(200.dp * (1f - progress))
                            .height(4.dp)
                            .background(
                                if (urgency) HotPink else Cyan,
                                RoundedCornerShape(2.dp)
                            )
                            .align(Alignment.CenterStart)
                    )
                }

                // Score summary
                Row(
                    horizontalArrangement = Arrangement.spacedBy(24.dp)
                ) {
                    Text(
                        "Temiz: ${sceneState.clearedCount}",
                        color = Cyan,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium
                    )
                    Text(
                        "Kaçan: ${sceneState.missedCount}",
                        color = Orange,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }
    }
}

@Composable
private fun DodgeRunObjectLayer(
    uiState: MotionUiState,
    sceneState: DodgeRunSceneState,
    modifier: Modifier = Modifier
) {
    BoxWithConstraints(modifier = modifier) {
        Surface(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(start = 16.dp, bottom = 18.dp)
                .size(width = 76.dp, height = 104.dp),
            shape = RoundedCornerShape(30.dp),
            color = Color(0xFF38BDF8),
            shadowElevation = 10.dp
        ) {
            Column(
                modifier = Modifier.padding(10.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Text("RUN", color = Color.White, fontWeight = FontWeight.Black)
                Text("AlbaGo", color = Color.White.copy(alpha = 0.78f), style = MaterialTheme.typography.labelSmall)
            }
        }

        if (sceneState.obstacles.isEmpty()) {
            SceneHintCard(
                modifier = Modifier.align(Alignment.Center),
                title = "Engel hazırlanıyor",
                body = sceneState.prompt
            )
        }

        sceneState.obstacles.take(3).forEachIndexed { index, obstacle ->
            val ageMs = (System.currentTimeMillis() - obstacle.spawnedAtMs).coerceAtLeast(0L)
            val progress = (ageMs.toFloat() / obstacle.travelMs.toFloat()).coerceIn(0f, 1f)
            val x = (maxWidth - 90.dp) * (1f - progress)
            val y = when (obstacle.type) {
                DodgeObstacleType.DUCK -> maxHeight - 96.dp
                DodgeObstacleType.JUMP -> maxHeight - 150.dp
                DodgeObstacleType.BOOST -> maxHeight - 124.dp
            }
            DodgeObstacleCard(
                obstacle = obstacle,
                assetUri = resolveAssetUri(uiState, obstacle.assetKey),
                modifier = Modifier
                    .offset(x = x.coerceAtLeast(84.dp), y = y + (index * 8).dp)
                    .size(width = 96.dp, height = 74.dp)
            )
        }
    }
}

@Composable
private fun DodgeObstacleCard(
    obstacle: DodgeObstacle,
    assetUri: String?,
    modifier: Modifier = Modifier
) {
    val color = when (obstacle.type) {
        DodgeObstacleType.DUCK -> Color(0xFFFF7A45)
        DodgeObstacleType.JUMP -> Color(0xFF7C3AED)
        DodgeObstacleType.BOOST -> Color(0xFF10B981)
    }
    val title = when (obstacle.type) {
        DodgeObstacleType.DUCK -> "EĞİL"
        DodgeObstacleType.JUMP -> "ZIPLA"
        DodgeObstacleType.BOOST -> "ENERJİ"
    }
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(22.dp),
        color = color,
        shadowElevation = 8.dp
    ) {
        Column(
            modifier = Modifier.padding(10.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            if (assetUri != null) {
                AsyncImage(
                    model = assetUri,
                    contentDescription = title,
                    contentScale = ContentScale.Fit,
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(8.dp)
                )
            } else {
                Text(title, color = Color.White, fontWeight = FontWeight.Black)
                Text(motionLabel(obstacle.requiredMotion), color = Color.White.copy(alpha = 0.78f), style = MaterialTheme.typography.labelSmall)
            }
        }
    }
}

@Composable
private fun FitChallengeObjectLayer(
    sceneState: FitChallengeSceneState,
    modifier: Modifier = Modifier
) {
    Box(modifier = modifier) {
        val task = sceneState.tasks.getOrNull(sceneState.activeTaskIndex)
        if (task == null) {
            SceneHintCard(
                modifier = Modifier.align(Alignment.Center),
                title = "Görev tamam",
                body = "Sonuç ekranına hazırlanılıyor."
            )
        } else {
            FitTaskCard(
                task = task,
                qualityScore = sceneState.qualityScore,
                modifier = Modifier
                    .align(Alignment.Center)
                    .fillMaxWidth()
            )
        }
    }
}

@Composable
private fun FitTaskCard(
    task: FitChallengeTaskProgress,
    qualityScore: Int,
    modifier: Modifier = Modifier
) {
    val progress = if (task.targetCount == 0) 1f else task.currentCount.toFloat() / task.targetCount.toFloat()
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(30.dp),
        color = Color(0xE610172A),
        shadowElevation = 12.dp
    ) {
        Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Aktif görev", color = Color.White.copy(alpha = 0.72f), style = MaterialTheme.typography.labelLarge)
            Text(
                "${motionLabel(task.motion)}: ${task.currentCount}/${task.targetCount}",
                color = Color.White,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold
            )
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(12.dp)
                    .clip(RoundedCornerShape(999.dp))
                    .background(Color.White.copy(alpha = 0.12f))
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth(progress.coerceIn(0f, 1f))
                        .height(12.dp)
                        .clip(RoundedCornerShape(999.dp))
                        .background(Color(0xFF53F2B5))
                )
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Pill(
                    label = "Kalite $qualityScore%",
                    background = Color(0x3334D399),
                    foreground = Color(0xFF86EFAC)
                )
                Pill(
                    label = "+${task.pointsPerRep} puan",
                    background = Color(0x33FFC857),
                    foreground = Color(0xFFFFE08A)
                )
            }
        }
    }
}

@Composable
private fun SceneHintCard(
    modifier: Modifier = Modifier,
    title: String,
    body: String
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(26.dp),
        color = Color(0xB3121724)
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 18.dp, vertical = 14.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text(title, color = Color.White, fontWeight = FontWeight.Bold)
            Text(body, color = Color.White.copy(alpha = 0.76f), style = MaterialTheme.typography.bodySmall)
        }
    }
}

private fun fruitGlyph(target: FruitTarget): String = when (target.requiredMotion) {
    MotionType.SQUAT -> "◆"
    MotionType.JUMPING_JACK -> "●"
    MotionType.JUMP_ROPE -> "✦"
}

private fun resolveAssetUri(uiState: MotionUiState, assetKey: String): String? {
    val uri = uiState.activeGameDefinition
        ?.assets
        ?.items
        ?.firstOrNull { it.key == assetKey }
        ?.uri
        ?: return null
    if (uri.startsWith("local://")) {
        // Fallback: construct a CDN URL from template name and asset key
        val template = uiState.activeGameDefinition?.template?.name?.lowercase() ?: return null
        return "https://albago.tr/assets/fallback/$template/$assetKey.png"
    }
    if (uri.startsWith("http://") || uri.startsWith("https://")) return uri
    val baseUrl = uiState.effectiveBackendBaseUrl.trimEnd('/')
    return if (uri.startsWith("/")) "$baseUrl$uri" else "$baseUrl/$uri"
}

@Composable
private fun OverlayMetric(
    modifier: Modifier = Modifier,
    label: String,
    value: String,
    accent: Color
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(20.dp),
        color = Color(0xCC111827)
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
            verticalArrangement = Arrangement.spacedBy(2.dp)
        ) {
            Text(label, color = Color.White.copy(alpha = 0.68f), style = MaterialTheme.typography.labelMedium)
            Text(value, color = accent, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun GameSceneMiniPanel(uiState: MotionUiState) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        color = Color(0xD9121724)
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(sceneTitle(uiState.game.sceneState), color = Color.White, fontWeight = FontWeight.Bold)
            Text(sceneSummary(uiState.game.sceneState, uiState), color = Color.White.copy(alpha = 0.78f))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Pill(
                    label = "Hareket: ${motionLabel(uiState.selectedMotionType)}",
                    background = Color(0x33FFFFFF),
                    foreground = Color.White
                )
                Pill(
                    label = "Doğruluk ${(uiState.game.accuracy * 100).toInt()}%",
                    background = Color(0x3334D399),
                    foreground = Color(0xFF86EFAC)
                )
            }
        }
    }
}

private fun sceneTitle(sceneState: GameSceneState): String = when (sceneState) {
    is FruitSlashSceneState -> "Meyveleri kes"
    is DodgeRunSceneState -> "Engelden kaç"
    is FitChallengeSceneState -> "Görevi tamamla"
    is ScenePlaySceneState -> sceneState.prompt.ifBlank { "Komutu bekle" }
    else -> "Hazırlan"
}

private fun scenePrompt(sceneState: GameSceneState, fallbackMotion: MotionType): String = when (sceneState) {
    is FruitSlashSceneState -> "Jumping jack meyveleri keser, squat bonus hedefi patlatır."
    is DodgeRunSceneState -> sceneState.prompt.ifBlank { "Doğru hareketle engelden kaç." }
    is FitChallengeSceneState -> {
        val task = sceneState.tasks.getOrNull(sceneState.activeTaskIndex)
        if (task != null) "${motionLabel(task.motion)} görevini tamamla." else "Sıradaki göreve hazırlan."
    }
    is ScenePlaySceneState -> {
        val obj = sceneState.objects.firstOrNull()
        if (obj != null) "Komut: ${obj.label} — ${motionLabel(obj.requiredMotion)} yap" else sceneState.prompt.ifBlank { "Yeni komut bekleniyor" }
    }
    else -> "${motionLabel(fallbackMotion)} için hazır ol."
}

private fun sceneSummary(sceneState: GameSceneState, uiState: MotionUiState): String = when (sceneState) {
    is FruitSlashSceneState ->
        "Kesilen ${sceneState.slicedCount} • Kaçan ${sceneState.missedCount} • Ceza ${sceneState.penaltyCount}"

    is DodgeRunSceneState ->
        "Can ${sceneState.lives} • Mesafe ${sceneState.distance} • Enerji ${sceneState.energy}"

    is ScenePlaySceneState ->
        "Can ${sceneState.lives} • Temiz ${sceneState.clearedCount} • Kaçan ${sceneState.missedCount}"

    is FitChallengeSceneState -> {
        val task = sceneState.tasks.getOrNull(sceneState.activeTaskIndex)
        if (task != null) {
            "${task.currentCount}/${task.targetCount} tekrar • Kalite ${sceneState.qualityScore}%"
        } else {
            "Tamamlanan görev ${sceneState.completedTasks} • Skor ${uiState.game.score}"
        }
    }

    else -> "Kamera açılıyor, tüm vücudunu kadraja al."
}

private fun motionLabel(motion: MotionType): String = when (motion) {
    MotionType.SQUAT -> "Squat"
    MotionType.JUMPING_JACK -> "Jumping jack"
    MotionType.JUMP_ROPE -> "Jump rope"
}

@Composable
private fun MotionCameraStage(
    controller: AlbaMotionController,
    uiState: MotionUiState,
    showHud: Boolean,
    modifier: Modifier = Modifier
        .fillMaxWidth()
        .height(420.dp),
    rounded: Boolean = true
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val previewView = remember {
        PreviewView(context).apply {
            scaleType = PreviewView.ScaleType.FILL_CENTER
            implementationMode = PreviewView.ImplementationMode.COMPATIBLE
        }
    }
    val onboardingStore = remember { AppOnboardingStore(context) }
    var hasCameraPermission by remember {
        mutableStateOf(context.hasPermission(Manifest.permission.CAMERA))
    }
    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        hasCameraPermission = granted
        onboardingStore.cameraPermissionEverRequested = true
    }

    if (!hasCameraPermission) {
        val activity = context as? ComponentActivity
        val neverAsked = !onboardingStore.cameraPermissionEverRequested
        val permanentlyDenied = !neverAsked && activity != null &&
            !ActivityCompat.shouldShowRequestPermissionRationale(activity, Manifest.permission.CAMERA)

        Card(
            modifier = modifier,
            colors = CardDefaults.cardColors(containerColor = Color(0xFF111827))
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Text(
                    if (permanentlyDenied)
                        "Kamera izni kapalı.\nBu oyunu oynamak icin telefon ayarlarindan kamera iznini acmalisin."
                    else
                        "Bu oyun hareketlerini algilamak icin kamerayi kullanir.\nOynamak icin kamera izni gerekiyor.",
                    color = Color.White.copy(alpha = 0.90f),
                    style = MaterialTheme.typography.bodyMedium
                )
                Spacer(modifier = Modifier.height(18.dp))
                if (permanentlyDenied) {
                    Button(onClick = {
                        val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                            data = Uri.parse("package:${context.packageName}")
                        }
                        context.startActivity(intent)
                    }) {
                        Text("Ayarlari Ac")
                    }
                } else {
                    Button(onClick = { permissionLauncher.launch(Manifest.permission.CAMERA) }) {
                        Text("Kamera Izni Ver")
                    }
                }
            }
        }
        return
    }

    DisposableEffect(lifecycleOwner) {
        controller.bindCamera(lifecycleOwner, previewView)
        onDispose { controller.unbindCamera() }
    }

    val shape = if (rounded) RoundedCornerShape(28.dp) else RoundedCornerShape(0.dp)
    Box(
        modifier = modifier
            .clip(shape)
            .background(Color.Black, shape)
    ) {
        AndroidView(
            factory = { previewView },
            modifier = Modifier.fillMaxSize()
        )
        if (uiState.overlayEnabled) {
            PoseOverlay(uiState = uiState, modifier = Modifier.fillMaxSize())
        }
        if (showHud) {
            MotionHud(uiState = uiState, modifier = Modifier.align(Alignment.TopStart))
        }
        if (!uiState.isUserInFrame) {
            Surface(
                modifier = Modifier
                    .align(Alignment.Center)
                    .padding(16.dp),
                shape = RoundedCornerShape(22.dp),
                color = Color(0xDD111827)
            ) {
                Text(
                    "Tüm vücudunu kadraja al",
                    modifier = Modifier.padding(horizontal = 18.dp, vertical = 12.dp),
                    color = Color.White,
                    fontWeight = FontWeight.SemiBold
                )
            }
        }
    }
}

@Composable
private fun MotionHud(uiState: MotionUiState, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier.padding(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xCC10151D))
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            val hudColor = Color(0xFFF7F7F7)
            Text(uiState.appName, color = hudColor)
            Text("FPS ${uiState.fps}", color = hudColor)
            Text("Inference ${uiState.inferenceTimeMs}ms", color = hudColor)
            Text("Visibility ${"%.2f".format(uiState.visibilityScore)}", color = hudColor)
            Text("Visible KP ${uiState.visibleKeypointCount}", color = hudColor)
            Text("Motion ${uiState.selectedMotionType}", color = hudColor)
            Text("Phase ${uiState.detectorState.phase}", color = hudColor)
            Text("Reps ${uiState.detectorState.repCount}", color = hudColor)
            Text("Game ${uiState.activeGameTemplate ?: "-"}", color = hudColor)
            Text("Event ${uiState.lastMotionEvent?.type ?: "None"}", color = hudColor)
        }
    }
}

@Composable
private fun PoseOverlay(uiState: MotionUiState, modifier: Modifier = Modifier) {
    val poseFrame = uiState.poseFrame
    if (poseFrame == null || poseFrame.keypoints.isEmpty()) {
        return
    }
    val pointsByName = remember(poseFrame) { poseFrame.keypoints.associateBy { it.name } }
    val connections = remember {
        listOf(
            "left_shoulder" to "right_shoulder",
            "left_shoulder" to "left_elbow",
            "left_elbow" to "left_wrist",
            "right_shoulder" to "right_elbow",
            "right_elbow" to "right_wrist",
            "left_shoulder" to "left_hip",
            "right_shoulder" to "right_hip",
            "left_hip" to "right_hip",
            "left_hip" to "left_knee",
            "left_knee" to "left_ankle",
            "right_hip" to "right_knee",
            "right_knee" to "right_ankle"
        )
    }
    Canvas(modifier = modifier) {
        val imageWidth = poseFrame.imageWidth.toFloat().coerceAtLeast(1f)
        val imageHeight = poseFrame.imageHeight.toFloat().coerceAtLeast(1f)
        val scale = maxOf(size.width / imageWidth, size.height / imageHeight)
        val xOffset = (size.width - imageWidth * scale) / 2f
        val yOffset = (size.height - imageHeight * scale) / 2f

        connections.forEach { (startName, endName) ->
            val start = pointsByName[startName]
            val end = pointsByName[endName]
            if (start != null && end != null) {
                drawLine(
                    color = Color(0xFF53F2B5),
                    start = Offset(
                        x = xOffset + start.x * imageWidth * scale,
                        y = yOffset + start.y * imageHeight * scale
                    ),
                    end = Offset(
                        x = xOffset + end.x * imageWidth * scale,
                        y = yOffset + end.y * imageHeight * scale
                    ),
                    strokeWidth = 6f,
                    cap = StrokeCap.Round
                )
            }
        }
        poseFrame.keypoints.forEach { point ->
            drawCircle(
                color = if (point.confidence >= 0.55f) Color(0xFFFFD166) else Color(0xFFFB7185),
                radius = 8f,
                center = Offset(
                    x = xOffset + point.x * imageWidth * scale,
                    y = yOffset + point.y * imageHeight * scale
                )
            )
        }
    }
}

@Composable
private fun MotionLabPanel(uiState: MotionUiState) {
    Card(colors = CardDefaults.cardColors(containerColor = Color.White)) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text("Motion Lab", style = MaterialTheme.typography.titleLarge)
            Text(
            "Detector tuning ve canlı pose akışı burada takip edilir. " +
                "Debug HUD yalnız QA paneli açıldığında gösterilir."
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Pill(
                    label = "Detector ${uiState.detectorVersion}",
                    background = Color(0xFFFFEDD5),
                    foreground = Color(0xFFC2410C)
                )
                Pill(
                    label = "Event ${uiState.lastMotionEvent?.type ?: "None"}",
                    background = Color(0xFFDBEAFE),
                    foreground = Color(0xFF1D4ED8)
                )
                Pill(
                    label = "Backend ${uiState.backendStatus}",
                    background = Color(0xFFDCFCE7),
                    foreground = Color(0xFF15803D)
                )
            }
        }
    }
}

@Composable
private fun MotionQaPanel(
    uiState: MotionUiState,
    controller: AlbaMotionController
) {
    var backendUrlInput by remember(uiState.backendBaseUrlOverride, uiState.effectiveBackendBaseUrl) {
        mutableStateOf(uiState.backendBaseUrlOverride ?: uiState.effectiveBackendBaseUrl)
    }
    LaunchedEffect(uiState.backendBaseUrlOverride, uiState.effectiveBackendBaseUrl) {
        backendUrlInput = uiState.backendBaseUrlOverride ?: uiState.effectiveBackendBaseUrl
    }

    Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A))) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text("QA Panel", style = MaterialTheme.typography.titleLarge, color = Color.White)
            Text("App: ${uiState.appName} ${uiState.appVersion} (${uiState.buildType})", color = Color.White)
            Text("Backend URL: ${uiState.effectiveBackendBaseUrl}", color = Color.White.copy(alpha = 0.86f))
            Text("Game: ${uiState.activeGameId ?: "-"} / ${uiState.activeGameTemplate ?: "-"}", color = Color.White.copy(alpha = 0.86f))
            Text("Game version: ${uiState.activeGameVersion ?: 0}", color = Color.White.copy(alpha = 0.86f))
            Text("Detector: ${uiState.selectedMotionType} / ${uiState.detectorState.phase}", color = Color.White.copy(alpha = 0.86f))
            Text("Last event: ${uiState.lastMotionEvent?.type ?: "None"}", color = Color.White.copy(alpha = 0.86f))
            Text("Workout key: ${uiState.workout.clientSessionKey ?: "-"}", color = Color.White.copy(alpha = 0.86f))
            Text("Game key: ${uiState.game.clientSessionKey ?: "-"}", color = Color.White.copy(alpha = 0.86f))
            Text("Score / Combo: ${uiState.game.score} / ${uiState.game.combo}", color = Color.White.copy(alpha = 0.86f))
            Text("Sync: ${uiState.backendStatus}", color = Color.White.copy(alpha = 0.86f))
            Text("Error: ${uiState.lastError ?: "None"}", color = Color.White.copy(alpha = 0.86f))

            OutlinedTextField(
                value = backendUrlInput,
                onValueChange = { backendUrlInput = it },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Backend base URL override") }
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = { controller.saveBackendBaseUrlOverride(backendUrlInput) }) {
                    Text("URL kaydet")
                }
                OutlinedButton(onClick = controller::resetBackendBaseUrlOverride) {
                    Text("URL sifirla")
                }
                OutlinedButton(onClick = controller::retryPendingSync) {
                    Text("Sync retry")
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = controller::clearMotionLog) {
                    Text("Log temizle")
                }
                OutlinedButton(onClick = controller::refreshActiveGameDefinition) {
                    Text("Config yenile")
                }
                OutlinedButton(onClick = controller::toggleOverlay) {
            Text(if (uiState.overlayEnabled) "Overlay kapat" else "Overlay aç")
                }
            }
            Text("Mock motion", color = Color.White, fontWeight = FontWeight.SemiBold)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = { controller.injectMockRep(MotionType.SQUAT) }) {
                    Text("Squat")
                }
                Button(onClick = { controller.injectMockRep(MotionType.JUMPING_JACK) }) {
                    Text("Jumping")
                }
                Button(onClick = { controller.injectMockRep(MotionType.JUMP_ROPE) }) {
                    Text("Rope")
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = controller::injectMockBadForm) {
                    Text("Bad form")
                }
                OutlinedButton(onClick = controller::injectMockOutOfFrame) {
                    Text("Out frame")
                }
            }
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text("Motion log", color = Color.White, fontWeight = FontWeight.SemiBold)
                if (uiState.motionLog.isEmpty()) {
                    Text("Henüz event yok", color = Color.White.copy(alpha = 0.66f))
                } else {
                    uiState.motionLog.forEach { line ->
                        Text("- $line", color = Color.White.copy(alpha = 0.86f))
                    }
                }
            }
        }
    }
}

@Composable
private fun Pill(
    label: String,
    background: Color,
    foreground: Color
) {
    Surface(
        shape = RoundedCornerShape(999.dp),
        color = background
    ) {
        Text(
            label,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
            color = foreground,
            style = MaterialTheme.typography.labelMedium
        )
    }
}

private fun Context.hasPermission(permission: String): Boolean {
    return ContextCompat.checkSelfPermission(this, permission) == PackageManager.PERMISSION_GRANTED
}
