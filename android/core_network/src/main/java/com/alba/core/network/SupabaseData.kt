package com.alba.core.network

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.encodeToString
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.logging.HttpLoggingInterceptor
import java.io.IOException
import java.util.concurrent.TimeUnit

object SupabaseData {
    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }
    private var gameCache = RuntimeCatalogCache()

    private val okHttp: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(15, TimeUnit.SECONDS)
            .writeTimeout(10, TimeUnit.SECONDS)
            .addInterceptor(HttpLoggingInterceptor { message ->
                android.util.Log.d("AlbaGoOkHttp", message.take(500))
            }.apply { level = HttpLoggingInterceptor.Level.BASIC })
            .build()
    }

    private val JSON_MEDIA_TYPE = "application/json; charset=utf-8".toMediaType()

    suspend fun getActiveGames(): List<GameRow> = withContext(Dispatchers.IO) {
        val root = getJsonObject("/game-definitions/active?appVersion=0.2.0")
        val items = root.array("items")
        gameCache = RuntimeCatalogCache.fromBackendItems(items)
        gameCache.games
    }

    suspend fun getGameWithVersions(gameId: String): Pair<GameRow?, List<GameVersionRow>> = withContext(Dispatchers.IO) {
        if (gameCache.games.none { it.id == gameId }) {
            runCatching { getActiveGames() }
        }
        gameCache.games.firstOrNull { it.id == gameId } to gameCache.versionsByGameId[gameId].orEmpty()
    }

    suspend fun getGameLevels(versionId: String): List<GameLevelRow> = withContext(Dispatchers.IO) {
        gameCache.levelsByVersionId[versionId].orEmpty()
    }

    suspend fun getGameProgramSteps(levelId: String): List<GameProgramStepRow> = withContext(Dispatchers.IO) {
        gameCache.programStepsByLevelId[levelId].orEmpty()
    }

    suspend fun getGameMotionRules(versionId: String): List<GameMotionRuleRow> = withContext(Dispatchers.IO) {
        gameCache.motionRulesByVersionId[versionId].orEmpty()
    }

    suspend fun getGameInteractionRules(versionId: String): List<GameInteractionRuleRow> = withContext(Dispatchers.IO) {
        gameCache.interactionRulesByVersionId[versionId].orEmpty()
    }

    suspend fun getGameRewardRules(versionId: String): List<GameRewardRuleRow> = withContext(Dispatchers.IO) {
        gameCache.rewardRulesByVersionId[versionId].orEmpty()
    }

    suspend fun createWorkoutSession(session: WorkoutSessionRow): WorkoutSessionRow? = withContext(Dispatchers.IO) {
        session.copy(id = session.id.ifBlank { "workout-local-${System.currentTimeMillis()}" })
    }

    suspend fun updateWorkoutSession(id: String, update: Map<String, Any>): WorkoutSessionRow? = withContext(Dispatchers.IO) {
        null
    }

    suspend fun insertWorkoutEvent(event: WorkoutEventRow) = withContext(Dispatchers.IO) {
        Unit
    }

    suspend fun createGameSession(session: GameSessionRow): GameSessionRow? = withContext(Dispatchers.IO) {
        session.copy(id = session.id.ifBlank { "game-local-${System.currentTimeMillis()}" })
    }

    suspend fun updateGameSession(id: String, update: Map<String, Any>): GameSessionRow? = withContext(Dispatchers.IO) {
        null
    }

    suspend fun submitGameSessionResult(
        request: GameSessionSubmitRequest
    ): Result<GameSessionSubmitResponse> = withContext(Dispatchers.IO) {
        runCatching {
            val response = postJson("/game-sessions", json.encodeToString(request))
            json.decodeFromString<GameSessionSubmitResponse>(response)
        }
    }

    suspend fun getDailyGoals(): List<DailyGoalRow> = withContext(Dispatchers.IO) {
        emptyList()
    }

    suspend fun getLeaderboards(scope: String = "global", period: String = "all_time"): List<LeaderboardEntryRow> =
        withContext(Dispatchers.IO) {
            emptyList()
        }

    suspend fun claimReward(grant: RewardGrantRow): RewardGrantRow? = withContext(Dispatchers.IO) {
        grant.copy(id = grant.id.ifBlank { "reward-local-${System.currentTimeMillis()}" })
    }

    suspend fun getActivityModes(): List<JsonObject> = withContext(Dispatchers.IO) {
        emptyList()
    }

    // P15: OkHttp replaces HttpURLConnection for reliable network on all Android devices
    private fun getJsonObject(path: String): JsonObject {
        val url = "${AlbaSupabase.backendBaseUrl}$path"
        val request = Request.Builder().url(url).header("Accept", "application/json").build()
        val response = okHttp.newCall(request).execute()
        val body = response.body?.string() ?: throw IOException("Empty GET response from $url")
        if (!response.isSuccessful) {
            throw IOException("HTTP ${response.code} GET $url: ${body.take(200)}")
        }
        return json.parseToJsonElement(body).jsonObject
    }

    private fun postJson(path: String, payload: String): String {
        val url = "${AlbaSupabase.backendBaseUrl}$path"
        val body = payload.toRequestBody(JSON_MEDIA_TYPE)
        val request = Request.Builder().url(url).post(body).build()
        val response = okHttp.newCall(request).execute()
        val responseBody = response.body?.string().orEmpty()
        android.util.Log.d("AlbaGoSync", "POST $url -> HTTP ${response.code} body=${responseBody.take(300)}")
        if (!response.isSuccessful) {
            throw IOException("HTTP ${response.code} ${responseBody.take(200)}".trim())
        }
        return responseBody
    }
}

private data class RuntimeCatalogCache(
    val games: List<GameRow> = emptyList(),
    val versionsByGameId: Map<String, List<GameVersionRow>> = emptyMap(),
    val levelsByVersionId: Map<String, List<GameLevelRow>> = emptyMap(),
    val motionRulesByVersionId: Map<String, List<GameMotionRuleRow>> = emptyMap(),
    val rewardRulesByVersionId: Map<String, List<GameRewardRuleRow>> = emptyMap(),
    val interactionRulesByVersionId: Map<String, List<GameInteractionRuleRow>> = emptyMap(),
    val programStepsByLevelId: Map<String, List<GameProgramStepRow>> = emptyMap()
) {
    companion object {
        fun fromBackendItems(items: JsonArray): RuntimeCatalogCache {
            val games = mutableListOf<GameRow>()
            val versions = mutableMapOf<String, List<GameVersionRow>>()
            val levels = mutableMapOf<String, List<GameLevelRow>>()
            val motionRules = mutableMapOf<String, List<GameMotionRuleRow>>()
            val rewardRules = mutableMapOf<String, List<GameRewardRuleRow>>()
            val interactionRules = mutableMapOf<String, List<GameInteractionRuleRow>>()
            val programSteps = mutableMapOf<String, List<GameProgramStepRow>>()

            items.mapNotNull { it.asObject() }.forEach { item ->
                val gameId = item.string("id")
                val gameKey = item.string("gameKey", gameId)
                val versionNumber = item.int("version", 1)
                val versionId = "$gameId:v$versionNumber"
                val template = item.string("template", "SCENE_PLAY")
                val status = item.string("status", "PUBLISHED")
                val cameraRequirement = item.string("cameraRequirement", "FULL_BODY")

                games += GameRow(
                    id = gameId,
                    gameKey = gameKey,
                    title = item.string("title", gameKey),
                    description = item.optionalString("description"),
                    category = item.string("category", "FUN"),
                    status = status,
                    minAppVersion = item.string("minAppVersion", "0.2.0"),
                    orientation = item.string("orientation", "PORTRAIT"),
                    requiresCamera = cameraRequirement != "HAND_TARGET",
                    tags = item.stringArray("tags"),
                    config = JsonObject(mapOf("template" to JsonPrimitive(template))),
                    metadata = JsonObject(mapOf("assets" to (item["assets"] ?: JsonObject(emptyMap()))))
                )

                versions[gameId] = listOf(
                    GameVersionRow(
                        id = versionId,
                        gameId = gameId,
                        version = versionNumber.toString(),
                        status = status,
                        publishedAt = item.optionalString("publishedAt"),
                        minAppVersion = item.string("minAppVersion", "0.2.0"),
                        supportedMotions = item.stringArray("supportedMotions"),
                        assetManifest = item["assets"] as? JsonObject,
                        runtimeContract = JsonObject(mapOf("schemaVersion" to JsonPrimitive("3.0")))
                    )
                )

                val levelRows = mutableListOf<GameLevelRow>()
                val versionMotionRules = mutableListOf<GameMotionRuleRow>()
                val versionRewardRules = mutableListOf<GameRewardRuleRow>()
                val versionInteractionRules = mutableListOf<GameInteractionRuleRow>()
                item.array("levels").mapNotNull { it.asObject() }.forEachIndexed { levelIndex, level ->
                    val levelKey = level.string("levelId", "level_${levelIndex + 1}")
                    val levelId = "$versionId:$levelKey"
                    levelRows += GameLevelRow(
                        id = levelId,
                        gameVersionId = versionId,
                        levelKey = levelKey,
                        levelIndex = levelIndex,
                        title = levelKey,
                        durationSec = level.int("durationSec", 60),
                        targetScore = level.int("targetScore", 0),
                        difficulty = level.string("difficulty", "EASY"),
                        sceneConfig = level["sceneConfig"] as? JsonObject,
                        runtimeConfig = level["config"] as? JsonObject
                    )

                    level.array("motionRules").mapNotNull { it.asObject() }.forEachIndexed { ruleIndex, rule ->
                        val motion = rule.string("motion", "SQUAT")
                        val event = rule.string("event", "REP_COUNTED")
                        versionMotionRules += GameMotionRuleRow(
                            id = "$levelId:motion:$ruleIndex",
                            gameVersionId = versionId,
                            motion = motion,
                            ruleKey = "${levelKey}_motion_$ruleIndex",
                            label = "$motion $event",
                            cooldownMs = rule.int("cooldownMs", 0),
                            scoring = JsonObject(mapOf("points" to JsonPrimitive(rule.int("points", 0)))),
                            config = JsonObject(mapOf("event" to JsonPrimitive(event))),
                            sortOrder = ruleIndex
                        )
                    }

                    level.array("rewardRules").mapNotNull { it.asObject() }.forEachIndexed { rewardIndex, reward ->
                        versionRewardRules += GameRewardRuleRow(
                            id = "$levelId:reward:$rewardIndex",
                            gameVersionId = versionId,
                            rewardType = reward.string("rewardType", "STAR"),
                            ruleKey = "${levelKey}_reward_$rewardIndex",
                            title = reward.string("rewardType", "STAR"),
                            amount = reward.int("amount", 1),
                            conditions = JsonObject(mapOf("minimumScore" to JsonPrimitive(reward.int("minimumScore", 0))))
                        )
                    }

                    level.array("interactionRules").mapNotNull { it.asObject() }.forEachIndexed { ruleIdx, ir ->
                        versionInteractionRules += GameInteractionRuleRow(
                            id = "$levelId:interaction:$ruleIdx",
                            gameVersionId = versionId,
                            interactionKey = ir.string("ruleId", "${levelKey}_interaction_$ruleIdx"),
                            interactionType = ir.string("input", "MOTION_EVENT"),
                            title = ir.string("ruleId", "Rule $ruleIdx"),
                            motion = ir.optionalString("motion"),
                            interactionPayload = ir
                        )
                    }

                    programSteps[levelId] = level.array("programSteps").mapNotNull { it.asObject() }
                        .mapIndexed { stepIndex, step ->
                            GameProgramStepRow(
                                id = "$levelId:step:$stepIndex",
                                gameLevelId = levelId,
                                stepKey = step.string("stepId", "step_${stepIndex + 1}"),
                                stepType = step.string("type", "INSTRUCTION"),
                                title = step.string("title", "Step ${stepIndex + 1}"),
                                motion = step.optionalString("motion"),
                                targetCount = step.optionalInt("targetCount"),
                                holdSec = step.optionalInt("holdSec"),
                                durationSec = step.optionalInt("durationSec"),
                                successMessage = step.optionalString("successMessage"),
                                isRequired = step.optionalBoolean("nextOnComplete") ?: true,
                                sortOrder = stepIndex
                            )
                        }
                }
                levels[versionId] = levelRows
                motionRules[versionId] = versionMotionRules
                rewardRules[versionId] = versionRewardRules
                interactionRules[versionId] = versionInteractionRules
            }

            return RuntimeCatalogCache(
                games = games,
                versionsByGameId = versions,
                levelsByVersionId = levels,
                motionRulesByVersionId = motionRules,
                rewardRulesByVersionId = rewardRules,
                interactionRulesByVersionId = interactionRules,
                programStepsByLevelId = programSteps
            )
        }
    }
}

private fun JsonElement.asObject(): JsonObject? = this as? JsonObject

private fun JsonObject.string(key: String, default: String = ""): String =
    optionalString(key)?.takeIf { it.isNotBlank() } ?: default

private fun JsonObject.optionalString(key: String): String? = this[key]?.jsonPrimitive?.contentOrNull

private fun JsonObject.int(key: String, default: Int = 0): Int = this[key]?.jsonPrimitive?.intOrNull ?: default

private fun JsonObject.optionalInt(key: String): Int? = this[key]?.jsonPrimitive?.intOrNull

private fun JsonObject.optionalBoolean(key: String): Boolean? = this[key]?.jsonPrimitive?.booleanOrNull

private fun JsonObject.array(key: String): JsonArray = this[key]?.jsonArray ?: JsonArray(emptyList())

private fun JsonObject.stringArray(key: String): List<String> =
    array(key).mapNotNull { element -> element.jsonPrimitive.contentOrNull }
