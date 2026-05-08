package com.alba.core.network

import kotlinx.coroutines.runBlocking
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import org.junit.Assert.assertTrue
import org.junit.Test

class GameSessionApiClientTest {
    private val json = Json { encodeDefaults = true }

    @Test
    fun submitRequestSerializesStableIdempotencyFields() {
        val body = json.encodeToString(sampleRequest())

        assertTrue(body.contains("\"clientSessionId\":\"client-1\""))
        assertTrue(body.contains("\"gameKey\":\"fruit_slash_demo\""))
        assertTrue(body.contains("\"score\":420"))
        assertTrue(body.contains("\"motionSummary\""))
    }

    @Test
    fun submitGameSessionResultReturnsFailureWithoutThrowingWhenNetworkFails() = runBlocking {
        AlbaSupabase.setBackendBaseUrl("http://127.0.0.1:9/v1")

        val result = SupabaseData.submitGameSessionResult(sampleRequest())

        assertTrue(result.isFailure)
    }

    private fun sampleRequest() = GameSessionSubmitRequest(
        clientSessionId = "client-1",
        gameKey = "fruit_slash_demo",
        gameDefinitionVersion = 1,
        startedAt = "2026-05-08T12:00:00.000Z",
        endedAt = "2026-05-08T12:01:00.000Z",
        durationSec = 60,
        score = 420,
        combo = 8,
        accuracy = 0.82,
        resultPayload = JsonObject(
            mapOf(
                "template" to JsonPrimitive("FRUIT_SLASH"),
                "motionSummary" to JsonObject(mapOf("SQUAT" to JsonPrimitive(4)))
            )
        )
    )
}
