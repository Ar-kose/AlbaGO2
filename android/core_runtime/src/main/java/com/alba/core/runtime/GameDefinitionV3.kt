package com.alba.core.runtime

import com.alba.core.motion.MotionEventType
import com.alba.core.motion.MotionType
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

data class GameDefinitionV3ParseResult(
    val definition: GameDefinitionV3?,
    val errors: List<String>
) {
    val isSuccess: Boolean = definition != null && errors.isEmpty()
}

data class GameDefinitionV3(
    val schemaVersion: String,
    val gameKey: String,
    val version: Int,
    val title: String,
    val description: String,
    val category: String,
    val tags: List<String>,
    val minAppVersion: String,
    val minRuntimeVersion: String,
    val orientation: String,
    val cameraRequirement: String,
    val capabilities: List<String>,
    val supportedMotions: List<MotionType>,
    val assetManifest: V3AssetManifest,
    val levels: List<V3LevelDefinition>
)

data class V3AssetManifest(
    val items: List<V3AssetItem>
)

data class V3AssetItem(
    val key: String,
    val kind: String,
    val format: String,
    val uri: String,
    val sha256: String? = null,
    val bytes: Int? = null
)

data class V3LevelDefinition(
    val levelId: String,
    val durationSec: Int,
    val targetScore: Int,
    val difficulty: String,
    val scene: V3SceneDefinition,
    val rules: List<V3RuleDefinition>,
    val programSteps: List<V3ProgramStepDefinition>
)

data class V3SceneDefinition(
    val type: String,
    val maxObjects: Int,
    val spawnRateMs: Int,
    val objects: List<V3SceneObjectDefinition>
)

data class V3SceneObjectDefinition(
    val objectId: String,
    val label: String,
    val assetKey: String,
    val requiredMotion: MotionType,
    val lifeMs: Int,
    val points: Int
)

data class V3RuleDefinition(
    val ruleId: String,
    val priority: Int,
    val condition: V3RuleCondition,
    val actions: List<V3RuleAction>,
    val cooldownMs: Int
)

data class V3RuleCondition(
    val type: String,
    val event: MotionEventType? = null,
    val motion: MotionType? = null,
    val targetObjectId: String? = null
)

data class V3RuleAction(
    val type: String,
    val amount: Int? = null,
    val target: String? = null
)

data class V3ProgramStepDefinition(
    val stepId: String,
    val type: ProgramStepType,
    val title: String,
    val description: String? = null,
    val motion: MotionType? = null,
    val targetCount: Int? = null,
    val holdSec: Int? = null,
    val durationSec: Int? = null,
    val successMessage: String? = null,
    val nextOnComplete: Boolean = true
)

object GameDefinitionV3Parser {
    private const val runtimeVersion = "2.0.0"
    private val json = Json { ignoreUnknownKeys = false }
    private val supportedCapabilities = setOf(
        "MOTION_EVENT",
        "POSE_CONTACT",
        "SCENE_OBJECTS",
        "PROGRAM_STEPS",
        "AUDIO",
        "TIMER"
    )
    private val supportedConditions = setOf(
        "MOTION_EVENT",
        "POSE_CONTACT",
        "TIMER_EXPIRED",
        "OBJECT_EXPIRED",
        "STEP_COMPLETED",
        "SCORE_REACHED",
        "LIFE_ZERO",
        "QUIZ_ANSWERED"
    )
    private val supportedActions = setOf(
        "ADD_SCORE",
        "REMOVE_OBJECT",
        "SPAWN_OBJECT",
        "DECREASE_LIFE",
        "INCREASE_LIFE",
        "RESET_COMBO",
        "ADD_COMBO",
        "PAUSE_GAME",
        "RESUME_GAME",
        "ADVANCE_STEP",
        "COMPLETE_LEVEL",
        "PLAY_SOUND",
        "SHOW_EFFECT",
        "SHOW_MESSAGE",
        "PROGRESS_TASK",
        "GRANT_REWARD_REQUEST"
    )

    fun parse(rawJson: String): GameDefinitionV3ParseResult {
        val errors = mutableListOf<String>()
        val root = try {
            json.parseToJsonElement(rawJson).jsonObject
        } catch (error: Exception) {
            return GameDefinitionV3ParseResult(null, listOf("INVALID_JSON:${error.message.orEmpty()}"))
        }

        checkAllowed(
            root,
            "$",
            setOf(
                "schemaVersion",
                "gameKey",
                "version",
                "title",
                "description",
                "category",
                "tags",
                "minAppVersion",
                "minRuntimeVersion",
                "orientation",
                "cameraRequirement",
                "capabilities",
                "supportedMotions",
                "assetManifest",
                "levels"
            ),
            errors
        )

        val schemaVersion = root.string("schemaVersion", "$.schemaVersion", errors)
        if (schemaVersion != "3.0") {
            errors += "UNSUPPORTED_SCHEMA_VERSION:$.schemaVersion"
        }

        val minRuntimeVersion = root.string("minRuntimeVersion", "$.minRuntimeVersion", errors)
        if (minRuntimeVersion != null && compareVersions(minRuntimeVersion, runtimeVersion) > 0) {
            errors += "UNSUPPORTED_RUNTIME_VERSION:$.minRuntimeVersion"
        }

        val capabilities = root.stringList("capabilities", "$.capabilities", errors)
        capabilities.forEachIndexed { index, capability ->
            if (capability !in supportedCapabilities) {
                errors += "UNSUPPORTED_CAPABILITY:$.capabilities[$index]"
            }
        }

        val supportedMotions = root.stringList("supportedMotions", "$.supportedMotions", errors)
            .mapIndexedNotNull { index, value -> parseMotion(value, "$.supportedMotions[$index]", errors) }
        val supportedMotionSet = supportedMotions.toSet()
        val assets = parseAssetManifest(root.objectValue("assetManifest"), errors)
        val assetKeys = assets.items.map { it.key }.toSet()
        val levels = root.array("levels", "$.levels", errors)
            .mapIndexedNotNull { index, element ->
                parseLevel(element.asObject(), index, supportedMotionSet, assetKeys, errors)
            }

        val definition = if (errors.isEmpty()) {
            GameDefinitionV3(
                schemaVersion = schemaVersion.orEmpty(),
                gameKey = root.string("gameKey", "$.gameKey", errors).orEmpty(),
                version = root.int("version", "$.version", errors) ?: 1,
                title = root.string("title", "$.title", errors).orEmpty(),
                description = root.string("description", "$.description", errors).orEmpty(),
                category = root.string("category", "$.category", errors).orEmpty(),
                tags = root.stringList("tags", "$.tags", errors),
                minAppVersion = root.string("minAppVersion", "$.minAppVersion", errors).orEmpty(),
                minRuntimeVersion = minRuntimeVersion.orEmpty(),
                orientation = root.string("orientation", "$.orientation", errors).orEmpty(),
                cameraRequirement = root.string("cameraRequirement", "$.cameraRequirement", errors).orEmpty(),
                capabilities = capabilities,
                supportedMotions = supportedMotions,
                assetManifest = assets,
                levels = levels
            )
        } else {
            null
        }

        return GameDefinitionV3ParseResult(definition, errors)
    }

    private fun parseAssetManifest(raw: JsonObject?, errors: MutableList<String>): V3AssetManifest {
        if (raw == null) {
            errors += "MISSING_ASSET_MANIFEST:$.assetManifest"
            return V3AssetManifest(emptyList())
        }
        checkAllowed(raw, "$.assetManifest", setOf("items"), errors)
        val keys = mutableSetOf<String>()
        val items = raw.array("items", "$.assetManifest.items", errors).mapIndexedNotNull { index, element ->
            val path = "$.assetManifest.items[$index]"
            val item = element.asObject() ?: run {
                errors += "INVALID_ASSET:$path"
                return@mapIndexedNotNull null
            }
            checkAllowed(item, path, setOf("key", "kind", "format", "uri", "sha256", "bytes"), errors)
            val key = item.string("key", "$path.key", errors).orEmpty()
            if (!keys.add(key)) errors += "DUPLICATE_ASSET_KEY:$path.key"
            V3AssetItem(
                key = key,
                kind = item.string("kind", "$path.kind", errors).orEmpty(),
                format = item.string("format", "$path.format", errors).orEmpty(),
                uri = item.string("uri", "$path.uri", errors).orEmpty(),
                sha256 = item.optionalString("sha256"),
                bytes = item.optionalInt("bytes")
            )
        }
        return V3AssetManifest(items)
    }

    private fun parseLevel(
        raw: JsonObject?,
        index: Int,
        supportedMotions: Set<MotionType>,
        assetKeys: Set<String>,
        errors: MutableList<String>
    ): V3LevelDefinition? {
        val path = "$.levels[$index]"
        val level = raw ?: run {
            errors += "INVALID_LEVEL:$path"
            return null
        }
        checkAllowed(
            level,
            path,
            setOf("levelId", "durationSec", "targetScore", "difficulty", "scene", "rules", "programSteps", "rewards"),
            errors
        )
        val scene = parseScene(level.objectValue("scene"), path, supportedMotions, assetKeys, errors)
        val objectIds = scene.objects.map { it.objectId }.toSet()
        val rules = level.array("rules", "$path.rules", errors).mapIndexedNotNull { ruleIndex, element ->
            parseRule(element.asObject(), "$path.rules[$ruleIndex]", supportedMotions, objectIds, errors)
        }
        val steps = level.optionalArray("programSteps").mapIndexedNotNull { stepIndex, element ->
            parseStep(element.asObject(), "$path.programSteps[$stepIndex]", supportedMotions, errors)
        }
        return V3LevelDefinition(
            levelId = level.string("levelId", "$path.levelId", errors).orEmpty(),
            durationSec = level.int("durationSec", "$path.durationSec", errors) ?: 0,
            targetScore = level.int("targetScore", "$path.targetScore", errors) ?: 0,
            difficulty = level.string("difficulty", "$path.difficulty", errors).orEmpty(),
            scene = scene,
            rules = rules,
            programSteps = steps
        )
    }

    private fun parseScene(
        raw: JsonObject?,
        levelPath: String,
        supportedMotions: Set<MotionType>,
        assetKeys: Set<String>,
        errors: MutableList<String>
    ): V3SceneDefinition {
        val path = "$levelPath.scene"
        val scene = raw ?: run {
            errors += "MISSING_SCENE:$path"
            return V3SceneDefinition("", 0, 0, emptyList())
        }
        checkAllowed(scene, path, setOf("type", "maxObjects", "spawnRateMs", "objects"), errors)
        val objectIds = mutableSetOf<String>()
        val objects = scene.array("objects", "$path.objects", errors).mapIndexedNotNull { index, element ->
            val objectPath = "$path.objects[$index]"
            val obj = element.asObject() ?: run {
                errors += "INVALID_SCENE_OBJECT:$objectPath"
                return@mapIndexedNotNull null
            }
            checkAllowed(obj, objectPath, setOf("objectId", "label", "assetKey", "requiredMotion", "lifeMs", "points"), errors)
            val objectId = obj.string("objectId", "$objectPath.objectId", errors).orEmpty()
            if (!objectIds.add(objectId)) errors += "DUPLICATE_OBJECT_ID:$objectPath.objectId"
            val assetKey = obj.string("assetKey", "$objectPath.assetKey", errors).orEmpty()
            if (assetKeys.isNotEmpty() && assetKey !in assetKeys) errors += "UNKNOWN_ASSET_KEY:$objectPath.assetKey"
            val motion = parseMotion(obj.string("requiredMotion", "$objectPath.requiredMotion", errors), "$objectPath.requiredMotion", errors)
            if (motion != null && motion !in supportedMotions) errors += "MOTION_NOT_DECLARED:$objectPath.requiredMotion"
            V3SceneObjectDefinition(
                objectId = objectId,
                label = obj.string("label", "$objectPath.label", errors).orEmpty(),
                assetKey = assetKey,
                requiredMotion = motion ?: MotionType.SQUAT,
                lifeMs = obj.int("lifeMs", "$objectPath.lifeMs", errors) ?: 0,
                points = obj.int("points", "$objectPath.points", errors) ?: 0
            )
        }
        return V3SceneDefinition(
            type = scene.string("type", "$path.type", errors).orEmpty(),
            maxObjects = scene.int("maxObjects", "$path.maxObjects", errors) ?: 0,
            spawnRateMs = scene.int("spawnRateMs", "$path.spawnRateMs", errors) ?: 0,
            objects = objects
        )
    }

    private fun parseRule(
        raw: JsonObject?,
        path: String,
        supportedMotions: Set<MotionType>,
        objectIds: Set<String>,
        errors: MutableList<String>
    ): V3RuleDefinition? {
        val rule = raw ?: run {
            errors += "INVALID_RULE:$path"
            return null
        }
        checkAllowed(rule, path, setOf("ruleId", "priority", "when", "then", "cooldownMs"), errors)
        val condition = parseCondition(rule.objectValue("when"), "$path.when", supportedMotions, objectIds, errors)
        val actions = rule.array("then", "$path.then", errors).mapIndexedNotNull { index, element ->
            parseAction(element.asObject(), "$path.then[$index]", objectIds, errors)
        }
        return V3RuleDefinition(
            ruleId = rule.string("ruleId", "$path.ruleId", errors).orEmpty(),
            priority = rule.int("priority", "$path.priority", errors) ?: 0,
            condition = condition,
            actions = actions,
            cooldownMs = rule.int("cooldownMs", "$path.cooldownMs", errors) ?: 0
        )
    }

    private fun parseCondition(
        raw: JsonObject?,
        path: String,
        supportedMotions: Set<MotionType>,
        objectIds: Set<String>,
        errors: MutableList<String>
    ): V3RuleCondition {
        val condition = raw ?: run {
            errors += "MISSING_CONDITION:$path"
            return V3RuleCondition("")
        }
        checkAllowed(condition, path, setOf("type", "event", "motion", "targetObjectId"), errors)
        val type = condition.string("type", "$path.type", errors).orEmpty()
        if (type !in supportedConditions) errors += "UNKNOWN_CONDITION:$path.type"
        val motion = parseMotion(condition.optionalString("motion"), "$path.motion", errors)
        if (motion != null && motion !in supportedMotions) errors += "MOTION_NOT_DECLARED:$path.motion"
        val targetObjectId = condition.optionalString("targetObjectId")
        if (targetObjectId != null && targetObjectId !in objectIds) errors += "UNKNOWN_TARGET_OBJECT:$path.targetObjectId"
        return V3RuleCondition(
            type = type,
            event = parseEvent(condition.optionalString("event"), "$path.event", errors),
            motion = motion,
            targetObjectId = targetObjectId
        )
    }

    private fun parseAction(
        raw: JsonObject?,
        path: String,
        objectIds: Set<String>,
        errors: MutableList<String>
    ): V3RuleAction? {
        val action = raw ?: run {
            errors += "INVALID_ACTION:$path"
            return null
        }
        checkAllowed(action, path, setOf("type", "amount", "target"), errors)
        val type = action.string("type", "$path.type", errors).orEmpty()
        if (type !in supportedActions) errors += "UNKNOWN_ACTION:$path.type"
        val target = action.optionalString("target")
        if (target != null && target !in objectIds) errors += "UNKNOWN_TARGET_OBJECT:$path.target"
        return V3RuleAction(
            type = type,
            amount = action.optionalInt("amount"),
            target = target
        )
    }

    private fun parseStep(
        raw: JsonObject?,
        path: String,
        supportedMotions: Set<MotionType>,
        errors: MutableList<String>
    ): V3ProgramStepDefinition? {
        val step = raw ?: run {
            errors += "INVALID_PROGRAM_STEP:$path"
            return null
        }
        checkAllowed(
            step,
            path,
            setOf("stepId", "type", "title", "description", "motion", "targetCount", "holdSec", "durationSec", "nextOnComplete", "successMessage"),
            errors
        )
        val type = parseStepType(step.string("type", "$path.type", errors), "$path.type", errors)
        val motion = parseMotion(step.optionalString("motion"), "$path.motion", errors)
        if (motion != null && motion !in supportedMotions) errors += "MOTION_NOT_DECLARED:$path.motion"
        return V3ProgramStepDefinition(
            stepId = step.string("stepId", "$path.stepId", errors).orEmpty(),
            type = type ?: ProgramStepType.INSTRUCTION,
            title = step.string("title", "$path.title", errors).orEmpty(),
            description = step.optionalString("description"),
            motion = motion,
            targetCount = step.optionalInt("targetCount"),
            holdSec = step.optionalInt("holdSec"),
            durationSec = step.optionalInt("durationSec"),
            successMessage = step.optionalString("successMessage"),
            nextOnComplete = step.optionalBoolean("nextOnComplete") ?: true
        )
    }

    private fun parseMotion(value: String?, path: String, errors: MutableList<String>): MotionType? {
        if (value == null) return null
        return MotionType.values().firstOrNull { it.name == value } ?: run {
            errors += "UNSUPPORTED_MOTION:$path"
            null
        }
    }

    private fun parseEvent(value: String?, path: String, errors: MutableList<String>): MotionEventType? {
        if (value == null) return null
        return MotionEventType.values().firstOrNull { it.name == value } ?: run {
            errors += "UNSUPPORTED_EVENT:$path"
            null
        }
    }

    private fun parseStepType(value: String?, path: String, errors: MutableList<String>): ProgramStepType? {
        if (value == null) return null
        return ProgramStepType.values().firstOrNull { it.name == value } ?: run {
            errors += "UNSUPPORTED_STEP_TYPE:$path"
            null
        }
    }

    private fun checkAllowed(
        objectValue: JsonObject,
        path: String,
        allowed: Set<String>,
        errors: MutableList<String>
    ) {
        objectValue.keys.filterNot { it in allowed }.forEach { key ->
            errors += "UNKNOWN_FIELD:$path.$key"
        }
    }

    private fun JsonElement.asObject(): JsonObject? = this as? JsonObject

    private fun JsonObject.objectValue(key: String): JsonObject? = this[key] as? JsonObject

    private fun JsonObject.array(key: String, path: String, errors: MutableList<String>): JsonArray {
        val value = this[key] as? JsonArray
        if (value == null) errors += "INVALID_ARRAY:$path"
        return value ?: JsonArray(emptyList())
    }

    private fun JsonObject.optionalArray(key: String): JsonArray = this[key] as? JsonArray ?: JsonArray(emptyList())

    private fun JsonObject.string(key: String, path: String, errors: MutableList<String>): String? {
        val value = this[key]?.jsonPrimitive?.content
        if (value.isNullOrBlank()) errors += "MISSING_REQUIRED_FIELD:$path"
        return value
    }

    private fun JsonObject.optionalString(key: String): String? = this[key]?.jsonPrimitive?.contentOrNull

    private fun JsonObject.int(key: String, path: String, errors: MutableList<String>): Int? {
        val value = this[key]?.jsonPrimitive?.intOrNull
        if (value == null) errors += "INVALID_NUMBER:$path"
        return value
    }

    private fun JsonObject.optionalInt(key: String): Int? = this[key]?.jsonPrimitive?.intOrNull

    private fun JsonObject.optionalBoolean(key: String): Boolean? = this[key]?.jsonPrimitive?.booleanOrNull

    private fun JsonObject.stringList(key: String, path: String, errors: MutableList<String>): List<String> {
        val array = this[key] as? JsonArray
        if (array == null) {
            errors += "INVALID_ARRAY:$path"
            return emptyList()
        }
        return array.mapIndexedNotNull { index, element ->
            val value = element.jsonPrimitive.contentOrNull
            if (value.isNullOrBlank()) {
                errors += "INVALID_ARRAY_ITEM:$path[$index]"
                null
            } else {
                value
            }
        }
    }

    private fun compareVersions(left: String, right: String): Int {
        val leftParts = left.split(".").map { it.toIntOrNull() ?: 0 }
        val rightParts = right.split(".").map { it.toIntOrNull() ?: 0 }
        val maxSize = maxOf(leftParts.size, rightParts.size)
        for (index in 0 until maxSize) {
            val l = leftParts.getOrElse(index) { 0 }
            val r = rightParts.getOrElse(index) { 0 }
            if (l != r) return l.compareTo(r)
        }
        return 0
    }
}
