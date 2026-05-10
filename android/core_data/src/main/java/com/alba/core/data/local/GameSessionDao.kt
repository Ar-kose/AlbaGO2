package com.alba.core.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface GameSessionDao {
    @Query("SELECT * FROM local_game_sessions WHERE syncStatus = 'SYNCED' ORDER BY createdAt DESC LIMIT 5")
    fun getRecentSynced(): Flow<List<LocalGameSession>>

    @Query("SELECT * FROM local_game_sessions ORDER BY createdAt DESC LIMIT 20")
    fun getRecent(): Flow<List<LocalGameSession>>

    @Query("SELECT COUNT(*) FROM local_game_sessions")
    fun getCount(): Flow<Int>

    @Query("SELECT COALESCE(SUM(durationSec), 0) FROM local_game_sessions")
    fun getTotalDuration(): Flow<Int>

    @Query("SELECT COALESCE(MAX(score), 0) FROM local_game_sessions")
    fun getTopScore(): Flow<Int>

    @Query("SELECT COUNT(*) FROM local_game_sessions WHERE syncStatus = 'SYNCED'")
    fun getSyncedCount(): Flow<Int>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(session: LocalGameSession)

    @Query("UPDATE local_game_sessions SET syncStatus = :status, serverSessionId = :serverId WHERE id = :id")
    suspend fun updateSyncStatus(id: String, status: String, serverId: String?)
}
