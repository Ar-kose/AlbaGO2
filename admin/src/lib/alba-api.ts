export type MotionType =
  | 'SQUAT' | 'JUMPING_JACK' | 'JUMP_ROPE'
  | 'PLANK_HOLD' | 'LEFT_HAND_HIT' | 'RIGHT_HAND_HIT'
  | 'BOTH_HANDS_UP' | 'BALANCE' | 'POSE_STABLE' | 'POSE_LOST';
export type PublishStatus = 'DRAFT' | 'REVIEW' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED';
export type GameTemplate =
  | 'FRUIT_SLASH' | 'DODGE_RUN' | 'FIT_CHALLENGE' | 'SCENE_PLAY'
  | 'TARGET_HIT' | 'ENDLESS_RUNNER'
  | 'WHACK_A_MOLE' | 'POSE_CONTACT_TARGETS' | 'CAMERA_ARCADE_OVERLAY'
  | 'RHYTHM_MOTION' | 'POSE_HOLD' | 'REP_COUNTER'
  | 'MOTION_SEQUENCE' | 'INTERVAL_WORKOUT'
  | 'QUIZ' | 'FLASHCARD' | 'MEMORY_MATCH' | 'TRUE_FALSE' | 'MATCH_PAIRS'
  | 'REACTION' | 'CATCH_FALLING' | 'AVOID_OBSTACLE' | 'COLLECT_ITEMS'
  | 'PROGRAM_FLOW' | 'HYBRID_SCENE';
export type PublicDemoTemplate = 'FRUIT_SLASH' | 'DODGE_RUN' | 'FIT_CHALLENGE' | 'SCENE_PLAY' | 'WHACK_A_MOLE' | 'POSE_CONTACT_TARGETS';
export type GameOrientation = 'PORTRAIT' | 'LANDSCAPE' | 'AUTO';
export type CameraRequirement = 'FULL_BODY' | 'UPPER_BODY' | 'HAND_TARGET';
export type GameCategory = 'SPORT' | 'FUN' | 'EDUCATION';
export type ProgramStepType = 'MOTION_REPS' | 'HOLD_POSE' | 'REST' | 'INSTRUCTION' | 'PLAY_GAME';
export type GameAction =
  | 'ADD_SCORE'
  | 'REMOVE_OBJECT'
  | 'RESET_COMBO'
  | 'DECREASE_LIFE'
  | 'PROGRESS_TASK'
  | 'PAUSE_GAME'
  | 'RESUME_GAME'
  | 'ADVANCE_STEP'
  | 'COMPLETE_LEVEL'
  | 'SHOW_MESSAGE'
  | 'SHOW_EFFECT';

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
  cover?: string;
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

export interface GameDefinitionV3Payload {
  schemaVersion: '3.0';
  gameKey: string;
  version: number;
  title: string;
  description: string;
  category: 'fun' | 'sport' | 'education';
  tags: string[];
  minAppVersion: string;
  minRuntimeVersion: string;
  orientation: 'portrait' | 'landscape' | 'auto';
  cameraRequirement: 'full_body' | 'upper_body' | 'hand_target';
  capabilities: string[];
  supportedMotions: MotionType[];
  assetManifest: {
    items: GameAssetDto[];
  };
  levels: Array<{
    levelId: string;
    durationSec: number;
    targetScore: number;
    difficulty: string;
    scene: {
      type: string;
      maxObjects: number;
      spawnRateMs: number;
      objects: Array<{
        objectId: string;
        label: string;
        assetKey: string;
        requiredMotion: MotionType;
        lifeMs: number;
        points: number;
      }>;
    };
    rules: Array<{
      ruleId: string;
      priority: number;
      when: {
        type: 'MOTION_EVENT' | 'POSE_CONTACT';
        event?: MotionRuleDto['event'];
        motion?: MotionType;
        targetObjectId?: string;
      };
      then: Array<Record<string, unknown>>;
      cooldownMs: number;
    }>;
    programSteps: ProgramStepDto[];
    rewards: Array<{
      rewardId: string;
      type: string;
      amount: number;
      condition: {
        minimumScore: number;
      };
    }>;
  }>;
}

const apiBaseUrl = (process.env.NEXT_PUBLIC_ALBAGO_API_URL ?? 'http://localhost:3000/v1').replace(/\/$/, '');

export async function listGameDefinitions(): Promise<GameDefinitionDto[]> {
  const response = await request<{ items: unknown[] }>('/internal/game-definitions');
  return (response.items ?? []).map(normalizeGameDefinition);
}

export async function listActiveGameDefinitions(): Promise<GameDefinitionDto[]> {
  const response = await request<{ items: unknown[] }>('/game-definitions/active');
  return (response.items ?? []).map(normalizeGameDefinition);
}

export async function getGameValidation(id: string): Promise<ValidationResponse> {
  return request<ValidationResponse>(`/internal/game-definitions/${encodeURIComponent(id)}/validation`);
}

export async function createGameDefinition(draft: GameDefinitionDraft): Promise<GameDefinitionDto> {
  return normalizeGameDefinition(
    await request('/internal/game-definitions', {
      method: 'POST',
      body: JSON.stringify(toBackendDraft(draft))
    })
  );
}

export async function updateGameDefinition(
  id: string,
  draft: Partial<GameDefinitionDraft>
): Promise<GameDefinitionDto> {
  return normalizeGameDefinition(
    await request(`/internal/game-definitions/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(toBackendDraft(draft))
    })
  );
}

export type PublishResult = {
  published: boolean;
  game?: GameDefinitionDto;
  validation?: {
    valid: boolean;
    publishable: boolean;
    errors: Array<{ severity: string; scope: string; code: string; path: string; message: string }>;
    warnings: Array<{ severity: string; scope: string; code: string; path: string; message: string }>;
  };
  error?: string;
};

export async function publishGameDefinition(id: string, actorId: string): Promise<PublishResult> {
  const result = await request<any>(`/internal/game-definitions/${encodeURIComponent(id)}/publish`, {
    method: 'POST',
    body: JSON.stringify({ actorId })
  });
  if (result.published === true && result.game) {
    return { published: true, game: normalizeGameDefinition(result.game), validation: result.validation };
  }
  return result as PublishResult;
}

export async function validateGameDraft(draft: any): Promise<any> {
  return request('/internal/game-definitions/validate', {
    method: 'POST',
    body: JSON.stringify({ gameDefinition: draft })
  });
}

export async function rollbackGameDefinition(id: string, actorId: string): Promise<GameDefinitionDto> {
  return normalizeGameDefinition(
    await request(`/internal/game-definitions/${encodeURIComponent(id)}/rollback`, {
      method: 'POST',
      body: JSON.stringify({ actorId })
    })
  );
}

// Temporary: fetches all games and filters by ID since no single-GET endpoint exists yet.
// Replace with GET /internal/game-definitions/:id when backend adds it.
export async function getGameDefinitionById(id: string): Promise<GameDefinitionDto | null> {
  const all = await listGameDefinitions();
  return all.find((g) => g.id === id) ?? null;
}

export interface GameSessionResultSummary {
  id: string;
  clientSessionKey?: string;
  gameDefinitionId?: string;
  gameKey?: string;
  gameDefinitionVersion?: number;
  deviceId?: string;
  status?: string;
  startedAt?: string;
  endedAt?: string;
  durationSec?: number;
  score?: number;
  combo?: number;
  accuracy?: number;
  calories?: number;
  result?: string;
  createdAt?: string;
}

export async function listGameSessionsByGame(gameDefinitionId: string): Promise<GameSessionResultSummary[]> {
  const response = await request<{ items: GameSessionResultSummary[] }>(
    `/game-sessions?gameDefinitionId=${encodeURIComponent(gameDefinitionId)}`
  );
  return response.items ?? [];
}

export async function listAuditLogs(): Promise<AuditLogDto[]> {
  const response = await request<{ items: AuditLogDto[] }>('/internal/audit-logs');
  return response.items ?? [];
}

export async function uploadGameAsset(file: File): Promise<GameAssetDto & { id: string; createdAt: string }> {
  const form = new FormData();
  form.append('file', file);
  return request<GameAssetDto & { id: string; createdAt: string }>('/internal/assets', {
    method: 'POST',
    body: form
  });
}

export function toGameDefinitionV3(draft: GameDefinitionDraft): GameDefinitionV3Payload {
  const assetItems = normalizeAssetItems(draft.assets);
  return {
    schemaVersion: '3.0',
    gameKey: draft.gameKey,
    version: 1,
    title: draft.title,
    description: draft.description,
    category: toV3Category(draft.category),
    tags: draft.tags,
    minAppVersion: draft.minAppVersion,
    minRuntimeVersion: '2.0.0',
    orientation: draft.orientation.toLowerCase() as GameDefinitionV3Payload['orientation'],
    cameraRequirement: toV3CameraRequirement(draft.cameraRequirement),
    capabilities: capabilitiesForDraft(draft),
    supportedMotions: draft.supportedMotions,
    assetManifest: {
      items: assetItems
    },
    levels: draft.levels.map((level) => {
      const objects = sceneObjectsForDraft(draft, level);
      return {
        levelId: level.levelId,
        durationSec: level.durationSec,
        targetScore: level.targetScore,
        difficulty: level.difficulty.toLowerCase(),
        scene: {
          type: sceneTypeForTemplate(draft.template),
          maxObjects: Number(level.sceneConfig.maxObjects ?? (draft.template === 'SCENE_PLAY' ? 1 : 3)),
          spawnRateMs: Number(level.config.spawnRateMs ?? level.config.obstacleSpawnMs ?? 1800),
          objects
        },
        rules: rulesForLevel(level, objects),
        programSteps: level.programSteps,
        rewards: level.rewardRules.map((reward) => ({
          rewardId: `${level.levelId}_${reward.rewardType.toLowerCase()}`,
          type: reward.rewardType,
          amount: reward.amount,
          condition: {
            minimumScore: reward.minimumScore
          }
        }))
      };
    })
  };
}

export function isPublicDemoTemplate(template: GameTemplate): template is PublicDemoTemplate {
  return (
    template === 'FRUIT_SLASH' ||
    template === 'DODGE_RUN' ||
    template === 'FIT_CHALLENGE' ||
    template === 'SCENE_PLAY' ||
    template === 'WHACK_A_MOLE' ||
    template === 'POSE_CONTACT_TARGETS'
  );
}

const TEMPLATE_LABELS: Record<GameTemplate, string> = {
  FRUIT_SLASH: 'Meyve Kesme', DODGE_RUN: 'Engelden Kacis',
  FIT_CHALLENGE: 'Spor Mucadelesi', SCENE_PLAY: 'Scene Play / No-code',
  TARGET_HIT: 'Target Hit', ENDLESS_RUNNER: 'Endless Runner',
  WHACK_A_MOLE: 'Whack-a-Mole', POSE_CONTACT_TARGETS: 'Pose Contact',
  CAMERA_ARCADE_OVERLAY: 'Camera Arcade', RHYTHM_MOTION: 'Ritim',
  POSE_HOLD: 'Pose Hold', REP_COUNTER: 'Rep Counter',
  MOTION_SEQUENCE: 'Motion Sequence', INTERVAL_WORKOUT: 'Interval Workout',
  QUIZ: 'Quiz', FLASHCARD: 'Flash Card', MEMORY_MATCH: 'Hafiza',
  TRUE_FALSE: 'Dogru-Yanlis', MATCH_PAIRS: 'Esleme',
  REACTION: 'Refleks', CATCH_FALLING: 'Yakala',
  AVOID_OBSTACLE: 'Engelden Kac', COLLECT_ITEMS: 'Topla',
  PROGRAM_FLOW: 'Program Akisi', HYBRID_SCENE: 'Hibrit'
};

export function templateLabel(template: GameTemplate): string {
  return TEMPLATE_LABELS[template] ?? template;
}

export function buildDemoDraft(template: PublicDemoTemplate): GameDefinitionDraft {
  const shared = { minAppVersion: '0.2.0', status: 'DRAFT' as const, actorId: 'admin@local' };

  if (template === 'FRUIT_SLASH') {
    return {
      ...shared,
      gameKey: 'fruit_slash_demo',
      template,
      title: 'Meyve Kesme',
      description: 'Jumping jack ve squat ile ritimli meyve kesme oyunu.',
      category: 'FUN',
      tags: ['reflex', 'arcade', 'hand-target'],
      orientation: 'LANDSCAPE',
      cameraRequirement: 'HAND_TARGET',
      supportedMotions: ['SQUAT', 'JUMPING_JACK', 'JUMP_ROPE'],
      levels: [
        {
          levelId: 'fruit_slash_level_1',
          durationSec: 60,
          targetScore: 420,
          difficulty: 'EASY',
          motionRules: [
            { motion: 'JUMPING_JACK', event: 'REP_COUNTED', points: 15, cooldownMs: 400 },
            { motion: 'SQUAT', event: 'REP_COUNTED', points: 10, cooldownMs: 500 },
            { motion: 'JUMP_ROPE', event: 'REP_COUNTED', points: 3, cooldownMs: 250 },
            { motion: 'SQUAT', event: 'BAD_FORM', points: -5, cooldownMs: 250 }
          ],
          rewardRules: [{ rewardType: 'STAR', amount: 3, minimumScore: 420 }],
          config: { spawnRateMs: 900, comboMultiplier: true, penaltyObjects: true, penaltyPoints: 10 },
          sceneConfig: fruitSceneConfig(),
          interactionRules: fruitInteractionRules(),
          tasks: [],
          programSteps: [
            {
              stepId: 'fruit_step_play',
              type: 'PLAY_GAME',
              title: 'Meyveleri kes',
              description: 'Hareket eventleriyle hedefleri topla.',
              durationSec: 60,
              successMessage: 'Meyve turu tamamlandi.',
              nextOnComplete: true
            }
          ]
        }
      ],
      assets: {
        background: 'local://fruit-slash/background',
        character: 'local://fruit-slash/hero',
        soundtrack: 'local://fruit-slash/theme',
        items: demoAssetItems('fruit-slash', [
          ['background', 'local://fruit-slash/background'],
          ['fruit', 'local://fruit-slash/fruit'],
          ['bonus', 'local://fruit-slash/bonus'],
          ['bomb', 'local://fruit-slash/bomb']
        ])
      }
    };
  }

  if (template === 'DODGE_RUN') {
    return {
      ...shared,
      gameKey: 'dodge_run_demo',
      template,
      title: 'Engelden Kacis',
      description: 'Squat, jumping jack ve jump rope ile tepki veren kacis oyunu.',
      category: 'FUN',
      tags: ['runner', 'reaction', 'obstacle'],
      orientation: 'LANDSCAPE',
      cameraRequirement: 'FULL_BODY',
      supportedMotions: ['SQUAT', 'JUMPING_JACK', 'JUMP_ROPE'],
      levels: [
        {
          levelId: 'dodge_run_level_1',
          durationSec: 60,
          targetScore: 500,
          difficulty: 'MEDIUM',
          motionRules: [
            { motion: 'SQUAT', event: 'REP_COUNTED', points: 10, cooldownMs: 500 },
            { motion: 'JUMPING_JACK', event: 'REP_COUNTED', points: 15, cooldownMs: 450 },
            { motion: 'JUMP_ROPE', event: 'REP_COUNTED', points: 3, cooldownMs: 250 },
            { motion: 'SQUAT', event: 'BAD_FORM', points: -5, cooldownMs: 250 }
          ],
          rewardRules: [{ rewardType: 'ENERGY', amount: 1, minimumScore: 350 }],
          config: { lives: 3, obstacleSpawnMs: 1400, pauseOnOutOfFrame: true, baseDistancePerTick: 2, damageOnMiss: 1 },
          sceneConfig: dodgeSceneConfig(),
          interactionRules: dodgeInteractionRules(),
          tasks: [],
          programSteps: [
            {
              stepId: 'dodge_step_reaction',
              type: 'PLAY_GAME',
              title: 'Engelleri temizle',
              description: 'Dogru hareketle aktif engeli gec.',
              durationSec: 60,
              successMessage: 'Kacis parkuru bitti.',
              nextOnComplete: true
            }
          ]
        }
      ],
      assets: {
        background: 'local://dodge-run/background',
        character: 'local://dodge-run/runner',
        soundtrack: 'local://dodge-run/theme',
        items: demoAssetItems('dodge-run', [
          ['background', 'local://dodge-run/background'],
          ['runner', 'local://dodge-run/runner'],
          ['lowObstacle', 'local://dodge-run/low-obstacle'],
          ['jumpObstacle', 'local://dodge-run/jump-obstacle'],
          ['boostOrb', 'local://dodge-run/boost']
        ])
      }
    };
  }

  if (template === 'FIT_CHALLENGE') {
    return {
      ...shared,
      gameKey: 'fit_challenge_demo',
      template,
      title: 'Spor Mucadelesi',
      description: 'Gorev sirali, kalite odakli fitness demo oyunu.',
      category: 'SPORT',
      tags: ['playlist', 'fitness', 'program'],
      orientation: 'PORTRAIT',
      cameraRequirement: 'FULL_BODY',
      supportedMotions: ['SQUAT', 'JUMPING_JACK', 'JUMP_ROPE'],
      levels: [
        {
          levelId: 'fit_challenge_level_1',
          durationSec: 120,
          targetScore: 620,
          difficulty: 'CHALLENGE',
          motionRules: [
            { motion: 'SQUAT', event: 'REP_COUNTED', points: 10, cooldownMs: 500 },
            { motion: 'JUMPING_JACK', event: 'REP_COUNTED', points: 12, cooldownMs: 400 },
            { motion: 'JUMP_ROPE', event: 'REP_COUNTED', points: 3, cooldownMs: 220 },
            { motion: 'SQUAT', event: 'BAD_FORM', points: -3, cooldownMs: 250 }
          ],
          rewardRules: [{ rewardType: 'BADGE', amount: 1, minimumScore: 620 }],
          config: { showQualityScore: true, advanceAutomatically: true },
          sceneConfig: fitSceneConfig(),
          interactionRules: fitInteractionRules(),
          tasks: [
            { motion: 'SQUAT', targetCount: 10, pointsPerRep: 10 },
            { motion: 'JUMPING_JACK', targetCount: 10, pointsPerRep: 12 },
            { motion: 'JUMP_ROPE', targetCount: 20, pointsPerRep: 3 }
          ],
          programSteps: [
            { stepId: 'fit_step_squat', type: 'MOTION_REPS', title: 'Squat seti', motion: 'SQUAT', targetCount: 10, successMessage: 'Squat seti tamamlandi.', nextOnComplete: true },
            { stepId: 'fit_step_rest', type: 'REST', title: 'Dinlenme', durationSec: 20, successMessage: 'Dinlenme tamamlandi.', nextOnComplete: true },
            { stepId: 'fit_step_plank', type: 'HOLD_POSE', title: 'Plank tutusu', description: 'Pozisyonunu koru.', holdSec: 30, successMessage: 'Program tamamlandi.', nextOnComplete: true }
          ]
        }
      ],
      assets: {
        background: 'local://fit-challenge/background',
        character: 'local://fit-challenge/coach',
        soundtrack: 'local://fit-challenge/theme',
        items: demoAssetItems('fit-challenge', [
          ['background', 'local://fit-challenge/background'],
          ['coach', 'local://fit-challenge/coach'],
          ['squatIcon', 'local://fit-challenge/squat'],
          ['jumpingJackIcon', 'local://fit-challenge/jumping-jack'],
          ['jumpRopeIcon', 'local://fit-challenge/jump-rope']
        ])
      }
    };
  }

  if (template === 'WHACK_A_MOLE' || template === 'POSE_CONTACT_TARGETS') {
    return {
      ...shared,
      gameKey: 'whack_a_mole_demo',
      template,
      title: 'Orman Refleks Oyunu',
      description: 'Cikan karakterlere elinle dokun. Bileklerini hedef noktasina getir, skor yap.',
      category: 'FUN',
      tags: ['reflex', 'arcade', 'hand-target', 'whack'],
      orientation: 'LANDSCAPE',
      cameraRequirement: 'UPPER_BODY',
      supportedMotions: ['LEFT_HAND_HIT', 'RIGHT_HAND_HIT'],
      levels: [
        {
          levelId: 'whack_level_1',
          durationSec: 60,
          targetScore: 200,
          difficulty: 'EASY',
          motionRules: [
            { motion: 'LEFT_HAND_HIT', event: 'REP_COUNTED', points: 10, cooldownMs: 300 },
            { motion: 'RIGHT_HAND_HIT', event: 'REP_COUNTED', points: 10, cooldownMs: 300 }
          ],
          rewardRules: [{ rewardType: 'STAR', amount: 1, minimumScore: 100 }],
          config: { spawnIntervalMs: 900, visibleMs: 1400, lives: 3, maxActiveTargets: 2, loseLifeOnTimeout: true },
          sceneConfig: {
            type: 'OBJECT_SPAWN',
            maxObjects: 3,
            spawnRateMs: 900,
            objects: [
              { objectId: 'hole_left', label: 'Sol Hedef', assetKey: 'mole_green', requiredMotion: 'LEFT_HAND_HIT', lifeMs: 1400, points: 10, x: 0.14, y: 0.78, radius: 0.10, hitBy: ['LEFT_WRIST', 'RIGHT_WRIST'] },
              { objectId: 'hole_center', label: 'Orta Hedef', assetKey: 'mole_green', requiredMotion: 'RIGHT_HAND_HIT', lifeMs: 1400, points: 10, x: 0.50, y: 0.78, radius: 0.10, hitBy: ['LEFT_WRIST', 'RIGHT_WRIST'] },
              { objectId: 'hole_right', label: 'Sag Hedef', assetKey: 'mole_green', requiredMotion: 'LEFT_HAND_HIT', lifeMs: 1400, points: 10, x: 0.86, y: 0.78, radius: 0.10, hitBy: ['LEFT_WRIST', 'RIGHT_WRIST'] }
            ]
          },
          interactionRules: [
            { input: 'POSE_CONTACT', targetObjectType: 'hole_left', keypoints: ['LEFT_WRIST', 'RIGHT_WRIST'], action: 'REMOVE_OBJECT', points: 10, cooldownMs: 300 },
            { input: 'POSE_CONTACT', targetObjectType: 'hole_center', keypoints: ['LEFT_WRIST', 'RIGHT_WRIST'], action: 'REMOVE_OBJECT', points: 10, cooldownMs: 300 },
            { input: 'POSE_CONTACT', targetObjectType: 'hole_right', keypoints: ['LEFT_WRIST', 'RIGHT_WRIST'], action: 'REMOVE_OBJECT', points: 10, cooldownMs: 300 },
            { input: 'MOTION_EVENT', event: 'BAD_FORM', action: 'DECREASE_LIFE', points: 0, cooldownMs: 1000 },
            { input: 'MOTION_EVENT', event: 'USER_OUT_OF_FRAME', action: 'PAUSE_GAME', points: 0, cooldownMs: 500 }
          ],
          tasks: [],
          programSteps: []
        }
      ],
      assets: {
        background: 'local://whack-a-mole/forest-bg',
        character: 'local://whack-a-mole/mole',
        soundtrack: '',
        items: demoAssetItems('whack-a-mole', [
          ['forest_background', 'local://whack-a-mole/forest-bg'],
          ['mole_green', 'local://whack-a-mole/mole-green'],
          ['hit_sfx', 'local://whack-a-mole/hit']
        ])
      }
    };
  }

  return {
    ...shared,
    gameKey: 'deve_cuce_demo',
    template,
    title: 'Deve Cuce',
    description: 'Scene Play motoru ile kurulan, komutlara hareketle cevap verme oyunu.',
    category: 'EDUCATION',
    tags: ['kids', 'command', 'scene-play'],
    orientation: 'LANDSCAPE',
    cameraRequirement: 'FULL_BODY',
    supportedMotions: ['SQUAT', 'JUMPING_JACK'],
    levels: [
      {
        levelId: 'deve_cuce_level_1',
        durationSec: 60,
        targetScore: 300,
        difficulty: 'EASY',
        motionRules: [
          { motion: 'SQUAT', event: 'REP_COUNTED', points: 10, cooldownMs: 500 },
          { motion: 'JUMPING_JACK', event: 'REP_COUNTED', points: 12, cooldownMs: 400 },
          { motion: 'SQUAT', event: 'BAD_FORM', points: -5, cooldownMs: 250 }
        ],
        rewardRules: [{ rewardType: 'STAR', amount: 2, minimumScore: 220 }],
        config: { spawnRateMs: 1800, lives: 3, damageOnMiss: 1, comboMultiplier: true },
        sceneConfig: scenePlayConfig(),
        interactionRules: scenePlayInteractionRules(),
        tasks: [],
        programSteps: [
          {
            stepId: 'deve_cuce_step_play',
            type: 'PLAY_GAME',
            title: 'Komutu takip et',
            description: 'Cuce gelirse squat, deve gelirse jumping jack yap.',
            durationSec: 60,
            successMessage: 'Komut oyunu tamamlandi.',
            nextOnComplete: true
          }
        ]
      }
    ],
    assets: {
      background: 'local://scene-play/deve-cuce/background',
      character: 'local://scene-play/deve-cuce/guide',
      soundtrack: 'local://scene-play/deve-cuce/theme',
      items: demoAssetItems('scene-play-deve-cuce', [
        ['background', 'local://scene-play/deve-cuce/background'],
        ['guide', 'local://scene-play/deve-cuce/guide'],
        ['cuceCard', 'local://scene-play/deve-cuce/cuce'],
        ['deveCard', 'local://scene-play/deve-cuce/deve']
      ])
    }
  };
}

export const publicDemoTemplates: PublicDemoTemplate[] = [
  'SCENE_PLAY',
  'FRUIT_SLASH',
  'DODGE_RUN',
  'FIT_CHALLENGE',
  'WHACK_A_MOLE',
  'POSE_CONTACT_TARGETS'
];

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const isFormData = init.body instanceof FormData;
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(init.headers ?? {})
    }
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok || payload.error) {
    const messages = Array.isArray(payload.message) ? payload.message
      : Array.isArray(payload.errors) ? payload.errors
      : [];
    const details = messages.length > 0 ? `: ${messages.join(', ')}` : '';
    throw new Error(`${payload.error ?? payload.message ?? response.statusText}${details}`);
  }
  return payload as T;
}

function toBackendDraft(draft: Partial<GameDefinitionDraft>): Record<string, unknown> {
  return {
    ...draft,
    template: draft.template,
    status: draft.status,
    segmentRuleJson: {
      audience: 'all',
      internalOnly: false,
      schemaVersion: '3.0',
      category: draft.category,
      tags: draft.tags
    }
  };
}

function normalizeGameDefinition(raw: unknown): GameDefinitionDto {
  const game = raw as Partial<GameDefinitionDto>;
  return {
    id: String(game.id ?? ''),
    gameKey: String(game.gameKey ?? ''),
    version: Number(game.version ?? 1),
    template: normalizeTemplate(game.template),
    title: String(game.title ?? ''),
    description: String(game.description ?? ''),
    status: normalizeStatus(game.status),
    minAppVersion: String(game.minAppVersion ?? '0.2.0'),
    category: normalizeCategory(game.category),
    tags: Array.isArray(game.tags) ? game.tags.filter((item): item is string => typeof item === 'string') : [],
    orientation: normalizeOrientation(game.orientation),
    cameraRequirement: normalizeCameraRequirement(game.cameraRequirement),
    supportedMotions: Array.isArray(game.supportedMotions)
      ? game.supportedMotions.filter((item): item is MotionType => isMotionType(item))
      : [],
    levels: Array.isArray(game.levels) ? game.levels.map(normalizeLevel) : [],
    assets: normalizeAssets(game.assets),
    publishedAt: game.publishedAt
  };
}

function normalizeLevel(raw: unknown): GameLevelDto {
  const level = raw as Partial<GameLevelDto>;
  return {
    levelId: String(level.levelId ?? 'level_1'),
    durationSec: Number(level.durationSec ?? 60),
    targetScore: Number(level.targetScore ?? 0),
    difficulty: String(level.difficulty ?? 'EASY'),
    motionRules: Array.isArray(level.motionRules) ? level.motionRules as MotionRuleDto[] : [],
    rewardRules: Array.isArray(level.rewardRules) ? level.rewardRules as RewardRuleDto[] : [],
    config: isObject(level.config) ? level.config : {},
    sceneConfig: isObject(level.sceneConfig) ? level.sceneConfig : {},
    interactionRules: Array.isArray(level.interactionRules) ? level.interactionRules as InteractionRuleDto[] : [],
    tasks: Array.isArray(level.tasks) ? level.tasks as TaskRuleDto[] : [],
    programSteps: Array.isArray(level.programSteps) ? level.programSteps as ProgramStepDto[] : []
  };
}

function normalizeAssets(raw: unknown): AssetDto {
  const assets = isObject(raw) ? raw as Partial<AssetDto> : {};
  return {
    cover: typeof assets.cover === 'string' ? assets.cover : undefined,
    background: String(assets.background ?? ''),
    character: String(assets.character ?? ''),
    soundtrack: assets.soundtrack,
    items: Array.isArray(assets.items) ? assets.items as GameAssetDto[] : []
  };
}

function normalizeTemplate(value: unknown): GameTemplate {
  const text = String(value ?? 'SCENE_PLAY').toUpperCase();
  return isGameTemplate(text) ? text : 'SCENE_PLAY';
}

function normalizeStatus(value: unknown): PublishStatus {
  const text = String(value ?? 'DRAFT').toUpperCase();
  return ['DRAFT', 'REVIEW', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED'].includes(text) ? text as PublishStatus : 'DRAFT';
}

function normalizeCategory(value: unknown): GameCategory {
  const text = String(value ?? 'FUN').toUpperCase();
  if (text === 'SPORT') return 'SPORT';
  if (text === 'EDUCATION') return 'EDUCATION';
  return 'FUN';
}

function normalizeOrientation(value: unknown): GameOrientation {
  const text = String(value ?? 'PORTRAIT').toUpperCase();
  if (text === 'LANDSCAPE') return 'LANDSCAPE';
  if (text === 'AUTO') return 'AUTO';
  return 'PORTRAIT';
}

function normalizeCameraRequirement(value: unknown): CameraRequirement {
  const text = String(value ?? 'FULL_BODY').toUpperCase();
  if (text === 'UPPER_BODY') return 'UPPER_BODY';
  if (text === 'HAND_TARGET') return 'HAND_TARGET';
  return 'FULL_BODY';
}

function isGameTemplate(value: string): value is GameTemplate {
  return ['TARGET_HIT', 'ENDLESS_RUNNER', 'FRUIT_SLASH', 'DODGE_RUN', 'FIT_CHALLENGE', 'SCENE_PLAY'].includes(value);
}

function isMotionType(value: unknown): value is MotionType {
  return value === 'SQUAT' || value === 'JUMPING_JACK' || value === 'JUMP_ROPE';
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toV3Category(category: GameCategory): GameDefinitionV3Payload['category'] {
  return category === 'SPORT' ? 'sport' : category === 'EDUCATION' ? 'education' : 'fun';
}

function toV3CameraRequirement(requirement: CameraRequirement): GameDefinitionV3Payload['cameraRequirement'] {
  return requirement.toLowerCase() as GameDefinitionV3Payload['cameraRequirement'];
}

function capabilitiesForDraft(draft: GameDefinitionDraft): string[] {
  const capabilities = new Set(['MOTION_EVENT', 'SCENE_OBJECTS', 'PROGRAM_STEPS', 'TIMER']);
  if (draft.levels.some((level) => level.interactionRules.some((rule) => rule.input === 'POSE_CONTACT'))) {
    capabilities.add('POSE_CONTACT');
  }
  if (draft.assets.soundtrack) {
    capabilities.add('AUDIO');
  }
  return Array.from(capabilities);
}

type V3SceneObject = GameDefinitionV3Payload['levels'][number]['scene']['objects'][number];

function sceneObjectsForDraft(draft: GameDefinitionDraft, level: GameLevelDto): V3SceneObject[] {
  const rawObjects = Array.isArray(level.sceneConfig.objects) ? level.sceneConfig.objects as Array<Record<string, unknown>> : [];
  if (rawObjects.length > 0) {
    return rawObjects.map((object, index) => ({
      objectId: String(object.objectId ?? object.objectType ?? `object_${index + 1}`),
      label: String(object.label ?? object.objectType ?? `Object ${index + 1}`),
      assetKey: String(object.assetKey ?? defaultAssetKey(draft.template)),
      requiredMotion: isMotionType(object.requiredMotion) ? object.requiredMotion : 'SQUAT',
      lifeMs: Number(object.lifeMs ?? level.sceneConfig.defaultObjectLifeMs ?? 2400),
      points: Number(object.points ?? pointsForMotion(level, isMotionType(object.requiredMotion) ? object.requiredMotion : 'SQUAT'))
    }));
  }

  if (draft.template === 'FRUIT_SLASH') {
    return [
      { objectId: 'fruit_target', label: 'Fruit', assetKey: 'fruit', requiredMotion: 'JUMPING_JACK', lifeMs: 2600, points: 15 },
      { objectId: 'bonus_target', label: 'Bonus', assetKey: 'bonus', requiredMotion: 'SQUAT', lifeMs: 2600, points: 10 }
    ];
  }

  if (draft.template === 'FIT_CHALLENGE') {
    return level.tasks.map((task) => ({
      objectId: `${task.motion.toLowerCase()}_task`,
      label: task.motion.replace('_', ' '),
      assetKey: task.motion === 'SQUAT' ? 'squatIcon' : task.motion === 'JUMPING_JACK' ? 'jumpingJackIcon' : 'jumpRopeIcon',
      requiredMotion: task.motion,
      lifeMs: 5000,
      points: task.pointsPerRep
    }));
  }

  return [{ objectId: 'default_prompt', label: 'Prompt', assetKey: defaultAssetKey(draft.template), requiredMotion: 'SQUAT', lifeMs: 2400, points: 10 }];
}

function rulesForLevel(level: GameLevelDto, objects: V3SceneObject[]): GameDefinitionV3Payload['levels'][number]['rules'] {
  if (level.interactionRules.length > 0) {
    return level.interactionRules.map((rule, index) => {
      const targetObjectId = rule.targetObjectType ?? objectForMotion(objects, rule.motion)?.objectId;
      return {
        ruleId: `${level.levelId}_rule_${index + 1}`,
        priority: 100 - index,
        when: {
          type: rule.input,
          event: rule.event,
          motion: rule.motion,
          targetObjectId
        },
        then: actionsForInteractionRule(rule, targetObjectId),
        cooldownMs: rule.cooldownMs ?? 0
      };
    });
  }

  return level.motionRules.map((rule, index) => ({
    ruleId: `${level.levelId}_motion_${index + 1}`,
    priority: 100 - index,
    when: {
      type: 'MOTION_EVENT',
      event: rule.event,
      motion: rule.motion,
      targetObjectId: objectForMotion(objects, rule.motion)?.objectId
    },
    then: [{ type: 'ADD_SCORE', amount: rule.points }],
    cooldownMs: rule.cooldownMs
  }));
}

function actionsForInteractionRule(rule: InteractionRuleDto, targetObjectId?: string): Array<Record<string, unknown>> {
  if (rule.action === 'REMOVE_OBJECT') {
    return [
      { type: 'ADD_SCORE', amount: rule.points ?? 0 },
      { type: 'REMOVE_OBJECT', target: targetObjectId }
    ];
  }
  if (rule.action === 'RESET_COMBO') {
    return [{ type: 'RESET_COMBO' }, { type: 'ADD_SCORE', amount: rule.points ?? 0 }];
  }
  if (rule.action === 'DECREASE_LIFE') {
    return [{ type: 'DECREASE_LIFE', amount: 1 }, { type: 'ADD_SCORE', amount: rule.points ?? 0 }];
  }
  if (rule.action === 'PAUSE_GAME') {
    return [{ type: 'PAUSE_GAME' }];
  }
  if (rule.action === 'PROGRESS_TASK') {
    return [{ type: 'PROGRESS_TASK', amount: 1 }, { type: 'ADD_SCORE', amount: rule.points ?? 0 }];
  }
  return [{ type: rule.action, amount: rule.points ?? 0, target: targetObjectId }];
}

function objectForMotion(objects: V3SceneObject[], motion?: MotionType): V3SceneObject | undefined {
  return motion ? objects.find((object) => object.requiredMotion === motion) : undefined;
}

function pointsForMotion(level: GameLevelDto, motion: MotionType): number {
  return level.motionRules.find((rule) => rule.motion === motion && rule.event === 'REP_COUNTED')?.points ?? 10;
}

function normalizeAssetItems(assets: AssetDto): GameAssetDto[] {
  const items = assets.items && assets.items.length > 0
    ? assets.items
    : demoAssetItems('draft', [
        ['background', assets.background],
        ['character', assets.character]
      ]);
  return items.filter((item) => item.key && item.uri);
}

function sceneTypeForTemplate(template: GameTemplate): string {
  if (template === 'SCENE_PLAY') return 'PROMPT_SEQUENCE';
  if (template === 'FIT_CHALLENGE') return 'TASK_SEQUENCE';
  if (template === 'DODGE_RUN') return 'LANE_OBSTACLES';
  return 'OBJECT_SPAWN';
}

function demoAssetItems(pack: string, items: Array<[key: string, uri: string]>): GameAssetDto[] {
  return items.map(([key, uri]) => ({
    key,
    kind: 'IMAGE',
    format: 'PNG',
    uri,
    mimeType: 'image/png',
    sha256: `local-${pack}-${key}`,
    bytes: 1024
  }));
}

function fruitSceneConfig(): Record<string, unknown> {
  return {
    laneCount: 3,
    maxObjects: 5,
    defaultHitRadius: 0.18,
    defaultObjectLifeMs: 2600,
    spawn: { objectTypes: ['fruit', 'bonus', 'bomb'] }
  };
}

function fruitInteractionRules(): InteractionRuleDto[] {
  return [
    { input: 'POSE_CONTACT', targetObjectType: 'fruit_target', keypoints: ['left_wrist', 'right_wrist'], action: 'REMOVE_OBJECT', points: 15, cooldownMs: 120 },
    { input: 'MOTION_EVENT', event: 'REP_COUNTED', motion: 'SQUAT', targetObjectType: 'bonus_target', action: 'REMOVE_OBJECT', points: 10, cooldownMs: 500 },
    { input: 'MOTION_EVENT', event: 'BAD_FORM', action: 'RESET_COMBO', points: -5, cooldownMs: 250 }
  ];
}

function dodgeSceneConfig(): Record<string, unknown> {
  return {
    lanes: ['low', 'high', 'boost'],
    travelMs: 2100,
    obstacleWindowMs: 1400,
    objects: [
      { objectType: 'low_obstacle', label: 'Low obstacle', assetKey: 'lowObstacle', requiredMotion: 'SQUAT', points: 10, lifeMs: 2100 },
      { objectType: 'jump_obstacle', label: 'Jump obstacle', assetKey: 'jumpObstacle', requiredMotion: 'JUMPING_JACK', points: 15, lifeMs: 2100 },
      { objectType: 'boost_orb', label: 'Boost orb', assetKey: 'boostOrb', requiredMotion: 'JUMP_ROPE', points: 3, lifeMs: 1800 }
    ]
  };
}

function dodgeInteractionRules(): InteractionRuleDto[] {
  return [
    { input: 'MOTION_EVENT', event: 'REP_COUNTED', motion: 'SQUAT', targetObjectType: 'low_obstacle', action: 'REMOVE_OBJECT', points: 10, cooldownMs: 500 },
    { input: 'MOTION_EVENT', event: 'REP_COUNTED', motion: 'JUMPING_JACK', targetObjectType: 'jump_obstacle', action: 'REMOVE_OBJECT', points: 15, cooldownMs: 450 },
    { input: 'MOTION_EVENT', event: 'REP_COUNTED', motion: 'JUMP_ROPE', targetObjectType: 'boost_orb', action: 'ADD_SCORE', points: 3, cooldownMs: 250 },
    { input: 'MOTION_EVENT', event: 'BAD_FORM', action: 'DECREASE_LIFE', points: -5, cooldownMs: 250 },
    { input: 'MOTION_EVENT', event: 'USER_OUT_OF_FRAME', action: 'PAUSE_GAME', cooldownMs: 0 }
  ];
}

function fitSceneConfig(): Record<string, unknown> {
  return { showQualityScore: true, taskCardStyle: 'stacked', completionEffect: 'pulse', maxObjects: 3 };
}

function fitInteractionRules(): InteractionRuleDto[] {
  return [
    { input: 'MOTION_EVENT', event: 'REP_COUNTED', motion: 'SQUAT', targetObjectType: 'squat_task', action: 'PROGRESS_TASK', points: 10, cooldownMs: 500 },
    { input: 'MOTION_EVENT', event: 'REP_COUNTED', motion: 'JUMPING_JACK', targetObjectType: 'jumping_jack_task', action: 'PROGRESS_TASK', points: 12, cooldownMs: 400 },
    { input: 'MOTION_EVENT', event: 'BAD_FORM', action: 'RESET_COMBO', points: -3, cooldownMs: 250 },
    { input: 'MOTION_EVENT', event: 'USER_OUT_OF_FRAME', action: 'PAUSE_GAME', cooldownMs: 0 }
  ];
}

function scenePlayConfig(): Record<string, unknown> {
  return {
    mode: 'PROMPT_SEQUENCE',
    maxObjects: 1,
    defaultObjectLifeMs: 2400,
    objects: [
      { objectId: 'cuce_prompt', objectType: 'cuce_prompt', label: 'Cuce', assetKey: 'cuceCard', requiredMotion: 'SQUAT', points: 10, lifeMs: 2400 },
      { objectId: 'deve_prompt', objectType: 'deve_prompt', label: 'Deve', assetKey: 'deveCard', requiredMotion: 'JUMPING_JACK', points: 12, lifeMs: 2400 }
    ]
  };
}

function scenePlayInteractionRules(): InteractionRuleDto[] {
  return [
    { input: 'MOTION_EVENT', event: 'REP_COUNTED', motion: 'SQUAT', targetObjectType: 'cuce_prompt', action: 'REMOVE_OBJECT', points: 10, cooldownMs: 500 },
    { input: 'MOTION_EVENT', event: 'REP_COUNTED', motion: 'JUMPING_JACK', targetObjectType: 'deve_prompt', action: 'REMOVE_OBJECT', points: 12, cooldownMs: 450 },
    { input: 'MOTION_EVENT', event: 'BAD_FORM', action: 'RESET_COMBO', points: -5, cooldownMs: 250 },
    { input: 'MOTION_EVENT', event: 'USER_OUT_OF_FRAME', action: 'PAUSE_GAME', cooldownMs: 0 }
  ];
}

function defaultAssetKey(template: GameTemplate): string {
  if (template === 'SCENE_PLAY') return 'cuceCard';
  if (template === 'FRUIT_SLASH') return 'fruit';
  if (template === 'DODGE_RUN') return 'lowObstacle';
  return 'squatIcon';
}
