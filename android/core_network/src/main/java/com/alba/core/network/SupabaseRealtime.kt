package com.alba.core.network

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flowOf

object SupabaseRealtime {
    fun observeRoomParticipants(roomId: String): Flow<List<LiveRoomRow>> = flowOf(emptyList())

    fun observeGameSessions(roomId: String): Flow<List<GameSessionRow>> = flowOf(emptyList())

    fun observeLeaderboard(scope: String = "global", period: String = "daily"): Flow<List<LeaderboardEntryRow>> =
        flowOf(emptyList())
}
