package com.alba.core.network

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonObject

// ─── Games ───

@Serializable
data class GameRow(
    val id: String,
    @SerialName("game_key") val gameKey: String,
    val title: String,
    val description: String? = null,
    val category: String? = null,
    @SerialName("content_category_id") val contentCategoryId: String? = null,
    @SerialName("template_id") val templateId: String? = null,
    @SerialName("cover_asset_id") val coverAssetId: String? = null,
    @SerialName("banner_asset_id") val bannerAssetId: String? = null,
    val status: String = "draft",
    @SerialName("min_app_version") val minAppVersion: String? = null,
    val orientation: String? = null,
    @SerialName("requires_camera") val requiresCamera: Boolean = false,
    @SerialName("default_duration_sec") val defaultDurationSec: Int? = null,
    @SerialName("sort_order") val sortOrder: Int = 0,
    @SerialName("search_terms") val searchTerms: String? = null,
    val tags: List<String>? = null,
    val config: JsonObject? = null,
    val metadata: JsonObject? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null
)

@Serializable
data class GameVersionRow(
    val id: String,
    @SerialName("game_id") val gameId: String,
    val version: String,
    val status: String = "draft",
    @SerialName("published_at") val publishedAt: String? = null,
    @SerialName("min_app_version") val minAppVersion: String? = null,
    @SerialName("segment_rules") val segmentRules: JsonObject? = null,
    @SerialName("supported_motions") val supportedMotions: List<String>? = null,
    @SerialName("asset_manifest") val assetManifest: JsonObject? = null,
    @SerialName("runtime_contract") val runtimeContract: JsonObject? = null,
    val changelog: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null
)

@Serializable
data class GameLevelRow(
    val id: String,
    @SerialName("game_version_id") val gameVersionId: String,
    @SerialName("level_key") val levelKey: String,
    @SerialName("level_index") val levelIndex: Int = 0,
    val title: String,
    @SerialName("duration_sec") val durationSec: Int,
    @SerialName("target_score") val targetScore: Int = 0,
    val difficulty: String = "EASY",
    @SerialName("scene_config") val sceneConfig: JsonObject? = null,
    @SerialName("runtime_config") val runtimeConfig: JsonObject? = null,
    @SerialName("created_at") val createdAt: String? = null
)

@Serializable
data class GameProgramStepRow(
    val id: String,
    @SerialName("game_level_id") val gameLevelId: String,
    @SerialName("step_key") val stepKey: String,
    @SerialName("step_type") val stepType: String,
    val title: String,
    val motion: String? = null,
    @SerialName("target_count") val targetCount: Int? = null,
    @SerialName("hold_sec") val holdSec: Int? = null,
    @SerialName("duration_sec") val durationSec: Int? = null,
    @SerialName("success_message") val successMessage: String? = null,
    @SerialName("is_required") val isRequired: Boolean = true,
    @SerialName("sort_order") val sortOrder: Int = 0,
    @SerialName("created_at") val createdAt: String? = null
)

@Serializable
data class GameMotionRuleRow(
    val id: String,
    @SerialName("game_version_id") val gameVersionId: String,
    val motion: String,
    @SerialName("rule_key") val ruleKey: String,
    val label: String,
    @SerialName("min_confidence") val minConfidence: Double = 0.65,
    @SerialName("cooldown_ms") val cooldownMs: Int = 250,
    val scoring: JsonObject? = null,
    val config: JsonObject? = null,
    @SerialName("sort_order") val sortOrder: Int = 0,
    @SerialName("created_at") val createdAt: String? = null
)

@Serializable
data class GameRewardRuleRow(
    val id: String,
    @SerialName("game_version_id") val gameVersionId: String,
    @SerialName("reward_type") val rewardType: String,
    @SerialName("rule_key") val ruleKey: String,
    val title: String,
    val amount: Int = 0,
    @SerialName("trigger_event") val triggerEvent: String = "session_completed",
    val conditions: JsonObject? = null,
    val config: JsonObject? = null,
    @SerialName("created_at") val createdAt: String? = null
)

@Serializable
data class GameInteractionRuleRow(
    val id: String,
    @SerialName("game_version_id") val gameVersionId: String,
    @SerialName("interaction_key") val interactionKey: String,
    @SerialName("interaction_type") val interactionType: String,
    val title: String,
    val description: String? = null,
    val motion: String? = null,
    @SerialName("interaction_payload") val interactionPayload: JsonObject? = null,
    @SerialName("sort_order") val sortOrder: Int = 0,
    @SerialName("created_at") val createdAt: String? = null
)

// ─── Profiles & Devices ───

@Serializable
data class ProfileRow(
    val id: String,
    @SerialName("display_name") val displayName: String? = null,
    val status: String = "active",
    @SerialName("guest_token") val guestToken: String? = null,
    val locale: String = "tr-TR",
    val timezone: String = "Europe/Istanbul",
    @SerialName("onboarding_completed_at") val onboardingCompletedAt: String? = null,
    @SerialName("last_seen_at") val lastSeenAt: String? = null,
    val settings: JsonObject? = null,
    @SerialName("avatar_asset_id") val avatarAssetId: String? = null,
    @SerialName("created_at") val createdAt: String? = null
)

@Serializable
data class DeviceRow(
    val id: String,
    @SerialName("profile_id") val profileId: String? = null,
    @SerialName("install_id") val installId: String,
    val platform: String = "android",
    @SerialName("app_version") val appVersion: String? = null,
    @SerialName("os_version") val osVersion: String? = null,
    @SerialName("device_model") val deviceModel: String? = null,
    @SerialName("push_token") val pushToken: String? = null,
    @SerialName("camera_capabilities") val cameraCapabilities: JsonObject? = null,
    @SerialName("last_seen_at") val lastSeenAt: String? = null,
    @SerialName("created_at") val createdAt: String? = null
)

// ─── Sessions ───

@Serializable
data class WorkoutSessionRow(
    val id: String,
    @SerialName("profile_id") val profileId: String,
    @SerialName("mode_id") val modeId: String? = null,
    @SerialName("device_id") val deviceId: String? = null,
    val status: String = "active",
    @SerialName("source_screen_key") val sourceScreenKey: String? = null,
    @SerialName("started_at") val startedAt: String,
    @SerialName("ended_at") val endedAt: String? = null,
    @SerialName("duration_sec") val durationSec: Int? = null,
    val calories: Double = 0.0,
    val score: Int = 0,
    @SerialName("motion_summary") val motionSummary: JsonObject? = null,
    @SerialName("created_at") val createdAt: String? = null
)

@Serializable
data class GameSessionRow(
    val id: String,
    @SerialName("profile_id") val profileId: String,
    @SerialName("game_id") val gameId: String,
    @SerialName("game_version_id") val gameVersionId: String,
    @SerialName("game_level_id") val gameLevelId: String? = null,
    @SerialName("device_id") val deviceId: String? = null,
    val status: String = "active",
    @SerialName("started_at") val startedAt: String,
    @SerialName("ended_at") val endedAt: String? = null,
    @SerialName("duration_sec") val durationSec: Int? = null,
    val score: Int = 0,
    val combo: Int = 0,
    val accuracy: Double? = null,
    val calories: Double = 0.0,
    @SerialName("result_payload") val resultPayload: JsonObject? = null,
    @SerialName("created_at") val createdAt: String? = null
)

@Serializable
data class WorkoutEventRow(
    val id: String,
    @SerialName("workout_session_id") val workoutSessionId: String,
    @SerialName("event_type") val eventType: String,
    val motion: String? = null,
    val confidence: Double? = null,
    @SerialName("occurred_at") val occurredAt: String,
    val payload: JsonObject? = null,
    @SerialName("created_at") val createdAt: String? = null
)

@Serializable
data class GameSessionMotionCountRow(
    val id: String,
    @SerialName("game_session_id") val gameSessionId: String,
    val motion: String,
    val count: Int = 0,
    @SerialName("max_confidence") val maxConfidence: Double? = null,
    @SerialName("duration_sec") val durationSec: Int? = null,
    @SerialName("created_at") val createdAt: String? = null
)

// ─── Daily Goals & Leaderboards ───

@Serializable
data class DailyGoalRow(
    val id: String,
    @SerialName("goal_key") val goalKey: String,
    val title: String,
    @SerialName("mode_id") val modeId: String? = null,
    @SerialName("metric_key") val metricKey: String,
    @SerialName("target_value") val targetValue: Int = 0,
    val unit: String = "count",
    @SerialName("reward_type") val rewardType: String = "xp",
    @SerialName("reward_amount") val rewardAmount: Int = 0,
    val active: Boolean = true,
    val config: JsonObject? = null,
    @SerialName("created_at") val createdAt: String? = null
)

@Serializable
data class LeaderboardEntryRow(
    val id: String,
    @SerialName("profile_id") val profileId: String? = null,
    @SerialName("game_id") val gameId: String? = null,
    @SerialName("challenge_id") val challengeId: String? = null,
    val scope: String = "global",
    val period: String = "all_time",
    @SerialName("period_start") val periodStart: String? = null,
    @SerialName("period_end") val periodEnd: String? = null,
    val rank: Int = 0,
    val score: Int = 0,
    @SerialName("display_name") val displayName: String? = null,
    val metadata: JsonObject? = null,
    @SerialName("created_at") val createdAt: String? = null
)

// ─── Reward Grants ───

@Serializable
data class RewardGrantRow(
    val id: String,
    @SerialName("profile_id") val profileId: String,
    @SerialName("source_type") val sourceType: String,
    @SerialName("source_id") val sourceId: String,
    @SerialName("reward_type") val rewardType: String,
    val amount: Int = 0,
    @SerialName("idempotency_key") val idempotencyKey: String? = null,
    @SerialName("created_at") val createdAt: String? = null
)

// ─── Live Rooms ───

@Serializable
data class LiveRoomRow(
    val id: String,
    @SerialName("room_key") val roomKey: String,
    val title: String,
    val description: String? = null,
    @SerialName("game_id") val gameId: String? = null,
    @SerialName("host_profile_id") val hostProfileId: String? = null,
    @SerialName("cover_asset_id") val coverAssetId: String? = null,
    val status: String = "open",
    @SerialName("max_participants") val maxParticipants: Int = 4,
    @SerialName("starts_at") val startsAt: String? = null,
    @SerialName("ends_at") val endsAt: String? = null,
    @SerialName("participant_count") val participantCount: Int = 0,
    val config: JsonObject? = null,
    @SerialName("created_at") val createdAt: String? = null
)
