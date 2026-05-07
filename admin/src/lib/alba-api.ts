export type MotionType = 'SQUAT' | 'JUMPING_JACK' | 'JUMP_ROPE';
export type PublishStatus = 'DRAFT' | 'REVIEW' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED';
export type GameTemplate =
  | 'TARGET_HIT'
  | 'ENDLESS_RUNNER'
  | 'FRUIT_SLASH'
  | 'DODGE_RUN'
  | 'FIT_CHALLENGE'
  | 'SCENE_PLAY';
export type PublicDemoTemplate = 'FRUIT_SLASH' | 'DODGE_RUN' | 'FIT_CHALLENGE' | 'SCENE_PLAY';
export type GameOrientation = 'PORTRAIT' | 'LANDSCAPE';
export type CameraRequirement = 'FULL_BODY' | 'UPPER_BODY' | 'HAND_TARGET';
export type GameCategory = 'SPORT' | 'FUN' | 'EDUCATION';
export type ProgramStepType = 'PLAY_GAME' | 'MOTION_REPS' | 'HOLD_POSE' | 'REST' | 'INSTRUCTION';
export type GameAction =
  | 'ADD_SCORE'
  | 'REMOVE_OBJECT'
  | 'RESET_COMBO'
  | 'DECREASE_LIFE'
  | 'PROGRESS_TASK'
  | 'PAUSE_GAME'
  | 'SHOW_EFFECT'
  | 'COMPLETE_LEVEL';

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

const API_BASE_URL =
  process.env.NEXT_PUBLIC_ALBA_API_BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:3000/v1';

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    let details = response.statusText;
    try {
      const body = await response.json();
      details = body.error ?? body.message ?? JSON.stringify(body);
    } catch {
      // Keep status text fallback.
    }
    throw new Error(details || 'request_failed');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function listGameDefinitions(): Promise<GameDefinitionDto[]> {
  const response = await apiRequest<{ items: GameDefinitionDto[] }>('/internal/game-definitions');
  return response.items;
}

export async function listActiveGameDefinitions(): Promise<GameDefinitionDto[]> {
  const response = await apiRequest<{ items: GameDefinitionDto[] }>('/game-definitions/active?appVersion=0.1.0&platform=ANDROID');
  return response.items;
}

export async function getGameValidation(id: string): Promise<ValidationResponse> {
  return apiRequest<ValidationResponse>(`/internal/game-definitions/${id}/validation`);
}

export async function createGameDefinition(
  draft: GameDefinitionDraft
): Promise<GameDefinitionDto> {
  return apiRequest<GameDefinitionDto>('/internal/game-definitions', {
    method: 'POST',
    body: JSON.stringify(draft)
  });
}

export async function updateGameDefinition(
  id: string,
  draft: Partial<GameDefinitionDraft>
): Promise<GameDefinitionDto> {
  return apiRequest<GameDefinitionDto>(`/internal/game-definitions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(draft)
  });
}

export async function publishGameDefinition(id: string, actorId: string): Promise<GameDefinitionDto> {
  return apiRequest<GameDefinitionDto>(`/internal/game-definitions/${id}/publish`, {
    method: 'POST',
    body: JSON.stringify({ actorId })
  });
}

export async function rollbackGameDefinition(id: string, actorId: string): Promise<GameDefinitionDto> {
  return apiRequest<GameDefinitionDto>(`/internal/game-definitions/${id}/rollback`, {
    method: 'POST',
    body: JSON.stringify({ actorId })
  });
}

export async function listAuditLogs(): Promise<AuditLogDto[]> {
  const response = await apiRequest<{ items: AuditLogDto[] }>('/internal/audit-logs');
  return response.items;
}

export async function uploadGameAsset(file: File): Promise<GameAssetDto & { id: string; createdAt: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(`${API_BASE_URL}/internal/assets`, {
    method: 'POST',
    body: formData,
    cache: 'no-store'
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
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
    SCENE_PLAY: 'Scene Play / No-code'
  }[template];
}

export function buildDemoDraft(template: PublicDemoTemplate): GameDefinitionDraft {
  const shared = {
    minAppVersion: '0.1.0',
    status: 'DRAFT' as const,
    actorId: 'admin@local'
  };

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
            { motion: 'SQUAT', event: 'BAD_FORM', points: -5, cooldownMs: 250 },
            { motion: 'JUMPING_JACK', event: 'BAD_FORM', points: -5, cooldownMs: 250 },
            { motion: 'JUMP_ROPE', event: 'BAD_FORM', points: -2, cooldownMs: 200 }
          ],
          rewardRules: [{ rewardType: 'STAR', amount: 3, minimumScore: 420 }],
          config: {
            spawnRateMs: 900,
            comboMultiplier: true,
            penaltyObjects: true,
            penaltyPoints: 10
          },
          sceneConfig: fruitSceneConfig(),
          interactionRules: fruitInteractionRules(),
          tasks: [],
          programSteps: [
            {
              stepId: 'fruit_step_play',
              type: 'PLAY_GAME',
              title: 'Meyveleri kes',
              description: 'Ellerinle hedeflere dokun veya hareket eventleriyle bonus topla.',
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
            { motion: 'SQUAT', event: 'BAD_FORM', points: -5, cooldownMs: 250 },
            { motion: 'JUMPING_JACK', event: 'BAD_FORM', points: -5, cooldownMs: 250 }
          ],
          rewardRules: [{ rewardType: 'ENERGY', amount: 1, minimumScore: 350 }],
          config: {
            lives: 3,
            obstacleSpawnMs: 1400,
            pauseOnOutOfFrame: true,
            baseDistancePerTick: 2,
            damageOnMiss: 1
          },
          sceneConfig: dodgeSceneConfig(),
          interactionRules: dodgeInteractionRules(),
          tasks: [],
          programSteps: [
            {
              stepId: 'dodge_step_reaction',
              type: 'PLAY_GAME',
              title: 'Engelleri temizle',
              description: 'Dogru hareketle aktif engeli gec; yanlis tepki can azaltir.',
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
            { motion: 'SQUAT', event: 'BAD_FORM', points: -3, cooldownMs: 250 },
            { motion: 'JUMPING_JACK', event: 'BAD_FORM', points: -3, cooldownMs: 250 },
            { motion: 'JUMP_ROPE', event: 'BAD_FORM', points: -2, cooldownMs: 200 }
          ],
          rewardRules: [{ rewardType: 'BADGE', amount: 1, minimumScore: 620 }],
          config: {
            showQualityScore: true,
            advanceAutomatically: true
          },
          sceneConfig: fitSceneConfig(),
          interactionRules: fitInteractionRules(),
          tasks: [
            { motion: 'SQUAT', targetCount: 10, pointsPerRep: 10 },
            { motion: 'JUMPING_JACK', targetCount: 10, pointsPerRep: 12 },
            { motion: 'JUMP_ROPE', targetCount: 20, pointsPerRep: 3 }
          ],
          programSteps: [
            {
              stepId: 'fit_step_squat',
              type: 'MOTION_REPS',
              title: 'Squat seti',
              motion: 'SQUAT',
              targetCount: 10,
              successMessage: 'Squat seti tamamlandi.',
              nextOnComplete: true
            },
            {
              stepId: 'fit_step_jumping_jack',
              type: 'MOTION_REPS',
              title: 'Jumping jack seti',
              motion: 'JUMPING_JACK',
              targetCount: 10,
              successMessage: 'Ritim guzel.',
              nextOnComplete: true
            },
            {
              stepId: 'fit_step_jump_rope',
              type: 'MOTION_REPS',
              title: 'Jump rope enerjisi',
              motion: 'JUMP_ROPE',
              targetCount: 20,
              successMessage: 'Enerji toplandi.',
              nextOnComplete: true
            },
            {
              stepId: 'fit_step_plank',
              type: 'HOLD_POSE',
              title: 'Plank tutusu',
              description: 'Pozisyonunu koru, sure dolunca tebrik mesaji acilir.',
              holdSec: 30,
              successMessage: 'Tebrikler, spor programi tamamlandi.',
              nextOnComplete: true
            }
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
          { motion: 'SQUAT', event: 'BAD_FORM', points: -5, cooldownMs: 250 },
          { motion: 'JUMPING_JACK', event: 'BAD_FORM', points: -5, cooldownMs: 250 }
        ],
        rewardRules: [{ rewardType: 'STAR', amount: 2, minimumScore: 220 }],
        config: {
          spawnRateMs: 1800,
          lives: 3,
          damageOnMiss: 1,
          comboMultiplier: true
        },
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
  'FIT_CHALLENGE'
];

function demoAssetItems(pack: string, items: Array<[key: string, uri: string]>): GameAssetDto[] {
  return items.map(([key, uri]) => ({
    key,
    kind: 'IMAGE',
    format: 'PNG',
    uri,
    mimeType: 'image/png',
    sha256: `local-${pack}-${key}`
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
    {
      input: 'POSE_CONTACT',
      targetObjectType: 'fruit',
      keypoints: ['left_wrist', 'right_wrist', 'left_index', 'right_index', 'left_thumb', 'right_thumb'],
      action: 'REMOVE_OBJECT',
      points: 15,
      cooldownMs: 120
    },
    {
      input: 'MOTION_EVENT',
      event: 'REP_COUNTED',
      motion: 'SQUAT',
      targetObjectType: 'bonus',
      action: 'ADD_SCORE',
      points: 10,
      cooldownMs: 500
    },
    {
      input: 'MOTION_EVENT',
      event: 'BAD_FORM',
      action: 'RESET_COMBO',
      points: -5,
      cooldownMs: 250
    }
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
      { objectType: 'boost_orb', assetKey: 'boostOrb', requiredMotion: 'JUMP_ROPE', hitRadius: 0.14, lifeMs: 1800 }
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
  return {
    showQualityScore: true,
    taskCardStyle: 'stacked',
    completionEffect: 'pulse'
  };
}

function fitInteractionRules(): InteractionRuleDto[] {
  return [
    { input: 'MOTION_EVENT', event: 'REP_COUNTED', motion: 'SQUAT', action: 'PROGRESS_TASK', points: 10, cooldownMs: 500 },
    { input: 'MOTION_EVENT', event: 'REP_COUNTED', motion: 'JUMPING_JACK', action: 'PROGRESS_TASK', points: 12, cooldownMs: 400 },
    { input: 'MOTION_EVENT', event: 'REP_COUNTED', motion: 'JUMP_ROPE', action: 'PROGRESS_TASK', points: 3, cooldownMs: 220 },
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
      {
        objectType: 'cuce_prompt',
        label: 'Cuce',
        assetKey: 'cuceCard',
        requiredMotion: 'SQUAT',
        points: 10,
        lifeMs: 2400,
        hitRadius: 0.2
      },
      {
        objectType: 'deve_prompt',
        label: 'Deve',
        assetKey: 'deveCard',
        requiredMotion: 'JUMPING_JACK',
        points: 12,
        lifeMs: 2400,
        hitRadius: 0.2
      }
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
