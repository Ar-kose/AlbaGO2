# P16 WorkManager Offline Sync Queue Design

**Date:** 2026-05-09
**Status:** Design frozen, implementation P17

## Current Sync Architecture

```
Game Finish → Local save (SyncStatus.LOCAL_SAVED) 
           → Coroutine scope.launch { syncFinishedGame() }
           → OkHttp POST /v1/game-sessions
           → Success: SyncStatus.SYNCED
           → Failure: SyncStatus.FAILED, no retry queue
```

Problems:
- Sync runs on coroutine scope, lost if app is killed
- No retry with backoff
- No persistent queue — if app closes before sync, result is lost from sync perspective (local save preserved)
- Manual retry button removed (P14 non-blocking decision)

## Target Architecture (P17)

```
Game Finish → Local save (SyncStatus.LOCAL_SAVED)
           → SyncQueue.enqueue(SyncItem)
           → WorkManager OneTimeWorkRequest
           → SyncWorker.doWork():
               OkHttp POST /v1/game-sessions
               Success → SyncStatus.SYNCED, dequeue
               Failure → Result.retry() with exponential backoff
           → UI observes sync status via LiveData/Flow
```

## Components

### 1. SyncItem (Kotlin data class)

```kotlin
data class SyncItem(
    val id: String,              // UUID
    val clientSessionId: String,
    val gameKey: String,
    val score: Int,
    val payload: String,         // JSON serialized GameSessionSubmitRequest
    val createdAt: Long,         // System.currentTimeMillis()
    val attemptCount: Int = 0,
    val lastErrorClass: String? = null
)
```

### 2. SyncQueue (in-memory + SharedPreferences for P16, Room for P17)

```kotlin
class SyncQueue(private val prefs: SharedPreferences) {
    fun enqueue(item: SyncItem)
    fun dequeue(id: String)
    fun peek(): SyncItem?
    fun all(): List<SyncItem>
    fun markAttempt(id: String, error: String?)
    fun count(): Int
}
```

### 3. SyncWorker (WorkManager Worker)

```kotlin
class SyncWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val queue = SyncQueue(applicationContext)
        val item = queue.peek() ?: return Result.success()
        return try {
            val response = SupabaseData.submitGameSessionResult(...)
            response.onSuccess { queue.dequeue(item.id); Result.success() }
                   .onFailure { queue.markAttempt(item.id, ...); Result.retry() }
        } catch (e: Exception) {
            if (runAttemptCount < 5) Result.retry() else Result.failure()
        }
    }
}
```

### 4. Dependency additions

```kotlin
// app/build.gradle.kts
implementation("androidx.work:work-runtime-ktx:2.9.1")

// For testing
testImplementation("androidx.work:work-testing:2.9.1")
```

### 5. Backoff Policy

```
Initial: 30 seconds
Multiplier: 2x
Max attempts: 5
Max backoff: 15 minutes

Attempt timeline:
1 → 0s
2 → 30s
3 → 60s  
4 → 120s
5 → 240s
Final → fail permanently, show in UI
```

### 6. Idempotency

Backend already supports idempotent submission via `clientSessionKey` UNIQUE constraint:
```
POST /v1/game-sessions 
→ first submit: stored
→ duplicate submit: duplicate_accepted
```

### 7. UI Integration

```kotlin
// In result screen (GamesFeature.kt)
val queueCount by syncQueue.count.collectAsState()
when {
    syncStatus == SyncStatus.SYNCED -> // green check
    syncStatus == SyncStatus.SYNCING || queueCount > 0 -> // "Arka planda gonderilecek"
    syncStatus == SyncStatus.FAILED && queueCount > 0 -> // "Cevrimdisi — {queueCount} oturum bekliyor"
}
```

## P16 vs P17 Scope

| Component | P16 | P17 |
|---|---|---|
| SyncItem data class | Design | Implement |
| SyncQueue (SharedPreferences) | Design | Implement |
| SyncWorker | Design | Implement |
| WorkManager dependency | Plan | Add + configure |
| UI pending badge | Design | Implement |
| Retry + backoff | Design | Implement |
| Unit tests | — | Worker + queue tests |
| Idempotency verification | Existing (backend) | — |

## P16 Deliverable

Design document complete. Implementation deferred to P17 when:
1. OkHttp sync verified on physical device
2. Profile system foundation stable
3. RLS policies deployed and validated

## P16 Evidence

Design frozen. No code changes in P16 for WorkManager. Safe P17 plan.
