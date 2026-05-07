package com.alba.core.data

import android.content.Context
import com.alba.core.motion.MotionEventType
import com.alba.core.motion.MotionType
import com.alba.core.network.CreateGameSessionRequest
import com.alba.core.network.CreateWorkoutSessionRequest
import com.alba.core.network.UpdateGameSessionRequest
import com.alba.core.network.UpdateWorkoutSessionRequest
import com.alba.core.runtime.AssetManifest
import com.alba.core.runtime.GameDefinition
import com.alba.core.runtime.GameLevelDefinition
import com.alba.core.runtime.GameTaskDefinition
import com.alba.core.runtime.GameTemplate
import com.alba.core.runtime.MotionRule
import com.alba.core.runtime.PublishStatus
import com.alba.core.runtime.RewardRule
import com.alba.core.runtime.RuleAction
import com.alba.core.runtime.RuleActionType
import org.json.JSONArray
import org.json.JSONObject

data class PendingWorkoutSyncItem(
    val clientSessionKey: String,
    val createRequest: CreateWorkoutSessionRequest,
    val updateRequest: UpdateWorkoutSessionRequest
)

data class PendingGameSyncItem(
    val clientSessionKey: String,
    val createRequest: CreateGameSessionRequest,
    val updateRequest: UpdateGameSessionRequest
)

class MotionDebugStore(context: Context) {
    private val preferences = context.getSharedPreferences("albago_debug_store", Context.MODE_PRIVATE)

    fun readBackendBaseUrlOverride(): String? {
        return preferences.getString(KEY_BACKEND_BASE_URL_OVERRIDE, null)?.takeIf { it.isNotBlank() }
    }

    fun saveBackendBaseUrlOverride(value: String?) {
        preferences.edit().apply {
            if (value.isNullOrBlank()) {
                remove(KEY_BACKEND_BASE_URL_OVERRIDE)
            } else {
                putString(KEY_BACKEND_BASE_URL_OVERRIDE, value)
            }
        }.apply()
    }

    fun cacheAvailableGames(definitions: List<GameDefinition>) {
        val payload = JSONArray().apply {
            definitions.forEach { put(it.toJson()) }
        }
        preferences.edit()
            .putString(KEY_AVAILABLE_GAMES_CACHE, payload.toString())
            .apply()
    }

    fun readCachedAvailableGames(): List<GameDefinition> {
        val payload = preferences.getString(KEY_AVAILABLE_GAMES_CACHE, null) ?: return emptyList()
        return runCatching {
            val array = JSONArray(payload)
            buildList {
                for (index in 0 until array.length()) {
                    array.getJSONObject(index).toGameDefinitionOrNull()?.let(::add)
                }
            }
        }.getOrDefault(emptyList())
    }

    fun enqueuePendingWorkoutSync(item: PendingWorkoutSyncItem) {
        upsertQueueItem(KEY_PENDING_WORKOUT_SYNCS, item.clientSessionKey, item.toJson())
    }

    fun readPendingWorkoutSyncs(): List<PendingWorkoutSyncItem> {
        return readQueue(KEY_PENDING_WORKOUT_SYNCS).mapNotNull {
            runCatching { it.toPendingWorkoutSyncItem() }.getOrNull()
        }
    }

    fun removePendingWorkoutSync(clientSessionKey: String) {
        removeQueueItem(KEY_PENDING_WORKOUT_SYNCS, clientSessionKey)
    }

    fun enqueuePendingGameSync(item: PendingGameSyncItem) {
        upsertQueueItem(KEY_PENDING_GAME_SYNCS, item.clientSessionKey, item.toJson())
    }

    fun readPendingGameSyncs(): List<PendingGameSyncItem> {
        return readQueue(KEY_PENDING_GAME_SYNCS).mapNotNull {
            runCatching { it.toPendingGameSyncItem() }.getOrNull()
        }
    }

    fun removePendingGameSync(clientSessionKey: String) {
        removeQueueItem(KEY_PENDING_GAME_SYNCS, clientSessionKey)
    }

    private fun upsertQueueItem(key: String, clientSessionKey: String, payload: JSONObject) {
        val current = readQueue(key).filterNot { it.optString("clientSessionKey") == clientSessionKey }
        val next = JSONArray().apply {
            current.forEach { put(it) }
            put(payload)
        }
        preferences.edit().putString(key, next.toString()).apply()
    }

    private fun removeQueueItem(key: String, clientSessionKey: String) {
        val next = JSONArray().apply {
            readQueue(key)
                .filterNot { it.optString("clientSessionKey") == clientSessionKey }
                .forEach { put(it) }
        }
        preferences.edit().putString(key, next.toString()).apply()
    }

    private fun readQueue(key: String): List<JSONObject> {
        val payload = preferences.getString(key, null) ?: return emptyList()
        return runCatching {
            val array = JSONArray(payload)
            buildList {
                for (index in 0 until array.length()) {
                    add(array.getJSONObject(index))
                }
            }
        }.getOrDefault(emptyList())
    }

    private fun PendingWorkoutSyncItem.toJson(): JSONObject {
        return JSONObject()
            .put("clientSessionKey", clientSessionKey)
            .put(
                "createRequest",
                JSONObject()
                    .put("clientSessionKey", createRequest.clientSessionKey)
                    .put("motionType", createRequest.motionType)
                    .put("source", createRequest.source)
                    .put("startedAt", createRequest.startedAt)
            )
            .put(
                "updateRequest",
                JSONObject()
                    .put("endedAt", updateRequest.endedAt)
                    .put("durationSec", updateRequest.durationSec)
                    .put("totalScore", updateRequest.totalScore)
                    .put("status", updateRequest.status)
                    .put(
                        "motionSummary",
                        updateRequest.motionSummary?.toJsonObject() ?: JSONObject()
                    )
            )
    }

    private fun JSONObject.toPendingWorkoutSyncItem(): PendingWorkoutSyncItem {
        val create = getJSONObject("createRequest")
        val update = getJSONObject("updateRequest")
        return PendingWorkoutSyncItem(
            clientSessionKey = getString("clientSessionKey"),
            createRequest = CreateWorkoutSessionRequest(
                clientSessionKey = create.getString("clientSessionKey"),
                motionType = create.getString("motionType"),
                source = create.getString("source"),
                startedAt = create.getString("startedAt")
            ),
            updateRequest = UpdateWorkoutSessionRequest(
                endedAt = update.optString("endedAt").takeIf { it.isNotBlank() },
                durationSec = update.takeIf { !it.isNull("durationSec") }?.getInt("durationSec"),
                totalScore = update.takeIf { !it.isNull("totalScore") }?.getInt("totalScore"),
                status = update.optString("status").takeIf { it.isNotBlank() },
                motionSummary = update.optJSONObject("motionSummary")?.toMap()
            )
        )
    }

    private fun PendingGameSyncItem.toJson(): JSONObject {
        return JSONObject()
            .put("clientSessionKey", clientSessionKey)
            .put(
                "createRequest",
                JSONObject()
                    .put("clientSessionKey", createRequest.clientSessionKey)
                    .put("gameDefinitionId", createRequest.gameDefinitionId)
                    .put("workoutSessionId", createRequest.workoutSessionId)
                    .put("startedAt", createRequest.startedAt)
            )
            .put(
                "updateRequest",
                JSONObject()
                    .put("endedAt", updateRequest.endedAt)
                    .put("score", updateRequest.score)
                    .put("result", updateRequest.result)
                    .put("gameVersion", updateRequest.gameVersion)
                    .put("clientIntegrityHash", updateRequest.clientIntegrityHash)
                    .put("resultPayload", updateRequest.resultPayload?.toJsonObject() ?: JSONObject())
            )
    }

    private fun JSONObject.toPendingGameSyncItem(): PendingGameSyncItem {
        val create = getJSONObject("createRequest")
        val update = getJSONObject("updateRequest")
        return PendingGameSyncItem(
            clientSessionKey = getString("clientSessionKey"),
            createRequest = CreateGameSessionRequest(
                clientSessionKey = create.getString("clientSessionKey"),
                gameDefinitionId = create.getString("gameDefinitionId"),
                workoutSessionId = create.getString("workoutSessionId"),
                startedAt = create.getString("startedAt")
            ),
            updateRequest = UpdateGameSessionRequest(
                endedAt = update.optString("endedAt").takeIf { it.isNotBlank() },
                score = update.takeIf { !it.isNull("score") }?.getInt("score"),
                result = update.optString("result").takeIf { it.isNotBlank() },
                gameVersion = update.takeIf { !it.isNull("gameVersion") }?.getInt("gameVersion"),
                clientIntegrityHash = update.optString("clientIntegrityHash").takeIf { it.isNotBlank() },
                resultPayload = update.optJSONObject("resultPayload")?.toMap()
            )
        )
    }

    private fun GameDefinition.toJson(): JSONObject {
        return JSONObject()
            .put("gameId", gameId)
            .put("version", version)
            .put("template", template.name)
            .put("title", title)
            .put("description", description)
            .put("status", status.name)
            .put("minAppVersion", minAppVersion)
            .put("supportedMotions", JSONArray(supportedMotions.map { it.name }))
            .put(
                "levels",
                JSONArray().apply {
                    levels.forEach { level ->
                        put(
                            JSONObject()
                                .put("levelId", level.levelId)
                                .put("durationSec", level.durationSec)
                                .put("targetScore", level.targetScore)
                                .put("difficulty", level.difficulty)
                                .put("config", level.config.toJsonObject())
                                .put(
                                    "tasks",
                                    JSONArray().apply {
                                        level.tasks.forEach { task ->
                                            put(
                                                JSONObject()
                                                    .put("motion", task.motion.name)
                                                    .put("targetCount", task.targetCount)
                                                    .put("pointsPerRep", task.pointsPerRep)
                                            )
                                        }
                                    }
                                )
                                .put(
                                    "motionRules",
                                    JSONArray().apply {
                                        level.motionRules.forEach { rule ->
                                            put(
                                                JSONObject()
                                                    .put("motion", rule.motion.name)
                                                    .put("event", rule.event.name)
                                                    .put("points", rule.points)
                                                    .put("cooldownMs", rule.cooldownMs)
                                                    .put(
                                                        "actions",
                                                        JSONArray().apply {
                                                            rule.actions.forEach { action ->
                                                                put(
                                                                    JSONObject()
                                                                        .put("type", action.type.name)
                                                                        .put("amount", action.amount)
                                                                        .put("payload", action.payload)
                                                                )
                                                            }
                                                        }
                                                    )
                                            )
                                        }
                                    }
                                )
                                .put(
                                    "rewards",
                                    JSONArray().apply {
                                        level.rewards.forEach { reward ->
                                            put(
                                                JSONObject()
                                                    .put("rewardType", reward.rewardType)
                                                    .put("amount", reward.amount)
                                                    .put("minimumScore", reward.minimumScore)
                                            )
                                        }
                                    }
                                )
                        )
                    }
                }
            )
            .put(
                "assets",
                JSONObject()
                    .put("background", assets.background)
                    .put("character", assets.character)
                    .put("soundtrack", assets.soundtrack)
            )
    }

    private fun JSONObject.toGameDefinitionOrNull(): GameDefinition? {
        val parsedTemplate = enumValueOrNull<GameTemplate>(optString("template")) ?: return null
        val parsedStatus = enumValueOrNull<PublishStatus>(optString("status")) ?: return null
        val parsedMotions = optJSONArray("supportedMotions")?.toStringList()?.mapNotNull {
            enumValueOrNull<MotionType>(it)
        }.orEmpty()
        val parsedLevels = optJSONArray("levels")?.toGameLevels().orEmpty()
        if (parsedMotions.isEmpty() || parsedLevels.isEmpty()) return null
        return GameDefinition(
            gameId = getString("gameId"),
            version = getInt("version"),
            template = parsedTemplate,
            title = getString("title"),
            description = optString("description"),
            status = parsedStatus,
            minAppVersion = getString("minAppVersion"),
            supportedMotions = parsedMotions,
            levels = parsedLevels,
            assets = getJSONObject("assets").toAssetManifest()
        )
    }

    private fun JSONArray.toGameLevels(): List<GameLevelDefinition> {
        return buildList {
            for (index in 0 until length()) {
                val level = getJSONObject(index)
                add(
                    GameLevelDefinition(
                        levelId = level.getString("levelId"),
                        durationSec = level.getInt("durationSec"),
                        targetScore = level.getInt("targetScore"),
                        difficulty = level.getString("difficulty"),
                        motionRules = level.optJSONArray("motionRules")?.toMotionRules().orEmpty(),
                        rewards = level.optJSONArray("rewards")?.toRewardRules().orEmpty(),
                        config = level.optJSONObject("config")?.toMap() ?: emptyMap(),
                        tasks = level.optJSONArray("tasks")?.toTasks() ?: emptyList()
                    )
                )
            }
        }
    }

    private fun JSONArray.toMotionRules(): List<MotionRule> {
        return buildList {
            for (index in 0 until length()) {
                val rule = getJSONObject(index)
                val motion = enumValueOrNull<MotionType>(rule.optString("motion")) ?: continue
                val event = enumValueOrNull<MotionEventType>(rule.optString("event")) ?: continue
                add(
                    MotionRule(
                        motion = motion,
                        event = event,
                        points = rule.optInt("points", 0),
                        cooldownMs = rule.optLong("cooldownMs", 0L),
                        actions = rule.optJSONArray("actions")?.toRuleActions().orEmpty()
                    )
                )
            }
        }
    }

    private fun JSONArray.toRuleActions(): List<RuleAction> {
        return buildList {
            for (index in 0 until length()) {
                val action = getJSONObject(index)
                val type = enumValueOrNull<RuleActionType>(action.optString("type")) ?: continue
                add(
                    RuleAction(
                        type = type,
                        amount = action.optInt("amount", 0),
                        payload = action.optString("payload").takeIf { it.isNotBlank() }
                    )
                )
            }
        }
    }

    private fun JSONArray.toRewardRules(): List<RewardRule> {
        return buildList {
            for (index in 0 until length()) {
                val reward = getJSONObject(index)
                add(
                    RewardRule(
                        rewardType = reward.getString("rewardType"),
                        amount = reward.getInt("amount"),
                        minimumScore = reward.getInt("minimumScore")
                    )
                )
            }
        }
    }

    private fun JSONArray.toTasks(): List<GameTaskDefinition> {
        return buildList {
            for (index in 0 until length()) {
                val task = getJSONObject(index)
                val motion = enumValueOrNull<MotionType>(task.optString("motion")) ?: continue
                add(
                    GameTaskDefinition(
                        motion = motion,
                        targetCount = task.optInt("targetCount", 0),
                        pointsPerRep = task.optInt("pointsPerRep", 0)
                    )
                )
            }
        }
    }

    private inline fun <reified T : Enum<T>> enumValueOrNull(rawValue: String?): T? {
        val normalized = rawValue?.trim()?.takeIf { it.isNotBlank() } ?: return null
        return enumValues<T>().firstOrNull { it.name.equals(normalized, ignoreCase = true) }
    }

    private fun JSONObject.toAssetManifest(): AssetManifest {
        return AssetManifest(
            background = getString("background"),
            character = getString("character"),
            soundtrack = optString("soundtrack").takeIf { it.isNotBlank() }
        )
    }

    private fun JSONArray.toStringList(): List<String> {
        return buildList {
            for (index in 0 until length()) {
                add(getString(index))
            }
        }
    }

    private fun JSONObject.toMap(): Map<String, Any> {
        return keys().asSequence().associateWith { key ->
            when (val value = get(key)) {
                is JSONObject -> value.toMap()
                is JSONArray -> buildList {
                    for (index in 0 until value.length()) {
                        add(
                            when (val item = value.get(index)) {
                                is JSONObject -> item.toMap()
                                else -> item
                            }
                        )
                    }
                }

                else -> value
            }
        }
    }

    private fun Map<String, Any>.toJsonObject(): JSONObject {
        return JSONObject().apply {
            forEach { (key, value) ->
                put(key, value.toJsonValue())
            }
        }
    }

    private fun Any?.toJsonValue(): Any? {
        return when (this) {
            null -> JSONObject.NULL
            is Map<*, *> -> JSONObject().apply {
                this@toJsonValue.forEach { (key, value) ->
                    put(key.toString(), value.toJsonValue())
                }
            }

            is List<*> -> JSONArray().apply {
                this@toJsonValue.forEach { put(it.toJsonValue()) }
            }

            else -> this
        }
    }

    private companion object {
        const val KEY_BACKEND_BASE_URL_OVERRIDE = "backend_base_url_override"
        const val KEY_AVAILABLE_GAMES_CACHE = "available_games_cache"
        const val KEY_PENDING_WORKOUT_SYNCS = "pending_workout_syncs"
        const val KEY_PENDING_GAME_SYNCS = "pending_game_syncs"
    }
}
