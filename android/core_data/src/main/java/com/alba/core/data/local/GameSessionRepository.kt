package com.alba.core.data.local

import com.alba.core.network.GameSessionSubmitRequest
import kotlinx.coroutines.flow.Flow
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

class GameSessionRepository(private val db: AlbaDatabase) {
    private val json = Json { encodeDefaults = true }

    val recentSessions: Flow<List<LocalGameSession>> = db.gameSessionDao().getRecent()
    val recentSynced: Flow<List<LocalGameSession>> = db.gameSessionDao().getRecentSynced()
    val totalGames: Flow<Int> = db.gameSessionDao().getCount()
    val totalDuration: Flow<Int> = db.gameSessionDao().getTotalDuration()
    val topScore: Flow<Int> = db.gameSessionDao().getTopScore()
    val syncedCount: Flow<Int> = db.gameSessionDao().getSyncedCount()
    val pendingQueueCount: Flow<Int> = db.syncQueueDao().pendingCount()

    suspend fun saveAndEnqueue(
        request: GameSessionSubmitRequest,
        resultPayload: JsonObject,
        motionCounts: Map<String, Int>
    ) {
        val localId = "local-${request.clientSessionId}"
        val gameTitle = resultPayload["gameTitle"]?.let {
            (it as? JsonPrimitive)?.content
        } ?: request.gameKey

        val motionJson = motionCounts.entries.joinToString(",", "{", "}") { (k, v) ->
            "\"$k\":$v"
        }
        val payloadStr = json.encodeToString(JsonObject.serializer(), resultPayload)

        val local = LocalGameSession(
            id = localId,
            clientSessionId = request.clientSessionId,
            gameKey = request.gameKey,
            gameTitle = gameTitle,
            score = request.score,
            durationSec = request.durationSec ?: 0,
            comboMax = request.combo ?: 0,
            accuracy = request.accuracy ?: 0.0,
            calories = request.calories ?: 0.0,
            motionCounts = motionJson,
            resultPayload = payloadStr,
            startedAt = System.currentTimeMillis(),
            endedAt = System.currentTimeMillis(),
            syncStatus = "LOCAL_SAVED",
            serverSessionId = null,
            createdAt = System.currentTimeMillis()
        )
        db.gameSessionDao().upsert(local)

        val queueItem = SyncQueueItem(
            id = "q-${request.clientSessionId}",
            localSessionId = localId,
            clientSessionId = request.clientSessionId,
            gameKey = request.gameKey,
            score = request.score,
            durationSec = request.durationSec ?: 0,
            calories = request.calories ?: 0.0,
            accuracy = request.accuracy ?: 0.0,
            comboMax = request.combo ?: 0,
            motionCounts = motionJson,
            resultPayload = payloadStr,
            startedAt = request.startedAt ?: "",
            endedAt = request.endedAt ?: "",
            attemptCount = 0,
            lastAttemptAt = null,
            lastErrorClass = null,
            syncStatus = "QUEUED",
            createdAt = System.currentTimeMillis()
        )
        db.syncQueueDao().enqueue(queueItem)
    }

    suspend fun markSynced(localId: String, serverSessionId: String) {
        db.gameSessionDao().updateSyncStatus(localId, "SYNCED", serverSessionId)
        db.syncQueueDao().markSynced(localId)
    }

    suspend fun markFailed(localId: String, errorClass: String) {
        db.gameSessionDao().updateSyncStatus(localId, "FAILED_PERMANENT", null)
    }

    suspend fun getNextPending(): SyncQueueItem? = db.syncQueueDao().getNextPending()

    suspend fun updateAttempt(id: String, status: String, errorClass: String?) {
        db.syncQueueDao().updateAttempt(id, status, System.currentTimeMillis(), errorClass)
    }
}
