package com.alba.feature.games

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.alba.core.data.GameUiState
import com.alba.core.data.MotionUiState
import com.alba.core.data.SyncStatus
import com.alba.core.motion.MotionType
import com.alba.core.runtime.DodgeObstacleType
import com.alba.core.runtime.DodgeRunSceneState
import com.alba.core.runtime.FitChallengeSceneState
import com.alba.core.runtime.FruitSlashSceneState
import com.alba.core.runtime.CameraRequirement
import com.alba.core.runtime.GameDefinition
import com.alba.core.runtime.WhackAMoleSceneState
import com.alba.core.runtime.GameCategory
import com.alba.core.runtime.GameSceneState
import com.alba.core.runtime.GameSessionStatus
import com.alba.core.runtime.GameTemplate
import com.alba.core.runtime.IdleSceneState
import com.alba.core.runtime.ProgramStepDefinition
import com.alba.core.runtime.ProgramStepType
import com.alba.core.runtime.ScenePlaySceneState

private enum class GameFlowStage {
    LIST,
    DETAIL,
    SESSION
}

@Composable
fun GamesHomeScreen(
    contentPadding: PaddingValues,
    uiState: MotionUiState,
    onNavigateBack: () -> Unit,
    onNavigateHome: () -> Unit,
    onStartGame: (String) -> Unit,
    onFinishGame: () -> Unit,
    onRefreshGames: () -> Unit,
    onSelectGameDefinition: (String) -> Unit
) {
    var stage by rememberSaveable { mutableStateOf(GameFlowStage.LIST) }
    var selectedGameId by rememberSaveable { mutableStateOf<String?>(uiState.activeGameId) }

    LaunchedEffect(uiState.game.status, uiState.activeGameId) {
        if (uiState.game.status == GameSessionStatus.ACTIVE ||
            uiState.game.status == GameSessionStatus.PAUSED ||
            uiState.game.status == GameSessionStatus.FINISHED
        ) {
            stage = GameFlowStage.SESSION
            selectedGameId = uiState.activeGameId
        }
    }

    val games = uiState.availableGames.filter { it.isPlayableCatalogItem() }
    val selectedDefinition = games.firstOrNull { it.gameId == selectedGameId }
        ?: uiState.activeGameDefinition?.takeIf { it.isPlayableCatalogItem() }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(contentPadding)
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        when (stage) {
            GameFlowStage.LIST -> GameCatalogScreen(
                uiState = uiState,
                games = games,
                onOpenDetail = { gameId ->
                    selectedGameId = gameId
                    onSelectGameDefinition(gameId)
                    stage = GameFlowStage.DETAIL
                },
                onRefreshGames = onRefreshGames,
                onNavigateBack = onNavigateBack
            )

            GameFlowStage.DETAIL -> if (selectedDefinition != null) {
                GameDetailScreen(
                    definition = selectedDefinition,
                    onStart = {
                        onSelectGameDefinition(selectedDefinition.gameId)
                        onStartGame(selectedDefinition.gameId)
                        stage = GameFlowStage.SESSION
                    },
                    onBackToCatalog = { stage = GameFlowStage.LIST }
                )
            } else {
                EmptyCatalogCard(
                    onRefreshGames = onRefreshGames,
                    onNavigateBack = { stage = GameFlowStage.LIST }
                )
            }

            GameFlowStage.SESSION -> {
                val activeDefinition = uiState.activeGameDefinition ?: selectedDefinition
                if (activeDefinition != null) {
                    val nextGame = games
                        .filter { it.category == activeDefinition.category && it.gameId != activeDefinition.gameId }
                        .firstOrNull()
                    ActiveGameScreen(
                        uiState = uiState,
                        gameDefinition = activeDefinition,
                        nextGameId = nextGame?.gameId,
                        sameCategoryGames = games.filter { it.category == activeDefinition.category },
                        onFinishGame = onFinishGame,
                        onReplay = { onStartGame(activeDefinition.gameId) },
                        onBrowseGames = { stage = GameFlowStage.LIST },
                        onRefreshGames = onRefreshGames,
                        onNavigateBack = onNavigateHome,
                        onStartGame = onStartGame
                    )
                } else {
                    EmptyCatalogCard(
                        onRefreshGames = onRefreshGames,
                        onNavigateBack = { stage = GameFlowStage.LIST }
                    )
                }
            }
        }
    }
}

@Composable
private fun GameCatalogScreen(
    uiState: MotionUiState,
    games: List<GameDefinition>,
    onOpenDetail: (String) -> Unit,
    onRefreshGames: () -> Unit,
    onNavigateBack: () -> Unit
) {
    var selectedCategory by rememberSaveable { mutableStateOf<GameCategory?>(null) }
    val filteredGames = games.filter { selectedCategory == null || it.category == selectedCategory }

    HeroCard(
        title = "Oyunlar",
        eyebrow = "AlbaGo",
        description = "Kameranı aç, hareketlerinle oyna. Her oyun kısa, net ve skor odaklı.",
        accent = Color(0xFFFF7A45)
    )

    Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF2D1627))) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text("Oyun vitrini", style = MaterialTheme.typography.titleLarge, color = Color.White)
            Text(
                "Önce oyunu incele, kameranı güvenli bir yere yerleştir, sonra hareketlerinle skor üret.",
                color = Color.White.copy(alpha = 0.78f)
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = onRefreshGames) {
                    Text("Yenile")
                }
                OutlinedButton(onClick = onNavigateBack) {
                    Text("Ana ekrana dön")
                }
            }
        }
    }

    CategoryFilterRow(
        games = games,
        selectedCategory = selectedCategory,
        onSelectCategory = { selectedCategory = it }
    )

    if (filteredGames.isEmpty()) {
        EmptyCatalogCard(
            onRefreshGames = onRefreshGames,
            onNavigateBack = onNavigateBack
        )
    } else {
        filteredGames.forEach { game ->
            DemoGameCard(
                definition = game,
                selected = uiState.activeGameId == game.gameId,
                onOpenDetail = { onOpenDetail(game.gameId) }
            )
        }
    }

    CatalogStateCard(uiState = uiState, hasGames = games.isNotEmpty(), onRefreshGames = onRefreshGames)
}

@Composable
private fun GameDetailScreen(
    definition: GameDefinition,
    onStart: () -> Unit,
    onBackToCatalog: () -> Unit
) {
    val level = definition.primaryLevel()
    if (level == null) {
        InvalidGameDefinitionCard(onBackToCatalog = onBackToCatalog)
        return
    }
    HeroCard(
        title = definition.title,
        eyebrow = templateLabel(definition.template),
        description = definition.description,
        accent = templateAccent(definition.template)
    )
    Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF2D1627))) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Text("Oyuna hazırlan", style = MaterialTheme.typography.titleLarge, color = Color.White)
            DetailRow("Süre", "${level.durationSec} saniye", Color.White)
            DetailRow("Zorluk", level.difficulty, Color.White)
            DetailRow("Hedef skor", level.targetScore.toString(), Color.White)
            DetailRow("Hareketler", definition.supportedMotions.joinToString { motionLabel(it) }, Color.White)
            Text("Nasıl oynanır?", style = MaterialTheme.typography.titleMedium, color = Color.White)
            Text(howToPlay(definition.template), color = Color.White.copy(alpha = 0.68f))
            if (level.programSteps.isNotEmpty()) {
                Text("Program akisi", style = MaterialTheme.typography.titleMedium, color = Color.White)
                ProgramStepList(steps = level.programSteps)
            }
            Text("Kamera önerisi", style = MaterialTheme.typography.titleMedium)
            Text(
                "Telefonu sabit bir yere koy, tüm vücudun kadraja girsin ve başlamadan önce 1-2 saniye sabit kal.",
                color = Color(0xFF475569)
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = onStart) {
                    Text("Oyunu başlat")
                }
                OutlinedButton(onClick = onBackToCatalog) {
                    Text("Oyunlara dön")
                }
            }
        }
    }
}

@Composable
private fun ActiveGameScreen(
    uiState: MotionUiState,
    gameDefinition: GameDefinition,
    nextGameId: String?,
    sameCategoryGames: List<GameDefinition>,
    onFinishGame: () -> Unit,
    onReplay: () -> Unit,
    onBrowseGames: () -> Unit,
    onRefreshGames: () -> Unit,
    onNavigateBack: () -> Unit,
    onStartGame: (String) -> Unit
) {
    if (uiState.game.status == GameSessionStatus.FINISHED) {
        GameResultScreen(
            game = uiState.game,
            template = gameDefinition.template,
            gameTitle = gameDefinition.title,
            category = gameDefinition.category,
            nextGameId = nextGameId,
            nextGameTitle = sameCategoryGames.firstOrNull { it.gameId == nextGameId }?.title,
            onReplay = onReplay,
            onNextGame = if (nextGameId != null) {{ onStartGame(nextGameId) }} else null,
            onBackToGames = onBrowseGames,
            onHome = onNavigateBack
        )
        return
    }

    HeroCard(
        title = gameDefinition.title,
        eyebrow = templateLabel(gameDefinition.template),
        description = gameDefinition.description,
        accent = templateAccent(gameDefinition.template)
    )

    GameHudCard(
        game = uiState.game,
        gameDefinition = gameDefinition,
        motionType = uiState.selectedMotionType
    )

    Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF2D1627))) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text("Oyun", style = MaterialTheme.typography.titleMedium, color = Color.White)
            Text("Aktif hareket: ${motionLabel(uiState.selectedMotionType)}", color = Color.White.copy(alpha = 0.78f))
            Text("Desteklenen hareketler: ${gameDefinition.supportedMotions.joinToString { motionLabel(it) }}", color = Color.White.copy(alpha = 0.68f))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                if (uiState.game.status == GameSessionStatus.ACTIVE ||
                    uiState.game.status == GameSessionStatus.PAUSED
                ) {
                    Button(onClick = onFinishGame) {
                        Text("Oyunu bitir")
                    }
                } else {
                    Button(onClick = onReplay) {
                        Text("Tekrar oyna")
                    }
                }
                OutlinedButton(onClick = onNavigateBack) {
                    Text("Ana ekran")
                }
            }
        }
    }
}

@Composable
private fun DemoGameCard(
    definition: GameDefinition,
    selected: Boolean,
    onOpenDetail: () -> Unit
) {
    val level = definition.primaryLevel()
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF2D1627))
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    StatusPill(
                        label = templateLabel(definition.template),
                        color = templateAccent(definition.template)
                    )
                    StatusPill(
                        label = categoryLabel(definition.category),
                        color = categoryAccent(definition.category)
                    )
                    Text(definition.title, style = MaterialTheme.typography.titleLarge, color = Color.White)
                    Text(definition.description, color = Color.White.copy(alpha = 0.68f))
                }
                if (selected) {
                    StatusPill(label = "Hazır", color = Color(0xFF22C55E))
                }
            }

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                StatusPill(label = "${level?.durationSec ?: 0}s", color = Color(0xFF0EA5E9))
                StatusPill(label = level?.difficulty ?: "Hazırlanıyor", color = Color(0xFF6366F1))
                StatusPill(label = "Hedef ${level?.targetScore ?: 0}", color = Color(0xFFF97316))
                if (!level?.programSteps.isNullOrEmpty()) {
                    StatusPill(label = "Program", color = Color(0xFF0F766E))
                }
                definition.supportedMotions.forEach { motion ->
                    StatusPill(label = motionLabel(motion), color = Color(0xFF14B8A6))
                }
            }

            Text(
                when (definition.template) {
                    GameTemplate.FRUIT_SLASH -> "Jumping jack ile meyveleri kes, squat ile güçlü hedefi patlat."
                    GameTemplate.DODGE_RUN -> "Engeller akar; squat ile alttan geç, jumping jack ile zıpla."
                    GameTemplate.FIT_CHALLENGE -> "Görev kartlarını sırayla tamamla ve form kaliteni yüksek tut."
                    GameTemplate.SCENE_PLAY -> "Panelden gelen komutlari hareketle cevapla; Deve Cuce gibi oyunlari app guncellemeden dene."
                    else -> definition.description
                },
                color = Color(0xFF475569)
            )

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(
                    onClick = onOpenDetail,
                    enabled = level != null
                ) {
                    Text(if (level == null) "Yakında" else if (selected) "Devam et" else "Hazırlan")
                }
            }
        }
    }
}

@Composable
private fun EmptyCatalogCard(
    onRefreshGames: () -> Unit,
    onNavigateBack: () -> Unit
) {
    Card(colors = CardDefaults.cardColors(containerColor = Color(0xFFFFF7ED))) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text("Oyunlar yüklenemedi", style = MaterialTheme.typography.titleLarge)
            Text("Şu anda yayınlanmış demo oyun bulunamadı. Bağlantını kontrol edip tekrar deneyebilirsin.")
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = onRefreshGames) {
                    Text("Tekrar dene")
                }
                OutlinedButton(onClick = onNavigateBack) {
                    Text("Geri")
                }
            }
        }
    }
}

@Composable
private fun CatalogStateCard(
    uiState: MotionUiState,
    hasGames: Boolean,
    onRefreshGames: () -> Unit
) {
    val message = when {
        uiState.backendStatus.contains("yüklen", ignoreCase = true) && !hasGames ->
            "Oyunlar yükleniyor..."

        uiState.backendStatus.contains("Yerel demo", ignoreCase = true) ->
            "Bağlantı kurulamadı. Çevrimdışı oyun gösterilemiyor."

        uiState.backendStatus.contains("Önbellek", ignoreCase = true) ->
            "Son yayınlanan oyunlar cihaz önbelleğinden gösteriliyor."

        !hasGames ->
            "Oyun kataloğu yüklenemedi. Tekrar dene."

        else -> null
    } ?: return

    Card(colors = CardDefaults.cardColors(containerColor = Color(0xFFE0F2FE))) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(message, modifier = Modifier.weight(1f), color = Color(0xFF075985))
            OutlinedButton(onClick = onRefreshGames) {
                Text("Tekrar dene")
            }
        }
    }
}

@Composable
private fun InvalidGameDefinitionCard(onBackToCatalog: () -> Unit) {
    Card(colors = CardDefaults.cardColors(containerColor = Color(0xFFFFF7ED))) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text("Bu oyun hazırlanıyor", style = MaterialTheme.typography.titleLarge)
            Text(
                "Oyun tanımında seviye veya skor kuralı eksik. AlbaGo güvenli moda geçti; katalogdan başka bir oyun seçebilirsin.",
                color = Color(0xFF9A3412)
            )
            Button(onClick = onBackToCatalog) {
                Text("Oyunlara dön")
            }
        }
    }
}

@Composable
private fun CategoryFilterRow(
    games: List<GameDefinition>,
    selectedCategory: GameCategory?,
    onSelectCategory: (GameCategory?) -> Unit
) {
    val availableCategories = games
        .map { it.category }
        .distinct()
        .sortedBy { it.displayRank() }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        CategoryChip(
            label = "Tum oyunlar",
            selected = selectedCategory == null,
            color = Color(0xFF0F172A),
            onClick = { onSelectCategory(null) }
        )
        availableCategories.forEach { category ->
            CategoryChip(
                label = categoryLabel(category),
                selected = selectedCategory == category,
                color = categoryAccent(category),
                onClick = { onSelectCategory(category) }
            )
        }
    }
}

@Composable
private fun CategoryChip(
    label: String,
    selected: Boolean,
    color: Color,
    onClick: () -> Unit
) {
    val container = if (selected) color else color.copy(alpha = 0.12f)
    val content = if (selected) Color.White else color
    Surface(
        shape = RoundedCornerShape(999.dp),
        color = container,
        onClick = onClick
    ) {
        Text(
            label,
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
            color = content,
            style = MaterialTheme.typography.labelLarge,
            fontWeight = FontWeight.SemiBold
        )
    }
}

@Composable
private fun ProgramStepList(steps: List<ProgramStepDefinition>) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        steps.forEachIndexed { index, step ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xFFF8FAFC), RoundedCornerShape(18.dp))
                    .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(18.dp))
                    .padding(12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(2.dp), modifier = Modifier.weight(1f)) {
                    Text("${index + 1}. ${step.title}", fontWeight = FontWeight.SemiBold)
                    Text(programStepSubtitle(step), color = Color(0xFF64748B), style = MaterialTheme.typography.bodySmall)
                }
                StatusPill(label = programStepLabel(step.type), color = Color(0xFF0F766E))
            }
        }
    }
}

private fun programStepSubtitle(step: ProgramStepDefinition): String {
    return when (step.type) {
        ProgramStepType.MOTION_REPS -> "${step.motion?.let { motionLabel(it) } ?: "Hareket"} x${step.targetCount ?: 0}"
        ProgramStepType.HOLD_POSE -> "${step.holdSec ?: 0} sn pozisyonu koru"
        ProgramStepType.REST -> "${step.durationSec ?: 0} sn dinlen"
        ProgramStepType.PLAY_GAME -> "${step.durationSec ?: 0} sn oyun sahnesi"
        ProgramStepType.INSTRUCTION -> step.description ?: "Kisa yonlendirme"
    }
}

private fun programStepLabel(type: ProgramStepType): String {
    return when (type) {
        ProgramStepType.PLAY_GAME -> "Oyun"
        ProgramStepType.MOTION_REPS -> "Tekrar"
        ProgramStepType.HOLD_POSE -> "Tut"
        ProgramStepType.REST -> "Dinlen"
        ProgramStepType.INSTRUCTION -> "Bilgi"
    }
}

@Composable
private fun DetailRow(
    label: String,
    value: String,
    valueColor: Color = Color.Black
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(label, color = Color(0xFF64748B))
        Text(value, fontWeight = FontWeight.SemiBold, color = valueColor)
    }
}

@Composable
private fun GameHudCard(
    game: GameUiState,
    gameDefinition: GameDefinition,
    motionType: MotionType
) {
    val durationSec = gameDefinition.primaryLevel()?.durationSec ?: (game.remainingMs / 1000L).toInt().coerceAtLeast(1)
    val progress = if (durationSec <= 0) {
        0f
    } else {
        (game.elapsedMs.toFloat() / (durationSec * 1000f)).coerceIn(0f, 1f)
    }

    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF101B2D))
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("Skor", color = Color.White.copy(alpha = 0.7f))
                    Text(
                        game.score.toString(),
                        style = MaterialTheme.typography.headlineMedium,
                        color = Color.White
                    )
                }
                Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("Combo x${game.combo}", color = Color(0xFFFFC857))
                    Text("En iyi x${game.comboMax}", color = Color(0xFF90CDF4))
                    Text(gameStatusLabel(game.status), color = Color.White.copy(alpha = 0.8f))
                }
            }

            LinearProgressIndicator(
                progress = { progress },
                modifier = Modifier.fillMaxWidth().height(10.dp),
                color = templateAccent(game.template),
                trackColor = Color(0xFF24344C)
            )

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                StatusPill(label = "${game.remainingMs / 1000}s", color = Color(0xFF38BDF8))
                StatusPill(label = "Doğruluk ${percentLabel(game.accuracy)}", color = Color(0xFF34D399))
                StatusPill(label = "Aktif ${motionLabel(motionType)}", color = Color(0xFFF97316))
                game.motionCounts.forEach { (motion, count) ->
                    StatusPill(label = "${motion.shortLabel()} x$count", color = Color(0xFF64748B))
                }
            }
        }
    }
}

@Composable
private fun SceneStateCard(
    template: GameTemplate,
    sceneState: GameSceneState,
    combo: Int,
    lastEffect: String?
) {
    // P13G: Neon dark theme — white card replaced with dark neon to match app design
    Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF1A0E1F)), border = androidx.compose.foundation.BorderStroke(0.5.dp, Color(0xFFF20DB9).copy(alpha = 0.3f))) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Text("Sahne", style = MaterialTheme.typography.titleMedium, color = Color.White)
            when (sceneState) {
                is FruitSlashSceneState -> FruitSlashScene(sceneState)
                is DodgeRunSceneState -> DodgeRunScene(sceneState)
                is FitChallengeSceneState -> FitChallengeScene(sceneState)
                is ScenePlaySceneState -> ScenePlayScene(sceneState)
                is WhackAMoleSceneState -> WhackAMoleScene(sceneState)
                IdleSceneState -> Text("Oyun hazırlanıyor...", color = Color.White.copy(alpha = 0.76f))
                else -> Text("Oyun hazırlanıyor...", color = Color.White.copy(alpha = 0.76f))
            }
            Text(
                "Kombo x$combo${if (!lastEffect.isNullOrBlank()) " • $lastEffect" else ""}",
                color = Color.White.copy(alpha = 0.72f)
            )
            if (template == GameTemplate.DODGE_RUN) {
                Text(
                    "Not: Kadrajdan çıkarsan oyun otomatik duraklar.",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color.White.copy(alpha = 0.62f)
                )
            }
        }
    }
}

@Composable
private fun FruitSlashScene(sceneState: FruitSlashSceneState) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            SceneMetric("Kesilen", sceneState.slicedCount.toString(), Color(0xFF22C55E))
            SceneMetric("Kaçan", sceneState.missedCount.toString(), Color(0xFFEF4444))
            SceneMetric("Ceza", sceneState.penaltyCount.toString(), Color(0xFFF59E0B))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            repeat(3) { lane ->
                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text("Koridor ${lane + 1}", style = MaterialTheme.typography.labelMedium, color = Color.White.copy(alpha = 0.68f))
                    val targets = sceneState.targets.filter { it.lane == lane }
                    if (targets.isEmpty()) {
                        Box(
                            modifier = Modifier
                                .size(72.dp)
                                .background(Color(0xFFE2E8F0), RoundedCornerShape(20.dp))
                        )
                    } else {
                        targets.take(2).forEach { target ->
                            Box(
                                modifier = Modifier
                                    .size(72.dp)
                                    .background(
                                        if (target.penaltyObject) Color(0xFF111827) else Color(0xFFFFC857),
                                        RoundedCornerShape(20.dp)
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    if (target.penaltyObject) "!" else target.label.take(1),
                                    color = if (target.penaltyObject) Color.White else Color(0xFF1F2937),
                                    style = MaterialTheme.typography.headlineSmall
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun DodgeRunScene(sceneState: DodgeRunSceneState) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            SceneMetric("Can", sceneState.lives.toString(), Color(0xFFEF4444))
            SceneMetric("Mesafe", sceneState.distance.toString(), Color(0xFF0EA5E9))
            SceneMetric("Enerji", sceneState.energy.toString(), Color(0xFF8B5CF6))
        }
        Text("Görev: ${sceneState.prompt}", fontWeight = FontWeight.SemiBold, color = Color.White)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Bottom
        ) {
            Box(
                modifier = Modifier
                    .width(54.dp)
                    .height(92.dp)
                    .background(Color(0xFF2563EB), RoundedCornerShape(18.dp))
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.Bottom) {
                sceneState.obstacles.take(3).forEach { obstacle ->
                    val obstacleHeight = when (obstacle.type) {
                        DodgeObstacleType.DUCK -> 44.dp
                        DodgeObstacleType.JUMP -> 82.dp
                        DodgeObstacleType.BOOST -> 56.dp
                    }
                    Box(
                        modifier = Modifier
                            .width(44.dp)
                            .height(obstacleHeight)
                            .background(obstacleColor(obstacle.type), RoundedCornerShape(14.dp))
                    )
                }
                if (sceneState.obstacles.isEmpty()) {
                    Text("Yeni engel geliyor...", color = Color.White.copy(alpha = 0.62f))
                }
            }
        }
    }
}

@Composable
private fun FitChallengeScene(sceneState: FitChallengeSceneState) {
    val activeTask = sceneState.tasks.getOrNull(sceneState.activeTaskIndex)
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        SceneMetric("Kalite", "${sceneState.qualityScore}%", Color(0xFF10B981))
        activeTask?.let { task ->
            Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF10221B))) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text("Aktif görev", style = MaterialTheme.typography.titleMedium, color = Color.White)
                    Text("${motionLabel(task.motion)} • ${task.currentCount}/${task.targetCount}", color = Color.White.copy(alpha = 0.78f))
                    LinearProgressIndicator(
                        progress = { task.currentCount.toFloat() / task.targetCount.toFloat().coerceAtLeast(1f) },
                        modifier = Modifier.fillMaxWidth().height(10.dp),
                        color = Color(0xFF22C55E),
                        trackColor = Color(0xFF1E3A2F)
                    )
                }
            }
        }
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            sceneState.tasks.forEachIndexed { index, task ->
                val isActive = index == sceneState.activeTaskIndex
                val borderColor = if (isActive) Color(0xFFFB923C) else Color(0xFFE2E8F0)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.dp, borderColor, RoundedCornerShape(18.dp))
                        .padding(14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(
                            motionLabel(task.motion),
                            color = Color.White,
                            fontWeight = if (isActive) FontWeight.Bold else FontWeight.Medium
                        )
                        Text("${task.currentCount}/${task.targetCount} tekrar", color = Color.White.copy(alpha = 0.68f))
                    }
                    StatusPill(
                        label = if (task.currentCount >= task.targetCount) "Tamam" else "+${task.pointsPerRep}",
                        color = if (task.currentCount >= task.targetCount) Color(0xFF22C55E) else Color(0xFF3B82F6)
                    )
                }
            }
        }
    }
}

@Composable
private fun ScenePlayScene(sceneState: ScenePlaySceneState) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            SceneMetric("Can", sceneState.lives.toString(), Color(0xFFEF4444))
            SceneMetric("Doğru", sceneState.clearedCount.toString(), Color(0xFF22C55E))
            SceneMetric("Kaçan", sceneState.missedCount.toString(), Color(0xFFF97316))
        }
        Text("Komut: ${sceneState.prompt}", fontWeight = FontWeight.SemiBold, color = Color.White)
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            if (sceneState.objects.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(96.dp)
                        .background(Color(0xFFE2E8F0), RoundedCornerShape(22.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Text("Yeni komut geliyor...", color = Color(0xFF64748B))
                }
            } else {
                sceneState.objects.take(3).forEach { sceneObject ->
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .height(112.dp)
                            .background(Color(0xFFFFE6A7), RoundedCornerShape(24.dp))
                            .border(1.dp, Color(0xFFFFB703), RoundedCornerShape(24.dp))
                            .padding(12.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(sceneObject.label, fontWeight = FontWeight.Bold)
                            Text(motionLabel(sceneObject.requiredMotion), color = Color(0xFF475569))
                            Text("+${sceneObject.points}", color = Color(0xFF16A34A))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun WhackAMoleScene(sceneState: WhackAMoleSceneState) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            SceneMetric("Vurulan", sceneState.hitCount.toString(), Color(0xFF20E99A))
            SceneMetric("Kaçan", sceneState.missCount.toString(), Color(0xFFEF4444))
            SceneMetric("Can", sceneState.lives.toString(), Color(0xFFFF1593))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            StatusPill(label = "Aktif hedef: ${sceneState.activeTargetIds.size}", color = Color(0xFF11D7F4))
            StatusPill(label = "Spawn: ${sceneState.spawnIntervalMs}ms", color = Color(0xFF9B4DFF))
        }
        if (sceneState.activeTargetIds.isEmpty()) {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = Color(0xFF101522),
                shape = RoundedCornerShape(14.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF9B4DFF).copy(alpha = 0.3f))
            ) {
                Text(
                    "Hedef bekleniyor...",
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    color = Color.White.copy(alpha = 0.55f),
                    textAlign = TextAlign.Center
                )
            }
        }
    }
}

@Composable
private fun GameResultScreen(
    game: GameUiState,
    template: GameTemplate,
    gameTitle: String,
    category: GameCategory,
    nextGameId: String?,
    nextGameTitle: String?,
    onReplay: () -> Unit,
    onNextGame: (() -> Unit)?,
    onBackToGames: () -> Unit,
    onHome: () -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Card(
            colors = CardDefaults.cardColors(containerColor = Color(0xFF07111F)),
            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFFF1593).copy(alpha = 0.55f))
        ) {
            Column(
                modifier = Modifier.padding(18.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                StatusPill(label = "Oyun tamamlandı", color = Color(0xFFFF1593))
                Text(gameTitle, style = MaterialTheme.typography.headlineSmall, color = Color.White, fontWeight = FontWeight.Bold)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(templateLabel(template), color = Color.White.copy(alpha = 0.72f))
                    Text("·", color = Color.White.copy(alpha = 0.4f))
                    Text(when(category) { GameCategory.SPORT -> "Spor"; GameCategory.EDUCATION -> "Egitim"; GameCategory.FUN -> "Eglence" }, color = Color.White.copy(alpha = 0.72f))
                }

                ResultScoreBlock(score = game.score)

                Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                    ResultMetricTile("Süre", formattedDuration(game.elapsedMs), Color(0xFF38BDF8), Modifier.weight(1f))
                    ResultMetricTile("Kombo", "x${game.comboMax}", Color(0xFF53F2B5), Modifier.weight(1f))
                }
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                    ResultMetricTile("Doğruluk", percentLabel(game.accuracy), Color(0xFF22C55E), Modifier.weight(1f))
                    ResultMetricTile("Sonuç", gameStatusLabel(game.status), Color(0xFFFFB020), Modifier.weight(1f))
                }

                SyncStatusPanel(game.syncStatus)

                if (game.motionCounts.isNotEmpty()) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Hareket özeti", color = Color.White, fontWeight = FontWeight.SemiBold)
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            game.motionCounts.forEach { (motion, count) ->
                                StatusPill(label = "${motionLabel(motion)} x$count", color = Color(0xFF8B5CF6))
                            }
                        }
                    }
                } else {
                    Text("Bu turda hareket kaydı oluşmadı.", color = Color.White.copy(alpha = 0.62f))
                }
            }
        }

        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(
                modifier = Modifier.fillMaxWidth(),
                onClick = onReplay,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFF1593))
            ) {
                Text("Tekrar oyna")
            }
            if (onNextGame != null && nextGameTitle != null) {
                Button(
                    modifier = Modifier.fillMaxWidth(),
                    onClick = onNextGame,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF7C3AED))
                ) {
                    Text("Sonraki: $nextGameTitle")
                }
            }
            OutlinedButton(modifier = Modifier.fillMaxWidth(), onClick = onBackToGames) {
                Text("Kataloğa dön")
            }
            OutlinedButton(modifier = Modifier.fillMaxWidth(), onClick = onHome) {
                Text("Ana sayfa")
            }
        }
    }
}

@Composable
private fun ResultScoreBlock(score: Int) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        color = Color(0xFFFFB020).copy(alpha = 0.14f),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFFFB020).copy(alpha = 0.34f))
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text("Toplam skor", color = Color.White.copy(alpha = 0.68f), style = MaterialTheme.typography.labelLarge)
            Text(score.toString(), color = Color(0xFFFFB020), style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun ResultMetricTile(
    label: String,
    value: String,
    accent: Color,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        color = Color.White.copy(alpha = 0.08f),
        border = androidx.compose.foundation.BorderStroke(1.dp, accent.copy(alpha = 0.28f))
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text(label, color = Color.White.copy(alpha = 0.64f), style = MaterialTheme.typography.labelMedium)
            Text(value, color = accent, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
        }
    }
}

@Composable
private fun SyncStatusPanel(syncStatus: SyncStatus) {
    val (message, color) = when (syncStatus) {
        SyncStatus.IDLE -> "Sonuç bu cihazda hazır." to Color(0xFF94A3B8)
        SyncStatus.LOCAL_SAVED -> "Cihaza kaydedildi. Bağlantı gelince sunucuya gönderilecek." to Color(0xFF22C55E)
        SyncStatus.SYNCING -> "Sunucuya kaydediliyor..." to Color(0xFF38BDF8)
        SyncStatus.SYNCED -> "Sunucuya kaydedildi." to Color(0xFF22C55E)
        SyncStatus.FAILED -> "Sunucu kaydı başarısız. Sonuç cihazda korunuyor." to Color(0xFFF97316)
    }
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        color = color.copy(alpha = 0.12f),
        border = androidx.compose.foundation.BorderStroke(1.dp, color.copy(alpha = 0.28f))
    ) {
        Text(
            message,
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
            color = Color.White.copy(alpha = 0.84f),
            style = MaterialTheme.typography.bodySmall
        )
    }
}

@Composable
private fun HeroCard(
    title: String,
    eyebrow: String,
    description: String,
    accent: Color
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFFF7F1E8))
    ) {
        Column(
            modifier = Modifier.padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            StatusPill(label = eyebrow, color = accent)
            Text(title, style = MaterialTheme.typography.headlineSmall)
            Text(description, color = Color(0xFF475569))
        }
    }
}

@Composable
private fun SceneMetric(
    title: String,
    value: String,
    color: Color
) {
    Surface(
        shape = RoundedCornerShape(18.dp),
        color = color.copy(alpha = 0.14f)
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
            verticalArrangement = Arrangement.spacedBy(2.dp)
        ) {
            Text(title, color = color, style = MaterialTheme.typography.labelMedium)
            Text(value, color = Color.White, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun StatusPill(
    label: String,
    color: Color
) {
    Surface(
        shape = RoundedCornerShape(999.dp),
        color = color.copy(alpha = 0.14f)
    ) {
        Text(
            label,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
            color = color,
            style = MaterialTheme.typography.labelMedium
        )
    }
}

private fun templateLabel(template: GameTemplate): String {
    return when (template) {
        GameTemplate.FRUIT_SLASH -> "Meyve Kesme"
        GameTemplate.DODGE_RUN -> "Engelden Kaçış"
        GameTemplate.FIT_CHALLENGE -> "Spor Mücadelesi"
        GameTemplate.SCENE_PLAY -> "Sahne Oyunu"
        GameTemplate.TARGET_HIT -> "Hedef Vuruşu"
        GameTemplate.ENDLESS_RUNNER -> "Endless Runner"
        GameTemplate.WHACK_A_MOLE -> "Whack-a-Mole"
        GameTemplate.POSE_CONTACT_TARGETS -> "Pose Contact"
        GameTemplate.QUIZ -> "Quiz"
        GameTemplate.MEMORY_MATCH -> "Hafıza"
        GameTemplate.FLASHCARD -> "Flash Card"
        GameTemplate.POSE_HOLD -> "Pose Hold"
        GameTemplate.RHYTHM_MOTION -> "Ritim"
        else -> template.name.lowercase().replaceFirstChar { it.uppercase() }
    }
}

private fun templateAccent(template: GameTemplate): Color {
    return when (template) {
        GameTemplate.FRUIT_SLASH -> Color(0xFFFF7A45)
        GameTemplate.DODGE_RUN -> Color(0xFF2563EB)
        GameTemplate.FIT_CHALLENGE -> Color(0xFF10B981)
        GameTemplate.SCENE_PLAY -> Color(0xFFF59E0B)
        GameTemplate.TARGET_HIT -> Color(0xFF9333EA)
        GameTemplate.ENDLESS_RUNNER -> Color(0xFF0F766E)
        GameTemplate.WHACK_A_MOLE,
        GameTemplate.POSE_CONTACT_TARGETS -> Color(0xFFFF1593)
        else -> Color(0xFF6366F1)
    }
}

private fun categoryLabel(category: GameCategory): String {
    return when (category) {
        GameCategory.SPORT -> "Spor"
        GameCategory.FUN -> "Eğlence"
        GameCategory.EDUCATION -> "Eğitim"
    }
}

private fun categoryAccent(category: GameCategory): Color {
    return when (category) {
        GameCategory.SPORT -> Color(0xFF10B981)
        GameCategory.FUN -> Color(0xFFFF7A45)
        GameCategory.EDUCATION -> Color(0xFF6366F1)
    }
}

private fun howToPlay(template: GameTemplate): String {
    return when (template) {
        GameTemplate.FRUIT_SLASH -> "Jumping jack meyveleri keser, squat bonus hedefleri patlatır. Hatalı form kombo serisini sıfırlar."
        GameTemplate.DODGE_RUN -> "Squat ile alttan geç, jumping jack ile zıpla, jump rope ile enerji topla. Kadrajdan çıkarsan oyun duraklar."
        GameTemplate.FIT_CHALLENGE -> "Aktif görev kartındaki hareketi tamamla. Görev bitince sıradaki hedef otomatik açılır."
        GameTemplate.TARGET_HIT -> "Doğru hareket hedefi vurur."
        GameTemplate.SCENE_PLAY -> "Panelden gelen komutu oku; istenen hareketi yaparak obje/komutu temizle."
        GameTemplate.ENDLESS_RUNNER -> "Ritmini koruyarak ilerle."
        GameTemplate.WHACK_A_MOLE,
        GameTemplate.POSE_CONTACT_TARGETS -> "Çıkan hedeflere elinle dokun. Bileklerini hedef noktasına getir, skor yap."
        else -> "Hareketlerini kullanarak hedefleri tamamla."
    }
}

private fun gameStatusLabel(status: GameSessionStatus): String {
    return when (status) {
        GameSessionStatus.READY -> "Hazır"
        GameSessionStatus.WAITING_FOR_BODY -> "Kadraj bekleniyor"
        GameSessionStatus.ACTIVE -> "Devam ediyor"
        GameSessionStatus.PAUSED -> "Duraklatıldı"
        GameSessionStatus.FINISHED -> "Tamamlandı"
    }
}

private fun percentLabel(value: Float): String = "${(value.coerceIn(0f, 1f) * 100).toInt()}%"

private fun formattedDuration(elapsedMs: Long): String {
    val totalSeconds = (elapsedMs / 1000L).coerceAtLeast(0L)
    val minutes = totalSeconds / 60L
    val seconds = totalSeconds % 60L
    return if (minutes > 0L) "${minutes}dk ${seconds}sn" else "${seconds}sn"
}

private fun obstacleColor(type: DodgeObstacleType): Color {
    return when (type) {
        DodgeObstacleType.DUCK -> Color(0xFFF97316)
        DodgeObstacleType.JUMP -> Color(0xFFEF4444)
        DodgeObstacleType.BOOST -> Color(0xFF8B5CF6)
    }
}

private fun motionLabel(motionType: MotionType): String {
    return when (motionType) {
        MotionType.SQUAT -> "Squat"
        MotionType.JUMPING_JACK -> "Jumping Jack"
        MotionType.JUMP_ROPE -> "Jump Rope"
    }
}

private fun MotionType.shortLabel(): String {
    return when (this) {
        MotionType.SQUAT -> "SQT"
        MotionType.JUMPING_JACK -> "JJ"
        MotionType.JUMP_ROPE -> "JR"
    }
}

private fun GameDefinition.primaryLevel() = levels.firstOrNull()

private fun GameDefinition.isPlayableCatalogItem(): Boolean {
    return supportedMotions.isNotEmpty() &&
        levels.any { it.durationSec > 0 && it.motionRules.isNotEmpty() }
}

@Composable
fun CameraReadinessCard(cameraRequirement: CameraRequirement) {
    val (title, guidance) = when (cameraRequirement) {
        CameraRequirement.FULL_BODY -> "Tam Vücut" to "Tüm vücudunun kamerada göründüğünden emin ol. Bir adım geri at, ayaklarını ve dizlerini kadrajda tut."
        CameraRequirement.UPPER_BODY -> "Üst Vücut" to "Gövden ve kolların kamerada görünmeli. Ellerinin kadraj dışında kalmadığından emin ol."
        CameraRequirement.HAND_TARGET -> "El Hedefi" to "Ellerin ve bileklerin kamerada net görünmeli. Hedef temasını algılamak için yeterli ışık olduğundan emin ol."
    }

    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFFEFF6FF)),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    "Kamera: $title",
                    fontWeight = FontWeight.SemiBold,
                    color = Color(0xFF1E40AF)
                )
            }
            Text(
                guidance,
                color = Color(0xFF1E3A5F),
                style = MaterialTheme.typography.bodyMedium
            )
        }
    }
}
