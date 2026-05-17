import {
  GameTemplateKey,
  TemplateSupportLevel,
  GameCategory,
  GameplayMechanic,
  MotionType,
  CameraRequirement
} from '../contracts';
import { TEMPLATE_FAMILY, MechanicKind } from '../game-settings';

export interface GameTemplateMetadata {
  template: GameTemplateKey;
  label: string;
  supportLevel: TemplateSupportLevel;
  categoryCompatibility: GameCategory[];
  mechanics: GameplayMechanic[];
  requiredCapabilities: string[];
  supportedMotions: MotionType[];
  requiresCamera: boolean;
  allowedCameraRequirements: CameraRequirement[];
  supportsAudio: boolean;
  requiredImageAssetKeys: string[];
  optionalImageAssetKeys: string[];
  requiredAudioEvents: string[];
  optionalAudioEvents: string[];
  minRuntimeVersion: string;
}

export function getMechanicKindForTemplate(template: GameTemplateKey): MechanicKind {
  return TEMPLATE_FAMILY[template];
}

export const TEMPLATE_REGISTRY: Record<GameTemplateKey, GameTemplateMetadata> = {
  // ---- Mevcut Runtime ----
  FRUIT_SLASH: {
    template: 'FRUIT_SLASH', label: 'Meyve Kesme',
    supportLevel: 'ANDROID_SUPPORTED',
    categoryCompatibility: ['FUN'],
    mechanics: ['TARGET_HIT'],
    requiredCapabilities: ['MOTION_EVENT', 'SCENE_OBJECTS', 'TIMER'],
    supportedMotions: ['SQUAT', 'JUMPING_JACK', 'JUMP_ROPE'],
    requiresCamera: true,
    allowedCameraRequirements: ['HAND_TARGET', 'UPPER_BODY', 'FULL_BODY'],
    supportsAudio: false,
    requiredImageAssetKeys: ['fruit', 'bonus'],
    optionalImageAssetKeys: ['background', 'bomb'],
    requiredAudioEvents: [],
    optionalAudioEvents: [],
    minRuntimeVersion: '2.0.0'
  },
  DODGE_RUN: {
    template: 'DODGE_RUN', label: 'Engelden Kacis',
    supportLevel: 'ANDROID_SUPPORTED',
    categoryCompatibility: ['FUN', 'SPORT'],
    mechanics: ['LANE_DODGE', 'AVOID'],
    requiredCapabilities: ['MOTION_EVENT', 'SCENE_OBJECTS', 'TIMER'],
    supportedMotions: ['SQUAT', 'JUMPING_JACK', 'JUMP_ROPE'],
    requiresCamera: true,
    allowedCameraRequirements: ['FULL_BODY'],
    supportsAudio: false,
    requiredImageAssetKeys: ['runner', 'lowObstacle'],
    optionalImageAssetKeys: ['jumpObstacle', 'boost_orb', 'background'],
    requiredAudioEvents: [],
    optionalAudioEvents: [],
    minRuntimeVersion: '2.0.0'
  },
  FIT_CHALLENGE: {
    template: 'FIT_CHALLENGE', label: 'Spor Mucadelesi',
    supportLevel: 'ANDROID_SUPPORTED',
    categoryCompatibility: ['SPORT'],
    mechanics: ['REP_COUNTER', 'PROGRAM_FLOW'],
    requiredCapabilities: ['MOTION_EVENT', 'PROGRAM_STEPS', 'TIMER'],
    supportedMotions: ['SQUAT', 'JUMPING_JACK', 'JUMP_ROPE'],
    requiresCamera: true,
    allowedCameraRequirements: ['FULL_BODY'],
    supportsAudio: false,
    requiredImageAssetKeys: ['squatIcon'],
    optionalImageAssetKeys: ['jumpingJackIcon', 'jumpRopeIcon', 'coach'],
    requiredAudioEvents: [],
    optionalAudioEvents: [],
    minRuntimeVersion: '2.0.0'
  },
  SCENE_PLAY: {
    template: 'SCENE_PLAY', label: 'Scene Play',
    supportLevel: 'ANDROID_SUPPORTED',
    categoryCompatibility: ['FUN', 'EDUCATION'],
    mechanics: ['POSE_CONTACT_TARGETS', 'REACTION'],
    requiredCapabilities: ['MOTION_EVENT', 'SCENE_OBJECTS', 'TIMER'],
    supportedMotions: ['SQUAT', 'JUMPING_JACK', 'JUMP_ROPE'],
    requiresCamera: true,
    allowedCameraRequirements: ['FULL_BODY', 'UPPER_BODY'],
    supportsAudio: false,
    requiredImageAssetKeys: [],
    optionalImageAssetKeys: ['background', 'character', 'cuceCard', 'deveCard'],
    requiredAudioEvents: [],
    optionalAudioEvents: [],
    minRuntimeVersion: '2.0.0'
  },

  // ---- Kamera Üstü Arcade / Motion Oyunları ----
  WHACK_A_MOLE: {
    template: 'WHACK_A_MOLE', label: 'Whack-a-Mole',
    supportLevel: 'ANDROID_SUPPORTED',
    categoryCompatibility: ['FUN'],
    mechanics: ['WHACK_A_MOLE', 'POSE_CONTACT_TARGETS', 'CAMERA_ARCADE_OVERLAY'],
    requiredCapabilities: ['POSE_CONTACT', 'SCENE_OBJECTS', 'TIMER', 'AUDIO'],
    supportedMotions: ['LEFT_HAND_HIT', 'RIGHT_HAND_HIT'],
    requiresCamera: true,
    allowedCameraRequirements: ['UPPER_BODY', 'FULL_BODY'],
    supportsAudio: true,
    requiredImageAssetKeys: [],
    optionalImageAssetKeys: ['mole_green', 'forest_background', 'hit_effect'],
    requiredAudioEvents: [],
    optionalAudioEvents: ['HIT', 'MISS', 'GAME_START', 'GAME_END', 'SUCCESS', 'LIFE_LOST'],
    minRuntimeVersion: '3.0.0'
  },
  POSE_CONTACT_TARGETS: {
    template: 'POSE_CONTACT_TARGETS', label: 'Pose Contact Targets',
    supportLevel: 'ANDROID_SUPPORTED',
    categoryCompatibility: ['FUN', 'SPORT'],
    mechanics: ['POSE_CONTACT_TARGETS', 'CAMERA_ARCADE_OVERLAY'],
    requiredCapabilities: ['POSE_CONTACT', 'SCENE_OBJECTS', 'TIMER'],
    supportedMotions: ['LEFT_HAND_HIT', 'RIGHT_HAND_HIT', 'BOTH_HANDS_UP'],
    requiresCamera: true,
    allowedCameraRequirements: ['FULL_BODY', 'UPPER_BODY'],
    supportsAudio: true,
    requiredImageAssetKeys: [],
    optionalImageAssetKeys: [],
    requiredAudioEvents: [],
    optionalAudioEvents: ['HIT', 'MISS', 'SUCCESS'],
    minRuntimeVersion: '3.0.0'
  },
  CAMERA_ARCADE_OVERLAY: {
    template: 'CAMERA_ARCADE_OVERLAY', label: 'Camera Arcade Overlay',
    supportLevel: 'WEB_PREVIEW_ONLY',
    categoryCompatibility: ['FUN'],
    mechanics: ['CAMERA_ARCADE_OVERLAY', 'POSE_CONTACT_TARGETS'],
    requiredCapabilities: ['POSE_CONTACT', 'SCENE_OBJECTS', 'TIMER'],
    supportedMotions: ['LEFT_HAND_HIT', 'RIGHT_HAND_HIT'],
    requiresCamera: true,
    allowedCameraRequirements: ['FULL_BODY'],
    supportsAudio: true,
    requiredImageAssetKeys: [],
    optionalImageAssetKeys: [],
    requiredAudioEvents: [],
    optionalAudioEvents: ['HIT', 'MISS'],
    minRuntimeVersion: '3.0.0'
  },

  // ---- Pose / Motion Oyunları ----
  POSE_HOLD: {
    template: 'POSE_HOLD', label: 'Pose Hold',
    supportLevel: 'ANDROID_SUPPORTED',
    categoryCompatibility: ['SPORT', 'FUN'],
    mechanics: ['POSE_HOLD'],
    requiredCapabilities: ['POSE_CONTACT', 'TIMER', 'MOTION_EVENT'],
    supportedMotions: ['PLANK_HOLD', 'BALANCE', 'POSE_STABLE', 'POSE_LOST'],
    requiresCamera: true,
    allowedCameraRequirements: ['FULL_BODY'],
    supportsAudio: true,
    requiredImageAssetKeys: [],
    optionalImageAssetKeys: [],
    requiredAudioEvents: [],
    optionalAudioEvents: ['COUNTDOWN', 'GAME_START', 'SUCCESS', 'FAIL', 'GAME_END'],
    minRuntimeVersion: '3.0.0'
  },
  RHYTHM_MOTION: {
    template: 'RHYTHM_MOTION', label: 'Ritim Motion',
    supportLevel: 'WEB_PREVIEW_ONLY',
    categoryCompatibility: ['FUN'],
    mechanics: ['RHYTHM_SYNC', 'TIMING_WINDOW'],
    requiredCapabilities: ['MOTION_EVENT', 'AUDIO', 'TIMER'],
    supportedMotions: ['SQUAT', 'JUMPING_JACK', 'JUMP_ROPE', 'LEFT_HAND_HIT', 'RIGHT_HAND_HIT'],
    requiresCamera: true,
    allowedCameraRequirements: ['FULL_BODY', 'UPPER_BODY'],
    supportsAudio: true,
    requiredImageAssetKeys: [],
    optionalImageAssetKeys: [],
    requiredAudioEvents: [],
    optionalAudioEvents: ['HIT', 'MISS', 'PERFECT', 'GOOD', 'BAD', 'COMBO', 'GAME_START', 'GAME_END'],
    minRuntimeVersion: '3.0.0'
  },
  REP_COUNTER: {
    template: 'REP_COUNTER', label: 'Rep Counter',
    supportLevel: 'ANDROID_SUPPORTED',
    categoryCompatibility: ['SPORT'],
    mechanics: ['REP_COUNTER'],
    requiredCapabilities: ['MOTION_EVENT', 'TIMER'],
    supportedMotions: ['SQUAT', 'JUMPING_JACK', 'JUMP_ROPE'],
    requiresCamera: true,
    allowedCameraRequirements: ['FULL_BODY'],
    supportsAudio: false,
    requiredImageAssetKeys: [],
    optionalImageAssetKeys: [],
    requiredAudioEvents: [],
    optionalAudioEvents: [],
    minRuntimeVersion: '2.0.0'
  },
  MOTION_SEQUENCE: {
    template: 'MOTION_SEQUENCE', label: 'Motion Sequence',
    supportLevel: 'ANDROID_SUPPORTED',
    categoryCompatibility: ['SPORT', 'FUN'],
    mechanics: ['SEQUENCE_MEMORY', 'PROGRAM_FLOW'],
    requiredCapabilities: ['MOTION_EVENT', 'PROGRAM_STEPS', 'TIMER'],
    supportedMotions: ['SQUAT', 'JUMPING_JACK', 'JUMP_ROPE'],
    requiresCamera: true,
    allowedCameraRequirements: ['FULL_BODY'],
    supportsAudio: true,
    requiredImageAssetKeys: [],
    optionalImageAssetKeys: [],
    requiredAudioEvents: [],
    optionalAudioEvents: ['SUCCESS', 'FAIL', 'INSTRUCTION'],
    minRuntimeVersion: '3.0.0'
  },
  INTERVAL_WORKOUT: {
    template: 'INTERVAL_WORKOUT', label: 'Interval Workout',
    supportLevel: 'ANDROID_SUPPORTED',
    categoryCompatibility: ['SPORT'],
    mechanics: ['REP_COUNTER', 'PROGRAM_FLOW', 'TIMING_WINDOW'],
    requiredCapabilities: ['MOTION_EVENT', 'PROGRAM_STEPS', 'TIMER'],
    supportedMotions: ['SQUAT', 'JUMPING_JACK', 'JUMP_ROPE', 'PLANK_HOLD'],
    requiresCamera: true,
    allowedCameraRequirements: ['FULL_BODY'],
    supportsAudio: true,
    requiredImageAssetKeys: [],
    optionalImageAssetKeys: [],
    requiredAudioEvents: [],
    optionalAudioEvents: ['COUNTDOWN', 'GAME_START', 'GAME_END', 'SUCCESS'],
    minRuntimeVersion: '3.0.0'
  },

  // ---- Eğitim ----
  QUIZ: {
    template: 'QUIZ', label: 'Quiz',
    supportLevel: 'ANDROID_SUPPORTED',
    categoryCompatibility: ['EDUCATION'],
    mechanics: ['QUIZ_SELECT'],
    requiredCapabilities: ['TIMER'],
    supportedMotions: [],
    requiresCamera: false,
    allowedCameraRequirements: ['FULL_BODY', 'UPPER_BODY'],
    supportsAudio: true,
    requiredImageAssetKeys: [],
    optionalImageAssetKeys: [],
    requiredAudioEvents: [],
    optionalAudioEvents: ['SUCCESS', 'FAIL', 'INSTRUCTION'],
    minRuntimeVersion: '3.0.0'
  },
  FLASHCARD: {
    template: 'FLASHCARD', label: 'Flash Card',
    supportLevel: 'ANDROID_SUPPORTED',
    categoryCompatibility: ['EDUCATION'],
    mechanics: ['QUIZ_SELECT'],
    requiredCapabilities: ['TIMER'],
    supportedMotions: [],
    requiresCamera: false,
    allowedCameraRequirements: ['FULL_BODY', 'UPPER_BODY'],
    supportsAudio: true,
    requiredImageAssetKeys: [],
    optionalImageAssetKeys: [],
    requiredAudioEvents: [],
    optionalAudioEvents: ['INSTRUCTION'],
    minRuntimeVersion: '3.0.0'
  },
  MEMORY_MATCH: {
    template: 'MEMORY_MATCH', label: 'Hafiza Esleme',
    supportLevel: 'ANDROID_SUPPORTED',
    categoryCompatibility: ['EDUCATION', 'FUN'],
    mechanics: ['MATCH_PAIRS'],
    requiredCapabilities: ['TIMER'],
    supportedMotions: [],
    requiresCamera: false,
    allowedCameraRequirements: ['FULL_BODY', 'UPPER_BODY'],
    supportsAudio: true,
    requiredImageAssetKeys: [],
    optionalImageAssetKeys: [],
    requiredAudioEvents: [],
    optionalAudioEvents: ['SUCCESS', 'FAIL'],
    minRuntimeVersion: '3.0.0'
  },
  TRUE_FALSE: {
    template: 'TRUE_FALSE', label: 'Dogru-Yanlis',
    supportLevel: 'ANDROID_SUPPORTED',
    categoryCompatibility: ['EDUCATION'],
    mechanics: ['QUIZ_SELECT'],
    requiredCapabilities: ['TIMER'],
    supportedMotions: [],
    requiresCamera: false,
    allowedCameraRequirements: ['FULL_BODY', 'UPPER_BODY'],
    supportsAudio: true,
    requiredImageAssetKeys: [],
    optionalImageAssetKeys: [],
    requiredAudioEvents: [],
    optionalAudioEvents: ['SUCCESS', 'FAIL'],
    minRuntimeVersion: '3.0.0'
  },
  MATCH_PAIRS: {
    template: 'MATCH_PAIRS', label: 'Match Pairs',
    supportLevel: 'EXPERIMENTAL',
    categoryCompatibility: ['EDUCATION', 'FUN'],
    mechanics: ['MATCH_PAIRS'],
    requiredCapabilities: ['TIMER'],
    supportedMotions: [],
    requiresCamera: false,
    allowedCameraRequirements: ['FULL_BODY', 'UPPER_BODY'],
    supportsAudio: true,
    requiredImageAssetKeys: [],
    optionalImageAssetKeys: [],
    requiredAudioEvents: [],
    optionalAudioEvents: ['SUCCESS', 'FAIL'],
    minRuntimeVersion: '3.0.0'
  },

  // ---- Eğlence / Aktivite ----
  REACTION: { template: 'REACTION', label: 'Refleks', supportLevel: 'WEB_PREVIEW_ONLY', categoryCompatibility: ['FUN'], mechanics: ['REACTION'], requiredCapabilities: ['MOTION_EVENT', 'TIMER'], supportedMotions: ['SQUAT', 'JUMPING_JACK', 'JUMP_ROPE'], requiresCamera: true, allowedCameraRequirements: ['FULL_BODY'], supportsAudio: true, requiredImageAssetKeys: [], optionalImageAssetKeys: [], requiredAudioEvents: [], optionalAudioEvents: ['HIT', 'MISS', 'GAME_START'], minRuntimeVersion: '3.0.0' },
  CATCH_FALLING: { template: 'CATCH_FALLING', label: 'Yakala', supportLevel: 'WEB_PREVIEW_ONLY', categoryCompatibility: ['FUN'], mechanics: ['COLLECT'], requiredCapabilities: ['POSE_CONTACT', 'SCENE_OBJECTS', 'TIMER'], supportedMotions: ['LEFT_HAND_HIT', 'RIGHT_HAND_HIT', 'BOTH_HANDS_UP'], requiresCamera: true, allowedCameraRequirements: ['UPPER_BODY', 'FULL_BODY'], supportsAudio: true, requiredImageAssetKeys: [], optionalImageAssetKeys: [], requiredAudioEvents: [], optionalAudioEvents: ['HIT', 'MISS', 'GAME_START', 'GAME_END'], minRuntimeVersion: '3.0.0' },
  AVOID_OBSTACLE: { template: 'AVOID_OBSTACLE', label: 'Engelden Kac', supportLevel: 'WEB_PREVIEW_ONLY', categoryCompatibility: ['FUN'], mechanics: ['AVOID'], requiredCapabilities: ['MOTION_EVENT', 'SCENE_OBJECTS', 'TIMER'], supportedMotions: ['SQUAT', 'JUMPING_JACK'], requiresCamera: true, allowedCameraRequirements: ['FULL_BODY'], supportsAudio: true, requiredImageAssetKeys: [], optionalImageAssetKeys: [], requiredAudioEvents: [], optionalAudioEvents: ['HIT', 'MISS', 'LIFE_LOST'], minRuntimeVersion: '3.0.0' },
  COLLECT_ITEMS: { template: 'COLLECT_ITEMS', label: 'Topla', supportLevel: 'WEB_PREVIEW_ONLY', categoryCompatibility: ['FUN'], mechanics: ['COLLECT'], requiredCapabilities: ['POSE_CONTACT', 'SCENE_OBJECTS', 'TIMER'], supportedMotions: ['LEFT_HAND_HIT', 'RIGHT_HAND_HIT'], requiresCamera: true, allowedCameraRequirements: ['UPPER_BODY', 'FULL_BODY'], supportsAudio: true, requiredImageAssetKeys: [], optionalImageAssetKeys: [], requiredAudioEvents: [], optionalAudioEvents: ['HIT', 'SUCCESS', 'COMBO'], minRuntimeVersion: '3.0.0' },

  // ---- Hibrit ----
  PROGRAM_FLOW: { template: 'PROGRAM_FLOW', label: 'Program Akisi', supportLevel: 'ANDROID_SUPPORTED', categoryCompatibility: ['SPORT', 'EDUCATION'], mechanics: ['PROGRAM_FLOW'], requiredCapabilities: ['PROGRAM_STEPS', 'TIMER', 'MOTION_EVENT'], supportedMotions: ['SQUAT', 'JUMPING_JACK', 'JUMP_ROPE', 'PLANK_HOLD'], requiresCamera: true, allowedCameraRequirements: ['FULL_BODY'], supportsAudio: true, requiredImageAssetKeys: [], optionalImageAssetKeys: [], requiredAudioEvents: [], optionalAudioEvents: ['INSTRUCTION', 'SUCCESS', 'GAME_END'], minRuntimeVersion: '3.0.0' },
  HYBRID_SCENE: { template: 'HYBRID_SCENE', label: 'Hibrit Sahne', supportLevel: 'EXPERIMENTAL', categoryCompatibility: ['FUN'], mechanics: ['PROGRAM_FLOW', 'CAMERA_ARCADE_OVERLAY'], requiredCapabilities: ['MOTION_EVENT', 'SCENE_OBJECTS', 'PROGRAM_STEPS', 'TIMER', 'POSE_CONTACT'], supportedMotions: ['SQUAT', 'JUMPING_JACK', 'JUMP_ROPE', 'LEFT_HAND_HIT', 'RIGHT_HAND_HIT'], requiresCamera: true, allowedCameraRequirements: ['FULL_BODY'], supportsAudio: true, requiredImageAssetKeys: [], optionalImageAssetKeys: [], requiredAudioEvents: [], optionalAudioEvents: [], minRuntimeVersion: '3.0.0' },

  // ---- Legacy Internal ----
  TARGET_HIT: { template: 'TARGET_HIT', label: 'Target Hit', supportLevel: 'EXPERIMENTAL', categoryCompatibility: ['FUN'], mechanics: ['TARGET_HIT'], requiredCapabilities: ['MOTION_EVENT', 'TIMER'], supportedMotions: ['SQUAT', 'JUMPING_JACK'], requiresCamera: true, allowedCameraRequirements: ['FULL_BODY'], supportsAudio: false, requiredImageAssetKeys: [], optionalImageAssetKeys: [], requiredAudioEvents: [], optionalAudioEvents: [], minRuntimeVersion: '2.0.0' },
  ENDLESS_RUNNER: { template: 'ENDLESS_RUNNER', label: 'Endless Runner', supportLevel: 'EXPERIMENTAL', categoryCompatibility: ['FUN'], mechanics: ['AVOID', 'LANE_DODGE'], requiredCapabilities: ['MOTION_EVENT', 'SCENE_OBJECTS', 'TIMER'], supportedMotions: ['SQUAT', 'JUMPING_JACK', 'JUMP_ROPE'], requiresCamera: true, allowedCameraRequirements: ['FULL_BODY'], supportsAudio: false, requiredImageAssetKeys: [], optionalImageAssetKeys: [], requiredAudioEvents: [], optionalAudioEvents: [], minRuntimeVersion: '2.0.0' }
};

export function getTemplateMeta(template: GameTemplateKey): GameTemplateMetadata {
  return TEMPLATE_REGISTRY[template];
}

export function isAndroidSupported(template: GameTemplateKey): boolean {
  const meta = TEMPLATE_REGISTRY[template];
  return meta?.supportLevel === 'ANDROID_SUPPORTED';
}

export function canPublishToMobile(template: GameTemplateKey): boolean {
  const meta = TEMPLATE_REGISTRY[template];
  if (!meta) return false;
  return meta.supportLevel === 'ANDROID_SUPPORTED';
}
