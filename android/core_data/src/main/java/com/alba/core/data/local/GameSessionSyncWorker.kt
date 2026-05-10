package com.alba.core.data.local

import android.content.Context
import android.util.Log
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.alba.core.network.GameSessionSubmitRequest
import com.alba.core.network.SupabaseData
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import java.io.IOException
import java.net.ConnectException
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import java.util.concurrent.TimeUnit

class GameSessionSyncWorker(
    appContext: Context,
    params: WorkerParameters
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result {
        val db = AlbaDatabase.getInstance(applicationContext)
        val repo = GameSessionRepository(db)

        val item = repo.getNextPending()
        if (item == null) {
            Log.d("AlbaGoSync", "Worker: no pending items")
            return Result.success()
        }

        repo.updateAttempt(item.id, "SYNCING", null)

        return try {
            val payload = Json.parseToJsonElement(item.resultPayload).jsonObject
            val request = GameSessionSubmitRequest(
                clientSessionId = item.clientSessionId,
                gameKey = item.gameKey,
                score = item.score,
                durationSec = item.durationSec,
                combo = item.comboMax,
                accuracy = item.accuracy,
                calories = item.calories,
                startedAt = item.startedAt.ifBlank { null },
                endedAt = item.endedAt.ifBlank { null },
                resultPayload = payload
            )

            val response = SupabaseData.submitGameSessionResult(request)
            response.fold(
                onSuccess = { submitted ->
                    Log.d("AlbaGoSync", "Worker synced ${item.clientSessionId} → ${submitted.id}")
                    repo.markSynced(item.localSessionId, submitted.id)
                },
                onFailure = { error -> throw error }
            )
            Result.success()
        } catch (e: Exception) {
            val errorClass = e::class.simpleName ?: "Unknown"
            val retryable = e is SocketTimeoutException ||
                e is ConnectException || e is UnknownHostException || e is IOException
            val attempt = item.attemptCount + 1

            if (retryable && attempt < 5) {
                repo.updateAttempt(item.id, "RETRY_SCHEDULED", errorClass)
                Log.w("AlbaGoSync", "Worker retry ${item.clientSessionId} #$attempt: $errorClass")
                Result.retry()
            } else {
                repo.markFailed(item.localSessionId, errorClass)
                Log.e("AlbaGoSync", "Worker failed ${item.clientSessionId}: $errorClass")
                Result.failure()
            }
        }
    }

    companion object {
        private const val TAG = "albago-sync"

        fun enqueue(context: Context, sessionId: String) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
            val work = OneTimeWorkRequestBuilder<GameSessionSyncWorker>()
                .setConstraints(constraints)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
                .addTag(TAG)
                .build()
            WorkManager.getInstance(context).enqueueUniqueWork(
                "$TAG-$sessionId",
                ExistingWorkPolicy.REPLACE,
                work
            )
        }
    }
}
