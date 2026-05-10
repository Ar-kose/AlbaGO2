# P17 WorkManager Offline Sync Architecture

**Date:** 2026-05-09
**Status:** Frozen
**Previous:** P16 design (docs/03-architecture/p16-workmanager-offline-sync-queue.md)

## Architecture Overview

```
Game Finished
  → MotionUiState.game.syncStatus = LOCAL_SAVED
  → GameSessionRepository.saveLocal(session)
  → SyncQueueRepository.enqueue(SyncQueueItem)
  → WorkManager.enqueueUniqueWork(sessionId)
      → GameSessionSyncWorker.doWork()
          → OkHttp POST /v1/game-sessions
          → SUCCESS: markSynced, saveServerId
          → RETRYABLE: markRetryScheduled, Result.retry()
          → PERMANENT: markFailedPermanent, Result.failure()
  → UI observes via Flow from Room
```

## Components

### 1. Room Database (`core_data`)

```
@Database(entities = [LocalGameSession::class, SyncQueueItem::class], version = 1)
abstract class AlbaDatabase : RoomDatabase() {
    abstract fun gameSessionDao(): GameSessionDao
    abstract fun syncQueueDao(): SyncQueueDao
}
```

### 2. Entities

```kotlin
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
    val motionCounts: String,  // JSON
    val resultPayload: String, // JSON
    val startedAt: Long,
    val endedAt: Long,
    val syncStatus: String,    // LOCAL_SAVED, QUEUED, SYNCING, SYNCED, RETRY_SCHEDULED, FAILED_PERMANENT
    val serverSessionId: String?,
    val createdAt: Long
)

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
    val motionCounts: String,   // JSON
    val resultPayload: String,  // JSON
    val startedAt: String,      // ISO
    val endedAt: String,        // ISO
    val attemptCount: Int,
    val lastAttemptAt: Long?,
    val lastErrorClass: String?,
    val syncStatus: String,     // QUEUED, SYNCING, RETRY_SCHEDULED, FAILED_PERMANENT
    val createdAt: Long
)
```

### 3. DAOs

```kotlin
@Dao
interface GameSessionDao {
    @Query("SELECT * FROM local_game_sessions WHERE syncStatus = 'SYNCED' ORDER BY createdAt DESC LIMIT 5")
    fun getRecentSynced(): Flow<List<LocalGameSession>>

    @Query("SELECT * FROM local_game_sessions ORDER BY createdAt DESC")
    fun getAll(): Flow<List<LocalGameSession>>

    @Query("SELECT COUNT(*) FROM local_game_sessions")
    fun getCount(): Flow<Int>

    @Query("SELECT SUM(durationSec) FROM local_game_sessions")
    fun getTotalDuration(): Flow<Int?>

    @Query("SELECT MAX(score) FROM local_game_sessions")
    fun getTopScore(): Flow<Int?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(session: LocalGameSession)

    @Query("UPDATE local_game_sessions SET syncStatus = :status, serverSessionId = :serverId WHERE id = :id")
    suspend fun updateSyncStatus(id: String, status: String, serverId: String?)
}

@Dao
interface SyncQueueDao {
    @Query("SELECT * FROM sync_queue WHERE syncStatus IN ('QUEUED','RETRY_SCHEDULED') ORDER BY createdAt ASC LIMIT 1")
    suspend fun getNextPending(): SyncQueueItem?

    @Query("SELECT COUNT(*) FROM sync_queue WHERE syncStatus IN ('QUEUED','SYNCING','RETRY_SCHEDULED')")
    fun pendingCount(): Flow<Int>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun enqueue(item: SyncQueueItem)

    @Query("UPDATE sync_queue SET syncStatus = :status, attemptCount = attemptCount + 1, lastAttemptAt = :now, lastErrorClass = :errorClass WHERE id = :id")
    suspend fun updateAttempt(id: String, status: String, now: Long, errorClass: String?)

    @Query("UPDATE sync_queue SET syncStatus = 'SYNCED' WHERE localSessionId = :localId")
    suspend fun markSynced(localId: String)

    @Query("DELETE FROM sync_queue WHERE localSessionId = :localId")
    suspend fun dequeue(localId: String)
}
```

### 4. Repository

```kotlin
class GameSessionRepository(private val db: AlbaDatabase) {
    suspend fun saveAndEnqueue(
        request: GameSessionSubmitRequest,
        resultPayload: JsonObject,
        motionCounts: Map<MotionType, Int>
    ) {
        val localId = "local-${request.clientSessionId}"
        val local = LocalGameSession(
            id = localId,
            clientSessionId = request.clientSessionId,
            gameKey = request.gameKey,
            gameTitle = resultPayload["gameTitle"]?.jsonPrimitive?.content ?: request.gameKey,
            score = request.score,
            durationSec = request.durationSec ?: 0,
            comboMax = request.combo ?: 0,
            accuracy = request.accuracy ?: 0.0,
            calories = request.calories ?: 0.0,
            motionCounts = Json.encodeToString(motionCounts),
            resultPayload = Json.encodeToString(resultPayload),
            startedAt = request.startedAt?.let { Instant.parse(it).toEpochMilli() } ?: 0L,
            endedAt = request.endedAt?.let { Instant.parse(it).toEpochMilli() } ?: 0L,
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
            motionCounts = Json.encodeToString(motionCounts),
            resultPayload = Json.encodeToString(resultPayload),
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
}
```

### 5. Worker

```kotlin
@HiltWorker
class GameSessionSyncWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val db: AlbaDatabase,
    private val okHttp: OkHttpClient
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val item = db.syncQueueDao().getNextPending() ?: return Result.success()
        
        db.syncQueueDao().updateAttempt(item.id, "SYNCING", System.currentTimeMillis(), null)
        
        return try {
            val request = GameSessionSubmitRequest(
                clientSessionId = item.clientSessionId,
                gameKey = item.gameKey,
                score = item.score,
                durationSec = item.durationSec,
                combo = item.comboMax,
                accuracy = item.accuracy,
                calories = item.calories,
                startedAt = item.startedAt,
                endedAt = item.endedAt,
                resultPayload = Json.parseToJsonElement(item.resultPayload).jsonObject
            )
            val response = SupabaseData.submitGameSessionResult(request)
            response.onSuccess { submitted ->
                db.syncQueueDao().markSynced(item.localSessionId)
                db.gameSessionDao().updateSyncStatus(item.localSessionId, "SYNCED", submitted.id)
                Result.success()
            }.getOrElse { error ->
                handleError(item, error)
            }
        } catch (e: Exception) {
            handleError(item, e)
        }
    }

    private suspend fun handleError(item: SyncQueueItem, error: Throwable): Result {
        val errorClass = error::class.simpleName
        val isRetryable = when (error) {
            is IOException, is SocketTimeoutException -> true
            is java.net.ConnectException -> true
            is java.net.UnknownHostException -> true
            else -> error is HttpException && (error as HttpException).code() >= 500
        }

        if (isRetryable && item.attemptCount < 5) {
            db.syncQueueDao().updateAttempt(
                item.id, "RETRY_SCHEDULED",
                System.currentTimeMillis(), errorClass
            )
            Result.retry()
        } else {
            db.syncQueueDao().updateAttempt(
                item.id, "FAILED_PERMANENT",
                System.currentTimeMillis(), errorClass
            )
            db.gameSessionDao().updateSyncStatus(item.localSessionId, "FAILED_PERMANENT", null)
            Result.failure()
        }
    }
}
```

### 6. WorkManager Configuration

```kotlin
// In AlbaApplication or startup
val constraints = Constraints.Builder()
    .setRequiredNetworkType(NetworkType.CONNECTED)
    .build()

val syncRequest = OneTimeWorkRequestBuilder<GameSessionSyncWorker>()
    .setConstraints(constraints)
    .setBackoffCriteria(
        BackoffPolicy.EXPONENTIAL,
        30, TimeUnit.SECONDS
    )
    .build()
```

## State Machine

```
LOCAL_SAVED → QUEUED → SYNCING → SYNCED
                            ↓
                      RETRY_SCHEDULED → SYNCING → SYNCED
                            ↓
                      FAILED_PERMANENT
```

## Idempotency

Backend `clientSessionKey` UNIQUE constraint ensures duplicate POST returns `duplicate_accepted`.
Worker must handle this gracefully — `duplicate_accepted` == SUCCESS.

## Dependencies

```kotlin
// core_data/build.gradle.kts
implementation("androidx.room:room-runtime:2.6.1")
implementation("androidx.room:room-ktx:2.6.1")
kapt("androidx.room:room-compiler:2.6.1")
implementation("androidx.work:work-runtime-ktx:2.9.1")

// Testing
testImplementation("androidx.room:room-testing:2.6.1")
testImplementation("androidx.work:work-testing:2.9.1")
```

## Non-Goals

- Hilt dependency injection (manual DI for now)
- Background fetch scheduling
- Multi-device sync conflict resolution
- Cloud message push-triggered sync
