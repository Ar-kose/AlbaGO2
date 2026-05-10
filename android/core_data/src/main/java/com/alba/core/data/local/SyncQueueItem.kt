package com.alba.core.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "sync_queue")
data class SyncQueueItem(
    @PrimaryKey val id: String,
    val localSessionId: String,
    val clientSessionId: String,
    val gameKey: String,
    val score: Int,
    val durationSec: Int,
    val calories: Double,
    val accuracy: Double,
    val comboMax: Int,
    val motionCounts: String,
    val resultPayload: String,
    val startedAt: String,
    val endedAt: String,
    val attemptCount: Int,
    val lastAttemptAt: Long?,
    val lastErrorClass: String?,
    val syncStatus: String,
    val createdAt: Long
)
