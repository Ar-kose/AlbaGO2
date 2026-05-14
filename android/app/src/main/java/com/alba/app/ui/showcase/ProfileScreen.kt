package com.alba.app.ui.showcase

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.alba.core.data.MotionUiState
import com.alba.core.data.SyncStatus
import com.alba.core.data.local.GameSessionRepository

@Composable
fun ProfileScreen(
    uiState: MotionUiState,
    repository: GameSessionRepository?,
    onNavigateBack: () -> Unit,
    onNavigateHome: () -> Unit
) {
    val totalGames by (repository?.totalGames?.collectAsState(initial = 0) ?: androidx.compose.runtime.remember { mutableStateOf(0) })
    val totalDuration by (repository?.totalDuration?.collectAsState(initial = 0) ?: androidx.compose.runtime.remember { mutableStateOf(0) })
    val topScore by (repository?.topScore?.collectAsState(initial = 0) ?: androidx.compose.runtime.remember { mutableStateOf(0) })
    val syncedCount by (repository?.syncedCount?.collectAsState(initial = 0) ?: androidx.compose.runtime.remember { mutableStateOf(0) })
    val pendingCount by (repository?.pendingQueueCount?.collectAsState(initial = 0) ?: androidx.compose.runtime.remember { mutableStateOf(0) })
    val recentSessions by (repository?.recentSessions?.collectAsState(initial = emptyList()) ?: androidx.compose.runtime.remember { mutableStateOf(emptyList()) })

    val durationMin = totalDuration / 60
    val hasGames = totalGames > 0

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0B1020))
            .statusBarsPadding()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text("Profil", style = MaterialTheme.typography.headlineSmall, color = Color.White)
                Text("Cihaz profili", color = Color.White.copy(alpha = 0.60f))
            }
            OutlinedButton(onClick = onNavigateBack) {
                Text("Geri")
            }
        }

        // Avatar + name card
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF1A0E1F)),
            shape = RoundedCornerShape(24.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(80.dp)
                        .clip(CircleShape)
                        .background(
                            Brush.linearGradient(
                                listOf(Color(0xFFF20DB9), Color(0xFFFF7A45))
                            )
                        )
                        .border(2.dp, Color.White.copy(alpha = 0.2f), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Text("A", color = Color.White, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.headlineMedium)
                }

                Text(
                    "Alba Oyuncusu",
                    color = Color.White,
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )

                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = Color(0x33FFC857)
                ) {
                    Text(
                        "Hesap sistemi yakında",
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                        color = Color(0xFFFFE08A),
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
        }

        // Stats card — real Room data
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF2D1627)),
            shape = RoundedCornerShape(20.dp)
        ) {
            Column(
                modifier = Modifier.padding(18.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                Text(
                    if (hasGames) "Bu cihazda" else "Henüz oyun kaydı yok",
                    style = MaterialTheme.typography.titleMedium,
                    color = Color.White
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    ProfileStat(
                        label = "Oyun",
                        value = "$totalGames",
                        accent = Color(0xFFFF7A45)
                    )
                    ProfileStat(
                        label = "Süre",
                        value = "${durationMin}dk",
                        accent = Color(0xFF10B981)
                    )
                    ProfileStat(
                        label = "En yüksek",
                        value = "$topScore",
                        accent = Color(0xFF06B6D4)
                    )
                }
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    ProfileStat(
                        label = "Sunucuda",
                        value = "$syncedCount",
                        accent = Color(0xFF22C55E)
                    )
                    ProfileStat(
                        label = "Bekleyen",
                        value = if (pendingCount > 0) "$pendingCount" else "0",
                        accent = if (pendingCount > 0) Color(0xFFF59E0B) else Color(0xFF64748B)
                    )
                    ProfileStat(
                        label = "Senkron",
                        value = when (uiState.game.syncStatus) {
                            SyncStatus.SYNCED -> "✓"
                            SyncStatus.LOCAL_SAVED -> "Cihaz"
                            SyncStatus.SYNCING -> "..."
                            SyncStatus.FAILED -> "!"
                            else -> "-"
                        },
                        accent = Color(0xFF6366F1)
                    )
                }

                // Recent sessions
                if (hasGames) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text("Son oyunlar", color = Color.White.copy(alpha = 0.72f), style = MaterialTheme.typography.labelLarge)
                    recentSessions.take(5).forEach { session ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                session.gameTitle,
                                color = Color.White,
                                style = MaterialTheme.typography.bodyMedium
                            )
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text(
                                    "${session.score}p",
                                    color = Color(0xFFFF7A45),
                                    style = MaterialTheme.typography.bodyMedium
                                )
                                Text(
                                    when (session.syncStatus) {
                                        "SYNCED" -> "✓"
                                        "LOCAL_SAVED", "QUEUED", "RETRY_SCHEDULED" -> "⇡"
                                        "FAILED_PERMANENT" -> "✗"
                                        else -> "·"
                                    },
                                    color = when (session.syncStatus) {
                                        "SYNCED" -> Color(0xFF22C55E)
                                        "FAILED_PERMANENT" -> Color(0xFFEF4444)
                                        else -> Color(0xFF64748B)
                                    }
                                )
                            }
                        }
                    }
                } else {
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        color = Color(0x33FFFFFF)
                    ) {
                        Text(
                            "İlk oyununu oynadığında burada görünecek.",
                            modifier = Modifier.padding(12.dp),
                            color = Color.White.copy(alpha = 0.68f),
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                }
            }
        }

        // Storage info
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF2D1627)),
            shape = RoundedCornerShape(20.dp)
        ) {
            Column(
                modifier = Modifier.padding(18.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text("Veri depolama", style = MaterialTheme.typography.titleMedium, color = Color.White)
                StorageRow("Cihazda kayıtlı", "Oyun sonuçların cihazında saklanıyor.", Color(0xFF22C55E))
                StorageRow("Sunucuya aktarılıyor", "İnternet varken sonuçlar otomatik yedeklenir.", Color(0xFF06B6D4))
                StorageRow("Hesap sistemi yakında", "Profilin kalıcı hesaba bağlanacak.", Color(0xFF6366F1))
            }
        }

        Button(
            modifier = Modifier.fillMaxWidth(),
            onClick = onNavigateHome
        ) {
            Text("Ana ekrana dön")
        }
    }
}

@Composable
private fun StorageRow(title: String, subtitle: String, color: Color) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(12.dp)
                .clip(CircleShape)
                .background(color)
        )
        Column(modifier = Modifier.weight(1f)) {
            Text(title, color = Color.White, fontWeight = FontWeight.SemiBold)
            Text(subtitle, color = Color.White.copy(alpha = 0.60f))
        }
    }
}

@Composable
private fun ProfileStat(
    label: String,
    value: String,
    accent: Color
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(accent.copy(alpha = 0.18f))
                .border(1.dp, accent.copy(alpha = 0.3f), RoundedCornerShape(16.dp)),
            contentAlignment = Alignment.Center
        ) {
            Text(
                value.take(6),
                color = accent,
                fontWeight = FontWeight.Bold,
                style = MaterialTheme.typography.titleMedium
            )
        }
        Text(label, color = Color.White.copy(alpha = 0.68f), style = MaterialTheme.typography.labelSmall)
    }
}

