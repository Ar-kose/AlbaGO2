import { randomUUID } from 'node:crypto';

export type Platform = 'ANDROID';
export type SessionSource = 'CAMERA';
export type SessionStatus = 'READY' | 'COUNTDOWN' | 'ACTIVE' | 'PAUSED' | 'FINISHED';
export type PublishStatus = 'DRAFT' | 'REVIEW' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED';
export type MotionType =
  | 'SQUAT'
  | 'JUMPING_JACK'
  | 'JUMP_ROPE'
  | 'PLANK_HOLD'
  | 'LEFT_HAND_HIT'
  | 'RIGHT_HAND_HIT'
  | 'BOTH_HANDS_UP'
  | 'BALANCE'
  | 'POSE_STABLE'
  | 'POSE_LOST';
export type ScopeType = 'GLOBAL' | 'FRIENDS';
export type PeriodType = 'DAILY' | 'WEEKLY';
export type GameTemplateKey =
  // Mevcut runtime
  | 'FRUIT_SLASH'
  | 'DODGE_RUN'
  | 'FIT_CHALLENGE'
  | 'SCENE_PLAY'
  | 'TARGET_HIT'
  | 'ENDLESS_RUNNER'
  // Kamera üstü arcade / motion oyunları
  | 'WHACK_A_MOLE'
  | 'POSE_CONTACT_TARGETS'
  | 'CAMERA_ARCADE_OVERLAY'
  | 'RHYTHM_MOTION'
  | 'POSE_HOLD'
  | 'REP_COUNTER'
  | 'MOTION_SEQUENCE'
  | 'INTERVAL_WORKOUT'
  // Eğitim
  | 'QUIZ'
  | 'FLASHCARD'
  | 'MEMORY_MATCH'
  | 'TRUE_FALSE'
  | 'MATCH_PAIRS'
  // Eğlence / aktivite
  | 'REACTION'
  | 'CATCH_FALLING'
  | 'AVOID_OBSTACLE'
  | 'COLLECT_ITEMS'
  // Hibrit
  | 'PROGRAM_FLOW'
  | 'HYBRID_SCENE';
export type TemplateSupportLevel =
  | 'ANDROID_SUPPORTED'
  | 'WEB_PREVIEW_ONLY'
  | 'EXPERIMENTAL';

export type GameplayMechanic =
  | 'TARGET_HIT'
  | 'WHACK_A_MOLE'
  | 'POSE_CONTACT_TARGETS'
  | 'CAMERA_ARCADE_OVERLAY'
  | 'LANE_DODGE'
  | 'RHYTHM_SYNC'
  | 'POSE_HOLD'
  | 'REP_COUNTER'
  | 'REACTION'
  | 'COLLECT'
  | 'AVOID'
  | 'TIMING_WINDOW'
  | 'SEQUENCE_MEMORY'
  | 'QUIZ_SELECT'
  | 'MATCH_PAIRS'
  | 'PROGRAM_FLOW';

export type GameTheme =
  | 'FOREST'
  | 'SPACE'
  | 'NINJA'
  | 'SPORT'
  | 'SCHOOL'
  | 'ANIMALS'
  | 'MUSIC'
  | 'FITNESS'
  | 'UNDERWATER'
  | 'CUSTOM';

export type GameOrientation = 'PORTRAIT' | 'LANDSCAPE';
export type CameraRequirement = 'FULL_BODY' | 'UPPER_BODY' | 'HAND_TARGET';
export type GameCategory = 'SPORT' | 'FUN' | 'EDUCATION';
export type ProgramStepType = 'PLAY_GAME' | 'MOTION_REPS' | 'HOLD_POSE' | 'REST' | 'INSTRUCTION';
export type GameAssetKind = 'IMAGE' | 'AUDIO';
export type GameAssetFormat = 'PNG' | 'WEBP' | 'SVG' | 'MP3';
export type GameActionType =
  | 'ADD_SCORE'
  | 'REMOVE_OBJECT'
  | 'SPAWN_OBJECT'
  | 'RESET_COMBO'
  | 'ADD_COMBO'
  | 'DECREASE_LIFE'
  | 'INCREASE_LIFE'
  | 'PROGRESS_TASK'
  | 'PAUSE_GAME'
  | 'RESUME_GAME'
  | 'COMPLETE_LEVEL'
  | 'ADVANCE_STEP'
  | 'PLAY_SOUND'
  | 'SHOW_EFFECT'
  | 'SHOW_MESSAGE'
  | 'GRANT_REWARD_REQUEST';

export interface UserEntity {
  id: string;
  guestToken: string;
  displayName: string;
  status: 'ACTIVE';
  createdAt: string;
}

export interface DeviceEntity {
  id: string;
  userId: string;
  installId: string;
  platform: Platform;
  appVersion: string;
  pushToken?: string;
  consentVersion: string;
  createdAt: string;
}

export interface MotionDefinitionEntity {
  motionType: MotionType;
  title: string;
  detectorKey: string;
  detectorMinVersion: string;
  supportedGameTemplates: GameTemplateKey[];
  isActive: boolean;
}

export interface WorkoutSessionEntity {
  id: string;
  clientSessionKey?: string;
  userId?: string;
  motionType: MotionType;
  source: SessionSource;
  startedAt: string;
  endedAt?: string;
  durationSec?: number;
  totalScore?: number;
  status: SessionStatus;
  motionSummary?: Record<string, unknown>;
}

export interface MotionRuleEntity {
  motion: MotionType;
  event: 'REP_COUNTED' | 'BAD_FORM' | 'USER_OUT_OF_FRAME' | 'PAUSED' | 'RESUMED';
  points: number;
  cooldownMs: number;
}

export interface RewardRuleEntity {
  rewardType: string;
  amount: number;
  minimumScore: number;
}

export interface TaskRuleEntity {
  motion: MotionType;
  targetCount: number;
  pointsPerRep: number;
}

export interface ProgramStepEntity {
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

export interface SceneObjectDefinitionEntity {
  objectId?: string;
  objectType: string;
  assetKey: string;
  position?: {
    x: number;
    y: number;
  };
  size?: {
    width: number;
    height: number;
  };
  hitRadius?: number;
  requiredMotion?: MotionType;
  isPenalty?: boolean;
  spawnedAtMs?: number;
  lifeMs?: number;
}

export interface InteractionRuleEntity {
  input: 'MOTION_EVENT' | 'POSE_CONTACT';
  event?: MotionRuleEntity['event'];
  motion?: MotionType;
  targetObjectType?: string;
  keypoints?: string[];
  action: GameActionType;
  points?: number;
  cooldownMs?: number;
}

export interface GameLevelEntity {
  levelId: string;
  durationSec: number;
  targetScore: number;
  difficulty: string;
  motionRules: MotionRuleEntity[];
  rewardRules: RewardRuleEntity[];
  configJson: Record<string, unknown>;
  sceneConfig?: Record<string, unknown>;
  interactionRules?: InteractionRuleEntity[];
  taskRulesJson?: TaskRuleEntity[];
  programSteps?: ProgramStepEntity[];
}

export interface GameAssetEntity {
  id?: string;
  key: string;
  kind: GameAssetKind;
  format: GameAssetFormat;
  uri: string;
  mimeType?: string;
  width?: number;
  height?: number;
  sha256?: string;
  bytes?: number;
  createdAt?: string;
}

export interface AssetManifestEntity {
  background: string;
  character: string;
  soundtrack?: string;
  items?: GameAssetEntity[];
}

export interface GameDefinitionEntity {
  id: string;
  gameKey: string;
  version: number;
  templateKey: GameTemplateKey;
  title: string;
  description: string;
  status: PublishStatus;
  minAppVersion: string;
  orientation: GameOrientation;
  cameraRequirement: CameraRequirement;
  segmentRuleJson: Record<string, unknown>;
  supportedMotions: MotionType[];
  levels: GameLevelEntity[];
  assets: AssetManifestEntity;
  publishedAt?: string;
}

export interface GameSessionResultPayload {
  gameId?: string;
  gameKey?: string;
  gameTitle?: string;
  template?: string;
  gameVersion?: number;
  score: number;
  durationSec: number;
  motionCounts?: Partial<Record<MotionType, number>>;
  motionSummary?: Record<string, unknown>;
  comboMax?: number;
  accuracy: number;
  startedAt: string;
  endedAt: string;
  clientSessionKey?: string;
  clientSessionId?: string;
  programSteps?: unknown[];
  sceneState?: Record<string, unknown>;
  debugSource?: string;
}

export interface GameSessionEntity {
  id: string;
  clientSessionKey?: string;
  userId?: string;
  gameDefinitionId?: string;
  workoutSessionId?: string;
  gameKey?: string;
  gameDefinitionVersion?: number;
  deviceId?: string;
  status?: string;
  startedAt: string;
  endedAt?: string;
  durationSec?: number;
  score?: number;
  combo?: number;
  accuracy?: number;
  calories?: number;
  gameVersion?: number;
  result?: string;
  clientIntegrityHash?: string;
  resultPayload?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface SubmitGameSessionResultInput {
  clientSessionId: string;
  gameKey: string;
  gameDefinitionId?: string;
  gameDefinitionVersion?: number;
  deviceId?: string;
  startedAt?: string;
  endedAt?: string;
  durationSec?: number;
  score: number;
  combo?: number;
  accuracy?: number;
  calories?: number;
  resultPayload: Record<string, unknown>;
}

export interface SubmitGameSessionResultResponse {
  id: string;
  clientSessionId: string;
  status: 'stored' | 'duplicate_accepted';
  createdAt: string;
}

export interface RewardGrantEntity {
  id: string;
  userId: string;
  sourceType: string;
  sourceId: string;
  rewardType: string;
  amount: number;
  idempotencyKey: string;
  createdAt: string;
}

export interface AuditLogEntity {
  id: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeJson?: Record<string, unknown>;
  afterJson?: Record<string, unknown>;
  createdAt: string;
}

export const motionDefinitions: MotionDefinitionEntity[] = [
  {
    motionType: 'SQUAT',
    title: 'Squat',
    detectorKey: 'squat_detector',
    detectorMinVersion: 'v1',
    supportedGameTemplates: ['TARGET_HIT', 'FRUIT_SLASH', 'DODGE_RUN', 'FIT_CHALLENGE', 'SCENE_PLAY'],
    isActive: true
  },
  {
    motionType: 'JUMPING_JACK',
    title: 'Jumping Jack',
    detectorKey: 'jumping_jack_detector',
    detectorMinVersion: 'v1',
    supportedGameTemplates: ['TARGET_HIT', 'FRUIT_SLASH', 'DODGE_RUN', 'FIT_CHALLENGE', 'SCENE_PLAY'],
    isActive: true
  },
  {
    motionType: 'JUMP_ROPE',
    title: 'Jump Rope',
    detectorKey: 'jump_rope_detector',
    detectorMinVersion: 'v1',
    supportedGameTemplates: ['ENDLESS_RUNNER', 'FRUIT_SLASH', 'DODGE_RUN', 'FIT_CHALLENGE', 'SCENE_PLAY'],
    isActive: true
  }
];

export const seededGames: GameDefinitionEntity[] = [
  {
    id: createId('game'),
    gameKey: 'fruit_slash_demo',
    version: 1,
    templateKey: 'FRUIT_SLASH',
    title: 'Meyve Kesme',
    description: 'Jumping jack ve squat ile ritimli meyve kesme demo oyunu.',
    status: 'PUBLISHED',
    minAppVersion: '0.1.0',
    orientation: 'LANDSCAPE',
    cameraRequirement: 'HAND_TARGET',
    segmentRuleJson: { audience: 'all', internalOnly: false, category: 'FUN', tags: ['reflex', 'arcade', 'hand-target'] },
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
        configJson: {
          spawnRateMs: 900,
          comboMultiplier: true,
          penaltyObjects: true,
          penaltyPoints: 10
        },
        sceneConfig: {
          laneCount: 3,
          maxObjects: 5,
          defaultHitRadius: 0.18,
          defaultObjectLifeMs: 2600,
          spawn: {
            objectTypes: ['fruit', 'bonus', 'bomb']
          }
        },
        interactionRules: [
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
            motion: 'JUMP_ROPE',
            targetObjectType: 'fruit',
            action: 'ADD_SCORE',
            points: 3,
            cooldownMs: 250
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
    },
    publishedAt: new Date().toISOString()
  },
  {
    id: createId('game'),
    gameKey: 'dodge_run_demo',
    version: 1,
    templateKey: 'DODGE_RUN',
    title: 'Engelden Kacis',
    description: 'Squat, jumping jack ve jump rope ile tepki veren kacis demosu.',
    status: 'PUBLISHED',
    minAppVersion: '0.1.0',
    orientation: 'LANDSCAPE',
    cameraRequirement: 'FULL_BODY',
    segmentRuleJson: { audience: 'all', internalOnly: false, category: 'FUN', tags: ['runner', 'reaction', 'arcade'] },
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
        configJson: {
          lives: 3,
          obstacleSpawnMs: 1400,
          pauseOnOutOfFrame: true,
          baseDistancePerTick: 2,
          damageOnMiss: 1
        },
        sceneConfig: {
          lanes: ['low', 'high', 'boost'],
          travelMs: 2100,
          obstacleWindowMs: 1400,
          objects: [
            { objectType: 'low_obstacle', assetKey: 'lowObstacle', requiredMotion: 'SQUAT', hitRadius: 0.16, lifeMs: 2100 },
            { objectType: 'jump_obstacle', assetKey: 'jumpObstacle', requiredMotion: 'JUMPING_JACK', hitRadius: 0.16, lifeMs: 2100 },
            { objectType: 'boost_orb', assetKey: 'boostOrb', requiredMotion: 'JUMP_ROPE', hitRadius: 0.14, lifeMs: 1800 }
          ]
        },
        interactionRules: [
          { input: 'MOTION_EVENT', event: 'REP_COUNTED', motion: 'SQUAT', targetObjectType: 'low_obstacle', action: 'REMOVE_OBJECT', points: 10, cooldownMs: 500 },
          { input: 'MOTION_EVENT', event: 'REP_COUNTED', motion: 'JUMPING_JACK', targetObjectType: 'jump_obstacle', action: 'REMOVE_OBJECT', points: 15, cooldownMs: 450 },
          { input: 'MOTION_EVENT', event: 'REP_COUNTED', motion: 'JUMP_ROPE', targetObjectType: 'boost_orb', action: 'ADD_SCORE', points: 3, cooldownMs: 250 },
          { input: 'MOTION_EVENT', event: 'BAD_FORM', action: 'DECREASE_LIFE', points: -5, cooldownMs: 250 },
          { input: 'MOTION_EVENT', event: 'USER_OUT_OF_FRAME', action: 'PAUSE_GAME', cooldownMs: 0 }
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
    },
    publishedAt: new Date().toISOString()
  },
  {
    id: createId('game'),
    gameKey: 'fit_challenge_demo',
    version: 1,
    templateKey: 'FIT_CHALLENGE',
    title: 'Spor Mucadelesi',
    description: 'Gorev sirali fitness demosi; squat, jumping jack ve jump rope hedefleri.',
    status: 'PUBLISHED',
    minAppVersion: '0.1.0',
    orientation: 'PORTRAIT',
    cameraRequirement: 'FULL_BODY',
    segmentRuleJson: { audience: 'all', internalOnly: false, category: 'SPORT', tags: ['playlist', 'fitness', 'program'] },
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
        configJson: {
          showQualityScore: true,
          advanceAutomatically: true
        },
        sceneConfig: {
          showQualityScore: true,
          taskCardStyle: 'stacked',
          completionEffect: 'pulse'
        },
        interactionRules: [
          { input: 'MOTION_EVENT', event: 'REP_COUNTED', motion: 'SQUAT', action: 'PROGRESS_TASK', points: 10, cooldownMs: 500 },
          { input: 'MOTION_EVENT', event: 'REP_COUNTED', motion: 'JUMPING_JACK', action: 'PROGRESS_TASK', points: 12, cooldownMs: 400 },
          { input: 'MOTION_EVENT', event: 'REP_COUNTED', motion: 'JUMP_ROPE', action: 'PROGRESS_TASK', points: 3, cooldownMs: 220 },
          { input: 'MOTION_EVENT', event: 'BAD_FORM', action: 'RESET_COMBO', points: -3, cooldownMs: 250 },
          { input: 'MOTION_EVENT', event: 'USER_OUT_OF_FRAME', action: 'PAUSE_GAME', cooldownMs: 0 }
        ],
        taskRulesJson: [
          { motion: 'SQUAT', targetCount: 10, pointsPerRep: 10 },
          { motion: 'JUMPING_JACK', targetCount: 10, pointsPerRep: 12 },
          { motion: 'JUMP_ROPE', targetCount: 20, pointsPerRep: 3 }
        ],
        programSteps: [
          {
            stepId: 'fit_step_squat',
            type: 'MOTION_REPS',
            title: 'Squat seti',
            description: 'Dizlerini kontrollu buk, tekrar sayimini tamamla.',
            motion: 'SQUAT',
            targetCount: 10,
            successMessage: 'Squat seti tamamlandi.',
            nextOnComplete: true
          },
          {
            stepId: 'fit_step_jumping_jack',
            type: 'MOTION_REPS',
            title: 'Jumping jack seti',
            description: 'Kollar ve bacaklar birlikte acilip kapansin.',
            motion: 'JUMPING_JACK',
            targetCount: 10,
            successMessage: 'Ritim guzel, siradaki hedefe gec.',
            nextOnComplete: true
          },
          {
            stepId: 'fit_step_jump_rope',
            type: 'MOTION_REPS',
            title: 'Jump rope enerjisi',
            description: 'Belirgin ziplamalarla enerji topla.',
            motion: 'JUMP_ROPE',
            targetCount: 20,
            successMessage: 'Enerji toplandi.',
            nextOnComplete: true
          },
          {
            stepId: 'fit_step_plank',
            type: 'HOLD_POSE',
            title: 'Plank tutusu',
            description: 'Pozisyonunu koru; sure dolunca program tamamlanir.',
            holdSec: 30,
            successMessage: 'Tebrikler, program tamamlandi.',
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
    },
    publishedAt: new Date().toISOString()
  },
  {
    id: createId('game'),
    gameKey: 'deve_cuce_demo',
    version: 1,
    templateKey: 'SCENE_PLAY',
    title: 'Deve Cuce',
    description: 'Admin scene-rule motoru ile uretilen komut takip oyunu.',
    status: 'PUBLISHED',
    minAppVersion: '0.1.0',
    orientation: 'LANDSCAPE',
    cameraRequirement: 'FULL_BODY',
    segmentRuleJson: { audience: 'kids', internalOnly: false, engine: 'scene_rule_v1', category: 'EDUCATION', tags: ['kids', 'command', 'deve-cuce'] },
    supportedMotions: ['SQUAT', 'JUMPING_JACK'],
    levels: [
      {
        levelId: 'deve_cuce_level_1',
        durationSec: 60,
        targetScore: 300,
        difficulty: 'EASY',
        motionRules: [
          { motion: 'SQUAT', event: 'REP_COUNTED', points: 10, cooldownMs: 500 },
          { motion: 'JUMPING_JACK', event: 'REP_COUNTED', points: 12, cooldownMs: 450 },
          { motion: 'SQUAT', event: 'BAD_FORM', points: -5, cooldownMs: 250 },
          { motion: 'JUMPING_JACK', event: 'BAD_FORM', points: -5, cooldownMs: 250 }
        ],
        rewardRules: [{ rewardType: 'STAR', amount: 2, minimumScore: 220 }],
        configJson: {
          spawnRateMs: 1800,
          lives: 3,
          damageOnMiss: 1,
          comboMultiplier: true
        },
        sceneConfig: {
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
        },
        interactionRules: [
          { input: 'MOTION_EVENT', event: 'REP_COUNTED', motion: 'SQUAT', targetObjectType: 'cuce_prompt', action: 'REMOVE_OBJECT', points: 10, cooldownMs: 500 },
          { input: 'MOTION_EVENT', event: 'REP_COUNTED', motion: 'JUMPING_JACK', targetObjectType: 'deve_prompt', action: 'REMOVE_OBJECT', points: 12, cooldownMs: 450 },
          { input: 'MOTION_EVENT', event: 'BAD_FORM', action: 'RESET_COMBO', points: -5, cooldownMs: 250 },
          { input: 'MOTION_EVENT', event: 'USER_OUT_OF_FRAME', action: 'PAUSE_GAME', cooldownMs: 0 }
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
    },
    publishedAt: new Date().toISOString()
  },
  {
    id: createId('game'),
    gameKey: 'target_hit_internal',
    version: 1,
    templateKey: 'TARGET_HIT',
    title: 'Target Hit Internal',
    description: 'Regression ve debug icin korunan eski hedef vurma oyunu.',
    status: 'REVIEW',
    minAppVersion: '0.1.0',
    orientation: 'PORTRAIT',
    cameraRequirement: 'FULL_BODY',
    segmentRuleJson: { audience: 'internal', internalOnly: true, category: 'SPORT', tags: ['debug'] },
    supportedMotions: ['SQUAT', 'JUMPING_JACK'],
    levels: [
      {
        levelId: 'target_hit_level_1',
        durationSec: 60,
        targetScore: 300,
        difficulty: 'EASY',
        motionRules: [
          { motion: 'SQUAT', event: 'REP_COUNTED', points: 10, cooldownMs: 500 },
          { motion: 'JUMPING_JACK', event: 'REP_COUNTED', points: 15, cooldownMs: 400 }
        ],
        rewardRules: [{ rewardType: 'COIN', amount: 20, minimumScore: 300 }],
        configJson: {
          pulseScale: 1.0
        },
        sceneConfig: {
          targetCount: 1,
          hitRadius: 0.2
        },
        interactionRules: [
          { input: 'MOTION_EVENT', event: 'REP_COUNTED', motion: 'SQUAT', action: 'ADD_SCORE', points: 10, cooldownMs: 500 },
          { input: 'MOTION_EVENT', event: 'REP_COUNTED', motion: 'JUMPING_JACK', action: 'ADD_SCORE', points: 15, cooldownMs: 400 }
        ]
      }
    ],
    assets: {
      background: 'local://target-hit/background',
      character: 'local://target-hit/orb',
      items: demoAssetItems('target-hit', [
        ['background', 'local://target-hit/background'],
        ['orb', 'local://target-hit/orb']
      ])
    }
  },
  {
    id: createId('game'),
    gameKey: 'endless_runner_internal',
    version: 1,
    templateKey: 'ENDLESS_RUNNER',
    title: 'Endless Runner Internal',
    description: 'Legacy kosu runtime testi.',
    status: 'REVIEW',
    minAppVersion: '0.1.0',
    orientation: 'LANDSCAPE',
    cameraRequirement: 'FULL_BODY',
    segmentRuleJson: { audience: 'internal', internalOnly: true, category: 'SPORT', tags: ['debug'] },
    supportedMotions: ['JUMP_ROPE'],
    levels: [
      {
        levelId: 'endless_runner_level_1',
        durationSec: 45,
        targetScore: 280,
        difficulty: 'MEDIUM',
        motionRules: [
          { motion: 'JUMP_ROPE', event: 'REP_COUNTED', points: 15, cooldownMs: 300 }
        ],
        rewardRules: [{ rewardType: 'STAR', amount: 3, minimumScore: 280 }],
        configJson: {
          laneCount: 1
        },
        sceneConfig: {
          laneCount: 1,
          speed: 1
        },
        interactionRules: [
          { input: 'MOTION_EVENT', event: 'REP_COUNTED', motion: 'JUMP_ROPE', action: 'ADD_SCORE', points: 15, cooldownMs: 300 }
        ]
      }
    ],
    assets: {
      background: 'local://endless-runner/background',
      character: 'local://endless-runner/runner',
      items: demoAssetItems('endless-runner', [
        ['background', 'local://endless-runner/background'],
        ['runner', 'local://endless-runner/runner']
      ])
    }
  }
];

export function createId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

function demoAssetItems(
  pack: string,
  items: Array<[key: string, uri: string]>
): GameAssetEntity[] {
  return items.map(([key, uri]) => ({
    key,
    kind: 'IMAGE',
    format: 'PNG',
    uri,
    mimeType: 'image/png',
    sha256: `local-${pack}-${key}`
  }));
}
