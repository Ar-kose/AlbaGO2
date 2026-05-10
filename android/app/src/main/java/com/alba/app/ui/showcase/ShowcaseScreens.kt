package com.alba.app.ui.showcase

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import kotlinx.coroutines.delay
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.alba.app.R
import com.alba.app.ui.theme.AlbaColors
import com.alba.core.data.MotionUiState

enum class ShowcaseTab {
    HOME,
    SPORT,
    EDUCATION,
    ENTERTAINMENT,
    DEMOS
}

private enum class NeonIconType {
    Sport,
    Education,
    Fun,
    Star,
    Camera,
    Shield,
    Lock,
    Phone,
    Body,
    Target,
    Home,
    Compass,
    Trophy,
    Bag,
    Calendar,
    Friends,
    Profile,
    CenterA,
    Tasks
}

private data class QuickAction(
    val title: String,
    val icon: NeonIconType,
    val accent: Color,
    val onClick: () -> Unit,
    val enabled: Boolean = true
)

private data class GameCardUi(
    val title: String,
    val subtitle: String,
    val meta: String,
    val imageRes: Int,
    val accent: Color
)

@Composable
fun OnboardingBodyTrackingScreen(onNext: () -> Unit) {
    OnboardingFrame(
        title = "Vücudun",
        accentTitle = "Senin Kumandan",
        subtitle = "Kameran seni algılar, hareketlerin oyuna dönüşür!",
        imageRes = R.drawable.onboarding_body_tracking,
        page = 0,
        buttonText = "Sonraki",
        onNext = onNext
    ) {
        NeonInfoCard(
            icon = NeonIconType.Shield,
            title = "Sen oyna, AlbaGO takip etsin!",
            body = "",
            accent = HotPink
        )
    }
}

@Composable
fun OnboardingModesScreen(
    onNext: () -> Unit,
    onSport: () -> Unit,
    onEducation: () -> Unit,
    onEntertainment: () -> Unit
) {
    NeonStaticScreen {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .padding(horizontal = 22.dp, vertical = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(20.dp))
            AccentTitle(
                first = "Hareket Et,",
                second = "Öğren ve Eğlen",
                secondBrush = Brush.horizontalGradient(listOf(Cyan, HotPink))
            )
            Text(
                text = "Üç modu keşfet, kendini her alanda geliştir!",
                color = SoftWhite.copy(alpha = 0.72f),
                style = MaterialTheme.typography.bodySmall,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(top = 10.dp, bottom = 26.dp)
            )

            Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                ModeChoiceCard(
                    title = "SPOR",
                    body = "Egzersiz yap, fit kal, hedeflerine ulaş!",
                    icon = NeonIconType.Sport,
                    accent = HotPink,
                    onClick = onSport
                )
                ModeChoiceCard(
                    title = "EĞİTİM",
                    body = "Hareketli derslerle öğrenmeyi kolaylaştır!",
                    icon = NeonIconType.Education,
                    accent = Cyan,
                    onClick = onEducation
                )
                ModeChoiceCard(
                    title = "EĞLENCE",
                    body = "Oyunlar, meydan okumalar ve daha fazlası!",
                    icon = NeonIconType.Fun,
                    accent = Purple,
                    onClick = onEntertainment
                )
            }

            Spacer(modifier = Modifier.weight(1f))
            PageDots(page = 1)
            Spacer(modifier = Modifier.height(18.dp))
            NeonButton(text = "Sonraki", onClick = onNext)
        }
    }
}

@Composable
fun OnboardingCameraWorldScreen(onNext: () -> Unit) {
    OnboardingFrame(
        title = "Kameranla",
        accentTitle = "Dünyaya Bağlan",
        subtitle = "Telefonunu yerleştir, alanını ayarla ve kameranla etkileşime geç!",
        imageRes = R.drawable.onboarding_camera_world_connect,
        page = 2,
        buttonText = "Hadi Başlayalım",
        onNext = onNext
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            MiniInstructionCard(
                modifier = Modifier.weight(1f),
                icon = NeonIconType.Phone,
                title = "Telefonunu sabitle"
            )
            MiniInstructionCard(
                modifier = Modifier.weight(1f),
                icon = NeonIconType.Body,
                title = "Vücudunu tam göster"
            )
            MiniInstructionCard(
                modifier = Modifier.weight(1f),
                icon = NeonIconType.Target,
                title = "Alanını kontrol et"
            )
        }
    }
}

@Composable
fun CameraPermissionShowcaseScreen(onFinished: () -> Unit) {
    val context = LocalContext.current
    var hasPermission by remember {
        mutableStateOf(context.hasCameraPermission())
    }
    val launcher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        hasPermission = granted
        if (granted) onFinished()
    }

    NeonStaticScreen {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .padding(horizontal = 22.dp, vertical = 18.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(18.dp))
            AccentTitle(
                first = "Kamerana İzin Ver,",
                second = "Deneyimini Zirveye Taşı!",
                secondBrush = Brush.horizontalGradient(listOf(HotPink, SoftWhite))
            )
            Spacer(modifier = Modifier.height(18.dp))
            FramedImage(
                imageRes = R.drawable.permission_camera_neon,
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 300.dp)
                    .aspectRatio(1f),
                shape = RoundedCornerShape(28.dp)
            )
            Spacer(modifier = Modifier.height(18.dp))
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = Panel,
                shape = RoundedCornerShape(20.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, StrokeLine)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(13.dp)
                ) {
                    BenefitRow(
                        icon = NeonIconType.Shield,
                        title = "Gizliliğin Senin Kontrolünde",
                        body = "Tüm veriler cihazında kalır, hiçbir şey sunuculara gönderilmez.",
                        accent = Cyan
                    )
                    BenefitRow(
                        icon = NeonIconType.Lock,
                        title = "Güvenli ve Özel",
                        body = "Yüzün tanımlanmaz, sadece hareketlerin analiz edilir.",
                        accent = Cyan
                    )
                    BenefitRow(
                        icon = NeonIconType.Star,
                        title = "Daha İyi Deneyim",
                        body = "Kişiselleştirilmiş ve akıllı öneriler al.",
                        accent = Purple
                    )
                }
            }
            Spacer(modifier = Modifier.weight(1f))
            NeonButton(
                text = if (hasPermission) "Devam Et" else "Kameraya İzin Ver",
                onClick = {
                    if (hasPermission) onFinished() else launcher.launch(Manifest.permission.CAMERA)
                }
            )
            Spacer(modifier = Modifier.height(10.dp))
            OutlineNeonButton(text = "Daha Fazla Bilgi", onClick = onFinished)
        }
    }
}

@Composable
fun HomeShowcaseScreen(
    uiState: MotionUiState,
    onOpenSport: () -> Unit,
    onOpenEducation: () -> Unit,
    onOpenEntertainment: () -> Unit,
    onOpenDemos: () -> Unit,
    onOpenProfile: () -> Unit,
    onCenterAction: () -> Unit
) {
    var snackbarMessage by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(snackbarMessage) {
        if (snackbarMessage != null) {
            delay(2000)
            snackbarMessage = null
        }
    }
    val showSoon: () -> Unit = { snackbarMessage = "Bu özellik yakında gelecek!" }

    NeonScreen(
        selectedTab = ShowcaseTab.HOME,
        onHome = {},
        onSport = onOpenSport,
        onEducation = onOpenEducation,
        onEntertainment = onOpenEntertainment,
        onDemos = onOpenDemos,
        onCenterAction = onCenterAction,
        snackbarMessage = snackbarMessage
    ) {
        HomeHeader()
        HeroBanner(
            imageRes = R.drawable.banner_neon_rush,
            eyebrow = "HAFTANIN OYUNU",
            title = "Neon\nRush",
            subtitle = "Koş, zıpla, puanları topla!",
            button = "Hemen Oyna",
            accent = HotPink,
            onClick = onOpenDemos
        )
        SectionLabel(title = "HIZLI ERİŞİM")
        QuickActionsRow(
            actions = listOf(
                QuickAction("Profil", NeonIconType.Friends, Cyan, onClick = onOpenProfile, enabled = true),
                QuickAction("Görevler", NeonIconType.Target, Orange, onClick = showSoon, enabled = false),
                QuickAction("Liderlik", NeonIconType.Trophy, Amber, onClick = showSoon, enabled = false),
                QuickAction("Mağaza", NeonIconType.Bag, HotPink, onClick = showSoon, enabled = false),
                QuickAction("Etkinlikler", NeonIconType.Calendar, Purple, onClick = showSoon, enabled = false)
            )
        )
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            ModeTile(
                modifier = Modifier.weight(1f),
                title = "SPOR",
                subtitle = "Antrenmanlara başla",
                icon = NeonIconType.Sport,
                accent = HotPink,
                onClick = onOpenSport
            )
            ModeTile(
                modifier = Modifier.weight(1f),
                title = "EĞİTİM",
                subtitle = "Dersleri keşfet",
                icon = NeonIconType.Education,
                accent = Cyan,
                onClick = onOpenEducation
            )
            ModeTile(
                modifier = Modifier.weight(1f),
                title = "EĞLENCE",
                subtitle = "Oyunlara oyna",
                icon = NeonIconType.Fun,
                accent = Purple,
                onClick = onOpenEntertainment
            )
        }
        SectionLabel(
            title = "GÜNLÜK İLERLEME",
            trailing = "Detaylar >"
        )
        DailyProgressCard(
            percent = 0.72f,
            goal = "${uiState.workout.totalReps.coerceAtLeast(43)} / 60 dk",
            calories = 220
        )
    }
}

@Composable
fun SportModeShowcaseScreen(
    onHome: () -> Unit,
    onEducation: () -> Unit,
    onEntertainment: () -> Unit,
    onDemos: () -> Unit,
    onCenterAction: () -> Unit
) {
    NeonScreen(
        selectedTab = ShowcaseTab.SPORT,
        onHome = onHome,
        onSport = {},
        onEducation = onEducation,
        onEntertainment = onEntertainment,
        onDemos = onDemos,
        onCenterAction = onCenterAction
    ) {
        CenteredTitle(
            title = "Spor Modu",
            subtitle = "Hareket et, güçlen, hedeflerine ulaş!"
        )
        SportHero(onClick = onDemos)
        SectionLabel(title = "Önerilen Oyunlar", trailing = "Tümünü Gör >")
        HorizontalGameCards(
            cards = listOf(
                GameCardUi("Zıplama\nŞampiyonası", "Enerji", "15 dk", R.drawable.game_ziplama_sampiyonasi, HotPink),
                GameCardUi("Esneklik\nUstası", "Denge", "12 dk", R.drawable.game_esneklik_ustasi, Cyan),
                GameCardUi("Ritim\nBoksu", "Kardiyo", "10 dk", R.drawable.game_ritim_boksu, Purple)
            ),
            onClick = onDemos
        )
        DailyGoalWideCard(
            percent = 0.76f,
            title = "30 Dakika Aktif Kal",
            detail = "23 / 30 dk",
            accent = HotPink
        )
    }
}

@Composable
fun EducationModeShowcaseScreen(
    onHome: () -> Unit,
    onSport: () -> Unit,
    onEntertainment: () -> Unit,
    onDemos: () -> Unit,
    onCenterAction: () -> Unit
) {
    NeonScreen(
        selectedTab = ShowcaseTab.EDUCATION,
        onHome = onHome,
        onSport = onSport,
        onEducation = {},
        onEntertainment = onEntertainment,
        onDemos = onDemos,
        onCenterAction = onCenterAction
    ) {
        CenteredTitle(
            title = "Öğrenirken\nHareket Et!",
            subtitle = "Eğlenerek öğren, bilgini hareketle pekiştir."
        )
        SegmentRow(items = listOf("Tümü", "Matematik", "Dil Bilgisi", "Mantık", "Fen Bilimleri"))
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            LearningListCard(
                imageRes = R.drawable.game_matematik_macerasi,
                title = "Matematik Macerası",
                meta = "8-12 Yaş    15 dk",
                accent = HotPink,
                onClick = onDemos
            )
            LearningListCard(
                imageRes = R.drawable.game_kelime_avcisi,
                title = "Kelime Avcısı",
                meta = "8-13 Yaş    10 dk",
                accent = HotPink,
                onClick = onDemos
            )
            LearningListCard(
                imageRes = R.drawable.game_bilim_kasifleri,
                title = "Bilim Kaşifleri",
                meta = "8-14 Yaş    15 dk",
                accent = HotPink,
                onClick = onDemos
            )
        }
        DailyGoalWideCard(
            percent = 0.71f,
            title = "45 Dakika",
            detail = "32 / 45 dk",
            accent = Cyan
        )
    }
}

@Composable
fun EntertainmentModeShowcaseScreen(
    onHome: () -> Unit,
    onSport: () -> Unit,
    onEducation: () -> Unit,
    onDemos: () -> Unit,
    onCenterAction: () -> Unit
) {
    NeonScreen(
        selectedTab = ShowcaseTab.ENTERTAINMENT,
        onHome = onHome,
        onSport = onSport,
        onEducation = onEducation,
        onEntertainment = {},
        onDemos = onDemos,
        onCenterAction = onCenterAction
    ) {
        CenteredTitle(
            title = "Eğlence Modu",
            subtitle = "Oyna, eğlen, arkadaşlarınla yarış!"
        )
        HeroBanner(
            imageRes = R.drawable.entertainment_banner_neon_arena,
            eyebrow = "YENİ SEZON",
            title = "Neon Arena",
            subtitle = "Kayfet, yarış ve ödülleri topla!",
            button = "Keşfet",
            accent = HotPink,
            onClick = onDemos
        )
        SegmentRow(items = listOf("Tümü", "Parti", "Ritim", "Hızlı"))
        SectionLabel(title = "Öne Çıkan Oyunlar", trailing = "Tümünü Gör >")
        HorizontalGameCards(
            cards = listOf(
                GameCardUi("Dans\nSavaşı", "Parti", "8 dk", R.drawable.game_dans_savasi, HotPink),
                GameCardUi("Neon\nKoşu", "Refleks", "10 dk", R.drawable.game_neon_kosu, Cyan),
                GameCardUi("Ritmik\nVuruş", "Ritim", "9 dk", R.drawable.game_ritmik_vurus, Purple)
            ),
            onClick = onDemos
        )
        SectionLabel(title = "Canlı Odalar")
        LiveRoomCard(
            imageRes = R.drawable.room_neon_party,
            title = "Neon Parti Odası",
            detail = "24 oyuncu",
            badge = "CANLI"
        )
        LiveRoomCard(
            imageRes = R.drawable.room_ritim_turnuvasi,
            title = "Ritim Turnuvası",
            detail = "16 oyuncu",
            badge = ""
        )
        WeeklyEventCard(onClick = onDemos)
    }
}

@Composable
fun DemoCatalogShowcaseScreen(
    onHome: () -> Unit,
    onSport: () -> Unit,
    onEducation: () -> Unit,
    onEntertainment: () -> Unit,
    onCenterAction: () -> Unit,
    onGameSelected: (String) -> Unit = {}
) {
    var snackbarMessage by remember { mutableStateOf<String?>(null) }
    NeonScreen(
        selectedTab = ShowcaseTab.DEMOS,
        onHome = onHome,
        onSport = onSport,
        onEducation = onEducation,
        onEntertainment = onEntertainment,
        onDemos = {},
        onCenterAction = onCenterAction,
        snackbarMessage = snackbarMessage
    ) {
        CenteredTitle(
            title = "Demo Oyunlar",
            subtitle = "Seç, hazırlan ve oynamaya başla!"
        )
        SegmentRow(items = listOf("Tümü", "Spor", "Eğlence", "Eğitim"))
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            DemoListCard(
                imageRes = R.drawable.demo_fruit_slash,
                title = "Meyve Kesme",
                category = "Eğlence · 60s · EASY",
                description = "Jumping jack ile meyveleri kes, squat ile güçlü hedefi patlat!",
                accent = HotPink,
                onClick = { onGameSelected("fruit_slash_demo") }
            )
            DemoListCard(
                imageRes = R.drawable.demo_dodge_run,
                title = "Engelden Kaçış",
                category = "Spor · 60s · MEDIUM",
                description = "Engeller akar; squat ile alttan geç, jumping jack ile zıpla!",
                accent = Orange,
                onClick = { onGameSelected("dodge_run_demo") }
            )
            DemoListCard(
                imageRes = R.drawable.demo_fit_challenge,
                title = "Spor Mücadelesi",
                category = "Spor · 120s · CHALLENGE",
                description = "Squat, jumping jack, jump rope ve plank — 4 aşamalı program.",
                accent = Cyan,
                onClick = { onGameSelected("fit_challenge_demo") }
            )
        }
    }
}

@Composable
fun NeonGamePrepScreen(
    uiState: MotionUiState,
    onStartGame: () -> Unit,
    onBackToCatalog: () -> Unit,
    onHome: () -> Unit,
    onCenterAction: () -> Unit
) {
    val game = uiState.activeGameDefinition
    if (game == null) {
        NeonScreen(
            selectedTab = ShowcaseTab.DEMOS,
            onHome = onHome,
            onSport = {},
            onEducation = {},
            onEntertainment = {},
            onDemos = {},
            onCenterAction = onCenterAction
        ) {
            CenteredTitle(
                title = "Oyun Yükleniyor",
                subtitle = "Oyun tanımı alınıyor..."
            )
        }
        return
    }

    val level = game.levels.firstOrNull()
    val durationSec = level?.durationSec ?: 60
    val targetScore = level?.targetScore ?: 0
    val difficulty = level?.difficulty ?: "EASY"
    val motions = game.supportedMotions

    NeonScreen(
        selectedTab = ShowcaseTab.DEMOS,
        onHome = onHome,
        onSport = {},
        onEducation = {},
        onEntertainment = {},
        onDemos = {},
        onCenterAction = onCenterAction
    ) {
        CenteredTitle(
            title = game.title,
            subtitle = game.description
        )

        // Game info chips
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            InfoChip(durationSec.toString() + "s", HotPink)
            InfoChip(difficulty, Orange)
            InfoChip("Hedef $targetScore", Cyan)
            InfoChip(game.category.name, Purple)
        }

        // Motion tags
        SectionLabel(title = "HAREKETLER")
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            motions.forEach { motion ->
                Surface(
                    color = HotPink.copy(alpha = 0.18f),
                    shape = RoundedCornerShape(20.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, HotPink.copy(alpha = 0.5f))
                ) {
                    Text(
                        motion.name.replace("_", " "),
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                        color = HotPink,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        // How to play card
        SectionLabel(title = "NASIL OYNANIR")
        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = Panel,
            shape = RoundedCornerShape(14.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, Cyan.copy(alpha = 0.35f))
        ) {
            Column(
                modifier = Modifier.padding(14.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Text(
                    game.description,
                    color = SoftWhite.copy(alpha = 0.82f),
                    fontSize = 12.sp,
                    lineHeight = 17.sp
                )
                if (level?.programSteps?.isNotEmpty() == true) {
                    Spacer(Modifier.height(6.dp))
                    Text("Program Akışı:", color = Cyan, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                    level.programSteps.forEachIndexed { index, step ->
                        Text(
                            "${index + 1}. ${step.title}" + if (step.description?.isNotBlank() == true) " — ${step.description}" else "",
                            color = SoftWhite.copy(alpha = 0.72f),
                            fontSize = 11.sp,
                            lineHeight = 15.sp
                        )
                    }
                }
            }
        }

        // Camera recommendation
        SectionLabel(title = "KAMERA")
        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = Panel,
            shape = RoundedCornerShape(14.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, Purple.copy(alpha = 0.35f))
        ) {
            Row(
                modifier = Modifier.padding(14.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                NeonGlyph(icon = NeonIconType.Camera, tint = Purple, modifier = Modifier.size(26.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text("Kamera Gereksinimi", color = SoftWhite, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    Text(
                        cameraLabel(game.cameraRequirement.name),
                        color = Purple,
                        fontSize = 11.sp
                    )
                }
            }
        }

        Spacer(Modifier.height(8.dp))

        // Start button
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .clickable(onClick = onStartGame),
            color = HotPink,
            shape = RoundedCornerShape(14.dp)
        ) {
            Text(
                "Oyuna Başla",
                modifier = Modifier.padding(vertical = 14.dp),
                color = Color.White,
                fontWeight = FontWeight.Bold,
                fontSize = 15.sp,
                textAlign = TextAlign.Center
            )
        }

        // Back to catalog
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .clickable(onClick = onBackToCatalog),
            color = Panel,
            shape = RoundedCornerShape(14.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, StrokeLine)
        ) {
            Text(
                "Kataloğa Dön",
                modifier = Modifier.padding(vertical = 12.dp),
                color = SoftWhite.copy(alpha = 0.72f),
                fontWeight = FontWeight.Medium,
                fontSize = 13.sp,
                textAlign = TextAlign.Center
            )
        }

        Spacer(Modifier.height(16.dp))
    }
}

@Composable
private fun InfoChip(label: String, accent: Color) {
    Surface(
        color = accent.copy(alpha = 0.12f),
        shape = RoundedCornerShape(8.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, accent.copy(alpha = 0.4f))
    ) {
        Text(
            label,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
            color = accent,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold
        )
    }
}

private fun cameraLabel(requirement: String): String = when (requirement.uppercase()) {
    "FULL_BODY" -> "Tam vücut görünümü gerekli"
    "UPPER_BODY" -> "Üst vücut görünümü gerekli"
    "HAND_TARGET" -> "El hedefleme — eller kadrajda olmalı"
    else -> requirement
}

@Composable
private fun OnboardingFrame(
    title: String,
    accentTitle: String,
    subtitle: String,
    imageRes: Int,
    page: Int,
    buttonText: String,
    onNext: () -> Unit,
    bottomContent: @Composable () -> Unit
) {
    NeonStaticScreen {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .padding(horizontal = 22.dp, vertical = 18.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(18.dp))
            AccentTitle(
                first = title,
                second = accentTitle,
                secondBrush = Brush.horizontalGradient(listOf(HotPink, HotPink))
            )
            Text(
                text = subtitle,
                color = SoftWhite.copy(alpha = 0.72f),
                style = MaterialTheme.typography.bodySmall,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(top = 10.dp, bottom = 18.dp)
            )
            FramedImage(
                imageRes = imageRes,
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 330.dp)
                    .aspectRatio(1f),
                shape = RoundedCornerShape(28.dp)
            )
            Spacer(modifier = Modifier.height(16.dp))
            bottomContent()
            Spacer(modifier = Modifier.weight(1f))
            PageDots(page = page)
            Spacer(modifier = Modifier.height(18.dp))
            NeonButton(text = buttonText, onClick = onNext)
        }
    }
}

@Composable
private fun NeonStaticScreen(content: @Composable () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(DeepBlack)
    ) {
        NeonBackground()
        content()
    }
}

@Composable
private fun NeonScreen(
    selectedTab: ShowcaseTab,
    onHome: () -> Unit,
    onSport: () -> Unit,
    onEducation: () -> Unit,
    onEntertainment: () -> Unit,
    onDemos: () -> Unit,
    onCenterAction: () -> Unit,
    snackbarMessage: String? = null,
    content: @Composable ColumnScopeShim.() -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(DeepBlack)
    ) {
        NeonBackground()
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp)
                .padding(top = 12.dp, bottom = 102.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            ColumnScopeShim(this).content()
        }
        BottomBar(
            selectedTab = selectedTab,
            onHome = onHome,
            onSport = onSport,
            onEducation = onEducation,
            onEntertainment = onEntertainment,
            onDemos = onDemos,
            onCenterAction = onCenterAction,
            modifier = Modifier.align(Alignment.BottomCenter)
        )
        if (snackbarMessage != null) {
            Surface(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 96.dp),
                color = Panel.copy(alpha = 0.95f),
                shape = RoundedCornerShape(24.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, HotPink.copy(alpha = 0.6f))
            ) {
                Text(
                    snackbarMessage,
                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 12.dp),
                    color = SoftWhite,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium
                )
            }
        }
    }
}

private class ColumnScopeShim(private val columnScope: androidx.compose.foundation.layout.ColumnScope) :
    androidx.compose.foundation.layout.ColumnScope by columnScope

@Composable
private fun NeonBackground() {
    Image(
        painter = painterResource(id = R.drawable.background_neon_streaks),
        contentDescription = null,
        modifier = Modifier.fillMaxSize(),
        contentScale = ContentScale.Crop,
        alpha = 0.55f
    )
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    listOf(
                        Color.Black.copy(alpha = 0.22f),
                        Color(0xFF070912).copy(alpha = 0.82f),
                        Color.Black.copy(alpha = 0.96f)
                    )
                )
            )
    )
}

@Composable
private fun HomeHeader() {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Image(
            painter = painterResource(id = R.drawable.avatar_user_efe),
            contentDescription = null,
            modifier = Modifier
                .size(46.dp)
                .clip(RoundedCornerShape(15.dp))
                .border(1.dp, HotPink.copy(alpha = 0.8f), RoundedCornerShape(15.dp)),
            contentScale = ContentScale.Crop
        )
        Column(modifier = Modifier.weight(1f)) {
            Text("Selam Efe! 👋", color = SoftWhite, fontWeight = FontWeight.Bold, fontSize = 15.sp)
            Text("Bugün harika bir gün!", color = SoftWhite.copy(alpha = 0.58f), fontSize = 11.sp)
        }
        TinyChip(text = "12", icon = NeonIconType.Star, accent = Purple)
        CircleIcon(icon = NeonIconType.Tasks, accent = SoftWhite.copy(alpha = 0.82f))
    }
}

@Composable
private fun HeroBanner(
    imageRes: Int,
    eyebrow: String,
    title: String,
    subtitle: String,
    button: String,
    accent: Color,
    onClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(154.dp)
            .clip(RoundedCornerShape(18.dp))
            .border(1.dp, accent.copy(alpha = 0.38f), RoundedCornerShape(18.dp))
            .clickable(onClick = onClick)
    ) {
        Image(
            painter = painterResource(id = imageRes),
            contentDescription = null,
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.horizontalGradient(
                        listOf(
                            Color.Black.copy(alpha = 0.72f),
                            Color.Black.copy(alpha = 0.18f),
                            Color.Transparent
                        )
                    )
                )
        )
        Column(
            modifier = Modifier
                .align(Alignment.CenterStart)
                .padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text(eyebrow, color = accent, fontSize = 10.sp, fontWeight = FontWeight.ExtraBold)
            Text(
                title,
                color = SoftWhite,
                fontSize = 28.sp,
                lineHeight = 26.sp,
                fontWeight = FontWeight.ExtraBold
            )
            Text(subtitle, color = SoftWhite.copy(alpha = 0.82f), fontSize = 11.sp)
            Spacer(modifier = Modifier.height(4.dp))
            Surface(
                color = accent,
                shape = RoundedCornerShape(7.dp)
            ) {
                Text(
                    button,
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 7.dp),
                    color = Color.White,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}

@Composable
private fun SportHero(onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(258.dp)
            .clip(RoundedCornerShape(20.dp))
            .border(1.dp, HotPink.copy(alpha = 0.38f), RoundedCornerShape(20.dp))
            .clickable(onClick = onClick)
    ) {
        Image(
            painter = painterResource(id = R.drawable.sport_hero_runner_woman),
            contentDescription = null,
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(alpha = 0.72f))))
        )
        NeonButton(
            text = "Hemen Oyna",
            onClick = onClick,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(16.dp)
        )
    }
}

@Composable
private fun QuickActionsRow(actions: List<QuickAction>) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        actions.forEach { action ->
            Surface(
                modifier = Modifier
                    .weight(1f)
                    .height(58.dp)
                    .clickable(onClick = action.onClick),
                color = Panel.copy(alpha = if (action.enabled) 1f else 0.45f),
                shape = RoundedCornerShape(13.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, StrokeLine)
            ) {
                Column(
                    modifier = Modifier.padding(6.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    NeonGlyph(icon = action.icon, tint = action.accent, modifier = Modifier.size(22.dp))
                    Text(
                        if (action.enabled) action.title else "Yakında",
                        color = SoftWhite.copy(alpha = 0.72f),
                        fontSize = 8.sp,
                        maxLines = 1,
                        textAlign = TextAlign.Center
                    )
                }
            }
        }
    }
}

@Composable
private fun ModeTile(
    modifier: Modifier,
    title: String,
    subtitle: String,
    icon: NeonIconType,
    accent: Color,
    onClick: () -> Unit
) {
    Surface(
        modifier = modifier
            .height(92.dp)
            .clickable(onClick = onClick),
        color = accent.copy(alpha = 0.14f),
        shape = RoundedCornerShape(14.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, accent.copy(alpha = 0.5f))
    ) {
        Column(
            modifier = Modifier.padding(10.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            NeonGlyph(icon = icon, tint = accent, modifier = Modifier.size(30.dp))
            Text(title, color = SoftWhite, fontWeight = FontWeight.Bold, fontSize = 12.sp)
            Text(subtitle, color = SoftWhite.copy(alpha = 0.66f), fontSize = 9.sp, textAlign = TextAlign.Center)
        }
    }
}

@Composable
private fun DailyProgressCard(percent: Float, goal: String, calories: Int) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = Panel,
        shape = RoundedCornerShape(18.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, StrokeLine)
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            horizontalArrangement = Arrangement.spacedBy(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            RingProgress(percent = percent, accent = Cyan, modifier = Modifier.size(58.dp))
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(7.dp)) {
                Text("Bugünkü Hedefin", color = SoftWhite.copy(alpha = 0.62f), fontSize = 10.sp)
                Text(goal, color = SoftWhite, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                ProgressLine(percent = percent, accent = Cyan)
            }
            Column(horizontalAlignment = Alignment.End) {
                Text("🔥", fontSize = 15.sp)
                Text(calories.toString(), color = SoftWhite, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                Text("Kalori", color = SoftWhite.copy(alpha = 0.58f), fontSize = 9.sp)
            }
        }
    }
}

@Composable
private fun DailyGoalWideCard(percent: Float, title: String, detail: String, accent: Color) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = Panel,
        shape = RoundedCornerShape(18.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, StrokeLine)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            RingProgress(percent = percent, accent = accent, modifier = Modifier.size(62.dp))
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Günlük Hedefin", color = SoftWhite.copy(alpha = 0.62f), fontSize = 10.sp)
                Text(title, color = SoftWhite, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                Text(detail, color = SoftWhite.copy(alpha = 0.72f), fontSize = 11.sp)
                ProgressLine(percent = percent, accent = accent)
            }
        }
    }
}

@Composable
private fun HorizontalGameCards(cards: List<GameCardUi>, onClick: () -> Unit) {
    Row(
        modifier = Modifier.horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        cards.forEach { card ->
            Box(
                modifier = Modifier
                    .width(105.dp)
                    .height(126.dp)
                    .clip(RoundedCornerShape(13.dp))
                    .border(1.dp, card.accent.copy(alpha = 0.48f), RoundedCornerShape(13.dp))
                    .clickable(onClick = onClick)
            ) {
                Image(
                    painter = painterResource(id = card.imageRes),
                    contentDescription = null,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop
                )
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(alpha = 0.82f))))
                )
                Text(
                    text = card.title,
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(8.dp),
                    color = SoftWhite,
                    fontSize = 11.sp,
                    lineHeight = 11.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}

@Composable
private fun LearningListCard(
    imageRes: Int,
    title: String,
    meta: String,
    accent: Color,
    onClick: () -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .height(92.dp)
            .clickable(onClick = onClick),
        color = Panel,
        shape = RoundedCornerShape(15.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, Cyan.copy(alpha = 0.26f))
    ) {
        Row(
            modifier = Modifier.padding(9.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Image(
                painter = painterResource(id = imageRes),
                contentDescription = null,
                modifier = Modifier
                    .size(74.dp)
                    .clip(RoundedCornerShape(12.dp)),
                contentScale = ContentScale.Crop
            )
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                Text(title, color = SoftWhite, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                Text(meta, color = SoftWhite.copy(alpha = 0.62f), fontSize = 10.sp)
            }
            Surface(color = accent, shape = RoundedCornerShape(7.dp)) {
                Text(
                    "Hemen Başla",
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 7.dp),
                    color = Color.White,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}

@Composable
private fun LiveRoomCard(imageRes: Int, title: String, detail: String, badge: String) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = Panel,
        shape = RoundedCornerShape(13.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, Purple.copy(alpha = 0.28f))
    ) {
        Row(
            modifier = Modifier.padding(8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Image(
                painter = painterResource(id = imageRes),
                contentDescription = null,
                modifier = Modifier
                    .size(width = 84.dp, height = 44.dp)
                    .clip(RoundedCornerShape(10.dp)),
                contentScale = ContentScale.Crop
            )
            Column(modifier = Modifier.weight(1f)) {
                if (badge.isNotBlank()) {
                    Text(badge, color = HotPink, fontWeight = FontWeight.ExtraBold, fontSize = 9.sp)
                }
                Text(title, color = SoftWhite, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                Text(detail, color = SoftWhite.copy(alpha = 0.58f), fontSize = 10.sp)
            }
            Text("›", color = Purple, fontSize = 22.sp, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun WeeklyEventCard(onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(104.dp)
            .clip(RoundedCornerShape(16.dp))
            .border(1.dp, HotPink.copy(alpha = 0.36f), RoundedCornerShape(16.dp))
            .clickable(onClick = onClick)
    ) {
        Image(
            painter = painterResource(id = R.drawable.weekly_event_gift_box),
            contentDescription = null,
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Brush.horizontalGradient(listOf(Color.Black.copy(alpha = 0.75f), Color.Transparent)))
        )
        Column(
            modifier = Modifier
                .align(Alignment.CenterStart)
                .padding(14.dp)
        ) {
            Text("Haftalık Etkinlik", color = HotPink, fontSize = 10.sp, fontWeight = FontWeight.Bold)
            Text("Ritim Ustaları Mücadelesi", color = SoftWhite, fontWeight = FontWeight.Bold, fontSize = 14.sp)
            Text("En yüksek puanı yap, ödülleri kap!", color = SoftWhite.copy(alpha = 0.72f), fontSize = 10.sp)
        }
    }
}

@Composable
private fun DemoListCard(
    imageRes: Int,
    title: String,
    category: String,
    description: String,
    accent: Color,
    onClick: () -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        color = Panel,
        shape = RoundedCornerShape(16.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, accent.copy(alpha = 0.42f))
    ) {
        Row(
            modifier = Modifier.padding(10.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Image(
                painter = painterResource(id = imageRes),
                contentDescription = null,
                modifier = Modifier
                    .size(84.dp)
                    .clip(RoundedCornerShape(13.dp)),
                contentScale = ContentScale.Crop
            )
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(title, color = SoftWhite, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                Text(category, color = accent, fontWeight = FontWeight.Bold, fontSize = 10.sp)
                Text(description, color = SoftWhite.copy(alpha = 0.66f), fontSize = 10.sp, lineHeight = 13.sp)
            }
            Surface(
                modifier = Modifier.clickable(onClick = onClick),
                color = HotPink,
                shape = RoundedCornerShape(7.dp)
            ) {
                Text(
                    "Hazırla",
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 7.dp),
                    color = Color.White,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}

@Composable
private fun ModeChoiceCard(
    title: String,
    body: String,
    icon: NeonIconType,
    accent: Color,
    onClick: () -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .height(84.dp)
            .clickable(onClick = onClick),
        color = accent.copy(alpha = 0.15f),
        shape = RoundedCornerShape(19.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, accent.copy(alpha = 0.64f))
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            NeonIconBox(icon = icon, accent = accent, size = 52.dp)
            Column(modifier = Modifier.weight(1f)) {
                Text(title, color = accent, fontWeight = FontWeight.ExtraBold, fontSize = 14.sp)
                Text(body, color = SoftWhite.copy(alpha = 0.72f), fontSize = 10.sp, lineHeight = 13.sp)
            }
            Text("›", color = accent, fontWeight = FontWeight.Bold, fontSize = 28.sp)
        }
    }
}

@Composable
private fun MiniInstructionCard(modifier: Modifier, icon: NeonIconType, title: String) {
    Surface(
        modifier = modifier.height(86.dp),
        color = Panel,
        shape = RoundedCornerShape(13.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, StrokeLine)
    ) {
        Column(
            modifier = Modifier.padding(8.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            NeonGlyph(icon = icon, tint = HotPink, modifier = Modifier.size(26.dp))
            Spacer(modifier = Modifier.height(7.dp))
            Text(title, color = SoftWhite.copy(alpha = 0.74f), fontSize = 9.sp, textAlign = TextAlign.Center, lineHeight = 11.sp)
        }
    }
}

@Composable
private fun NeonInfoCard(icon: NeonIconType, title: String, body: String, accent: Color) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = Panel,
        shape = RoundedCornerShape(15.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, StrokeLine)
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            NeonGlyph(icon = icon, tint = accent, modifier = Modifier.size(24.dp))
            Column {
                Text(title, color = SoftWhite, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                if (body.isNotBlank()) {
                    Text(body, color = SoftWhite.copy(alpha = 0.66f), fontSize = 10.sp)
                }
            }
        }
    }
}

@Composable
private fun BenefitRow(icon: NeonIconType, title: String, body: String, accent: Color) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.Top
    ) {
        NeonGlyph(icon = icon, tint = accent, modifier = Modifier.size(25.dp))
        Column {
            Text(title, color = SoftWhite, fontWeight = FontWeight.Bold, fontSize = 12.sp)
            Text(body, color = SoftWhite.copy(alpha = 0.64f), fontSize = 10.sp, lineHeight = 13.sp)
        }
    }
}

@Composable
private fun SegmentRow(items: List<String>) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items.forEachIndexed { index, item ->
            Surface(
                color = if (index == 0) HotPink else Panel,
                shape = RoundedCornerShape(8.dp),
                border = if (index == 0) null else androidx.compose.foundation.BorderStroke(1.dp, StrokeLine)
            ) {
                Text(
                    item,
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                    color = if (index == 0) Color.White else SoftWhite.copy(alpha = 0.72f),
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}

@Composable
private fun BottomBar(
    selectedTab: ShowcaseTab,
    onHome: () -> Unit,
    onSport: () -> Unit,
    onEducation: () -> Unit,
    onEntertainment: () -> Unit,
    onDemos: () -> Unit,
    onCenterAction: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier
            .fillMaxWidth()
            .navigationBarsPadding()
            .padding(horizontal = 14.dp, vertical = 8.dp),
        color = Color(0xF2070912),
        shape = RoundedCornerShape(23.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, StrokeLine)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(64.dp)
                .padding(horizontal = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            BottomItem("Ana Sayfa", NeonIconType.Home, selectedTab == ShowcaseTab.HOME, HotPink, onHome)
            BottomItem("Spor", NeonIconType.Sport, selectedTab == ShowcaseTab.SPORT, HotPink, onSport)
            Surface(
                modifier = Modifier
                    .size(58.dp)
                    .shadow(20.dp, CircleShape, ambientColor = HotPink, spotColor = HotPink)
                    .clickable(onClick = onCenterAction),
                color = HotPink,
                shape = CircleShape
            ) {
                Box(contentAlignment = Alignment.Center) {
                    NeonGlyph(icon = NeonIconType.CenterA, tint = Color.White, modifier = Modifier.size(34.dp))
                }
            }
            BottomItem("Eğitim", NeonIconType.Education, selectedTab == ShowcaseTab.EDUCATION, Cyan, onEducation)
            BottomItem("Eğlence", NeonIconType.Fun, selectedTab == ShowcaseTab.ENTERTAINMENT, Purple, onEntertainment)
        }
    }
}

@Composable
private fun BottomItem(
    title: String,
    icon: NeonIconType,
    selected: Boolean,
    accent: Color,
    onClick: () -> Unit
) {
    Column(
        modifier = Modifier
            .width(55.dp)
            .clickable(onClick = onClick),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        NeonGlyph(
            icon = icon,
            tint = if (selected) accent else SoftWhite.copy(alpha = 0.58f),
            modifier = Modifier.size(22.dp)
        )
        Text(
            title,
            color = if (selected) accent else SoftWhite.copy(alpha = 0.58f),
            fontSize = 8.sp,
            maxLines = 1,
            textAlign = TextAlign.Center
        )
    }
}

@Composable
private fun CenteredTitle(title: String, subtitle: String) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            title,
            color = SoftWhite,
            fontWeight = FontWeight.ExtraBold,
            fontSize = 23.sp,
            lineHeight = 24.sp,
            textAlign = TextAlign.Center
        )
        Text(
            subtitle,
            color = SoftWhite.copy(alpha = 0.66f),
            fontSize = 11.sp,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 5.dp)
        )
    }
}

@Composable
private fun AccentTitle(first: String, second: String, secondBrush: Brush) {
    Text(
        text = buildAnnotatedString {
            withStyle(SpanStyle(color = SoftWhite)) {
                append(first)
            }
            append("\n")
            withStyle(SpanStyle(brush = secondBrush)) {
                append(second)
            }
        },
        fontWeight = FontWeight.ExtraBold,
        fontSize = 22.sp,
        lineHeight = 26.sp,
        textAlign = TextAlign.Center
    )
}

@Composable
private fun SectionLabel(title: String, trailing: String? = null) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(title, color = SoftWhite, fontWeight = FontWeight.Bold, fontSize = 11.sp)
        if (trailing != null) {
            Text(trailing, color = SoftWhite.copy(alpha = 0.62f), fontSize = 10.sp)
        }
    }
}

@Composable
private fun FramedImage(imageRes: Int, modifier: Modifier, shape: RoundedCornerShape) {
    Image(
        painter = painterResource(id = imageRes),
        contentDescription = null,
        modifier = modifier
            .clip(shape)
            .border(1.dp, HotPink.copy(alpha = 0.26f), shape),
        contentScale = ContentScale.Crop
    )
}

@Composable
private fun PageDots(page: Int) {
    Row(horizontalArrangement = Arrangement.spacedBy(7.dp)) {
        repeat(4) { index ->
            Box(
                modifier = Modifier
                    .size(if (index == page) 7.dp else 6.dp)
                    .background(if (index == page) HotPink else SoftWhite.copy(alpha = 0.22f), CircleShape)
            )
        }
    }
}

@Composable
private fun NeonButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier.fillMaxWidth()
) {
    Surface(
        modifier = modifier
            .height(50.dp)
            .clip(RoundedCornerShape(13.dp))
            .clickable(onClick = onClick),
        color = Color.Transparent
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Brush.horizontalGradient(listOf(HotPink, Color(0xFFE80E7F))))
                .padding(horizontal = 18.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(text, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
            Text("›", modifier = Modifier.align(Alignment.CenterEnd), color = Color.White, fontSize = 26.sp)
        }
    }
}

@Composable
private fun OutlineNeonButton(text: String, onClick: () -> Unit) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .height(48.dp)
            .clickable(onClick = onClick),
        color = Color.Transparent,
        shape = RoundedCornerShape(13.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, SoftWhite.copy(alpha = 0.32f))
    ) {
        Box(contentAlignment = Alignment.Center) {
            Text(text, color = SoftWhite, fontWeight = FontWeight.Bold, fontSize = 13.sp)
        }
    }
}

@Composable
private fun TinyChip(text: String, icon: NeonIconType, accent: Color) {
    Surface(
        color = accent.copy(alpha = 0.16f),
        shape = RoundedCornerShape(999.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, accent.copy(alpha = 0.38f))
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            NeonGlyph(icon = icon, tint = accent, modifier = Modifier.size(13.dp))
            Text(text, color = SoftWhite, fontSize = 10.sp, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun CircleIcon(icon: NeonIconType, accent: Color) {
    Surface(
        modifier = Modifier.size(34.dp),
        color = Panel,
        shape = CircleShape,
        border = androidx.compose.foundation.BorderStroke(1.dp, StrokeLine)
    ) {
        Box(contentAlignment = Alignment.Center) {
            NeonGlyph(icon = icon, tint = accent, modifier = Modifier.size(18.dp))
        }
    }
}

@Composable
private fun NeonIconBox(icon: NeonIconType, accent: Color, size: Dp) {
    Box(
        modifier = Modifier
            .size(size)
            .background(
                Brush.radialGradient(listOf(accent.copy(alpha = 0.32f), accent.copy(alpha = 0.08f))),
                RoundedCornerShape(13.dp)
            )
            .border(1.dp, accent.copy(alpha = 0.78f), RoundedCornerShape(13.dp)),
        contentAlignment = Alignment.Center
    ) {
        NeonGlyph(icon = icon, tint = accent, modifier = Modifier.size(size * 0.64f))
    }
}

@Composable
private fun NeonGlyph(icon: NeonIconType, tint: Color, modifier: Modifier = Modifier) {
    Canvas(modifier = modifier) {
        drawNeonIcon(icon = icon, tint = tint)
    }
}

@Composable
private fun RingProgress(percent: Float, accent: Color, modifier: Modifier) {
    Box(modifier = modifier, contentAlignment = Alignment.Center) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val stroke = size.minDimension * 0.12f
            drawArc(
                color = SoftWhite.copy(alpha = 0.12f),
                startAngle = -90f,
                sweepAngle = 360f,
                useCenter = false,
                style = Stroke(stroke, cap = StrokeCap.Round)
            )
            drawArc(
                color = accent,
                startAngle = -90f,
                sweepAngle = percent.coerceIn(0f, 1f) * 360f,
                useCenter = false,
                style = Stroke(stroke, cap = StrokeCap.Round)
            )
        }
        Text("${(percent * 100).toInt()}%", color = SoftWhite, fontSize = 11.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun ProgressLine(percent: Float, accent: Color) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(7.dp)
            .clip(RoundedCornerShape(999.dp))
            .background(SoftWhite.copy(alpha = 0.1f))
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth(percent.coerceIn(0f, 1f))
                .fillMaxHeight()
                .background(Brush.horizontalGradient(listOf(HotPink, Cyan, accent)), RoundedCornerShape(999.dp))
        )
    }
}

private fun DrawScope.drawNeonIcon(icon: NeonIconType, tint: Color) {
    val w = size.width
    val h = size.height
    fun x(value: Float) = w * value
    fun y(value: Float) = h * value
    val stroke = (w.coerceAtMost(h) * 0.085f).coerceAtLeast(2f)
    val heavy = stroke * 1.35f
    val glow = tint.copy(alpha = 0.25f)

    fun line(a: Offset, b: Offset, width: Float = stroke) {
        drawLine(glow, a, b, strokeWidth = width * 2.5f, cap = StrokeCap.Round)
        drawLine(tint, a, b, strokeWidth = width, cap = StrokeCap.Round)
    }

    fun circle(center: Offset, radius: Float, style: Stroke? = null) {
        drawCircle(glow, radius * 1.25f, center, style = style ?: Stroke(stroke * 2.2f))
        drawCircle(tint, radius, center, style = style ?: Stroke(stroke))
    }

    when (icon) {
        NeonIconType.Sport -> {
            circle(Offset(x(0.58f), y(0.18f)), w * 0.08f)
            line(Offset(x(0.52f), y(0.29f)), Offset(x(0.43f), y(0.51f)), heavy)
            line(Offset(x(0.48f), y(0.36f)), Offset(x(0.25f), y(0.34f)))
            line(Offset(x(0.45f), y(0.50f)), Offset(x(0.63f), y(0.58f)), heavy)
            line(Offset(x(0.61f), y(0.58f)), Offset(x(0.80f), y(0.77f)), heavy)
            line(Offset(x(0.41f), y(0.52f)), Offset(x(0.31f), y(0.80f)), heavy)
        }

        NeonIconType.Education -> {
            val cap = Path().apply {
                moveTo(x(0.12f), y(0.38f))
                lineTo(x(0.50f), y(0.18f))
                lineTo(x(0.88f), y(0.38f))
                lineTo(x(0.50f), y(0.58f))
                close()
            }
            drawPath(cap, glow, style = Stroke(stroke * 2.1f, join = StrokeJoin.Round))
            drawPath(cap, tint, style = Stroke(stroke, join = StrokeJoin.Round))
            line(Offset(x(0.28f), y(0.50f)), Offset(x(0.28f), y(0.68f)))
            line(Offset(x(0.28f), y(0.68f)), Offset(x(0.72f), y(0.68f)))
            line(Offset(x(0.72f), y(0.50f)), Offset(x(0.72f), y(0.68f)))
            line(Offset(x(0.79f), y(0.42f)), Offset(x(0.79f), y(0.66f)))
            drawCircle(tint, w * 0.035f, Offset(x(0.79f), y(0.70f)))
        }

        NeonIconType.Fun -> {
            drawRoundRect(
                color = glow,
                topLeft = Offset(x(0.12f), y(0.34f)),
                size = Size(x(0.76f), y(0.34f)),
                cornerRadius = CornerRadius(w * 0.16f, w * 0.16f),
                style = Stroke(stroke * 2.2f)
            )
            drawRoundRect(
                color = tint,
                topLeft = Offset(x(0.12f), y(0.34f)),
                size = Size(x(0.76f), y(0.34f)),
                cornerRadius = CornerRadius(w * 0.16f, w * 0.16f),
                style = Stroke(stroke)
            )
            line(Offset(x(0.30f), y(0.46f)), Offset(x(0.30f), y(0.58f)))
            line(Offset(x(0.24f), y(0.52f)), Offset(x(0.36f), y(0.52f)))
            drawCircle(tint, w * 0.035f, Offset(x(0.66f), y(0.48f)))
            drawCircle(tint, w * 0.035f, Offset(x(0.76f), y(0.57f)))
        }

        NeonIconType.Star -> {
            val path = Path().apply {
                moveTo(x(0.50f), y(0.12f))
                lineTo(x(0.60f), y(0.39f))
                lineTo(x(0.88f), y(0.39f))
                lineTo(x(0.65f), y(0.56f))
                lineTo(x(0.74f), y(0.85f))
                lineTo(x(0.50f), y(0.67f))
                lineTo(x(0.26f), y(0.85f))
                lineTo(x(0.35f), y(0.56f))
                lineTo(x(0.12f), y(0.39f))
                lineTo(x(0.40f), y(0.39f))
                close()
            }
            drawPath(path, glow, style = Stroke(stroke * 2.2f, join = StrokeJoin.Round))
            drawPath(path, tint, style = Stroke(stroke, join = StrokeJoin.Round))
        }

        NeonIconType.Camera -> {
            drawRoundRect(
                tint,
                topLeft = Offset(x(0.14f), y(0.30f)),
                size = Size(x(0.72f), y(0.46f)),
                cornerRadius = CornerRadius(w * 0.08f, w * 0.08f),
                style = Stroke(stroke)
            )
            line(Offset(x(0.33f), y(0.30f)), Offset(x(0.39f), y(0.20f)))
            line(Offset(x(0.39f), y(0.20f)), Offset(x(0.62f), y(0.20f)))
            line(Offset(x(0.62f), y(0.20f)), Offset(x(0.68f), y(0.30f)))
            circle(Offset(x(0.50f), y(0.53f)), w * 0.13f)
        }

        NeonIconType.Shield,
        NeonIconType.Lock -> {
            val shield = Path().apply {
                moveTo(x(0.50f), y(0.12f))
                lineTo(x(0.82f), y(0.25f))
                lineTo(x(0.78f), y(0.62f))
                quadraticBezierTo(x(0.67f), y(0.80f), x(0.50f), y(0.90f))
                quadraticBezierTo(x(0.33f), y(0.80f), x(0.22f), y(0.62f))
                lineTo(x(0.18f), y(0.25f))
                close()
            }
            drawPath(shield, glow, style = Stroke(stroke * 2.1f, join = StrokeJoin.Round))
            drawPath(shield, tint, style = Stroke(stroke, join = StrokeJoin.Round))
            if (icon == NeonIconType.Lock) {
                drawRoundRect(
                    tint,
                    topLeft = Offset(x(0.38f), y(0.48f)),
                    size = Size(x(0.24f), y(0.20f)),
                    cornerRadius = CornerRadius(w * 0.04f, w * 0.04f),
                    style = Stroke(stroke)
                )
                drawArc(
                    tint,
                    startAngle = 190f,
                    sweepAngle = 160f,
                    useCenter = false,
                    topLeft = Offset(x(0.39f), y(0.34f)),
                    size = Size(x(0.22f), y(0.26f)),
                    style = Stroke(stroke, cap = StrokeCap.Round)
                )
            }
        }

        NeonIconType.Phone -> {
            drawRoundRect(
                tint,
                topLeft = Offset(x(0.30f), y(0.10f)),
                size = Size(x(0.40f), y(0.80f)),
                cornerRadius = CornerRadius(w * 0.08f, w * 0.08f),
                style = Stroke(stroke)
            )
            line(Offset(x(0.43f), y(0.78f)), Offset(x(0.57f), y(0.78f)))
        }

        NeonIconType.Body -> {
            circle(Offset(x(0.50f), y(0.18f)), w * 0.07f)
            line(Offset(x(0.50f), y(0.28f)), Offset(x(0.50f), y(0.58f)))
            line(Offset(x(0.25f), y(0.38f)), Offset(x(0.75f), y(0.38f)))
            line(Offset(x(0.50f), y(0.58f)), Offset(x(0.30f), y(0.86f)))
            line(Offset(x(0.50f), y(0.58f)), Offset(x(0.70f), y(0.86f)))
        }

        NeonIconType.Target -> {
            circle(Offset(x(0.50f), y(0.50f)), w * 0.34f)
            circle(Offset(x(0.50f), y(0.50f)), w * 0.18f)
            drawCircle(tint, w * 0.045f, Offset(x(0.50f), y(0.50f)))
            line(Offset(x(0.50f), y(0.08f)), Offset(x(0.50f), y(0.24f)))
            line(Offset(x(0.50f), y(0.76f)), Offset(x(0.50f), y(0.92f)))
            line(Offset(x(0.08f), y(0.50f)), Offset(x(0.24f), y(0.50f)))
            line(Offset(x(0.76f), y(0.50f)), Offset(x(0.92f), y(0.50f)))
        }

        NeonIconType.Home -> {
            val home = Path().apply {
                moveTo(x(0.15f), y(0.48f))
                lineTo(x(0.50f), y(0.18f))
                lineTo(x(0.85f), y(0.48f))
                moveTo(x(0.25f), y(0.45f))
                lineTo(x(0.25f), y(0.82f))
                lineTo(x(0.75f), y(0.82f))
                lineTo(x(0.75f), y(0.45f))
            }
            drawPath(home, glow, style = Stroke(stroke * 2.0f, cap = StrokeCap.Round, join = StrokeJoin.Round))
            drawPath(home, tint, style = Stroke(stroke, cap = StrokeCap.Round, join = StrokeJoin.Round))
        }

        NeonIconType.Compass -> {
            circle(Offset(x(0.50f), y(0.50f)), w * 0.34f)
            val needle = Path().apply {
                moveTo(x(0.60f), y(0.20f))
                lineTo(x(0.48f), y(0.55f))
                lineTo(x(0.28f), y(0.72f))
                lineTo(x(0.42f), y(0.38f))
                close()
            }
            drawPath(needle, tint)
        }

        NeonIconType.Trophy -> {
            drawRoundRect(tint, Offset(x(0.32f), y(0.18f)), Size(x(0.36f), y(0.34f)), CornerRadius(w * 0.04f, w * 0.04f), style = Stroke(stroke))
            line(Offset(x(0.38f), y(0.55f)), Offset(x(0.62f), y(0.55f)))
            line(Offset(x(0.50f), y(0.52f)), Offset(x(0.50f), y(0.75f)))
            line(Offset(x(0.34f), y(0.84f)), Offset(x(0.66f), y(0.84f)))
            drawArc(tint, 90f, 180f, false, Offset(x(0.13f), y(0.21f)), Size(x(0.26f), y(0.26f)), style = Stroke(stroke))
            drawArc(tint, -90f, 180f, false, Offset(x(0.61f), y(0.21f)), Size(x(0.26f), y(0.26f)), style = Stroke(stroke))
        }

        NeonIconType.Bag -> {
            drawRoundRect(tint, Offset(x(0.20f), y(0.36f)), Size(x(0.60f), y(0.46f)), CornerRadius(w * 0.07f, w * 0.07f), style = Stroke(stroke))
            drawArc(tint, 200f, 140f, false, Offset(x(0.36f), y(0.14f)), Size(x(0.28f), y(0.32f)), style = Stroke(stroke, cap = StrokeCap.Round))
        }

        NeonIconType.Calendar -> {
            drawRoundRect(tint, Offset(x(0.18f), y(0.22f)), Size(x(0.64f), y(0.58f)), CornerRadius(w * 0.06f, w * 0.06f), style = Stroke(stroke))
            line(Offset(x(0.18f), y(0.38f)), Offset(x(0.82f), y(0.38f)))
            line(Offset(x(0.34f), y(0.14f)), Offset(x(0.34f), y(0.28f)))
            line(Offset(x(0.66f), y(0.14f)), Offset(x(0.66f), y(0.28f)))
            drawCircle(tint, w * 0.035f, Offset(x(0.38f), y(0.55f)))
            drawCircle(tint, w * 0.035f, Offset(x(0.62f), y(0.55f)))
        }

        NeonIconType.Friends -> {
            circle(Offset(x(0.38f), y(0.30f)), w * 0.08f)
            circle(Offset(x(0.62f), y(0.30f)), w * 0.08f)
            circle(Offset(x(0.50f), y(0.22f)), w * 0.09f)
            drawArc(tint, 205f, 130f, false, Offset(x(0.18f), y(0.48f)), Size(x(0.40f), y(0.36f)), style = Stroke(stroke, cap = StrokeCap.Round))
            drawArc(tint, 205f, 130f, false, Offset(x(0.42f), y(0.48f)), Size(x(0.40f), y(0.36f)), style = Stroke(stroke, cap = StrokeCap.Round))
            drawArc(tint, 205f, 130f, false, Offset(x(0.28f), y(0.42f)), Size(x(0.44f), y(0.42f)), style = Stroke(stroke, cap = StrokeCap.Round))
        }

        NeonIconType.Profile -> {
            circle(Offset(x(0.50f), y(0.30f)), w * 0.14f)
            drawArc(tint, 205f, 130f, false, Offset(x(0.22f), y(0.48f)), Size(x(0.56f), y(0.42f)), style = Stroke(stroke, cap = StrokeCap.Round))
        }

        NeonIconType.CenterA -> {
            val path = Path().apply {
                moveTo(x(0.18f), y(0.78f))
                lineTo(x(0.48f), y(0.18f))
                lineTo(x(0.82f), y(0.78f))
                moveTo(x(0.35f), y(0.58f))
                lineTo(x(0.64f), y(0.58f))
            }
            drawPath(path, glow, style = Stroke(stroke * 2.4f, cap = StrokeCap.Round, join = StrokeJoin.Round))
            drawPath(path, tint, style = Stroke(heavy, cap = StrokeCap.Round, join = StrokeJoin.Round))
            line(Offset(x(0.55f), y(0.44f)), Offset(x(0.90f), y(0.30f)), stroke)
        }

        NeonIconType.Tasks -> {
            line(Offset(x(0.18f), y(0.28f)), Offset(x(0.82f), y(0.28f)))
            line(Offset(x(0.18f), y(0.50f)), Offset(x(0.82f), y(0.50f)))
            line(Offset(x(0.18f), y(0.72f)), Offset(x(0.82f), y(0.72f)))
            drawCircle(tint, w * 0.035f, Offset(x(0.18f), y(0.28f)))
            drawCircle(tint, w * 0.035f, Offset(x(0.18f), y(0.50f)))
            drawCircle(tint, w * 0.035f, Offset(x(0.18f), y(0.72f)))
        }
    }
}

private fun Context.hasCameraPermission(): Boolean =
    ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED

private val DeepBlack = Color(0xFF05060E)
private val Panel = Color(0xD90B1020)
private val StrokeLine = Color(0x25FFFFFF)
private val SoftWhite = Color(0xFFF8F7FF)
private val HotPink = Color(0xFFFF1593)
private val Cyan = Color(0xFF11D7F4)
private val Purple = Color(0xFF9B4DFF)
private val Orange = Color(0xFFFF8A1C)
private val Amber = Color(0xFFFFB020)

