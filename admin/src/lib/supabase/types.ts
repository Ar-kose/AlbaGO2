// Supabase schema types matching the albago_foundation schema

export type MotionType = 'SQUAT' | 'JUMPING_JACK' | 'JUMP_ROPE';
export type PublishStatus = 'draft' | 'review' | 'scheduled' | 'published' | 'archived';
export type GameTemplate = 'TARGET_HIT' | 'ENDLESS_RUNNER' | 'FRUIT_SLASH' | 'DODGE_RUN' | 'FIT_CHALLENGE' | 'SCENE_PLAY';
export type PublicDemoTemplate = 'FRUIT_SLASH' | 'DODGE_RUN' | 'FIT_CHALLENGE' | 'SCENE_PLAY';
export type GameOrientation = 'portrait' | 'landscape';
export type CameraRequirement = 'full_body' | 'upper_body' | 'hand_target';
export type GameCategory = 'sport' | 'education' | 'entertainment' | 'demo';
export type ProgramStepType = 'MOTION_REPS' | 'HOLD_POSE' | 'REST' | 'INSTRUCTION' | 'PLAY_GAME';

// DB row types matching Supabase tables

export interface GameRow {
  id: string;
  game_key: string;
  title: string;
  description: string | null;
  category: GameCategory;
  content_category_id: string | null;
  template_id: string | null;
  cover_asset_id: string | null;
  banner_asset_id: string | null;
  status: PublishStatus;
  min_app_version: string | null;
  orientation: GameOrientation | null;
  requires_camera: boolean;
  default_duration_sec: number | null;
  sort_order: number;
  search_terms: string | null;
  tags: string[] | null;
  config: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface GameVersionRow {
  id: string;
  game_id: string;
  version: string;
  status: PublishStatus;
  published_at: string | null;
  min_app_version: string | null;
  segment_rules: Record<string, unknown> | null;
  supported_motions: MotionType[] | null;
  asset_manifest: Record<string, unknown> | null;
  runtime_contract: Record<string, unknown> | null;
  changelog: string | null;
  created_at: string;
  updated_at: string;
}

export interface GameLevelRow {
  id: string;
  game_version_id: string;
  level_key: string;
  level_index: number;
  title: string;
  duration_sec: number;
  target_score: number;
  difficulty: string;
  scene_config: Record<string, unknown> | null;
  runtime_config: Record<string, unknown> | null;
  created_at: string;
}

export interface GameProgramStepRow {
  id: string;
  game_level_id: string;
  step_key: string;
  step_type: ProgramStepType;
  title: string;
  motion: MotionType | null;
  target_count: number | null;
  hold_sec: number | null;
  duration_sec: number | null;
  success_message: string | null;
  is_required: boolean;
  sort_order: number;
  created_at: string;
}

export interface GameMotionRuleRow {
  id: string;
  game_version_id: string;
  motion: MotionType;
  rule_key: string;
  label: string;
  min_confidence: number;
  cooldown_ms: number;
  scoring: Record<string, unknown> | null;
  config: Record<string, unknown> | null;
  sort_order: number;
  created_at: string;
}

export interface GameRewardRuleRow {
  id: string;
  game_version_id: string;
  reward_type: string;
  rule_key: string;
  title: string;
  amount: number;
  trigger_event: string;
  conditions: Record<string, unknown> | null;
  config: Record<string, unknown> | null;
  created_at: string;
}

export interface GameInteractionRuleRow {
  id: string;
  game_version_id: string;
  interaction_key: string;
  interaction_type: string;
  title: string;
  description: string | null;
  motion: MotionType | null;
  interaction_payload: Record<string, unknown> | null;
  sort_order: number;
  created_at: string;
}

export interface AssetFileRow {
  id: string;
  path: string;
  storage_bucket: string;
  public_url: string | null;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  size_bytes: number | null;
  sha256: string | null;
  kind: string;
  format: string;
  source_set: Record<string, unknown> | null;
  title: string | null;
  alt_text: string | null;
  dominant_color: string | null;
  is_published: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface AuditLogRow {
  id: string;
  profile_id: string;
  action: string;
  entity_table: string;
  entity_id: string;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface ProfileRow {
  id: string;
  display_name: string | null;
  status: 'guest' | 'active' | 'suspended' | 'deleted';
  guest_token: string | null;
  locale: string;
  timezone: string;
  onboarding_completed_at: string | null;
  last_seen_at: string | null;
  settings: Record<string, unknown> | null;
  avatar_asset_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeviceRow {
  id: string;
  profile_id: string | null;
  install_id: string;
  platform: 'ios' | 'android' | 'web' | 'admin_web';
  app_version: string | null;
  os_version: string | null;
  device_model: string | null;
  push_token: string | null;
  camera_capabilities: Record<string, unknown> | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GameSessionRow {
  id: string;
  profile_id: string;
  game_id: string;
  game_version_id: string;
  game_level_id: string | null;
  device_id: string | null;
  status: 'active' | 'completed' | 'abandoned' | 'failed';
  started_at: string;
  ended_at: string | null;
  duration_sec: number | null;
  score: number;
  combo: number;
  accuracy: number | null;
  calories: number;
  result_payload: Record<string, unknown> | null;
  created_at: string;
}

export interface WorkoutSessionRow {
  id: string;
  profile_id: string;
  mode_id: string | null;
  device_id: string | null;
  status: 'active' | 'completed' | 'abandoned' | 'failed';
  source_screen_key: string | null;
  started_at: string;
  ended_at: string | null;
  duration_sec: number | null;
  calories: number;
  score: number;
  motion_summary: Record<string, unknown> | null;
  created_at: string;
}

export interface DailyGoalRow {
  id: string;
  goal_key: string;
  title: string;
  mode_id: string | null;
  metric_key: string;
  target_value: number;
  unit: string;
  reward_type: string;
  reward_amount: number;
  active: boolean;
  config: Record<string, unknown> | null;
  created_at: string;
}

export interface LeaderboardEntryRow {
  id: string;
  profile_id: string | null;
  game_id: string | null;
  challenge_id: string | null;
  scope: 'global' | 'friends' | 'room' | 'challenge';
  period: 'daily' | 'weekly' | 'monthly' | 'season' | 'all_time';
  period_start: string | null;
  period_end: string | null;
  rank: number;
  score: number;
  display_name: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}
