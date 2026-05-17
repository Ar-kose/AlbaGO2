// GameSettings — Birlesik Oyun Konfigürasyon Semasi
// Source of truth: Backend (bu dosya). Admin ve Android birebir kopya tutar.
//
// Seviye 1: CommonGameSettings — TUM oyun tipleri icin gecerli ortak ayarlar
// Seviye 2: GameMechanic      — Oyun ailesine ozel mekanik konfigürasyonu

import { GameTemplateKey, GameCategory, GameOrientation, CameraRequirement, MotionType } from './contracts';

// ============================================================================
// SEVİYE 1: ORTAK OYUN AYARLARI
// ============================================================================

export interface CommonGameSettings {
  templateId: GameTemplateKey;
  title: string;
  description: string;
  category: GameCategory;

  lives: LivesSettings;
  duration: DurationSettings;
  scoring: ScoringSettings;
  completion: CompletionSettings;
  presentation: PresentationSettings;
  feedback: FeedbackSettings;
}

export interface LivesSettings {
  mode: 'NONE' | 'LIMITED' | 'UNLIMITED';
  count: number;
  gracePeriodSec: number;
  loseOnBadForm: boolean;
  loseOnExpire: boolean;
  loseOnOutOfFrame: boolean;
}

export interface DurationSettings {
  mode: 'TIMED' | 'UNTIL_COMPLETE' | 'ENDLESS';
  sec: number;
  countdownSec: number;
}

export interface ScoringSettings {
  targetScore: number;
  pointsPerCorrect: number;
  penaltyPerWrong: number;
  comboEnabled: boolean;
  comboMultiplier: number;
  maxComboMultiplier: number;
  streakBonus: number;
}

export interface CompletionSettings {
  primary: 'DURATION' | 'SCORE_TARGET' | 'ALL_TASKS_DONE' | 'LIVES_DEPLETED' | 'MANUAL';
  allowEarlyFinish: boolean;
  showResultScreen: boolean;
}

export interface PresentationSettings {
  orientation: GameOrientation;
  cameraRequirement: CameraRequirement | 'NONE';
  showTimer: boolean;
  showScore: boolean;
  showLives: boolean;
  showCombo: boolean;
}

export interface FeedbackSettings {
  visualEffectOnCorrect: boolean;
  visualEffectOnWrong: boolean;
  vibrateOnCorrect: boolean;
  vibrateOnWrong: boolean;
  soundOnCorrect: boolean;
  soundOnWrong: boolean;
  showPromptText: boolean;
  promptUpdateStrategy: 'ON_CHANGE' | 'ALWAYS_VISIBLE' | 'HIDDEN';
}

// ============================================================================
// SEVİYE 2: OYUN MEKANİĞİ (7 aile)
// ============================================================================

export type GameMechanic =
  | MotionArcadeMechanic
  | PoseContactMechanic
  | QuizMechanic
  | StudyMechanic
  | HoldMechanic
  | RhythmMechanic
  | ProgramMechanic;

export type MechanicKind = GameMechanic['kind'];

// --- Aile 1: Motion Arcade ---
// Kapsam: SCENE_PLAY, FRUIT_SLASH, DODGE_RUN, REACTION,
//         AVOID_OBSTACLE, TARGET_HIT, ENDLESS_RUNNER, CATCH_FALLING

export interface MotionArcadeObject {
  id: string;
  label: string;
  assetKey: string;
  requiredMotion: MotionType;
  points: number;
  lifeMs?: number;
  lane?: number;
  probability?: number;
  isPenalty?: boolean;
}

export interface MotionArcadeMechanic {
  kind: 'MOTION_ARCADE';

  spawn: {
    strategy: 'RANDOM' | 'SEQUENCE' | 'WAVE';
    intervalMs: number;
    maxActive: number;
    initialDelayMs: number;
    waveSize?: number;
    waveCooldownMs?: number;
  };

  objects: MotionArcadeObject[];

  match: {
    strategy: 'BY_MOTION' | 'BY_POSE_LANDMARK' | 'BY_TARGET_ID' | 'ANY_CORRECT';
    matchWindowMs: number;
  };

  onExpire: {
    action: 'NONE' | 'MISS_PENALTY' | 'LOSE_LIFE';
    penaltyPoints: number;
    showFeedback: boolean;
  };

  penaltyObjects?: {
    enabled: boolean;
    objects: MotionArcadeObject[];
    penaltyPoints: number;
    penaltyAction: 'DEDUCT_SCORE' | 'LOSE_LIFE' | 'RESET_COMBO';
  };

  objectDefaults: {
    lifeMs: number;
    hitRadius: number;
    fadeOutMs: number;
    hitCooldownMs: number;
  };
}

// --- Aile 2: Pose Contact ---
// Kapsam: WHACK_A_MOLE, POSE_CONTACT_TARGETS, CAMERA_ARCADE_OVERLAY, COLLECT_ITEMS

export interface PoseContactTarget {
  targetId: string;
  x: number;
  y: number;
  radius: number;
  hitBy: string[];
  assetKey: string;
  points: number;
}

export interface PoseContactMechanic {
  kind: 'POSE_CONTACT';

  targets: PoseContactTarget[];

  spawn: {
    intervalMs: number;
    visibleMs: number;
    maxActiveTargets: number;
    activateMode: 'RANDOM' | 'SEQUENCE' | 'ALL_AT_ONCE';
  };

  hitDetection: {
    minConfidence: number;
    hitRadius: number;
    hitCooldownMs: number;
    loseLifeOnTimeout: boolean;
  };
}

// --- Aile 3: Quiz ---
// Kapsam: QUIZ, TRUE_FALSE

export interface QuizQuestion {
  id: string;
  prompt: string;
  choices: string[];
  correctIndex: number;
  points: number;
  timeLimitSec?: number;
  explanation?: string;
}

export interface QuizMechanic {
  kind: 'QUIZ';

  questions: QuizQuestion[];

  display: {
    shuffleQuestions: boolean;
    shuffleChoices: boolean;
    showCorrectAnswer: boolean;
    showProgressBar: boolean;
    allowSkip: boolean;
    autoAdvance: boolean;
    autoAdvanceDelayMs: number;
  };
}

// --- Aile 4: Study ---
// Kapsam: FLASHCARD, MEMORY_MATCH, MATCH_PAIRS

export interface StudyCard {
  id: string;
  frontText: string;
  backText: string;
  imageAssetKey?: string;
  audioAssetKey?: string;
}

export interface StudyPair {
  id: string;
  left: { text?: string; imageAssetKey?: string; audioAssetKey?: string };
  right: { text?: string; imageAssetKey?: string; audioAssetKey?: string };
}

export interface StudyMechanic {
  kind: 'STUDY';

  studyType: 'FLASHCARD' | 'MEMORY_MATCH' | 'MATCH_PAIRS';

  cards?: StudyCard[];
  pairs?: StudyPair[];

  display: {
    shuffleItems: boolean;
    showProgress: boolean;
    gridColumns?: number;
    revealDelayMs?: number;
    allowFlipBack: boolean;
  };
}

// --- Aile 5: Hold ---
// Kapsam: POSE_HOLD

export interface HoldMechanic {
  kind: 'HOLD';

  pose: 'PLANK' | 'BALANCE' | 'CUSTOM';
  targetHoldSec: number;
  graceMs: number;
  minConfidence: number;
  customPoseDescription?: string;

  display: {
    showProgressBar: boolean;
    showQualityScore: boolean;
    countdownStyle: 'NUMERIC' | 'PROGRESS_BAR' | 'CIRCULAR';
  };
}

// --- Aile 6: Rhythm ---
// Kapsam: RHYTHM_MOTION

export interface RhythmNote {
  noteId: string;
  motion: MotionType;
  timingMs: number;
  windowMs: number;
  points: number;
}

export interface RhythmMechanic {
  kind: 'RHYTHM';

  bpm: number;
  notes: RhythmNote[];

  display: {
    noteSpeed: number;
    showBeatIndicator: boolean;
  };
}

// --- Aile 7: Program ---
// Kapsam: FIT_CHALLENGE, REP_COUNTER, MOTION_SEQUENCE,
//         INTERVAL_WORKOUT, PROGRAM_FLOW, HYBRID_SCENE

export interface ProgramStep {
  stepId: string;
  type: 'INSTRUCTION' | 'PLAY_GAME' | 'MOTION_REPS' | 'HOLD_POSE' | 'REST';
  title: string;
  description?: string;
  motion?: MotionType;
  targetCount?: number;
  pointsPerRep?: number;
  holdSec?: number;
  durationSec?: number;
  nextOnComplete: boolean;
  autoAdvance: boolean;
}

export interface ProgramMechanic {
  kind: 'PROGRAM';

  steps: ProgramStep[];

  display: {
    showStepIndicator: boolean;
    showRepCounter: boolean;
    showRestTimer: boolean;
  };
}

// ============================================================================
// TAM GAME SETTINGS
// ============================================================================

export interface GameSettings {
  schemaVersion: '1.0';
  common: CommonGameSettings;
  mechanic: GameMechanic;
}

// ============================================================================
// TEMPLATE → AİLE EŞLEŞTİRMESİ
// ============================================================================

export const TEMPLATE_FAMILY: Record<GameTemplateKey, MechanicKind> = {
  // Motion Arcade ailesi
  SCENE_PLAY: 'MOTION_ARCADE',
  FRUIT_SLASH: 'MOTION_ARCADE',
  DODGE_RUN: 'MOTION_ARCADE',
  REACTION: 'MOTION_ARCADE',
  AVOID_OBSTACLE: 'MOTION_ARCADE',
  TARGET_HIT: 'MOTION_ARCADE',
  ENDLESS_RUNNER: 'MOTION_ARCADE',
  CATCH_FALLING: 'MOTION_ARCADE',

  // Pose Contact ailesi
  WHACK_A_MOLE: 'POSE_CONTACT',
  POSE_CONTACT_TARGETS: 'POSE_CONTACT',
  CAMERA_ARCADE_OVERLAY: 'POSE_CONTACT',
  COLLECT_ITEMS: 'POSE_CONTACT',

  // Quiz ailesi
  QUIZ: 'QUIZ',
  TRUE_FALSE: 'QUIZ',

  // Study ailesi
  FLASHCARD: 'STUDY',
  MEMORY_MATCH: 'STUDY',
  MATCH_PAIRS: 'STUDY',

  // Hold ailesi
  POSE_HOLD: 'HOLD',

  // Rhythm ailesi
  RHYTHM_MOTION: 'RHYTHM',

  // Program ailesi
  FIT_CHALLENGE: 'PROGRAM',
  REP_COUNTER: 'PROGRAM',
  MOTION_SEQUENCE: 'PROGRAM',
  INTERVAL_WORKOUT: 'PROGRAM',
  PROGRAM_FLOW: 'PROGRAM',
  HYBRID_SCENE: 'PROGRAM',
};

// ============================================================================
// VARSAYILAN DEGERLER (her aile icin)
// ============================================================================

export function defaultCommonSettings(templateId: GameTemplateKey, overrides?: Partial<CommonGameSettings>): CommonGameSettings {
  return {
    templateId,
    title: '',
    description: '',
    category: 'FUN',
    lives: {
      mode: 'LIMITED',
      count: 3,
      gracePeriodSec: 20,
      loseOnBadForm: false,
      loseOnExpire: true,
      loseOnOutOfFrame: false,
    },
    duration: {
      mode: 'TIMED',
      sec: 60,
      countdownSec: 3,
    },
    scoring: {
      targetScore: 100,
      pointsPerCorrect: 10,
      penaltyPerWrong: 5,
      comboEnabled: false,
      comboMultiplier: 0.1,
      maxComboMultiplier: 3.0,
      streakBonus: 0,
    },
    completion: {
      primary: 'DURATION',
      allowEarlyFinish: false,
      showResultScreen: true,
    },
    presentation: {
      orientation: 'LANDSCAPE',
      cameraRequirement: 'FULL_BODY',
      showTimer: true,
      showScore: true,
      showLives: true,
      showCombo: true,
    },
    feedback: {
      visualEffectOnCorrect: true,
      visualEffectOnWrong: true,
      vibrateOnCorrect: true,
      vibrateOnWrong: true,
      soundOnCorrect: false,
      soundOnWrong: false,
      showPromptText: true,
      promptUpdateStrategy: 'ON_CHANGE',
    },
    ...overrides,
  };
}

// ============================================================================
// 25 TEMPLATE PRESET'İ
// ============================================================================

function makePreset(
  templateId: GameTemplateKey,
  commonOverrides: Partial<CommonGameSettings>,
  mechanic: GameMechanic
): GameSettings {
  return {
    schemaVersion: '1.0',
    common: defaultCommonSettings(templateId, commonOverrides),
    mechanic,
  };
}

export const GAME_SETTINGS_PRESETS: Record<GameTemplateKey, GameSettings> = {
  // --- Motion Arcade ---

  SCENE_PLAY: makePreset('SCENE_PLAY',
    {
      category: 'FUN',
      lives: { mode: 'LIMITED', count: 3, gracePeriodSec: 20, loseOnBadForm: false, loseOnExpire: true, loseOnOutOfFrame: false },
      duration: { mode: 'TIMED', sec: 45, countdownSec: 3 },
      scoring: { targetScore: 100, pointsPerCorrect: 10, penaltyPerWrong: 5, comboEnabled: false, comboMultiplier: 0.1, maxComboMultiplier: 3.0, streakBonus: 0 },
      completion: { primary: 'DURATION', allowEarlyFinish: false, showResultScreen: true },
      presentation: { orientation: 'LANDSCAPE', cameraRequirement: 'FULL_BODY', showTimer: true, showScore: true, showLives: true, showCombo: true },
    },
    {
      kind: 'MOTION_ARCADE',
      spawn: { strategy: 'RANDOM', intervalMs: 2400, maxActive: 1, initialDelayMs: 0 },
      objects: [
        { id: 'cuce', label: 'Cuce', assetKey: 'cuceCard', requiredMotion: 'SQUAT', points: 10, lifeMs: 5000 },
        { id: 'deve', label: 'Deve', assetKey: 'deveCard', requiredMotion: 'JUMPING_JACK', points: 12, lifeMs: 5000 },
      ],
      match: { strategy: 'BY_MOTION', matchWindowMs: 200 },
      onExpire: { action: 'MISS_PENALTY', penaltyPoints: 0, showFeedback: true },
      objectDefaults: { lifeMs: 5000, hitRadius: 0.15, fadeOutMs: 200, hitCooldownMs: 300 },
    }
  ),

  FRUIT_SLASH: makePreset('FRUIT_SLASH',
    {
      category: 'FUN',
      lives: { mode: 'LIMITED', count: 3, gracePeriodSec: 20, loseOnBadForm: false, loseOnExpire: false, loseOnOutOfFrame: false },
      duration: { mode: 'TIMED', sec: 60, countdownSec: 3 },
      scoring: { targetScore: 420, pointsPerCorrect: 10, penaltyPerWrong: 0, comboEnabled: true, comboMultiplier: 0.25, maxComboMultiplier: 3.0, streakBonus: 0 },
      completion: { primary: 'SCORE_TARGET', allowEarlyFinish: true, showResultScreen: true },
      presentation: { orientation: 'LANDSCAPE', cameraRequirement: 'HAND_TARGET', showTimer: true, showScore: true, showLives: true, showCombo: true },
    },
    {
      kind: 'MOTION_ARCADE',
      spawn: { strategy: 'RANDOM', intervalMs: 900, maxActive: 3, initialDelayMs: 0 },
      objects: [
        { id: 'melon', label: 'Melon', assetKey: 'fruit', requiredMotion: 'JUMPING_JACK', points: 10, lifeMs: 2000, probability: 0.4 },
        { id: 'berry', label: 'Berry', assetKey: 'bonus', requiredMotion: 'SQUAT', points: 15, lifeMs: 2000, probability: 0.4 },
      ],
      match: { strategy: 'BY_MOTION', matchWindowMs: 200 },
      onExpire: { action: 'NONE', penaltyPoints: 0, showFeedback: false },
      penaltyObjects: {
        enabled: true,
        objects: [{ id: 'bomb', label: 'Bomb', assetKey: 'bomb', requiredMotion: 'SQUAT', points: 0, lifeMs: 2000, isPenalty: true }],
        penaltyPoints: 10,
        penaltyAction: 'DEDUCT_SCORE',
      },
      objectDefaults: { lifeMs: 2000, hitRadius: 0.15, fadeOutMs: 200, hitCooldownMs: 300 },
    }
  ),

  DODGE_RUN: makePreset('DODGE_RUN',
    {
      category: 'FUN',
      lives: { mode: 'LIMITED', count: 3, gracePeriodSec: 20, loseOnBadForm: true, loseOnExpire: true, loseOnOutOfFrame: false },
      duration: { mode: 'TIMED', sec: 60, countdownSec: 3 },
      scoring: { targetScore: 100, pointsPerCorrect: 10, penaltyPerWrong: 0, comboEnabled: false, comboMultiplier: 0.1, maxComboMultiplier: 3.0, streakBonus: 0 },
      completion: { primary: 'DURATION', allowEarlyFinish: false, showResultScreen: true },
      presentation: { orientation: 'LANDSCAPE', cameraRequirement: 'FULL_BODY', showTimer: true, showScore: true, showLives: true, showCombo: true },
    },
    {
      kind: 'MOTION_ARCADE',
      spawn: { strategy: 'SEQUENCE', intervalMs: 1400, maxActive: 1, initialDelayMs: 0 },
      objects: [
        { id: 'duck', label: 'Duck', assetKey: 'lowObstacle', requiredMotion: 'SQUAT', points: 10, lifeMs: 3000 },
        { id: 'jump', label: 'Jump', assetKey: 'jumpObstacle', requiredMotion: 'JUMPING_JACK', points: 15, lifeMs: 3000 },
        { id: 'boost', label: 'Boost', assetKey: 'boostOrb', requiredMotion: 'JUMP_ROPE', points: 20, lifeMs: 3000 },
      ],
      match: { strategy: 'BY_MOTION', matchWindowMs: 200 },
      onExpire: { action: 'LOSE_LIFE', penaltyPoints: 0, showFeedback: true },
      objectDefaults: { lifeMs: 3000, hitRadius: 0.15, fadeOutMs: 200, hitCooldownMs: 300 },
    }
  ),

  REACTION: makePreset('REACTION',
    { category: 'FUN', duration: { mode: 'TIMED', sec: 30, countdownSec: 3 } },
    {
      kind: 'MOTION_ARCADE',
      spawn: { strategy: 'RANDOM', intervalMs: 1500, maxActive: 1, initialDelayMs: 0 },
      objects: [
        { id: 'react_squat', label: 'Squat!', assetKey: 'squatIcon', requiredMotion: 'SQUAT', points: 10, lifeMs: 1500 },
        { id: 'react_jump', label: 'Jump!', assetKey: 'jumpIcon', requiredMotion: 'JUMPING_JACK', points: 10, lifeMs: 1500 },
      ],
      match: { strategy: 'BY_MOTION', matchWindowMs: 300 },
      onExpire: { action: 'MISS_PENALTY', penaltyPoints: 5, showFeedback: true },
      objectDefaults: { lifeMs: 1500, hitRadius: 0.15, fadeOutMs: 150, hitCooldownMs: 200 },
    }
  ),

  AVOID_OBSTACLE: makePreset('AVOID_OBSTACLE',
    { category: 'FUN', lives: { mode: 'LIMITED', count: 3, gracePeriodSec: 10, loseOnBadForm: false, loseOnExpire: true, loseOnOutOfFrame: false } },
    {
      kind: 'MOTION_ARCADE',
      spawn: { strategy: 'RANDOM', intervalMs: 2000, maxActive: 2, initialDelayMs: 500 },
      objects: [
        { id: 'high_obstacle', label: 'High', assetKey: 'highObstacle', requiredMotion: 'SQUAT', points: 10, lifeMs: 2500 },
        { id: 'low_obstacle', label: 'Low', assetKey: 'lowObstacle', requiredMotion: 'JUMPING_JACK', points: 10, lifeMs: 2500 },
      ],
      match: { strategy: 'BY_MOTION', matchWindowMs: 250 },
      onExpire: { action: 'LOSE_LIFE', penaltyPoints: 0, showFeedback: true },
      objectDefaults: { lifeMs: 2500, hitRadius: 0.15, fadeOutMs: 200, hitCooldownMs: 300 },
    }
  ),

  TARGET_HIT: makePreset('TARGET_HIT',
    { category: 'FUN', lives: { mode: 'LIMITED', count: 3, gracePeriodSec: 20, loseOnBadForm: false, loseOnExpire: true, loseOnOutOfFrame: false } },
    {
      kind: 'MOTION_ARCADE',
      spawn: { strategy: 'RANDOM', intervalMs: 2000, maxActive: 1, initialDelayMs: 0 },
      objects: [
        { id: 'target_left', label: 'Left', assetKey: 'target', requiredMotion: 'LEFT_HAND_HIT', points: 10, lifeMs: 3000 },
        { id: 'target_right', label: 'Right', assetKey: 'target', requiredMotion: 'RIGHT_HAND_HIT', points: 10, lifeMs: 3000 },
      ],
      match: { strategy: 'BY_MOTION', matchWindowMs: 300 },
      onExpire: { action: 'MISS_PENALTY', penaltyPoints: 5, showFeedback: true },
      objectDefaults: { lifeMs: 3000, hitRadius: 0.2, fadeOutMs: 200, hitCooldownMs: 300 },
    }
  ),

  ENDLESS_RUNNER: makePreset('ENDLESS_RUNNER',
    { category: 'FUN', lives: { mode: 'LIMITED', count: 3, gracePeriodSec: 20, loseOnBadForm: false, loseOnExpire: true, loseOnOutOfFrame: false }, duration: { mode: 'ENDLESS', sec: 0, countdownSec: 3 } },
    {
      kind: 'MOTION_ARCADE',
      spawn: { strategy: 'RANDOM', intervalMs: 1200, maxActive: 1, initialDelayMs: 0 },
      objects: [
        { id: 'runner_obs', label: 'Obstacle', assetKey: 'obstacle', requiredMotion: 'JUMP_ROPE', points: 10, lifeMs: 2500 },
      ],
      match: { strategy: 'BY_MOTION', matchWindowMs: 200 },
      onExpire: { action: 'LOSE_LIFE', penaltyPoints: 0, showFeedback: true },
      objectDefaults: { lifeMs: 2500, hitRadius: 0.15, fadeOutMs: 200, hitCooldownMs: 300 },
    }
  ),

  CATCH_FALLING: makePreset('CATCH_FALLING',
    { category: 'FUN', lives: { mode: 'LIMITED', count: 3, gracePeriodSec: 20, loseOnBadForm: false, loseOnExpire: true, loseOnOutOfFrame: false } },
    {
      kind: 'MOTION_ARCADE',
      spawn: { strategy: 'RANDOM', intervalMs: 1500, maxActive: 3, initialDelayMs: 0 },
      objects: [
        { id: 'catch_left', label: 'Left', assetKey: 'fruit', requiredMotion: 'LEFT_HAND_HIT', points: 10, lifeMs: 2000 },
        { id: 'catch_right', label: 'Right', assetKey: 'bonus', requiredMotion: 'RIGHT_HAND_HIT', points: 10, lifeMs: 2000 },
      ],
      match: { strategy: 'BY_MOTION', matchWindowMs: 300 },
      onExpire: { action: 'MISS_PENALTY', penaltyPoints: 5, showFeedback: true },
      objectDefaults: { lifeMs: 2000, hitRadius: 0.2, fadeOutMs: 200, hitCooldownMs: 200 },
    }
  ),

  // --- Pose Contact ---

  WHACK_A_MOLE: makePreset('WHACK_A_MOLE',
    {
      category: 'FUN',
      lives: { mode: 'LIMITED', count: 3, gracePeriodSec: 20, loseOnBadForm: false, loseOnExpire: true, loseOnOutOfFrame: true },
      duration: { mode: 'TIMED', sec: 60, countdownSec: 3 },
      presentation: { orientation: 'LANDSCAPE', cameraRequirement: 'UPPER_BODY', showTimer: true, showScore: true, showLives: true, showCombo: true },
    },
    {
      kind: 'POSE_CONTACT',
      targets: [
        { targetId: 'mole_1', x: 0.3, y: 0.4, radius: 0.12, hitBy: ['LEFT_WRIST', 'RIGHT_WRIST'], assetKey: 'mole_green', points: 10 },
        { targetId: 'mole_2', x: 0.5, y: 0.3, radius: 0.12, hitBy: ['LEFT_WRIST', 'RIGHT_WRIST'], assetKey: 'mole_green', points: 10 },
        { targetId: 'mole_3', x: 0.7, y: 0.4, radius: 0.12, hitBy: ['LEFT_WRIST', 'RIGHT_WRIST'], assetKey: 'mole_green', points: 10 },
      ],
      spawn: { intervalMs: 1200, visibleMs: 1500, maxActiveTargets: 2, activateMode: 'RANDOM' },
      hitDetection: { minConfidence: 0.5, hitRadius: 0.15, hitCooldownMs: 300, loseLifeOnTimeout: true },
    }
  ),

  POSE_CONTACT_TARGETS: makePreset('POSE_CONTACT_TARGETS',
    {
      category: 'FUN',
      lives: { mode: 'LIMITED', count: 3, gracePeriodSec: 20, loseOnBadForm: false, loseOnExpire: false, loseOnOutOfFrame: false },
      duration: { mode: 'TIMED', sec: 45, countdownSec: 3 },
      presentation: { orientation: 'LANDSCAPE', cameraRequirement: 'FULL_BODY', showTimer: true, showScore: true, showLives: true, showCombo: true },
    },
    {
      kind: 'POSE_CONTACT',
      targets: [
        { targetId: 't1', x: 0.25, y: 0.5, radius: 0.1, hitBy: ['LEFT_WRIST'], assetKey: 'target', points: 10 },
        { targetId: 't2', x: 0.5, y: 0.3, radius: 0.1, hitBy: ['RIGHT_WRIST'], assetKey: 'target', points: 10 },
        { targetId: 't3', x: 0.75, y: 0.5, radius: 0.1, hitBy: ['LEFT_WRIST', 'RIGHT_WRIST'], assetKey: 'target', points: 20 },
      ],
      spawn: { intervalMs: 2000, visibleMs: 3000, maxActiveTargets: 3, activateMode: 'ALL_AT_ONCE' },
      hitDetection: { minConfidence: 0.5, hitRadius: 0.12, hitCooldownMs: 300, loseLifeOnTimeout: false },
    }
  ),

  CAMERA_ARCADE_OVERLAY: makePreset('CAMERA_ARCADE_OVERLAY',
    { category: 'FUN', presentation: { orientation: 'LANDSCAPE', cameraRequirement: 'FULL_BODY', showTimer: true, showScore: true, showLives: true, showCombo: true } },
    {
      kind: 'POSE_CONTACT',
      targets: [{ targetId: 'arc_1', x: 0.5, y: 0.5, radius: 0.15, hitBy: ['LEFT_WRIST', 'RIGHT_WRIST'], assetKey: 'target', points: 10 }],
      spawn: { intervalMs: 1500, visibleMs: 2000, maxActiveTargets: 1, activateMode: 'RANDOM' },
      hitDetection: { minConfidence: 0.5, hitRadius: 0.15, hitCooldownMs: 300, loseLifeOnTimeout: false },
    }
  ),

  COLLECT_ITEMS: makePreset('COLLECT_ITEMS',
    { category: 'FUN', lives: { mode: 'LIMITED', count: 3, gracePeriodSec: 20, loseOnBadForm: false, loseOnExpire: false, loseOnOutOfFrame: false } },
    {
      kind: 'POSE_CONTACT',
      targets: [
        { targetId: 'item_1', x: 0.3, y: 0.6, radius: 0.1, hitBy: ['LEFT_WRIST', 'RIGHT_WRIST'], assetKey: 'fruit', points: 10 },
        { targetId: 'item_2', x: 0.7, y: 0.6, radius: 0.1, hitBy: ['LEFT_WRIST', 'RIGHT_WRIST'], assetKey: 'bonus', points: 15 },
      ],
      spawn: { intervalMs: 2000, visibleMs: 3000, maxActiveTargets: 2, activateMode: 'RANDOM' },
      hitDetection: { minConfidence: 0.5, hitRadius: 0.12, hitCooldownMs: 300, loseLifeOnTimeout: false },
    }
  ),

  // --- Quiz ---

  QUIZ: makePreset('QUIZ',
    {
      category: 'EDUCATION',
      lives: { mode: 'NONE', count: 0, gracePeriodSec: 0, loseOnBadForm: false, loseOnExpire: false, loseOnOutOfFrame: false },
      duration: { mode: 'UNTIL_COMPLETE', sec: 0, countdownSec: 3 },
      scoring: { targetScore: 100, pointsPerCorrect: 10, penaltyPerWrong: 0, comboEnabled: false, comboMultiplier: 0.1, maxComboMultiplier: 3.0, streakBonus: 0 },
      completion: { primary: 'ALL_TASKS_DONE', allowEarlyFinish: false, showResultScreen: true },
      presentation: { orientation: 'PORTRAIT', cameraRequirement: 'NONE', showTimer: true, showScore: true, showLives: false, showCombo: false },
      feedback: { visualEffectOnCorrect: true, visualEffectOnWrong: true, vibrateOnCorrect: false, vibrateOnWrong: false, soundOnCorrect: false, soundOnWrong: false, showPromptText: true, promptUpdateStrategy: 'ALWAYS_VISIBLE' },
    },
    {
      kind: 'QUIZ',
      questions: [
        { id: 'q1', prompt: 'Ornek soru?', choices: ['A', 'B', 'C', 'D'], correctIndex: 0, points: 10 },
      ],
      display: { shuffleQuestions: true, shuffleChoices: true, showCorrectAnswer: true, showProgressBar: true, allowSkip: false, autoAdvance: true, autoAdvanceDelayMs: 1500 },
    }
  ),

  TRUE_FALSE: makePreset('TRUE_FALSE',
    {
      category: 'EDUCATION',
      lives: { mode: 'NONE', count: 0, gracePeriodSec: 0, loseOnBadForm: false, loseOnExpire: false, loseOnOutOfFrame: false },
      duration: { mode: 'UNTIL_COMPLETE', sec: 0, countdownSec: 3 },
      scoring: { targetScore: 100, pointsPerCorrect: 10, penaltyPerWrong: 0, comboEnabled: false, comboMultiplier: 0.1, maxComboMultiplier: 3.0, streakBonus: 0 },
      completion: { primary: 'ALL_TASKS_DONE', allowEarlyFinish: false, showResultScreen: true },
      presentation: { orientation: 'PORTRAIT', cameraRequirement: 'NONE', showTimer: true, showScore: true, showLives: false, showCombo: false },
    },
    {
      kind: 'QUIZ',
      questions: [
        { id: 'tf1', prompt: 'Ornek dogru/yanlis sorusu?', choices: ['Dogru', 'Yanlis'], correctIndex: 0, points: 10 },
      ],
      display: { shuffleQuestions: true, shuffleChoices: false, showCorrectAnswer: true, showProgressBar: true, allowSkip: false, autoAdvance: true, autoAdvanceDelayMs: 1000 },
    }
  ),

  // --- Study ---

  FLASHCARD: makePreset('FLASHCARD',
    {
      category: 'EDUCATION',
      lives: { mode: 'NONE', count: 0, gracePeriodSec: 0, loseOnBadForm: false, loseOnExpire: false, loseOnOutOfFrame: false },
      duration: { mode: 'UNTIL_COMPLETE', sec: 0, countdownSec: 0 },
      scoring: { targetScore: 0, pointsPerCorrect: 0, penaltyPerWrong: 0, comboEnabled: false, comboMultiplier: 0.1, maxComboMultiplier: 3.0, streakBonus: 0 },
      completion: { primary: 'ALL_TASKS_DONE', allowEarlyFinish: false, showResultScreen: false },
      presentation: { orientation: 'PORTRAIT', cameraRequirement: 'NONE', showTimer: false, showScore: false, showLives: false, showCombo: false },
    },
    {
      kind: 'STUDY',
      studyType: 'FLASHCARD',
      cards: [{ id: 'c1', frontText: 'On Yuz', backText: 'Arka Yuz' }],
      display: { shuffleItems: true, showProgress: true, allowFlipBack: true },
    }
  ),

  MEMORY_MATCH: makePreset('MEMORY_MATCH',
    {
      category: 'EDUCATION',
      lives: { mode: 'NONE', count: 0, gracePeriodSec: 0, loseOnBadForm: false, loseOnExpire: false, loseOnOutOfFrame: false },
      duration: { mode: 'UNTIL_COMPLETE', sec: 0, countdownSec: 3 },
      scoring: { targetScore: 100, pointsPerCorrect: 10, penaltyPerWrong: 5, comboEnabled: false, comboMultiplier: 0.1, maxComboMultiplier: 3.0, streakBonus: 0 },
      completion: { primary: 'ALL_TASKS_DONE', allowEarlyFinish: true, showResultScreen: true },
      presentation: { orientation: 'PORTRAIT', cameraRequirement: 'NONE', showTimer: true, showScore: true, showLives: false, showCombo: false },
    },
    {
      kind: 'STUDY',
      studyType: 'MEMORY_MATCH',
      pairs: [
        { id: 'p1', left: { text: 'A' }, right: { text: '1' } },
        { id: 'p2', left: { text: 'B' }, right: { text: '2' } },
        { id: 'p3', left: { text: 'C' }, right: { text: '3' } },
      ],
      display: { shuffleItems: true, showProgress: true, gridColumns: 4, revealDelayMs: 1000, allowFlipBack: true },
    }
  ),

  MATCH_PAIRS: makePreset('MATCH_PAIRS',
    {
      category: 'EDUCATION',
      lives: { mode: 'NONE', count: 0, gracePeriodSec: 0, loseOnBadForm: false, loseOnExpire: false, loseOnOutOfFrame: false },
      duration: { mode: 'UNTIL_COMPLETE', sec: 0, countdownSec: 3 },
      scoring: { targetScore: 100, pointsPerCorrect: 10, penaltyPerWrong: 5, comboEnabled: false, comboMultiplier: 0.1, maxComboMultiplier: 3.0, streakBonus: 0 },
      completion: { primary: 'ALL_TASKS_DONE', allowEarlyFinish: true, showResultScreen: true },
      presentation: { orientation: 'PORTRAIT', cameraRequirement: 'NONE', showTimer: true, showScore: true, showLives: false, showCombo: false },
    },
    {
      kind: 'STUDY',
      studyType: 'MATCH_PAIRS',
      pairs: [
        { id: 'p1', left: { text: 'Elma' }, right: { text: 'Apple' } },
        { id: 'p2', left: { text: 'Kopek' }, right: { text: 'Dog' } },
      ],
      display: { shuffleItems: true, showProgress: true, gridColumns: 2, revealDelayMs: 800, allowFlipBack: false },
    }
  ),

  // --- Hold ---

  POSE_HOLD: makePreset('POSE_HOLD',
    {
      category: 'SPORT',
      lives: { mode: 'LIMITED', count: 3, gracePeriodSec: 10, loseOnBadForm: true, loseOnExpire: false, loseOnOutOfFrame: false },
      duration: { mode: 'TIMED', sec: 45, countdownSec: 3 },
      scoring: { targetScore: 100, pointsPerCorrect: 10, penaltyPerWrong: 5, comboEnabled: false, comboMultiplier: 0.1, maxComboMultiplier: 3.0, streakBonus: 0 },
      completion: { primary: 'DURATION', allowEarlyFinish: false, showResultScreen: true },
      presentation: { orientation: 'PORTRAIT', cameraRequirement: 'FULL_BODY', showTimer: true, showScore: true, showLives: true, showCombo: false },
      feedback: { visualEffectOnCorrect: true, visualEffectOnWrong: true, vibrateOnCorrect: true, vibrateOnWrong: true, soundOnCorrect: false, soundOnWrong: false, showPromptText: true, promptUpdateStrategy: 'ON_CHANGE' },
    },
    {
      kind: 'HOLD',
      pose: 'PLANK',
      targetHoldSec: 30,
      graceMs: 500,
      minConfidence: 0.6,
      display: { showProgressBar: true, showQualityScore: true, countdownStyle: 'PROGRESS_BAR' },
    }
  ),

  // --- Rhythm ---

  RHYTHM_MOTION: makePreset('RHYTHM_MOTION',
    {
      category: 'FUN',
      lives: { mode: 'LIMITED', count: 3, gracePeriodSec: 10, loseOnBadForm: false, loseOnExpire: false, loseOnOutOfFrame: false },
      duration: { mode: 'TIMED', sec: 90, countdownSec: 3 },
      scoring: { targetScore: 500, pointsPerCorrect: 10, penaltyPerWrong: 5, comboEnabled: true, comboMultiplier: 0.25, maxComboMultiplier: 4.0, streakBonus: 0 },
      completion: { primary: 'DURATION', allowEarlyFinish: false, showResultScreen: true },
      presentation: { orientation: 'LANDSCAPE', cameraRequirement: 'FULL_BODY', showTimer: true, showScore: true, showLives: true, showCombo: true },
    },
    {
      kind: 'RHYTHM',
      bpm: 120,
      notes: [
        { noteId: 'n1', motion: 'SQUAT', timingMs: 1000, windowMs: 200, points: 10 },
        { noteId: 'n2', motion: 'JUMPING_JACK', timingMs: 2000, windowMs: 200, points: 10 },
      ],
      display: { noteSpeed: 1.0, showBeatIndicator: true },
    }
  ),

  // --- Program ---

  FIT_CHALLENGE: makePreset('FIT_CHALLENGE',
    {
      category: 'SPORT',
      lives: { mode: 'NONE', count: 0, gracePeriodSec: 0, loseOnBadForm: false, loseOnExpire: false, loseOnOutOfFrame: false },
      duration: { mode: 'UNTIL_COMPLETE', sec: 0, countdownSec: 3 },
      scoring: { targetScore: 100, pointsPerCorrect: 10, penaltyPerWrong: 5, comboEnabled: false, comboMultiplier: 0.1, maxComboMultiplier: 3.0, streakBonus: 0 },
      completion: { primary: 'ALL_TASKS_DONE', allowEarlyFinish: false, showResultScreen: true },
      presentation: { orientation: 'PORTRAIT', cameraRequirement: 'FULL_BODY', showTimer: true, showScore: true, showLives: false, showCombo: false },
    },
    {
      kind: 'PROGRAM',
      steps: [
        { stepId: 's1', type: 'INSTRUCTION', title: 'Hazir Ol', durationSec: 5, nextOnComplete: true, autoAdvance: true },
        { stepId: 's2', type: 'MOTION_REPS', title: 'Squat', motion: 'SQUAT', targetCount: 10, pointsPerRep: 10, nextOnComplete: true, autoAdvance: true },
        { stepId: 's3', type: 'REST', title: 'Dinlen', durationSec: 15, nextOnComplete: true, autoAdvance: true },
        { stepId: 's4', type: 'MOTION_REPS', title: 'Jumping Jack', motion: 'JUMPING_JACK', targetCount: 10, pointsPerRep: 10, nextOnComplete: true, autoAdvance: true },
      ],
      display: { showStepIndicator: true, showRepCounter: true, showRestTimer: true },
    }
  ),

  REP_COUNTER: makePreset('REP_COUNTER',
    {
      category: 'SPORT',
      lives: { mode: 'NONE', count: 0, gracePeriodSec: 0, loseOnBadForm: false, loseOnExpire: false, loseOnOutOfFrame: false },
      duration: { mode: 'TIMED', sec: 60, countdownSec: 3 },
      scoring: { targetScore: 0, pointsPerCorrect: 1, penaltyPerWrong: 0, comboEnabled: false, comboMultiplier: 0.1, maxComboMultiplier: 3.0, streakBonus: 0 },
      completion: { primary: 'DURATION', allowEarlyFinish: false, showResultScreen: true },
      presentation: { orientation: 'PORTRAIT', cameraRequirement: 'FULL_BODY', showTimer: true, showScore: true, showLives: false, showCombo: false },
    },
    {
      kind: 'PROGRAM',
      steps: [
        { stepId: 'r1', type: 'MOTION_REPS', title: 'Squat', motion: 'SQUAT', targetCount: 100, pointsPerRep: 1, nextOnComplete: false, autoAdvance: false },
      ],
      display: { showStepIndicator: false, showRepCounter: true, showRestTimer: false },
    }
  ),

  MOTION_SEQUENCE: makePreset('MOTION_SEQUENCE',
    {
      category: 'SPORT',
      lives: { mode: 'NONE', count: 0, gracePeriodSec: 0, loseOnBadForm: false, loseOnExpire: false, loseOnOutOfFrame: false },
      duration: { mode: 'UNTIL_COMPLETE', sec: 0, countdownSec: 3 },
      scoring: { targetScore: 100, pointsPerCorrect: 10, penaltyPerWrong: 5, comboEnabled: false, comboMultiplier: 0.1, maxComboMultiplier: 3.0, streakBonus: 0 },
      completion: { primary: 'ALL_TASKS_DONE', allowEarlyFinish: false, showResultScreen: true },
      presentation: { orientation: 'PORTRAIT', cameraRequirement: 'FULL_BODY', showTimer: true, showScore: true, showLives: false, showCombo: false },
    },
    {
      kind: 'PROGRAM',
      steps: [
        { stepId: 'm1', type: 'MOTION_REPS', title: 'Squat', motion: 'SQUAT', targetCount: 5, pointsPerRep: 10, nextOnComplete: true, autoAdvance: true },
        { stepId: 'm2', type: 'MOTION_REPS', title: 'Jump', motion: 'JUMPING_JACK', targetCount: 5, pointsPerRep: 10, nextOnComplete: true, autoAdvance: true },
        { stepId: 'm3', type: 'MOTION_REPS', title: 'Jump Rope', motion: 'JUMP_ROPE', targetCount: 5, pointsPerRep: 10, nextOnComplete: false, autoAdvance: true },
      ],
      display: { showStepIndicator: true, showRepCounter: true, showRestTimer: false },
    }
  ),

  INTERVAL_WORKOUT: makePreset('INTERVAL_WORKOUT',
    {
      category: 'SPORT',
      lives: { mode: 'NONE', count: 0, gracePeriodSec: 0, loseOnBadForm: false, loseOnExpire: false, loseOnOutOfFrame: false },
      duration: { mode: 'UNTIL_COMPLETE', sec: 0, countdownSec: 5 },
      scoring: { targetScore: 100, pointsPerCorrect: 10, penaltyPerWrong: 5, comboEnabled: false, comboMultiplier: 0.1, maxComboMultiplier: 3.0, streakBonus: 0 },
      completion: { primary: 'ALL_TASKS_DONE', allowEarlyFinish: false, showResultScreen: true },
      presentation: { orientation: 'PORTRAIT', cameraRequirement: 'FULL_BODY', showTimer: true, showScore: true, showLives: false, showCombo: false },
    },
    {
      kind: 'PROGRAM',
      steps: [
        { stepId: 'w1', type: 'INSTRUCTION', title: 'Isınma', durationSec: 10, nextOnComplete: true, autoAdvance: true },
        { stepId: 'w2', type: 'MOTION_REPS', title: 'Calıs', motion: 'SQUAT', targetCount: 15, pointsPerRep: 10, nextOnComplete: true, autoAdvance: true },
        { stepId: 'w3', type: 'REST', title: 'Dinlen', durationSec: 15, nextOnComplete: true, autoAdvance: true },
        { stepId: 'w4', type: 'MOTION_REPS', title: 'Calıs', motion: 'JUMPING_JACK', targetCount: 15, pointsPerRep: 10, nextOnComplete: true, autoAdvance: true },
        { stepId: 'w5', type: 'REST', title: 'Dinlen', durationSec: 15, nextOnComplete: true, autoAdvance: true },
        { stepId: 'w6', type: 'MOTION_REPS', title: 'Calıs', motion: 'JUMP_ROPE', targetCount: 15, pointsPerRep: 10, nextOnComplete: false, autoAdvance: true },
      ],
      display: { showStepIndicator: true, showRepCounter: true, showRestTimer: true },
    }
  ),

  PROGRAM_FLOW: makePreset('PROGRAM_FLOW',
    {
      category: 'SPORT',
      lives: { mode: 'NONE', count: 0, gracePeriodSec: 0, loseOnBadForm: false, loseOnExpire: false, loseOnOutOfFrame: false },
      duration: { mode: 'UNTIL_COMPLETE', sec: 0, countdownSec: 3 },
      completion: { primary: 'ALL_TASKS_DONE', allowEarlyFinish: false, showResultScreen: true },
      presentation: { orientation: 'PORTRAIT', cameraRequirement: 'FULL_BODY', showTimer: true, showScore: true, showLives: false, showCombo: false },
    },
    {
      kind: 'PROGRAM',
      steps: [
        { stepId: 'pf1', type: 'INSTRUCTION', title: 'Basla', durationSec: 3, nextOnComplete: true, autoAdvance: true },
        { stepId: 'pf2', type: 'PLAY_GAME', title: 'Oyun', durationSec: 60, nextOnComplete: false, autoAdvance: false },
      ],
      display: { showStepIndicator: true, showRepCounter: false, showRestTimer: false },
    }
  ),

  HYBRID_SCENE: makePreset('HYBRID_SCENE',
    {
      category: 'FUN',
      lives: { mode: 'LIMITED', count: 3, gracePeriodSec: 20, loseOnBadForm: false, loseOnExpire: true, loseOnOutOfFrame: true },
      duration: { mode: 'TIMED', sec: 60, countdownSec: 3 },
      presentation: { orientation: 'LANDSCAPE', cameraRequirement: 'FULL_BODY', showTimer: true, showScore: true, showLives: true, showCombo: true },
    },
    {
      kind: 'PROGRAM',
      steps: [
        { stepId: 'h1', type: 'PLAY_GAME', title: 'Arcade', durationSec: 45, nextOnComplete: true, autoAdvance: false },
        { stepId: 'h2', type: 'MOTION_REPS', title: 'Finish', motion: 'SQUAT', targetCount: 5, pointsPerRep: 10, nextOnComplete: false, autoAdvance: true },
      ],
      display: { showStepIndicator: true, showRepCounter: true, showRestTimer: false },
    }
  ),
};

// ============================================================================
// HELPER FONKSİYONLAR
// ============================================================================

export function getPreset(templateId: GameTemplateKey): GameSettings {
  return GAME_SETTINGS_PRESETS[templateId];
}

export function getMechanicKind(templateId: GameTemplateKey): MechanicKind {
  return TEMPLATE_FAMILY[templateId];
}

export function isGameSettings(obj: unknown): obj is GameSettings {
  if (!obj || typeof obj !== 'object') return false;
  const gs = obj as Record<string, unknown>;
  return gs.schemaVersion === '1.0' && typeof gs.common === 'object' && typeof gs.mechanic === 'object';
}
