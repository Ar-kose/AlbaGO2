package com.alba.core.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "local_game_sessions")
data class LocalGameSession(
    @PrimaryKey val id: String,
    val clientSessionId: String,
    val gameKey: String,
    val gameTitle: String,
    val score: Int,
    val durationSec: Int,
    val comboMax: Int,
    val accuracy: Double,
    val calories: Double,
    val motionCounts: String,
    val resultPayload: String,
    val startedAt: Long,
    val endedAt: Long,
    val syncStatus: String,
    val serverSessionId: String?,
    val createdAt: Long
)
