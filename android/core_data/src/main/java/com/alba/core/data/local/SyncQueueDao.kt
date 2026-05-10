package com.alba.core.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

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
