package com.alba.core.network

import io.github.jan.supabase.postgrest.postgrest
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

object SupabaseData {

    // ─── Game Definitions ───

    suspend fun getActiveGames(): List<GameRow> = withContext(Dispatchers.IO) {
        AlbaSupabase.client.postgrest.from("games")
            .select { filter { "status" eq "published" } }
            .decodeList<GameRow>()
    }

    suspend fun getGameWithVersions(gameId: String): Pair<GameRow?, List<GameVersionRow>> = withContext(Dispatchers.IO) {
        val game = AlbaSupabase.client.postgrest.from("games")
            .select { filter { "id" eq gameId } }
            .decodeList<GameRow>()
            .firstOrNull()

        val versions = AlbaSupabase.client.postgrest.from("game_versions")
            .select { filter { "game_id" eq gameId } }
            .decodeList<GameVersionRow>()

        game to versions
    }

    suspend fun getGameLevels(versionId: String): List<GameLevelRow> = withContext(Dispatchers.IO) {
        AlbaSupabase.client.postgrest.from("game_levels")
            .select { filter { "game_version_id" eq versionId } }
            .decodeList<GameLevelRow>()
    }

    suspend fun getGameProgramSteps(levelId: String): List<GameProgramStepRow> = withContext(Dispatchers.IO) {
        AlbaSupabase.client.postgrest.from("game_program_steps")
            .select { filter { "game_level_id" eq levelId } }
            .decodeList<GameProgramStepRow>()
    }

    suspend fun getGameMotionRules(versionId: String): List<GameMotionRuleRow> = withContext(Dispatchers.IO) {
        AlbaSupabase.client.postgrest.from("game_motion_rules")
            .select { filter { "game_version_id" eq versionId } }
            .decodeList<GameMotionRuleRow>()
    }

    suspend fun getGameInteractionRules(versionId: String): List<GameInteractionRuleRow> = withContext(Dispatchers.IO) {
        AlbaSupabase.client.postgrest.from("game_interaction_rules")
            .select { filter { "game_version_id" eq versionId } }
            .decodeList<GameInteractionRuleRow>()
    }

    suspend fun getGameRewardRules(versionId: String): List<GameRewardRuleRow> = withContext(Dispatchers.IO) {
        AlbaSupabase.client.postgrest.from("game_reward_rules")
            .select { filter { "game_version_id" eq versionId } }
            .decodeList<GameRewardRuleRow>()
    }

    // ─── Workout Sessions ───

    suspend fun createWorkoutSession(session: WorkoutSessionRow): WorkoutSessionRow? = withContext(Dispatchers.IO) {
        AlbaSupabase.client.postgrest.from("workout_sessions")
            .insert(session) { select() }
            .decodeSingleOrNull<WorkoutSessionRow>()
    }

    suspend fun updateWorkoutSession(id: String, update: Map<String, Any>): WorkoutSessionRow? = withContext(Dispatchers.IO) {
        AlbaSupabase.client.postgrest.from("workout_sessions")
            .update(update) {
                filter { "id" eq id }
                select()
            }
            .decodeSingleOrNull<WorkoutSessionRow>()
    }

    suspend fun insertWorkoutEvent(event: WorkoutEventRow) = withContext(Dispatchers.IO) {
        AlbaSupabase.client.postgrest.from("workout_events")
            .insert(event)
    }

    // ─── Game Sessions ───

    suspend fun createGameSession(session: GameSessionRow): GameSessionRow? = withContext(Dispatchers.IO) {
        AlbaSupabase.client.postgrest.from("game_sessions")
            .insert(session) { select() }
            .decodeSingleOrNull<GameSessionRow>()
    }

    suspend fun updateGameSession(id: String, update: Map<String, Any>): GameSessionRow? = withContext(Dispatchers.IO) {
        AlbaSupabase.client.postgrest.from("game_sessions")
            .update(update) {
                filter { "id" eq id }
                select()
            }
            .decodeSingleOrNull<GameSessionRow>()
    }

    // ─── Daily Goals & Leaderboards ───

    suspend fun getDailyGoals(): List<DailyGoalRow> = withContext(Dispatchers.IO) {
        AlbaSupabase.client.postgrest.from("daily_goals")
            .select { filter { "active" eq true } }
            .decodeList<DailyGoalRow>()
    }

    suspend fun getLeaderboards(scope: String = "global", period: String = "all_time"): List<LeaderboardEntryRow> = withContext(Dispatchers.IO) {
        AlbaSupabase.client.postgrest.from("leaderboard_entries")
            .select {
                filter {
                    "scope" eq scope
                    "period" eq period
                }
                order("rank", io.github.jan.supabase.postgrest.Postgrest.Order.ASCENDING)
            }
            .decodeList<LeaderboardEntryRow>()
    }

    // ─── Rewards ───

    suspend fun claimReward(grant: RewardGrantRow): RewardGrantRow? = withContext(Dispatchers.IO) {
        AlbaSupabase.client.postgrest.from("reward_grants")
            .insert(grant) { select() }
            .decodeSingleOrNull<RewardGrantRow>()
    }

    // ─── Activity Modes ───

    suspend fun getActivityModes(): List<JsonObject> = withContext(Dispatchers.IO) {
        @Suppress("UNCHECKED_CAST")
        AlbaSupabase.client.postgrest.from("activity_modes")
            .select { filter { "status" eq "published" } }
            .decodeList<Map<String, Any>>() as List<JsonObject>
    }
}

// Alias for JsonObject from kotlinx
typealias JsonObject = kotlinx.serialization.json.JsonObject
