import { supabase } from './supabase/client';
import type {
  GameRow,
  GameVersionRow,
  GameLevelRow,
  GameProgramStepRow,
  GameMotionRuleRow,
  GameRewardRuleRow,
  GameInteractionRuleRow,
  AssetFileRow,
  AuditLogRow,
} from './supabase/types';

// Re-export types for backward compatibility
export type MotionType = 'SQUAT' | 'JUMPING_JACK' | 'JUMP_ROPE';
export type PublishStatus = 'draft' | 'review' | 'scheduled' | 'published' | 'archived';
export type GameTemplate =
  | 'TARGET_HIT'
  | 'ENDLESS_RUNNER'
  | 'FRUIT_SLASH'
  | 'DODGE_RUN'
  | 'FIT_CHALLENGE'
  | 'SCENE_PLAY';
export type PublicDemoTemplate = 'FRUIT_SLASH' | 'DODGE_RUN' | 'FIT_CHALLENGE' | 'SCENE_PLAY';
export type GameOrientation = 'portrait' | 'landscape';
export type CameraRequirement = 'full_body' | 'upper_body' | 'hand_target';
export type GameCategory = 'sport' | 'education' | 'entertainment' | 'demo';
export type ProgramStepType = 'MOTION_REPS' | 'HOLD_POSE' | 'REST' | 'INSTRUCTION' | 'PLAY_GAME';
export type GameAction =
  | 'ADD_SCORE'
  | 'REMOVE_OBJECT'
  | 'RESET_COMBO'
  | 'DECREASE_LIFE'
  | 'PROGRESS_TASK'
  | 'PAUSE_GAME'
  | 'SHOW_EFFECT'
  | 'COMPLETE_LEVEL';

// DTO types used by UI components
export interface MotionRuleDto {
  motion: MotionType;
  event: 'REP_COUNTED' | 'BAD_FORM' | 'USER_OUT_OF_FRAME' | 'PAUSED' | 'RESUMED';
  points: number;
  cooldownMs: number;
}

export interface RewardRuleDto {
  rewardType: string;
  amount: number;
  minimumScore: number;
}

export interface TaskRuleDto {
  motion: MotionType;
  targetCount: number;
  pointsPerRep: number;
}

export interface ProgramStepDto {
  stepId: string;
  type: ProgramStepType;
  title: string;
  description?: string;
  motion?: MotionType;
  targetCount?: number;
  holdSec?: number;
  durationSec?: number;
  successMessage?: string;
  nextOnComplete?: boolean;
}

export interface GameLevelDto {
  levelId: string;
  durationSec: number;
  targetScore: number;
  difficulty: string;
  motionRules: MotionRuleDto[];
  rewardRules: RewardRuleDto[];
  config: Record<string, unknown>;
  sceneConfig: Record<string, unknown>;
  interactionRules: InteractionRuleDto[];
  tasks: TaskRuleDto[];
  programSteps: ProgramStepDto[];
}

export interface InteractionRuleDto {
  input: 'MOTION_EVENT' | 'POSE_CONTACT';
  event?: MotionRuleDto['event'];
  motion?: MotionType;
  targetObjectType?: string;
  keypoints?: string[];
  action: GameAction;
  points?: number;
  cooldownMs?: number;
}

export interface GameAssetDto {
  id?: string;
  key: string;
  kind: 'IMAGE' | 'AUDIO';
  format: 'PNG' | 'WEBP' | 'SVG' | 'MP3';
  uri: string;
  mimeType?: string;
  width?: number;
  height?: number;
  sha256?: string;
  bytes?: number;
  createdAt?: string;
}

export interface AssetDto {
  background: string;
  character: string;
  soundtrack?: string;
  items?: GameAssetDto[];
}

export interface GameDefinitionDto {
  id: string;
  gameKey: string;
  version: number;
  template: GameTemplate;
  title: string;
  description: string;
  status: PublishStatus;
  minAppVersion: string;
  category: GameCategory;
  tags: string[];
  orientation: GameOrientation;
  cameraRequirement: CameraRequirement;
  supportedMotions: MotionType[];
  levels: GameLevelDto[];
  assets: AssetDto;
  publishedAt?: string;
}

export interface AuditLogDto {
  id: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
}

export interface ValidationResponse {
  id: string;
  errors: string[];
}

export interface GameDefinitionDraft {
  gameKey: string;
  template: GameTemplate;
  title: string;
  description: string;
  minAppVersion: string;
  category: GameCategory;
  tags: string[];
  orientation: GameOrientation;
  cameraRequirement: CameraRequirement;
  supportedMotions: MotionType[];
  levels: GameLevelDto[];
  assets: AssetDto;
  status?: PublishStatus;
  actorId?: string;
}

// ─── Supabase query helpers ───

async function fetchGameWithRelations(gameId: string): Promise<GameDefinitionDto | null> {
  const { data: game, error: gameErr } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single();

  if (gameErr || !game) return null;

  const { data: versions, error: verErr } = await supabase
    .from('game_versions')
    .select('*')
    .eq('game_id', gameId)
    .order('created_at', { ascending: false });

  if (verErr || !versions?.length) return null;
  const latestVersion = versions[0];

  const { data: levels } = await supabase
    .from('game_levels')
    .select('*')
    .eq('game_version_id', latestVersion.id)
    .order('level_index', { ascending: true });

  const levelIds = levels?.map((l) => l.id) ?? [];

  const { data: programSteps } = levelIds.length
    ? await supabase.from('game_program_steps').select('*').in('game_level_id', levelIds).order('sort_order', { ascending: true })
    : { data: [] };

  const { data: motionRules } = await supabase
    .from('game_motion_rules')
    .select('*')
    .eq('game_version_id', latestVersion.id)
    .order('sort_order', { ascending: true });

  const { data: rewardRules } = await supabase
    .from('game_reward_rules')
    .select('*')
    .eq('game_version_id', latestVersion.id);

  const { data: interactionRules } = await supabase
    .from('game_interaction_rules')
    .select('*')
    .eq('game_version_id', latestVersion.id)
    .order('sort_order', { ascending: true });

  return mapGameToDto(game, latestVersion, levels ?? [], programSteps ?? [], motionRules ?? [], rewardRules ?? [], interactionRules ?? []);
}

function mapGameToDto(
  game: GameRow,
  version: GameVersionRow,
  levels: GameLevelRow[],
  programSteps: GameProgramStepRow[],
  motionRules: GameMotionRuleRow[],
  rewardRules: GameRewardRuleRow[],
  interactionRules: GameInteractionRuleRow[],
): GameDefinitionDto {
  const stepsByLevel = new Map<string, GameProgramStepRow[]>();
  for (const s of programSteps) {
    const list = stepsByLevel.get(s.game_level_id) ?? [];
    list.push(s);
    stepsByLevel.set(s.game_level_id, list);
  }

  return {
    id: game.id,
    gameKey: game.game_key,
    version: parseInt(version.version, 10) || 1,
    template: (game.config?.template as GameTemplate) ?? game.game_key.toUpperCase() as GameTemplate,
    title: game.title,
    description: game.description ?? '',
    status: game.status,
    minAppVersion: version.min_app_version ?? game.min_app_version ?? '0.1.0',
    category: game.category,
    tags: game.tags ?? [],
    orientation: game.orientation ?? 'portrait',
    cameraRequirement: (game.requires_camera ? 'full_body' : 'hand_target') as CameraRequirement,
    supportedMotions: (version.supported_motions ?? []) as MotionType[],
    publishedAt: version.published_at ?? undefined,
    assets: (game.metadata?.assets as AssetDto) ?? { background: '', character: '' },
    levels: levels.map((l) => {
      const steps = (stepsByLevel.get(l.id) ?? []).map(
        (s): ProgramStepDto => ({
          stepId: s.step_key,
          type: s.step_type,
          title: s.title,
          motion: s.motion as MotionType | undefined,
          targetCount: s.target_count ?? undefined,
          holdSec: s.hold_sec ?? undefined,
          durationSec: s.duration_sec ?? undefined,
          successMessage: s.success_message ?? undefined,
          nextOnComplete: s.is_required,
        }),
      );

      const levelMotionRules: MotionRuleDto[] = motionRules.map((mr) => ({
        motion: mr.motion,
        event: (mr.config?.event as MotionRuleDto['event']) ?? 'REP_COUNTED',
        points: (mr.scoring?.points as number) ?? 0,
        cooldownMs: mr.cooldown_ms,
      }));

      const levelRewardRules: RewardRuleDto[] = rewardRules.map((rr) => ({
        rewardType: rr.reward_type,
        amount: rr.amount,
        minimumScore: (rr.conditions?.minimumScore as number) ?? 0,
      }));

      const levelInteractionRules: InteractionRuleDto[] = interactionRules.map((ir) => ({
        input: ir.interaction_type as InteractionRuleDto['input'],
        event: (ir.interaction_payload?.event as MotionRuleDto['event']) ?? undefined,
        motion: ir.motion as MotionType | undefined,
        targetObjectType: (ir.interaction_payload?.targetObjectType as string) ?? undefined,
        keypoints: (ir.interaction_payload?.keypoints as string[]) ?? undefined,
        action: (ir.interaction_payload?.action as GameAction) ?? 'ADD_SCORE',
        points: (ir.interaction_payload?.points as number) ?? undefined,
        cooldownMs: (ir.interaction_payload?.cooldownMs as number) ?? undefined,
      }));

      let tasks: TaskRuleDto[] = [];
      if (l.runtime_config?.tasks) {
        tasks = l.runtime_config.tasks as TaskRuleDto[];
      }

      return {
        levelId: l.level_key,
        durationSec: l.duration_sec,
        targetScore: l.target_score,
        difficulty: l.difficulty,
        motionRules: levelMotionRules,
        rewardRules: levelRewardRules,
        config: (l.runtime_config?.config as Record<string, unknown>) ?? {},
        sceneConfig: l.scene_config ?? {},
        interactionRules: levelInteractionRules,
        tasks,
        programSteps: steps,
      };
    }),
  };
}

// ─── Public API ───

export async function listGameDefinitions(): Promise<GameDefinitionDto[]> {
  const { data: games, error } = await supabase
    .from('games')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const results: GameDefinitionDto[] = [];
  for (const game of games ?? []) {
    const dto = await fetchGameWithRelations(game.id);
    if (dto) results.push(dto);
  }
  return results;
}

export async function listActiveGameDefinitions(): Promise<GameDefinitionDto[]> {
  const { data: games, error } = await supabase
    .from('games')
    .select('*')
    .eq('status', 'published')
    .order('sort_order', { ascending: true });

  if (error) throw new Error(error.message);

  const results: GameDefinitionDto[] = [];
  for (const game of games ?? []) {
    const dto = await fetchGameWithRelations(game.id);
    if (dto) results.push(dto);
  }
  return results;
}

export async function getGameValidation(id: string): Promise<ValidationResponse> {
  const { data, error } = await supabase
    .from('publish_validation_results')
    .select('*')
    .eq('entity_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) return { id, errors: [] };
  return {
    id: data.entity_id,
    errors: (data.errors as string[]) ?? [],
  };
}

export async function createGameDefinition(draft: GameDefinitionDraft): Promise<GameDefinitionDto> {
  const templateId = await resolveTemplateId(draft.template);

  const { data: game, error: gameErr } = await supabase
    .from('games')
    .insert({
      game_key: draft.gameKey,
      title: draft.title,
      description: draft.description,
      category: draft.category,
      template_id: templateId,
      status: draft.status ?? 'draft',
      min_app_version: draft.minAppVersion,
      orientation: draft.orientation,
      requires_camera: draft.cameraRequirement !== 'hand_target',
      tags: draft.tags,
      config: { template: draft.template },
      metadata: { assets: draft.assets },
    })
    .select('*')
    .single();

  if (gameErr) throw new Error(gameErr.message);

  const { data: version, error: verErr } = await supabase
    .from('game_versions')
    .insert({
      game_id: game.id,
      version: '1',
      status: 'draft',
      min_app_version: draft.minAppVersion,
      supported_motions: draft.supportedMotions,
      asset_manifest: {},
      runtime_contract: {},
    })
    .select('*')
    .single();

  if (verErr) throw new Error(verErr.message);

  for (const level of draft.levels) {
    await insertLevel(version.id, level);
  }

  // Audit log
  if (draft.actorId) {
    await supabase.from('audit_logs').insert({
      profile_id: draft.actorId,
      action: 'create',
      entity_table: 'games',
      entity_id: game.id,
      after_data: draft as unknown as Record<string, unknown>,
    });
  }

  const result = await fetchGameWithRelations(game.id);
  if (!result) throw new Error('Failed to fetch created game');
  return result;
}

async function resolveTemplateId(template: GameTemplate): Promise<string | null> {
  const templateKey = template;
  const { data } = await supabase
    .from('game_templates')
    .select('id')
    .eq('template_key', templateKey)
    .single();
  return data?.id ?? null;
}

async function insertLevel(versionId: string, level: GameLevelDto, index = 0): Promise<string> {
  const { data: levelRow, error } = await supabase
    .from('game_levels')
    .insert({
      game_version_id: versionId,
      level_key: level.levelId,
      level_index: index,
      title: `Level ${index + 1}`,
      duration_sec: level.durationSec,
      target_score: level.targetScore,
      difficulty: level.difficulty,
      scene_config: level.sceneConfig,
      runtime_config: {
        config: level.config,
        tasks: level.tasks,
      },
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);

  // Program steps
  for (let si = 0; si < level.programSteps.length; si++) {
    const step = level.programSteps[si];
    await supabase.from('game_program_steps').insert({
      game_level_id: levelRow.id,
      step_key: step.stepId,
      step_type: step.type,
      title: step.title,
      motion: step.motion ?? null,
      target_count: step.targetCount ?? null,
      hold_sec: step.holdSec ?? null,
      duration_sec: step.durationSec ?? null,
      success_message: step.successMessage ?? null,
      is_required: step.nextOnComplete ?? true,
      sort_order: si,
    });
  }

  // Motion rules
  for (let mi = 0; mi < level.motionRules.length; mi++) {
    const mr = level.motionRules[mi];
    await supabase.from('game_motion_rules').insert({
      game_version_id: versionId,
      motion: mr.motion,
      rule_key: `${level.levelId}_motion_${mi}`,
      label: `${mr.motion} ${mr.event}`,
      cooldown_ms: mr.cooldownMs,
      scoring: { points: mr.points },
      config: { event: mr.event },
      sort_order: mi,
    });
  }

  // Reward rules
  for (const rr of level.rewardRules) {
    await supabase.from('game_reward_rules').insert({
      game_version_id: versionId,
      reward_type: rr.rewardType,
      rule_key: `${level.levelId}_reward_${rr.rewardType}`,
      title: `${rr.rewardType} reward`,
      amount: rr.amount,
      trigger_event: 'session_completed',
      conditions: { minimumScore: rr.minimumScore },
    });
  }

  // Interaction rules
  for (let ii = 0; ii < level.interactionRules.length; ii++) {
    const ir = level.interactionRules[ii];
    await supabase.from('game_interaction_rules').insert({
      game_version_id: versionId,
      interaction_key: `${level.levelId}_interaction_${ii}`,
      interaction_type: ir.input,
      title: ir.action,
      motion: ir.motion ?? null,
      interaction_payload: {
        event: ir.event,
        targetObjectType: ir.targetObjectType,
        keypoints: ir.keypoints,
        action: ir.action,
        points: ir.points,
        cooldownMs: ir.cooldownMs,
      },
      sort_order: ii,
    });
  }

  return levelRow.id;
}

export async function updateGameDefinition(
  id: string,
  draft: Partial<GameDefinitionDraft>,
): Promise<GameDefinitionDto> {
  const updateData: Record<string, unknown> = {};
  if (draft.title !== undefined) updateData.title = draft.title;
  if (draft.description !== undefined) updateData.description = draft.description;
  if (draft.category !== undefined) updateData.category = draft.category;
  if (draft.tags !== undefined) updateData.tags = draft.tags;
  if (draft.orientation !== undefined) updateData.orientation = draft.orientation;
  if (draft.cameraRequirement !== undefined) updateData.requires_camera = draft.cameraRequirement !== 'hand_target';
  if (draft.minAppVersion !== undefined) updateData.min_app_version = draft.minAppVersion;
  if (draft.status !== undefined) updateData.status = draft.status;
  if (draft.assets !== undefined) {
    updateData.metadata = { assets: draft.assets };
  }

  if (Object.keys(updateData).length) {
    const { error } = await supabase.from('games').update(updateData).eq('id', id);
    if (error) throw new Error(error.message);
  }

  // Get latest version and update if needed
  if (draft.supportedMotions) {
    const { data: versions } = await supabase
      .from('game_versions')
      .select('id')
      .eq('game_id', id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (versions?.length) {
      await supabase
        .from('game_versions')
        .update({ supported_motions: draft.supportedMotions, min_app_version: draft.minAppVersion })
        .eq('id', versions[0].id);
    }
  }

  // Audit log
  if (draft.actorId) {
    await supabase.from('audit_logs').insert({
      profile_id: draft.actorId,
      action: 'update',
      entity_table: 'games',
      entity_id: id,
      after_data: draft as unknown as Record<string, unknown>,
    });
  }

  const result = await fetchGameWithRelations(id);
  if (!result) throw new Error('Game not found after update');
  return result;
}

export async function publishGameDefinition(id: string, actorId: string): Promise<GameDefinitionDto> {
  const { error } = await supabase.from('games').update({ status: 'published' }).eq('id', id);
  if (error) throw new Error(error.message);

  // Update latest version too
  const { data: versions } = await supabase
    .from('game_versions')
    .select('id')
    .eq('game_id', id)
    .order('created_at', { ascending: false })
    .limit(1);

  if (versions?.length) {
    await supabase
      .from('game_versions')
      .update({ status: 'published', published_at: new Date().toISOString() })
      .eq('id', versions[0].id);
  }

  await supabase.from('audit_logs').insert({
    profile_id: actorId,
    action: 'publish',
    entity_table: 'games',
    entity_id: id,
  });

  const result = await fetchGameWithRelations(id);
  if (!result) throw new Error('Game not found after publish');
  return result;
}

export async function rollbackGameDefinition(id: string, actorId: string): Promise<GameDefinitionDto> {
  const { error } = await supabase.from('games').update({ status: 'draft' }).eq('id', id);
  if (error) throw new Error(error.message);

  const { data: versions } = await supabase
    .from('game_versions')
    .select('id')
    .eq('game_id', id)
    .order('created_at', { ascending: false })
    .limit(1);

  if (versions?.length) {
    await supabase
      .from('game_versions')
      .update({ status: 'draft', published_at: null })
      .eq('id', versions[0].id);
  }

  await supabase.from('audit_logs').insert({
    profile_id: actorId,
    action: 'rollback',
    entity_table: 'games',
    entity_id: id,
  });

  const result = await fetchGameWithRelations(id);
  if (!result) throw new Error('Game not found after rollback');
  return result;
}

export async function listAuditLogs(): Promise<AuditLogDto[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: AuditLogRow) => ({
    id: row.id,
    actorId: row.profile_id,
    action: row.action,
    entityType: row.entity_table,
    entityId: row.entity_id,
    createdAt: row.created_at,
  }));
}

export async function uploadGameAsset(file: File): Promise<GameAssetDto & { id: string; createdAt: string }> {
  const filePath = `uploads/${Date.now()}_${file.name}`;
  const { error: uploadErr } = await supabase.storage
    .from('albago-assets')
    .upload(filePath, file, { upsert: false });

  if (uploadErr) throw new Error(uploadErr.message);

  const { data: publicUrlData } = supabase.storage.from('albago-assets').getPublicUrl(filePath);

  const kind = file.type.startsWith('audio') ? 'audio' : 'image';
  const format = file.name.split('.').pop()?.toLowerCase() ?? 'png';

  const { data: asset, error: insertErr } = await supabase
    .from('asset_files')
    .insert({
      path: filePath,
      storage_bucket: 'albago-assets',
      public_url: publicUrlData.publicUrl,
      mime_type: file.type,
      size_bytes: file.size,
      kind,
      format,
      is_published: true,
    })
    .select('*')
    .single();

  if (insertErr) throw new Error(insertErr.message);

  return {
    id: asset.id,
    key: asset.path,
    kind: kind.toUpperCase() as 'IMAGE' | 'AUDIO',
    format: format.toUpperCase() as 'PNG' | 'WEBP' | 'SVG' | 'MP3',
    uri: asset.public_url ?? '',
    mimeType: asset.mime_type ?? undefined,
    width: asset.width ?? undefined,
    height: asset.height ?? undefined,
    sha256: asset.sha256 ?? undefined,
    bytes: asset.size_bytes ?? undefined,
    createdAt: asset.created_at,
  };
}

export function isPublicDemoTemplate(template: GameTemplate): template is PublicDemoTemplate {
  return (
    template === 'FRUIT_SLASH' ||
    template === 'DODGE_RUN' ||
    template === 'FIT_CHALLENGE' ||
    template === 'SCENE_PLAY'
  );
}

export function templateLabel(template: GameTemplate): string {
  return {
    TARGET_HIT: 'Target Hit',
    ENDLESS_RUNNER: 'Endless Runner',
    FRUIT_SLASH: 'Meyve Kesme',
    DODGE_RUN: 'Engelden Kacis',
    FIT_CHALLENGE: 'Spor Mucadelesi',
    SCENE_PLAY: 'Scene Play / No-code',
  }[template];
}

function demoAssetItems(pack: string, items: Array<[key: string, uri: string]>): GameAssetDto[] {
  return items.map(([key, uri]) => ({
    key,
    kind: 'IMAGE' as const,
    format: 'PNG' as const,
    uri,
    mimeType: 'image/png',
    sha256: `local-${pack}-${key}`,
  }));
}

// ─── Scene configs ───

function fruitSceneConfig(): Record<string, unknown> {
  return {
    laneCount: 3,
    maxObjects: 5,
    defaultHitRadius: 0.18,
    defaultObjectLifeMs: 2600,
    spawn: { objectTypes: ['fruit', 'bonus', 'bomb'] },
  };
}

function fruitInteractionRules(): InteractionRuleDto[] {
  return [
    { input: 'POSE_CONTACT', targetObjectType: 'fruit', keypoints: ['left_wrist', 'right_wrist', 'left_index', 'right_index', 'left_thumb', 'right_thumb'], action: 'REMOVE_OBJECT', points: 15, cooldownMs: 120 },
    { input: 'MOTION_EVENT', event: 'REP_COUNTED', motion: 'SQUAT', targetObjectType: 'bonus', action: 'ADD_SCORE', points: 10, cooldownMs: 500 },
    { input: 'MOTION_EVENT', event: 'BAD_FORM', action: 'RESET_COMBO', points: -5, cooldownMs: 250 },
  ];
}

function dodgeSceneConfig(): Record<string, unknown> {
  return {
    lanes: ['low', 'high', 'boost'],
    travelMs: 2100,
    obstacleWindowMs: 1400,
    objects: [
      { objectType: 'low_obstacle', assetKey: 'lowObstacle', requiredMotion: 'SQUAT', hitRadius: 0.16, lifeMs: 2100 },
      { objectType: 'jump_obstacle', assetKey: 'jumpObstacle', requiredMotion: 'JUMPING_JACK', hitRadius: 0.16, lifeMs: 2100 },
      { objectType: 'boost_orb', assetKey: 'boostOrb', requiredMotion: 'JUMP_ROPE', hitRadius: 0.14, lifeMs: 1800 },
    ],
  };
}

function dodgeInteractionRules(): InteractionRuleDto[] {
  return [
    { input: 'MOTION_EVENT', event: 'REP_COUNTED', motion: 'SQUAT', targetObjectType: 'low_obstacle', action: 'REMOVE_OBJECT', points: 10, cooldownMs: 500 },
    { input: 'MOTION_EVENT', event: 'REP_COUNTED', motion: 'JUMPING_JACK', targetObjectType: 'jump_obstacle', action: 'REMOVE_OBJECT', points: 15, cooldownMs: 450 },
    { input: 'MOTION_EVENT', event: 'REP_COUNTED', motion: 'JUMP_ROPE', targetObjectType: 'boost_orb', action: 'ADD_SCORE', points: 3, cooldownMs: 250 },
    { input: 'MOTION_EVENT', event: 'BAD_FORM', action: 'DECREASE_LIFE', points: -5, cooldownMs: 250 },
    { input: 'MOTION_EVENT', event: 'USER_OUT_OF_FRAME', action: 'PAUSE_GAME', cooldownMs: 0 },
  ];
}

function fitSceneConfig(): Record<string, unknown> {
  return { showQualityScore: true, taskCardStyle: 'stacked', completionEffect: 'pulse' };
}

function fitInteractionRules(): InteractionRuleDto[] {
  return [
    { input: 'MOTION_EVENT', event: 'REP_COUNTED', motion: 'SQUAT', action: 'PROGRESS_TASK', points: 10, cooldownMs: 500 },
    { input: 'MOTION_EVENT', event: 'REP_COUNTED', motion: 'JUMPING_JACK', action: 'PROGRESS_TASK', points: 12, cooldownMs: 400 },
    { input: 'MOTION_EVENT', event: 'REP_COUNTED', motion: 'JUMP_ROPE', action: 'PROGRESS_TASK', points: 3, cooldownMs: 220 },
    { input: 'MOTION_EVENT', event: 'BAD_FORM', action: 'RESET_COMBO', points: -3, cooldownMs: 250 },
    { input: 'MOTION_EVENT', event: 'USER_OUT_OF_FRAME', action: 'PAUSE_GAME', cooldownMs: 0 },
  ];
}

function scenePlayConfig(): Record<string, unknown> {
  return {
    mode: 'PROMPT_SEQUENCE',
    maxObjects: 1,
    defaultObjectLifeMs: 2400,
    objects: [
      { objectType: 'cuce_prompt', label: 'Cuce', assetKey: 'cuceCard', requiredMotion: 'SQUAT', points: 10, lifeMs: 2400, hitRadius: 0.2 },
      { objectType: 'deve_prompt', label: 'Deve', assetKey: 'deveCard', requiredMotion: 'JUMPING_JACK', points: 12, lifeMs: 2400, hitRadius: 0.2 },
    ],
  };
}

function scenePlayInteractionRules(): InteractionRuleDto[] {
  return [
    { input: 'MOTION_EVENT', event: 'REP_COUNTED', motion: 'SQUAT', targetObjectType: 'cuce_prompt', action: 'REMOVE_OBJECT', points: 10, cooldownMs: 500 },
    { input: 'MOTION_EVENT', event: 'REP_COUNTED', motion: 'JUMPING_JACK', targetObjectType: 'deve_prompt', action: 'REMOVE_OBJECT', points: 12, cooldownMs: 450 },
    { input: 'MOTION_EVENT', event: 'BAD_FORM', action: 'RESET_COMBO', points: -5, cooldownMs: 250 },
    { input: 'MOTION_EVENT', event: 'USER_OUT_OF_FRAME', action: 'PAUSE_GAME', cooldownMs: 0 },
  ];
}

export function buildDemoDraft(template: PublicDemoTemplate): GameDefinitionDraft {
  const shared = { minAppVersion: '0.1.0', status: 'draft' as const, actorId: 'admin@local' };

  if (template === 'FRUIT_SLASH') {
    return {
      ...shared,
      gameKey: 'fruit_slash_demo',
      template,
      title: 'Meyve Kesme',
      description: 'Jumping jack ve squat ile ritimli meyve kesme oyunu.',
      category: 'entertainment',
      tags: ['reflex', 'arcade', 'hand-target'],
      orientation: 'landscape',
      cameraRequirement: 'hand_target',
      supportedMotions: ['SQUAT', 'JUMPING_JACK', 'JUMP_ROPE'],
      levels: [{
        levelId: 'fruit_slash_level_1', durationSec: 60, targetScore: 420, difficulty: 'EASY',
        motionRules: [
          { motion: 'JUMPING_JACK', event: 'REP_COUNTED', points: 15, cooldownMs: 400 },
          { motion: 'SQUAT', event: 'REP_COUNTED', points: 10, cooldownMs: 500 },
          { motion: 'JUMP_ROPE', event: 'REP_COUNTED', points: 3, cooldownMs: 250 },
          { motion: 'SQUAT', event: 'BAD_FORM', points: -5, cooldownMs: 250 },
          { motion: 'JUMPING_JACK', event: 'BAD_FORM', points: -5, cooldownMs: 250 },
          { motion: 'JUMP_ROPE', event: 'BAD_FORM', points: -2, cooldownMs: 200 },
        ],
        rewardRules: [{ rewardType: 'STAR', amount: 3, minimumScore: 420 }],
        config: { spawnRateMs: 900, comboMultiplier: true, penaltyObjects: true, penaltyPoints: 10 },
        sceneConfig: fruitSceneConfig(),
        interactionRules: fruitInteractionRules(),
        tasks: [],
        programSteps: [{ stepId: 'fruit_step_play', type: 'PLAY_GAME', title: 'Meyveleri kes', description: 'Ellerinle hedeflere dokun veya hareket eventleriyle bonus topla.', durationSec: 60, successMessage: 'Meyve turu tamamlandi.', nextOnComplete: true }],
      }],
      assets: { background: 'local://fruit-slash/background', character: 'local://fruit-slash/hero', soundtrack: 'local://fruit-slash/theme', items: demoAssetItems('fruit-slash', [['background', 'local://fruit-slash/background'], ['fruit', 'local://fruit-slash/fruit'], ['bonus', 'local://fruit-slash/bonus'], ['bomb', 'local://fruit-slash/bomb']]) },
    };
  }

  if (template === 'DODGE_RUN') {
    return {
      ...shared,
      gameKey: 'dodge_run_demo',
      template,
      title: 'Engelden Kacis',
      description: 'Squat, jumping jack ve jump rope ile tepki veren kacis oyunu.',
      category: 'entertainment',
      tags: ['runner', 'reaction', 'obstacle'],
      orientation: 'landscape',
      cameraRequirement: 'full_body',
      supportedMotions: ['SQUAT', 'JUMPING_JACK', 'JUMP_ROPE'],
      levels: [{
        levelId: 'dodge_run_level_1', durationSec: 60, targetScore: 500, difficulty: 'MEDIUM',
        motionRules: [
          { motion: 'SQUAT', event: 'REP_COUNTED', points: 10, cooldownMs: 500 },
          { motion: 'JUMPING_JACK', event: 'REP_COUNTED', points: 15, cooldownMs: 450 },
          { motion: 'JUMP_ROPE', event: 'REP_COUNTED', points: 3, cooldownMs: 250 },
          { motion: 'SQUAT', event: 'BAD_FORM', points: -5, cooldownMs: 250 },
          { motion: 'JUMPING_JACK', event: 'BAD_FORM', points: -5, cooldownMs: 250 },
        ],
        rewardRules: [{ rewardType: 'ENERGY', amount: 1, minimumScore: 350 }],
        config: { lives: 3, obstacleSpawnMs: 1400, pauseOnOutOfFrame: true, baseDistancePerTick: 2, damageOnMiss: 1 },
        sceneConfig: dodgeSceneConfig(),
        interactionRules: dodgeInteractionRules(),
        tasks: [],
        programSteps: [{ stepId: 'dodge_step_reaction', type: 'PLAY_GAME', title: 'Engelleri temizle', description: 'Dogru hareketle aktif engeli gec; yanlis tepki can azaltir.', durationSec: 60, successMessage: 'Kacis parkuru bitti.', nextOnComplete: true }],
      }],
      assets: { background: 'local://dodge-run/background', character: 'local://dodge-run/runner', soundtrack: 'local://dodge-run/theme', items: demoAssetItems('dodge-run', [['background', 'local://dodge-run/background'], ['runner', 'local://dodge-run/runner'], ['lowObstacle', 'local://dodge-run/low-obstacle'], ['jumpObstacle', 'local://dodge-run/jump-obstacle'], ['boostOrb', 'local://dodge-run/boost']]) },
    };
  }

  if (template === 'FIT_CHALLENGE') {
    return {
      ...shared,
      gameKey: 'fit_challenge_demo',
      template,
      title: 'Spor Mucadelesi',
      description: 'Gorev sirali, kalite odakli fitness demo oyunu.',
      category: 'sport',
      tags: ['playlist', 'fitness', 'program'],
      orientation: 'portrait',
      cameraRequirement: 'full_body',
      supportedMotions: ['SQUAT', 'JUMPING_JACK', 'JUMP_ROPE'],
      levels: [{
        levelId: 'fit_challenge_level_1', durationSec: 120, targetScore: 620, difficulty: 'CHALLENGE',
        motionRules: [
          { motion: 'SQUAT', event: 'REP_COUNTED', points: 10, cooldownMs: 500 },
          { motion: 'JUMPING_JACK', event: 'REP_COUNTED', points: 12, cooldownMs: 400 },
          { motion: 'JUMP_ROPE', event: 'REP_COUNTED', points: 3, cooldownMs: 220 },
          { motion: 'SQUAT', event: 'BAD_FORM', points: -3, cooldownMs: 250 },
          { motion: 'JUMPING_JACK', event: 'BAD_FORM', points: -3, cooldownMs: 250 },
          { motion: 'JUMP_ROPE', event: 'BAD_FORM', points: -2, cooldownMs: 200 },
        ],
        rewardRules: [{ rewardType: 'BADGE', amount: 1, minimumScore: 620 }],
        config: { showQualityScore: true, advanceAutomatically: true },
        sceneConfig: fitSceneConfig(),
        interactionRules: fitInteractionRules(),
        tasks: [
          { motion: 'SQUAT', targetCount: 10, pointsPerRep: 10 },
          { motion: 'JUMPING_JACK', targetCount: 10, pointsPerRep: 12 },
          { motion: 'JUMP_ROPE', targetCount: 20, pointsPerRep: 3 },
        ],
        programSteps: [
          { stepId: 'fit_step_squat', type: 'MOTION_REPS', title: 'Squat seti', motion: 'SQUAT', targetCount: 10, successMessage: 'Squat seti tamamlandi.', nextOnComplete: true },
          { stepId: 'fit_step_jumping_jack', type: 'MOTION_REPS', title: 'Jumping jack seti', motion: 'JUMPING_JACK', targetCount: 10, successMessage: 'Ritim guzel.', nextOnComplete: true },
          { stepId: 'fit_step_jump_rope', type: 'MOTION_REPS', title: 'Jump rope enerjisi', motion: 'JUMP_ROPE', targetCount: 20, successMessage: 'Enerji toplandi.', nextOnComplete: true },
          { stepId: 'fit_step_plank', type: 'HOLD_POSE', title: 'Plank tutusu', description: 'Pozisyonunu koru, sure dolunca tebrik mesaji acilir.', holdSec: 30, successMessage: 'Tebrikler, spor programi tamamlandi.', nextOnComplete: true },
        ],
      }],
      assets: { background: 'local://fit-challenge/background', character: 'local://fit-challenge/coach', soundtrack: 'local://fit-challenge/theme', items: demoAssetItems('fit-challenge', [['background', 'local://fit-challenge/background'], ['coach', 'local://fit-challenge/coach'], ['squatIcon', 'local://fit-challenge/squat'], ['jumpingJackIcon', 'local://fit-challenge/jumping-jack'], ['jumpRopeIcon', 'local://fit-challenge/jump-rope']]) },
    };
  }

  return {
    ...shared,
    gameKey: 'deve_cuce_demo',
    template,
    title: 'Deve Cuce',
    description: 'Scene Play motoru ile kurulan, komutlara hareketle cevap verme oyunu.',
    category: 'education',
    tags: ['kids', 'command', 'scene-play'],
    orientation: 'landscape',
    cameraRequirement: 'full_body',
    supportedMotions: ['SQUAT', 'JUMPING_JACK'],
    levels: [{
      levelId: 'deve_cuce_level_1', durationSec: 60, targetScore: 300, difficulty: 'EASY',
      motionRules: [
        { motion: 'SQUAT', event: 'REP_COUNTED', points: 10, cooldownMs: 500 },
        { motion: 'JUMPING_JACK', event: 'REP_COUNTED', points: 12, cooldownMs: 400 },
        { motion: 'SQUAT', event: 'BAD_FORM', points: -5, cooldownMs: 250 },
        { motion: 'JUMPING_JACK', event: 'BAD_FORM', points: -5, cooldownMs: 250 },
      ],
      rewardRules: [{ rewardType: 'STAR', amount: 2, minimumScore: 220 }],
      config: { spawnRateMs: 1800, lives: 3, damageOnMiss: 1, comboMultiplier: true },
      sceneConfig: scenePlayConfig(),
      interactionRules: scenePlayInteractionRules(),
      tasks: [],
      programSteps: [{ stepId: 'deve_cuce_step_play', type: 'PLAY_GAME', title: 'Komutu takip et', description: 'Cuce gelirse squat, deve gelirse jumping jack yap.', durationSec: 60, successMessage: 'Komut oyunu tamamlandi.', nextOnComplete: true }],
    }],
    assets: { background: 'local://scene-play/deve-cuce/background', character: 'local://scene-play/deve-cuce/guide', soundtrack: 'local://scene-play/deve-cuce/theme', items: demoAssetItems('scene-play-deve-cuce', [['background', 'local://scene-play/deve-cuce/background'], ['guide', 'local://scene-play/deve-cuce/guide'], ['cuceCard', 'local://scene-play/deve-cuce/cuce'], ['deveCard', 'local://scene-play/deve-cuce/deve']]) },
  };
}

export const publicDemoTemplates: PublicDemoTemplate[] = [
  'SCENE_PLAY',
  'FRUIT_SLASH',
  'DODGE_RUN',
  'FIT_CHALLENGE',
];
