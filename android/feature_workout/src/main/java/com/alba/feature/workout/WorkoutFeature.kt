package com.alba.feature.workout

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.alba.core.data.MotionUiState
import com.alba.core.data.WorkoutSessionState
import com.alba.core.motion.MotionType

@Composable
fun WorkoutHomeScreen(
    contentPadding: PaddingValues,
    uiState: MotionUiState,
    onNavigateBack: () -> Unit,
    onStartWorkout: () -> Unit,
    onPauseWorkout: () -> Unit,
    onResumeWorkout: () -> Unit,
    onFinishWorkout: () -> Unit,
    onSelectMotionType: (MotionType) -> Unit
) {
    val state = uiState.workout.state

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(contentPadding)
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Text("Egzersiz", style = MaterialTheme.typography.headlineSmall, color = Color.White)
        Text(
            "Tek hareket seç, tekrarlarını takip et ve oturum sonucunu kaydet.",
            color = Color.White.copy(alpha = 0.68f)
        )

        MotionSelector(
            selected = uiState.selectedMotionType,
            onSelect = onSelectMotionType
        )

        SessionOverviewCard(uiState = uiState)

        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            when (state) {
                WorkoutSessionState.READY,
                WorkoutSessionState.FINISHED -> Button(
                    modifier = Modifier.fillMaxWidth(),
                    onClick = onStartWorkout,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFF1593))
                ) {
                    Text("Egzersizi başlat")
                }

                WorkoutSessionState.ACTIVE -> Button(
                    modifier = Modifier.fillMaxWidth(),
                    onClick = onPauseWorkout,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFFB020))
                ) {
                    Text("Duraklat")
                }

                WorkoutSessionState.PAUSED -> Button(
                    modifier = Modifier.fillMaxWidth(),
                    onClick = onResumeWorkout,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF22C55E))
                ) {
                    Text("Devam et")
                }

                WorkoutSessionState.COUNTDOWN -> Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    color = Color.White.copy(alpha = 0.08f)
                ) {
                    Text(
                        "Başlıyor...",
                        modifier = Modifier.padding(vertical = 12.dp),
                        color = Color.White.copy(alpha = 0.68f),
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }

            if (state == WorkoutSessionState.ACTIVE || state == WorkoutSessionState.PAUSED) {
                OutlinedButton(modifier = Modifier.fillMaxWidth(), onClick = onFinishWorkout) {
                    Text("Oturumu bitir")
                }
            }

            OutlinedButton(modifier = Modifier.fillMaxWidth(), onClick = onNavigateBack) {
                Text("Geri dön")
            }
        }
    }
}

@Composable
private fun SessionOverviewCard(uiState: MotionUiState) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF2D1627)),
        shape = RoundedCornerShape(18.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Surface(
                shape = RoundedCornerShape(999.dp),
                color = Color.White.copy(alpha = 0.08f)
            ) {
                Text(
                    workoutStateLabel(uiState.workout.state),
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 7.dp),
                    color = Color.White,
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.SemiBold
                )
            }

            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                WorkoutMetric("Tekrar", uiState.workout.totalReps.toString(), Color(0xFF38BDF8), Modifier.weight(1f))
                WorkoutMetric("Skor", uiState.workout.totalScore.toString(), Color(0xFFFFB020), Modifier.weight(1f))
            }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                WorkoutMetric("Süre", formatElapsed(uiState.workout.elapsedMs), Color(0xFF22C55E), Modifier.weight(1f))
                WorkoutMetric("Kalite", qualityPercent(uiState.workout.averageQuality), Color(0xFF8B5CF6), Modifier.weight(1f))
            }

            uiState.workout.countdownSecondsRemaining?.let { remaining ->
                Text("Başlangıç geri sayımı: $remaining", color = Color.White.copy(alpha = 0.72f))
            }
        }
    }
}

@Composable
private fun WorkoutMetric(
    label: String,
    value: String,
    accent: Color,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(14.dp),
        color = accent.copy(alpha = 0.12f)
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
private fun MotionSelector(
    selected: MotionType,
    onSelect: (MotionType) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        MotionType.entries.forEach { type ->
            if (selected == type) {
                Button(onClick = { onSelect(type) }) {
                    Text(motionLabel(type))
                }
            } else {
                OutlinedButton(onClick = { onSelect(type) }) {
                    Text(motionLabel(type))
                }
            }
        }
    }
}

private fun workoutStateLabel(state: WorkoutSessionState): String = when (state) {
    WorkoutSessionState.READY -> "Hazır"
    WorkoutSessionState.COUNTDOWN -> "Başlıyor"
    WorkoutSessionState.ACTIVE -> "Aktif"
    WorkoutSessionState.PAUSED -> "Duraklatıldı"
    WorkoutSessionState.FINISHED -> "Tamamlandı"
}

private fun motionLabel(type: MotionType): String = when (type) {
    MotionType.SQUAT -> "Squat"
    MotionType.JUMPING_JACK -> "Jumping jack"
    MotionType.JUMP_ROPE -> "Jump rope"
}

private fun formatElapsed(elapsedMs: Long): String {
    val totalSeconds = (elapsedMs / 1000L).coerceAtLeast(0L)
    val minutes = totalSeconds / 60L
    val seconds = totalSeconds % 60L
    return if (minutes > 0L) "${minutes}dk ${seconds}sn" else "${seconds}sn"
}

private fun qualityPercent(value: Float): String = "${(value.coerceIn(0f, 1f) * 100).toInt()}%"
