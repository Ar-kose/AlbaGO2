package com.alba.core.network

import io.github.jan.supabase.realtime.channel
import io.github.jan.supabase.realtime.postgresChangeFlow
import io.github.jan.supabase.realtime.selectAsFlow
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

object SupabaseRealtime {

    /**
     * Observe live room participants for a specific room.
     */
    fun observeRoomParticipants(roomId: String): Flow<List<LiveRoomRow>> {
        return AlbaSupabase.client.realtime.channel("room-$roomId")
            .postgresChangeFlow<LiveRoomRow>(
                schema = "public",
                table = "live_rooms",
                filter = "id=eq.$roomId"
            )
            .map { listOf(it.record) }
    }

    /**
     * Observe game session updates for live multiplayer.
     */
    fun observeGameSessions(roomId: String): Flow<List<GameSessionRow>> {
        return AlbaSupabase.client.realtime.channel("game-sessions-$roomId")
            .postgresChangeFlow<GameSessionRow>(
                schema = "public",
                table = "game_sessions"
            )
            .map { listOf(it.record) }
    }

    /**
     * Observe leaderboard changes.
     */
    fun observeLeaderboard(scope: String = "global", period: String = "daily"): Flow<List<LeaderboardEntryRow>> {
        return AlbaSupabase.client.realtime.channel("leaderboard-$scope-$period")
            .postgresChangeFlow<LeaderboardEntryRow>(
                schema = "public",
                table = "leaderboard_entries",
                filter = "scope=eq.$scope"
            )
            .map { listOf(it.record) }
    }
}
