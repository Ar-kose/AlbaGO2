package com.alba.feature.workout

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
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
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(contentPadding)
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("AlbaGo Workout Session", style = MaterialTheme.typography.headlineSmall)
        MotionSelector(
            selected = uiState.selectedMotionType,
            onSelect = onSelectMotionType
        )
        Card(modifier = Modifier.fillMaxWidth()) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text("State: ${uiState.workout.state}")
                Text("Local session: ${uiState.workout.clientSessionKey ?: "-"}")
                Text("Remote session: ${uiState.workout.remoteSessionId ?: "-"}")
                uiState.workout.countdownSecondsRemaining?.let {
                    Text("Countdown: $it")
                }
                Text("Reps: ${uiState.workout.totalReps}")
                Text("Score: ${uiState.workout.totalScore}")
                Text("Elapsed: ${uiState.workout.elapsedMs / 1000}s")
                Text("Average quality: ${"%.2f".format(uiState.workout.averageQuality)}")
                Text("Last event: ${uiState.lastMotionEvent?.type ?: "None"}")
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            when (uiState.workout.state) {
                WorkoutSessionState.READY,
                WorkoutSessionState.FINISHED -> Button(onClick = onStartWorkout) {
                    Text("Start")
                }

                WorkoutSessionState.ACTIVE -> Button(onClick = onPauseWorkout) {
                    Text("Pause")
                }

                WorkoutSessionState.PAUSED -> Button(onClick = onResumeWorkout) {
                    Text("Resume")
                }

                WorkoutSessionState.COUNTDOWN -> OutlinedButton(onClick = {}) {
                    Text("Counting...")
                }
            }
            if (uiState.workout.state != WorkoutSessionState.READY &&
                uiState.workout.state != WorkoutSessionState.COUNTDOWN
            ) {
                OutlinedButton(onClick = onFinishWorkout) {
                    Text("Finish")
                }
            }
            OutlinedButton(onClick = onNavigateBack) {
                Text("Back")
            }
        }
    }
}

@Composable
private fun MotionSelector(
    selected: MotionType,
    onSelect: (MotionType) -> Unit
) {
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        MotionType.entries.forEach { type ->
            val text = type.name.replace("_", " ")
            if (selected == type) {
                Button(onClick = { onSelect(type) }) {
                    Text(text)
                }
            } else {
                OutlinedButton(onClick = { onSelect(type) }) {
                    Text(text)
                }
            }
        }
    }
}
