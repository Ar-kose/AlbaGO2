package com.alba.core.runtime

import org.json.JSONArray
import org.json.JSONObject

// GameSettingsParser: JSON config'den GameSettings olusturur
// Yeni format (gameSettings) ve eski format (legacy config) destegi
object GameSettingsParser {
    private const val TAG = "GameSettingsParser"

    fun parse(configJson: JSONObject): GameSettings? {
        // Yeni format: configJson.gameSettings
        val gsJson = configJson.optJSONObject("gameSettings")
        if (gsJson != null) {
            return parseGameSettings(gsJson)
        }

        // Eski format: configJson'u GameSettings'e donustur
        return fromLegacyConfig(configJson)
    }

    fun parseOrNull(configJson: JSONObject?): GameSettings? {
        if (configJson == null) return null
        return try {
            parse(configJson)
        } catch (e: Exception) {
            android.util.Log.w(TAG, "Failed to parse GameSettings", e)
            null
        }
    }

    fun parseOrNull(configMap: Map<String, Any>?): GameSettings? {
        if (configMap == null) return null
        return try {
            val json = JSONObject(configMap)
            parse(json)
        } catch (e: Exception) {
            android.util.Log.w(TAG, "Failed to parse GameSettings from Map", e)
            null
        }
    }

    // --- Yeni format parser ---

    private fun parseGameSettings(json: JSONObject): GameSettings {
        val commonJson = json.getJSONObject("common")
        val common = parseCommonSettings(commonJson)
        val mechanicJson = json.optJSONObject("mechanic")
        val mechanic = if (mechanicJson != null) {
            val kind = mechanicJson.optString("kind", "MOTION_ARCADE")
            parseMechanic(kind, mechanicJson)
        } else {
            // Mechanic eksikse template'e gore varsayilan olustur
            val kind = TemplateFamily.getKind(common.templateId)
            createDefaultMechanic(kind)
        }

        return GameSettings(
            schemaVersion = json.optString("schemaVersion", "1.0"),
            common = common,
            mechanic = mechanic
        )
    }

    private fun createDefaultMechanic(kind: String): GameMechanicConfig {
        return when (kind) {
            "MOTION_ARCADE" -> MotionArcadeMechanic()
            "POSE_CONTACT" -> PoseContactMechanic()
            "QUIZ" -> QuizMechanic()
            "STUDY" -> StudyMechanic()
            "HOLD" -> HoldMechanic()
            "RHYTHM" -> RhythmMechanic()
            "PROGRAM" -> ProgramMechanic()
            else -> MotionArcadeMechanic()
        }
    }

    private fun parseCommonSettings(json: JSONObject): CommonGameSettings {
        return CommonGameSettings(
            templateId = json.optString("templateId", ""),
            title = json.optString("title", ""),
            description = json.optString("description", ""),
            category = json.optString("category", "FUN"),
            lives = parseLives(json.optJSONObject("lives")),
            duration = parseDuration(json.optJSONObject("duration")),
            scoring = parseScoring(json.optJSONObject("scoring")),
            completion = parseCompletion(json.optJSONObject("completion")),
            presentation = parsePresentation(json.optJSONObject("presentation")),
            feedback = parseFeedback(json.optJSONObject("feedback"))
        )
    }

    private fun parseLives(json: JSONObject?): LivesSettings {
        if (json == null) return LivesSettings()
        return LivesSettings(
            mode = json.optString("mode", "LIMITED"),
            count = json.optInt("count", 3),
            gracePeriodSec = json.optInt("gracePeriodSec", 20),
            loseOnBadForm = json.optBoolean("loseOnBadForm", false),
            loseOnExpire = json.optBoolean("loseOnExpire", true),
            loseOnOutOfFrame = json.optBoolean("loseOnOutOfFrame", false)
        )
    }

    private fun parseDuration(json: JSONObject?): DurationSettings {
        if (json == null) return DurationSettings()
        return DurationSettings(
            mode = json.optString("mode", "TIMED"),
            sec = json.optInt("sec", 60),
            countdownSec = json.optInt("countdownSec", 3)
        )
    }

    private fun parseScoring(json: JSONObject?): ScoringSettings {
        if (json == null) return ScoringSettings()
        return ScoringSettings(
            targetScore = json.optInt("targetScore", 100),
            pointsPerCorrect = json.optInt("pointsPerCorrect", 10),
            penaltyPerWrong = json.optInt("penaltyPerWrong", 5),
            comboEnabled = json.optBoolean("comboEnabled", false),
            comboMultiplier = json.optDouble("comboMultiplier", 0.1).toFloat(),
            maxComboMultiplier = json.optDouble("maxComboMultiplier", 3.0).toFloat(),
            streakBonus = json.optInt("streakBonus", 0)
        )
    }

    private fun parseCompletion(json: JSONObject?): CompletionSettings {
        if (json == null) return CompletionSettings()
        return CompletionSettings(
            primary = json.optString("primary", "DURATION"),
            allowEarlyFinish = json.optBoolean("allowEarlyFinish", false),
            showResultScreen = json.optBoolean("showResultScreen", true)
        )
    }

    private fun parsePresentation(json: JSONObject?): PresentationSettings {
        if (json == null) return PresentationSettings()
        return PresentationSettings(
            orientation = json.optString("orientation", "LANDSCAPE"),
            cameraRequirement = json.optString("cameraRequirement", "FULL_BODY"),
            showTimer = json.optBoolean("showTimer", true),
            showScore = json.optBoolean("showScore", true),
            showLives = json.optBoolean("showLives", true),
            showCombo = json.optBoolean("showCombo", true)
        )
    }

    private fun parseFeedback(json: JSONObject?): FeedbackSettings {
        if (json == null) return FeedbackSettings()
        return FeedbackSettings(
            visualEffectOnCorrect = json.optBoolean("visualEffectOnCorrect", true),
            visualEffectOnWrong = json.optBoolean("visualEffectOnWrong", true),
            vibrateOnCorrect = json.optBoolean("vibrateOnCorrect", true),
            vibrateOnWrong = json.optBoolean("vibrateOnWrong", true),
            soundOnCorrect = json.optBoolean("soundOnCorrect", false),
            soundOnWrong = json.optBoolean("soundOnWrong", false),
            showPromptText = json.optBoolean("showPromptText", true),
            promptUpdateStrategy = json.optString("promptUpdateStrategy", "ON_CHANGE")
        )
    }

    private fun parseMechanic(kind: String, json: JSONObject): GameMechanicConfig {
        return when (kind) {
            "MOTION_ARCADE" -> parseMotionArcade(json)
            "POSE_CONTACT" -> parsePoseContact(json)
            "QUIZ" -> parseQuiz(json)
            "STUDY" -> parseStudy(json)
            "HOLD" -> parseHold(json)
            "RHYTHM" -> parseRhythm(json)
            "PROGRAM" -> parseProgram(json)
            else -> MotionArcadeMechanic() // Fallback
        }
    }

    private fun parseMotionArcade(json: JSONObject): MotionArcadeMechanic {
        return MotionArcadeMechanic(
            spawn = json.optJSONObject("spawn")?.let { parseSpawnConfig(it) } ?: SpawnConfig(),
            objects = json.optJSONArray("objects")?.let { parseObjects(it) } ?: emptyList(),
            match = json.optJSONObject("match")?.let { parseMatchConfig(it) } ?: MatchConfig(),
            onExpire = json.optJSONObject("onExpire")?.let { parseExpireConfig(it) } ?: ExpireConfig(),
            penaltyObjects = json.optJSONObject("penaltyObjects")?.let { parsePenaltyObjects(it) },
            objectDefaults = json.optJSONObject("objectDefaults")?.let { parseObjectDefaults(it) } ?: ObjectDefaults()
        )
    }

    private fun parseSpawnConfig(json: JSONObject): SpawnConfig = SpawnConfig(
        strategy = json.optString("strategy", "RANDOM"),
        intervalMs = json.optLong("intervalMs", 2000),
        maxActive = json.optInt("maxActive", 1),
        initialDelayMs = json.optLong("initialDelayMs", 0),
        waveSize = if (json.has("waveSize")) json.optInt("waveSize") else null,
        waveCooldownMs = if (json.has("waveCooldownMs")) json.optLong("waveCooldownMs") else null
    )

    private fun parseObjects(arr: JSONArray): List<MotionArcadeObject> {
        val list = mutableListOf<MotionArcadeObject>()
        for (i in 0 until arr.length()) {
            val o = arr.getJSONObject(i)
            list.add(MotionArcadeObject(
                id = o.optString("id", "obj_$i"),
                label = o.optString("label", ""),
                assetKey = o.optString("assetKey", ""),
                requiredMotion = o.optString("requiredMotion", ""),
                points = o.optInt("points", 10),
                lifeMs = if (o.has("lifeMs")) o.optLong("lifeMs") else null,
                lane = if (o.has("lane")) o.optInt("lane") else null,
                probability = if (o.has("probability")) o.optDouble("probability").toFloat() else null,
                isPenalty = o.optBoolean("isPenalty", false)
            ))
        }
        return list
    }

    private fun parseMatchConfig(json: JSONObject): MatchConfig = MatchConfig(
        strategy = json.optString("strategy", "BY_MOTION"),
        matchWindowMs = json.optLong("matchWindowMs", 200)
    )

    private fun parseExpireConfig(json: JSONObject): ExpireConfig = ExpireConfig(
        action = json.optString("action", "NONE"),
        penaltyPoints = json.optInt("penaltyPoints", 0),
        showFeedback = json.optBoolean("showFeedback", false)
    )

    private fun parsePenaltyObjects(json: JSONObject): PenaltyObjectsConfig = PenaltyObjectsConfig(
        enabled = json.optBoolean("enabled", false),
        objects = json.optJSONArray("objects")?.let { parseObjects(it) } ?: emptyList(),
        penaltyPoints = json.optInt("penaltyPoints", 10),
        penaltyAction = json.optString("penaltyAction", "DEDUCT_SCORE")
    )

    private fun parseObjectDefaults(json: JSONObject): ObjectDefaults = ObjectDefaults(
        lifeMs = json.optLong("lifeMs", 3000),
        hitRadius = json.optDouble("hitRadius", 0.15).toFloat(),
        fadeOutMs = json.optLong("fadeOutMs", 200),
        hitCooldownMs = json.optLong("hitCooldownMs", 300)
    )

    private fun parsePoseContact(json: JSONObject): PoseContactMechanic {
        val targetsArr = json.optJSONArray("targets") ?: JSONArray()
        val targets = mutableListOf<PoseContactTarget>()
        for (i in 0 until targetsArr.length()) {
            val t = targetsArr.getJSONObject(i)
            val hitByArr = t.optJSONArray("hitBy") ?: JSONArray()
            val hitBy = mutableListOf<String>()
            for (j in 0 until hitByArr.length()) hitBy.add(hitByArr.getString(j))
            targets.add(PoseContactTarget(
                targetId = t.optString("targetId", "t$i"),
                x = t.optDouble("x", 0.5).toFloat(),
                y = t.optDouble("y", 0.5).toFloat(),
                radius = t.optDouble("radius", 0.1).toFloat(),
                hitBy = hitBy,
                assetKey = t.optString("assetKey", ""),
                points = t.optInt("points", 10)
            ))
        }
        return PoseContactMechanic(
            targets = targets,
            spawn = json.optJSONObject("spawn")?.let { j ->
                PoseSpawnConfig(
                    intervalMs = j.optLong("intervalMs", 1500),
                    visibleMs = j.optLong("visibleMs", 2000),
                    maxActiveTargets = j.optInt("maxActiveTargets", 2),
                    activateMode = j.optString("activateMode", "RANDOM")
                )
            } ?: PoseSpawnConfig(),
            hitDetection = json.optJSONObject("hitDetection")?.let { j ->
                HitDetectionConfig(
                    minConfidence = j.optDouble("minConfidence", 0.5).toFloat(),
                    hitRadius = j.optDouble("hitRadius", 0.15).toFloat(),
                    hitCooldownMs = j.optLong("hitCooldownMs", 300),
                    loseLifeOnTimeout = j.optBoolean("loseLifeOnTimeout", false)
                )
            } ?: HitDetectionConfig()
        )
    }

    private fun parseQuiz(json: JSONObject): QuizMechanic {
        val qArr = json.optJSONArray("questions") ?: JSONArray()
        val questions = mutableListOf<QuizQuestion>()
        for (i in 0 until qArr.length()) {
            val q = qArr.getJSONObject(i)
            val choicesArr = q.optJSONArray("choices") ?: JSONArray()
            val choices = mutableListOf<String>()
            for (j in 0 until choicesArr.length()) choices.add(choicesArr.getString(j))
            questions.add(QuizQuestion(
                id = q.optString("id", "q$i"),
                prompt = q.optString("prompt", ""),
                choices = choices,
                correctIndex = q.optInt("correctIndex", 0),
                points = q.optInt("points", 10),
                timeLimitSec = if (q.has("timeLimitSec")) q.optInt("timeLimitSec") else null,
                explanation = q.optString("explanation", null)
            ))
        }
        return QuizMechanic(
            questions = questions,
            display = json.optJSONObject("display")?.let { d ->
                QuizDisplayConfig(
                    shuffleQuestions = d.optBoolean("shuffleQuestions", true),
                    shuffleChoices = d.optBoolean("shuffleChoices", true),
                    showCorrectAnswer = d.optBoolean("showCorrectAnswer", true),
                    showProgressBar = d.optBoolean("showProgressBar", true),
                    allowSkip = d.optBoolean("allowSkip", false),
                    autoAdvance = d.optBoolean("autoAdvance", true),
                    autoAdvanceDelayMs = d.optLong("autoAdvanceDelayMs", 1500)
                )
            } ?: QuizDisplayConfig()
        )
    }

    private fun parseStudy(json: JSONObject): StudyMechanic {
        val cardsArr = json.optJSONArray("cards")
        val cards = cardsArr?.let { arr ->
            (0 until arr.length()).map { i ->
                val c = arr.getJSONObject(i)
                StudyCard(
                    id = c.optString("id", "c$i"),
                    frontText = c.optString("frontText", ""),
                    backText = c.optString("backText", ""),
                    imageAssetKey = c.optString("imageAssetKey", null),
                    audioAssetKey = c.optString("audioAssetKey", null)
                )
            }
        }

        val pairsArr = json.optJSONArray("pairs")
        val pairs = pairsArr?.let { arr ->
            (0 until arr.length()).map { i ->
                val p = arr.getJSONObject(i)
                val l = p.optJSONObject("left")
                val r = p.optJSONObject("right")
                StudyPair(
                    id = p.optString("id", "p$i"),
                    left = StudyItem(
                        text = l?.optString("text", null),
                        imageAssetKey = l?.optString("imageAssetKey", null),
                        audioAssetKey = l?.optString("audioAssetKey", null)
                    ),
                    right = StudyItem(
                        text = r?.optString("text", null),
                        imageAssetKey = r?.optString("imageAssetKey", null),
                        audioAssetKey = r?.optString("audioAssetKey", null)
                    )
                )
            }
        }

        return StudyMechanic(
            studyType = json.optString("studyType", "FLASHCARD"),
            cards = cards,
            pairs = pairs,
            display = json.optJSONObject("display")?.let { d ->
                StudyDisplayConfig(
                    shuffleItems = d.optBoolean("shuffleItems", true),
                    showProgress = d.optBoolean("showProgress", true),
                    gridColumns = if (d.has("gridColumns")) d.optInt("gridColumns") else null,
                    revealDelayMs = if (d.has("revealDelayMs")) d.optLong("revealDelayMs") else null,
                    allowFlipBack = d.optBoolean("allowFlipBack", false)
                )
            } ?: StudyDisplayConfig()
        )
    }

    private fun parseHold(json: JSONObject): HoldMechanic {
        return HoldMechanic(
            pose = json.optString("pose", "PLANK"),
            targetHoldSec = json.optInt("targetHoldSec", 30),
            graceMs = json.optLong("graceMs", 500),
            minConfidence = json.optDouble("minConfidence", 0.6).toFloat(),
            customPoseDescription = json.optString("customPoseDescription", null),
            display = json.optJSONObject("display")?.let { d ->
                HoldDisplayConfig(
                    showProgressBar = d.optBoolean("showProgressBar", true),
                    showQualityScore = d.optBoolean("showQualityScore", true),
                    countdownStyle = d.optString("countdownStyle", "PROGRESS_BAR")
                )
            } ?: HoldDisplayConfig()
        )
    }

    private fun parseRhythm(json: JSONObject): RhythmMechanic {
        val notesArr = json.optJSONArray("notes") ?: JSONArray()
        val notes = (0 until notesArr.length()).map { i ->
            val n = notesArr.getJSONObject(i)
            RhythmNote(
                noteId = n.optString("noteId", "n$i"),
                motion = n.optString("motion", ""),
                timingMs = n.optLong("timingMs", 0),
                windowMs = n.optLong("windowMs", 200),
                points = n.optInt("points", 10)
            )
        }
        return RhythmMechanic(
            bpm = json.optInt("bpm", 120),
            notes = notes,
            display = json.optJSONObject("display")?.let { d ->
                RhythmDisplayConfig(
                    noteSpeed = d.optDouble("noteSpeed", 1.0).toFloat(),
                    showBeatIndicator = d.optBoolean("showBeatIndicator", true)
                )
            } ?: RhythmDisplayConfig()
        )
    }

    private fun parseProgram(json: JSONObject): ProgramMechanic {
        val stepsArr = json.optJSONArray("steps") ?: JSONArray()
        val steps = (0 until stepsArr.length()).map { i ->
            val s = stepsArr.getJSONObject(i)
            ProgramStep(
                stepId = s.optString("stepId", "s$i"),
                type = s.optString("type", "INSTRUCTION"),
                title = s.optString("title", ""),
                description = s.optString("description", null),
                motion = s.optString("motion", null),
                targetCount = if (s.has("targetCount")) s.optInt("targetCount") else null,
                pointsPerRep = if (s.has("pointsPerRep")) s.optInt("pointsPerRep") else null,
                holdSec = if (s.has("holdSec")) s.optInt("holdSec") else null,
                durationSec = if (s.has("durationSec")) s.optInt("durationSec") else null,
                nextOnComplete = s.optBoolean("nextOnComplete", true),
                autoAdvance = s.optBoolean("autoAdvance", true)
            )
        }
        return ProgramMechanic(
            steps = steps,
            display = json.optJSONObject("display")?.let { d ->
                ProgramDisplayConfig(
                    showStepIndicator = d.optBoolean("showStepIndicator", true),
                    showRepCounter = d.optBoolean("showRepCounter", true),
                    showRestTimer = d.optBoolean("showRestTimer", false)
                )
            } ?: ProgramDisplayConfig()
        )
    }

    // --- Legacy config -> GameSettings donusumu (geriye uyumluluk) ---

    fun fromLegacyConfig(configJson: JSONObject): GameSettings {
        val templateId = configJson.optString("template", "SCENE_PLAY")
        val kind = TemplateFamily.getKind(templateId)
        val durationSec = configJson.optInt("durationSec", 60)
        val lives = configJson.optInt("lives", 3)
        val targetScore = configJson.optInt("targetScore", 100)
        val orientation = configJson.optString("orientation", "LANDSCAPE")
        val category = configJson.optString("category", "FUN")

        val common = CommonGameSettings(
            templateId = templateId,
            title = configJson.optString("title", ""),
            description = configJson.optString("description", ""),
            category = category,
            lives = LivesSettings(
                mode = if (lives > 0) "LIMITED" else "NONE",
                count = lives,
                gracePeriodSec = 20,
                loseOnBadForm = false,
                loseOnExpire = true,
                loseOnOutOfFrame = false
            ),
            duration = DurationSettings(
                mode = if (durationSec > 0) "TIMED" else "UNTIL_COMPLETE",
                sec = durationSec,
                countdownSec = 3
            ),
            scoring = ScoringSettings(
                targetScore = targetScore,
                pointsPerCorrect = 10,
                penaltyPerWrong = 5,
                comboEnabled = configJson.optBoolean("comboMultiplier", false),
                comboMultiplier = configJson.optDouble("comboMultiplier", 0.1).toFloat(),
                maxComboMultiplier = 3.0f,
                streakBonus = 0
            ),
            completion = CompletionSettings(
                primary = if (targetScore > 0 && lives == 0) "SCORE_TARGET" else "DURATION",
                allowEarlyFinish = targetScore > 0,
                showResultScreen = true
            ),
            presentation = PresentationSettings(
                orientation = orientation,
                cameraRequirement = configJson.optString("cameraRequirement", "FULL_BODY"),
                showTimer = true, showScore = true, showLives = lives > 0, showCombo = true
            ),
            feedback = FeedbackSettings()
        )

        // Legacy mechanic olustur
        val mechanic = when (kind) {
            "MOTION_ARCADE" -> legacyMotionArcade(configJson)
            "POSE_CONTACT" -> legacyPoseContact(configJson)
            else -> MotionArcadeMechanic()
        }

        return GameSettings(schemaVersion = "1.0", common = common, mechanic = mechanic)
    }

    private fun legacyMotionArcade(configJson: JSONObject): MotionArcadeMechanic {
        val spawnRateMs = configJson.optLong("spawnRateMs", configJson.optLong("obstacleSpawnMs", 2400))
        val objectLifeMs = configJson.optLong("objectLifeMs", configJson.optLong("lifeMs", 5000))
        val maxObjects = configJson.optInt("maxObjects", 1)

        // sceneConfig'teki objeleri ekle
        val sceneConfig = configJson.optJSONObject("sceneConfig")
        val objects = mutableListOf<MotionArcadeObject>()

        if (sceneConfig != null) {
            val sceneObjects = sceneConfig.optJSONArray("objects")
            if (sceneObjects != null) {
                for (i in 0 until sceneObjects.length()) {
                    val obj = sceneObjects.getJSONObject(i)
                    objects.add(MotionArcadeObject(
                        id = obj.optString("objectId", obj.optString("id", "legacy_$i")),
                        label = obj.optString("label", ""),
                        assetKey = obj.optString("assetKey", ""),
                        requiredMotion = obj.optString("requiredMotion", "SQUAT"),
                        points = obj.optInt("points", 10),
                        lifeMs = obj.optLong("lifeMs", objectLifeMs),
                        isPenalty = obj.optBoolean("isPenalty", obj.optBoolean("penaltyObject", false))
                    ))
                }
            }
        }

        // Eski commands/obstacles'ları da ekle
        if (objects.isEmpty()) {
            val commands = configJson.optJSONArray("commands")
            if (commands != null) {
                for (i in 0 until commands.length()) {
                    val cmd = commands.getJSONObject(i)
                    objects.add(MotionArcadeObject(
                        id = "cmd_$i",
                        label = cmd.optString("label", "Komut"),
                        assetKey = cmd.optString("assetKey", ""),
                        requiredMotion = cmd.optString("requiredMotion", "SQUAT"),
                        points = cmd.optInt("points", 10),
                        lifeMs = cmd.optLong("lifeMs", objectLifeMs)
                    ))
                }
            }
        }

        if (objects.isEmpty()) {
            objects.add(MotionArcadeObject("default", "Nesne", "default", "SQUAT", 10, objectLifeMs))
        }

        return MotionArcadeMechanic(
            spawn = SpawnConfig(
                strategy = "RANDOM",
                intervalMs = spawnRateMs,
                maxActive = maxObjects,
                initialDelayMs = 0
            ),
            objects = objects,
            match = MatchConfig(strategy = "BY_MOTION", matchWindowMs = 200),
            onExpire = ExpireConfig(
                action = configJson.optString("expireAction", if (configJson.optInt("damageOnMiss", 0) > 0) "LOSE_LIFE" else "NONE"),
                penaltyPoints = configJson.optInt("penaltyPoints", 0),
                showFeedback = true
            ),
            penaltyObjects = null,
            objectDefaults = ObjectDefaults(
                lifeMs = objectLifeMs,
                hitRadius = 0.15f,
                fadeOutMs = 200,
                hitCooldownMs = 300
            )
        )
    }

    private fun legacyPoseContact(configJson: JSONObject): PoseContactMechanic {
        val targetsArr = configJson.optJSONArray("targets") ?: configJson.optJSONObject("sceneConfig")?.optJSONArray("targets") ?: JSONArray()
        val targets = mutableListOf<PoseContactTarget>()
        for (i in 0 until targetsArr.length()) {
            val t = targetsArr.getJSONObject(i)
            val hitByArr = t.optJSONArray("hitBy") ?: JSONArray()
            val hitBy = mutableListOf<String>()
            for (j in 0 until hitByArr.length()) hitBy.add(hitByArr.getString(j))

            if (hitBy.isEmpty()) {
                hitBy.add("LEFT_WRIST")
                hitBy.add("RIGHT_WRIST")
            }

            targets.add(PoseContactTarget(
                targetId = t.optString("targetId", t.optString("id", "t$i")),
                x = t.optDouble("x", 0.5).toFloat(),
                y = t.optDouble("y", 0.5).toFloat(),
                radius = t.optDouble("radius", 0.12).toFloat(),
                hitBy = hitBy,
                assetKey = t.optString("assetKey", ""),
                points = t.optInt("points", 10)
            ))
        }

        return PoseContactMechanic(
            targets = targets.ifEmpty {
                listOf(PoseContactTarget("t0", 0.5f, 0.5f, 0.12f, listOf("LEFT_WRIST", "RIGHT_WRIST"), "target", 10))
            },
            spawn = PoseSpawnConfig(
                intervalMs = configJson.optLong("spawnIntervalMs", 1200),
                visibleMs = configJson.optLong("visibleMs", 1500),
                maxActiveTargets = configJson.optInt("maxActiveTargets", 2),
                activateMode = "RANDOM"
            ),
            hitDetection = HitDetectionConfig(
                minConfidence = 0.5f,
                hitRadius = 0.15f,
                hitCooldownMs = 300,
                loseLifeOnTimeout = configJson.optBoolean("loseLifeOnTimeout", true)
            )
        )
    }
}
