package com.alba.core.network

import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

data class CreateGuestSessionRequest(
    val installId: String,
    val platform: String = "ANDROID",
    val appVersion: String
)

data class GuestSessionResponse(
    val guestToken: String,
    val userId: String,
    val expiresAt: String
)

data class RegisterDeviceRequest(
    val userId: String,
    val installId: String,
    val platform: String = "ANDROID",
    val appVersion: String,
    val pushToken: String? = null,
    val consentVersion: String
)

data class CreateWorkoutSessionRequest(
    val clientSessionKey: String,
    val motionType: String,
    val source: String = "CAMERA",
    val startedAt: String
)

data class UpdateWorkoutSessionRequest(
    val endedAt: String? = null,
    val durationSec: Int? = null,
    val totalScore: Int? = null,
    val status: String? = null,
    val motionSummary: Map<String, @JvmSuppressWildcards Any>? = null
)

data class WorkoutSessionResponse(
    val id: String,
    val motionType: String,
    val source: String,
    val startedAt: String,
    val status: String
)

data class CreateGameSessionRequest(
    val clientSessionKey: String,
    val gameDefinitionId: String,
    val workoutSessionId: String,
    val startedAt: String
)

data class UpdateGameSessionRequest(
    val endedAt: String? = null,
    val score: Int? = null,
    val result: String? = null,
    val gameVersion: Int? = null,
    val clientIntegrityHash: String? = null,
    val resultPayload: Map<String, @JvmSuppressWildcards Any>? = null
)

data class GameSessionResponse(
    val id: String,
    val gameDefinitionId: String,
    val workoutSessionId: String,
    val startedAt: String,
    val score: Int? = null,
    val result: String? = null
)

data class RewardClaimRequest(
    val userId: String,
    val sourceType: String,
    val sourceId: String,
    val rewardType: String,
    val amount: Int,
    val idempotencyKey: String
)

data class ActiveGamesResponse(
    val items: List<GameDefinitionDto>
) {
    data class GameDefinitionDto(
        val id: String,
        val gameKey: String,
        val version: Int,
        val template: String,
        val title: String,
        val description: String,
        val status: String,
        val minAppVersion: String,
        val category: String? = null,
        val tags: List<String>? = null,
        val orientation: String? = null,
        val cameraRequirement: String? = null,
        val supportedMotions: List<String>,
        val levels: List<GameLevelDto>,
        val assets: AssetDto
    )

    data class GameLevelDto(
        val levelId: String,
        val durationSec: Int,
        val targetScore: Int,
        val difficulty: String,
        val motionRules: List<MotionRuleDto>,
        val rewardRules: List<RewardRuleDto>,
        val config: Map<String, @JvmSuppressWildcards Any>? = null,
        val sceneConfig: Map<String, @JvmSuppressWildcards Any>? = null,
        val interactionRules: List<InteractionRuleDto>? = null,
        val tasks: List<TaskRuleDto>? = null,
        val programSteps: List<ProgramStepDto>? = null
    )

    data class MotionRuleDto(
        val motion: String,
        val event: String,
        val points: Int,
        val cooldownMs: Long
    )

    data class RewardRuleDto(
        val rewardType: String,
        val amount: Int,
        val minimumScore: Int
    )

    data class TaskRuleDto(
        val motion: String,
        val targetCount: Int,
        val pointsPerRep: Int
    )

    data class ProgramStepDto(
        val stepId: String,
        val type: String,
        val title: String,
        val description: String? = null,
        val motion: String? = null,
        val targetCount: Int? = null,
        val holdSec: Int? = null,
        val durationSec: Int? = null,
        val successMessage: String? = null,
        val nextOnComplete: Boolean? = null
    )

    data class InteractionRuleDto(
        val input: String,
        val event: String? = null,
        val motion: String? = null,
        val targetObjectType: String? = null,
        val keypoints: List<String>? = null,
        val action: String,
        val points: Int? = null,
        val cooldownMs: Long? = null
    )

    data class AssetDto(
        val background: String,
        val character: String,
        val soundtrack: String? = null,
        val items: List<GameAssetDto>? = null
    )

    data class GameAssetDto(
        val id: String? = null,
        val key: String,
        val kind: String,
        val format: String,
        val uri: String,
        val mimeType: String? = null,
        val width: Int? = null,
        val height: Int? = null,
        val sha256: String? = null,
        val bytes: Int? = null,
        val createdAt: String? = null
    )
}

interface AlbaApiService {
    @POST("/v1/guest-sessions")
    suspend fun createGuestSession(@Body request: CreateGuestSessionRequest): GuestSessionResponse

    @POST("/v1/devices/register")
    suspend fun registerDevice(@Body request: RegisterDeviceRequest)

    @GET("/v1/motions")
    suspend fun getMotions(): Map<String, Any>

    @POST("/v1/workout-sessions")
    suspend fun createWorkoutSession(@Body request: CreateWorkoutSessionRequest): WorkoutSessionResponse

    @PATCH("/v1/workout-sessions/{workoutSessionId}")
    suspend fun updateWorkoutSession(
        @Path("workoutSessionId") workoutSessionId: String,
        @Body request: UpdateWorkoutSessionRequest
    ): WorkoutSessionResponse

    @POST("/v1/game-sessions")
    suspend fun createGameSession(@Body request: CreateGameSessionRequest): GameSessionResponse

    @PATCH("/v1/game-sessions/{gameSessionId}")
    suspend fun updateGameSession(
        @Path("gameSessionId") gameSessionId: String,
        @Body request: UpdateGameSessionRequest
    ): GameSessionResponse

    @GET("/v1/game-definitions/active")
    suspend fun getActiveGames(
        @Query("appVersion") appVersion: String,
        @Query("platform") platform: String = "ANDROID"
    ): ActiveGamesResponse

    @GET("/v1/daily-goals")
    suspend fun getDailyGoals(): Map<String, Any>

    @GET("/v1/leaderboards")
    suspend fun getLeaderboards(
        @Query("scope") scope: String,
        @Query("period") period: String
    ): Map<String, Any>

    @POST("/v1/reward-claims")
    suspend fun claimReward(@Body request: RewardClaimRequest): Map<String, Any>
}

object AlbaApiFactory {
    fun create(baseUrl: String): AlbaApiService {
        val logger = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BASIC
        }
        val client = OkHttpClient.Builder()
            .addInterceptor(logger)
            .build()
        val normalizedBaseUrl = if (baseUrl.endsWith("/")) baseUrl else "$baseUrl/"
        return Retrofit.Builder()
            .baseUrl(normalizedBaseUrl)
            .addConverterFactory(GsonConverterFactory.create())
            .client(client)
            .build()
            .create(AlbaApiService::class.java)
    }
}
