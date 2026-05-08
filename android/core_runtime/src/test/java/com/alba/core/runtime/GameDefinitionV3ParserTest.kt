package com.alba.core.runtime

import com.alba.core.motion.MotionType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class GameDefinitionV3ParserTest {

    @Test
    fun parsesValidScenePlayDefinition() {
        val result = GameDefinitionV3Parser.parse(validDefinitionJson())

        assertTrue(result.errors.toString(), result.isSuccess)
        assertEquals("deve_cuce_001", result.definition?.gameKey)
        assertEquals(listOf(MotionType.SQUAT, MotionType.JUMPING_JACK), result.definition?.supportedMotions)
        assertEquals("cuce_prompt", result.definition?.levels?.first()?.scene?.objects?.first()?.objectId)
    }

    @Test
    fun rejectsUnknownActions() {
        val result = GameDefinitionV3Parser.parse(
            validDefinitionJson().replace("\"ADD_SCORE\"", "\"TELEPORT_PLAYER\"")
        )

        assertFalse(result.isSuccess)
        assertTrue(result.errors.contains("UNKNOWN_ACTION:$.levels[0].rules[0].then[0].type"))
    }

    @Test
    fun rejectsUnsupportedCapabilities() {
        val result = GameDefinitionV3Parser.parse(
            validDefinitionJson().replace("\"TIMER\"", "\"SCRIPTING\"")
        )

        assertFalse(result.isSuccess)
        assertTrue(result.errors.contains("UNSUPPORTED_CAPABILITY:$.capabilities[4]"))
    }

    @Test
    fun rejectsUnknownFields() {
        val result = GameDefinitionV3Parser.parse(
            validDefinitionJson().replace("\"levels\"", "\"unexpectedRootField\": true, \"levels\"")
        )

        assertFalse(result.isSuccess)
        assertTrue(result.errors.contains("UNKNOWN_FIELD:$.unexpectedRootField"))
    }

    @Test
    fun parsesAllSceneObjectFields() {
        val result = GameDefinitionV3Parser.parse(validDefinitionJson())

        assertTrue(result.errors.toString(), result.isSuccess)
        val objects = result.definition!!.levels.first().scene.objects
        assertEquals(2, objects.size)

        val cuce = objects[0]
        assertEquals("cuce_prompt", cuce.objectId)
        assertEquals("Cuce", cuce.label)
        assertEquals("cuceCard", cuce.assetKey)
        assertEquals(MotionType.SQUAT, cuce.requiredMotion)
        assertEquals(10, cuce.points)
        assertEquals(2400, cuce.lifeMs)

        val deve = objects[1]
        assertEquals("deve_prompt", deve.objectId)
        assertEquals("Deve", deve.label)
        assertEquals("deveCard", deve.assetKey)
        assertEquals(MotionType.JUMPING_JACK, deve.requiredMotion)
        assertEquals(12, deve.points)
        assertEquals(2400, deve.lifeMs)
    }

    @Test
    fun retainsProgramStepSuccessMessage() {
        val result = GameDefinitionV3Parser.parse(validDefinitionJson())

        assertTrue(result.errors.toString(), result.isSuccess)
        val steps = result.definition!!.levels.first().programSteps
        assertEquals(2, steps.size)
        assertNotNull(steps[0].successMessage)
        assertEquals("Hazirlik tamamlandi", steps[0].successMessage)
        assertNotNull(steps[1].successMessage)
        assertEquals("Oyun basarili", steps[1].successMessage)
    }

    @Test
    fun rejectsMalformedJson() {
        val result = GameDefinitionV3Parser.parse("not valid json at all")

        assertFalse(result.isSuccess)
        assertNull(result.definition)
        assertTrue(result.errors.any { it.startsWith("INVALID_JSON") })
    }

    @Test
    fun rejectsJsonArrayInsteadOfObject() {
        val result = GameDefinitionV3Parser.parse("[]")

        assertFalse(result.isSuccess)
        assertNull(result.definition)
        assertTrue(result.errors.any { it.startsWith("INVALID_JSON") })
    }

    @Test
    fun rejectsUnsupportedSchemaVersion() {
        val result = GameDefinitionV3Parser.parse(
            validDefinitionJson().replace("\"3.0\"", "\"2.0\"")
        )

        assertFalse(result.isSuccess)
        assertNull(result.definition)
        assertTrue(
            "Expected UNSUPPORTED_SCHEMA_VERSION error but got: ${result.errors}",
            result.errors.any { it.contains("UNSUPPORTED_SCHEMA_VERSION") }
        )
    }

    @Test
    fun rejectsMissingRequiredFields() {
        val result = GameDefinitionV3Parser.parse("{}")

        assertFalse(result.isSuccess)
        assertNull(result.definition)
        assertTrue(
            "Expected at least one MISSING_REQUIRED_FIELD error but got: ${result.errors}",
            result.errors.any { it.startsWith("MISSING_REQUIRED_FIELD") }
        )
    }

    private fun validDefinitionJson(): String = """
        {
          "schemaVersion": "3.0",
          "gameKey": "deve_cuce_001",
          "version": 1,
          "title": "Deve Cuce",
          "description": "Komuta gore hareket et.",
          "category": "education",
          "tags": ["kids", "reaction", "motion"],
          "minAppVersion": "0.2.0",
          "minRuntimeVersion": "2.0.0",
          "orientation": "landscape",
          "cameraRequirement": "full_body",
          "capabilities": ["MOTION_EVENT", "SCENE_OBJECTS", "PROGRAM_STEPS", "AUDIO", "TIMER"],
          "supportedMotions": ["SQUAT", "JUMPING_JACK"],
          "assetManifest": {
            "items": [
              {
                "key": "background",
                "kind": "IMAGE",
                "format": "PNG",
                "uri": "local://scene-play/background",
                "sha256": "local-scene-background",
                "bytes": 1024
              },
              {
                "key": "cuceCard",
                "kind": "IMAGE",
                "format": "PNG",
                "uri": "local://scene-play/cuce",
                "sha256": "local-scene-cuce",
                "bytes": 1024
              },
              {
                "key": "deveCard",
                "kind": "IMAGE",
                "format": "PNG",
                "uri": "local://scene-play/deve",
                "sha256": "local-scene-deve",
                "bytes": 1024
              }
            ]
          },
          "levels": [
            {
              "levelId": "level_1",
              "durationSec": 60,
              "targetScore": 300,
              "difficulty": "easy",
              "scene": {
                "type": "PROMPT_SEQUENCE",
                "maxObjects": 1,
                "spawnRateMs": 1800,
                "objects": [
                  {
                    "objectId": "cuce_prompt",
                    "label": "Cuce",
                    "assetKey": "cuceCard",
                    "requiredMotion": "SQUAT",
                    "lifeMs": 2400,
                    "points": 10
                  },
                  {
                    "objectId": "deve_prompt",
                    "label": "Deve",
                    "assetKey": "deveCard",
                    "requiredMotion": "JUMPING_JACK",
                    "lifeMs": 2400,
                    "points": 12
                  }
                ]
              },
              "rules": [
                {
                  "ruleId": "correct_cuce",
                  "priority": 100,
                  "when": {
                    "type": "MOTION_EVENT",
                    "event": "REP_COUNTED",
                    "motion": "SQUAT",
                    "targetObjectId": "cuce_prompt"
                  },
                  "then": [
                    { "type": "ADD_SCORE", "amount": 10 },
                    { "type": "REMOVE_OBJECT", "target": "cuce_prompt" },
                    { "type": "ADD_COMBO", "amount": 1 }
                  ],
                  "cooldownMs": 500
                },
                {
                  "ruleId": "bad_form",
                  "priority": 10,
                  "when": {
                    "type": "MOTION_EVENT",
                    "event": "BAD_FORM"
                  },
                  "then": [
                    { "type": "RESET_COMBO" },
                    { "type": "ADD_SCORE", "amount": -5 }
                  ],
                  "cooldownMs": 250
                }
              ],
              "programSteps": [
                {
                  "stepId": "intro",
                  "type": "INSTRUCTION",
                  "title": "Hazir ol",
                  "description": "Cuce gelirse squat, deve gelirse jumping jack yap.",
                  "durationSec": 5,
                  "successMessage": "Hazirlik tamamlandi",
                  "nextOnComplete": true
                },
                {
                  "stepId": "play",
                  "type": "PLAY_GAME",
                  "title": "Oyunu oyna",
                  "durationSec": 60,
                  "successMessage": "Oyun basarili",
                  "nextOnComplete": true
                }
              ],
              "rewards": [
                {
                  "rewardId": "three_star",
                  "type": "STAR",
                  "amount": 3,
                  "condition": {
                    "minimumScore": 250
                  }
                }
              ]
            }
          ]
        }
    """.trimIndent()
}
