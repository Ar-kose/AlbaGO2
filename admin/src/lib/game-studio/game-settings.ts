// Admin-side GameSettings types (Backend game-settings.ts'in aynasi)
// Oyun studyosunda kullanilan birlesik konfigürasyon tipleri

// Types used are self-contained within this file

// ============================================================================
// SEVİYE 1: ORTAK OYUN AYARLARI
// ============================================================================

export interface CommonGameSettings {
  templateId: string;
  title: string;
  description: string;
  category: 'FUN' | 'SPORT' | 'EDUCATION';

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
  orientation: 'PORTRAIT' | 'LANDSCAPE' | 'AUTO';
  cameraRequirement: 'FULL_BODY' | 'UPPER_BODY' | 'HAND_TARGET' | 'NONE';
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
// SEVİYE 2: OYUN MEKANİĞİ
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

export interface MotionArcadeObject {
  id: string;
  label: string;
  assetKey: string;
  requiredMotion: string;
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

export interface RhythmNote {
  noteId: string;
  motion: string;
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

export interface ProgramStep {
  stepId: string;
  type: 'INSTRUCTION' | 'PLAY_GAME' | 'MOTION_REPS' | 'HOLD_POSE' | 'REST';
  title: string;
  description?: string;
  motion?: string;
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

export const TEMPLATE_FAMILY: Record<string, MechanicKind> = {
  SCENE_PLAY: 'MOTION_ARCADE',
  FRUIT_SLASH: 'MOTION_ARCADE',
  DODGE_RUN: 'MOTION_ARCADE',
  REACTION: 'MOTION_ARCADE',
  AVOID_OBSTACLE: 'MOTION_ARCADE',
  TARGET_HIT: 'MOTION_ARCADE',
  ENDLESS_RUNNER: 'MOTION_ARCADE',
  CATCH_FALLING: 'MOTION_ARCADE',
  WHACK_A_MOLE: 'POSE_CONTACT',
  POSE_CONTACT_TARGETS: 'POSE_CONTACT',
  CAMERA_ARCADE_OVERLAY: 'POSE_CONTACT',
  COLLECT_ITEMS: 'POSE_CONTACT',
  QUIZ: 'QUIZ',
  TRUE_FALSE: 'QUIZ',
  FLASHCARD: 'STUDY',
  MEMORY_MATCH: 'STUDY',
  MATCH_PAIRS: 'STUDY',
  POSE_HOLD: 'HOLD',
  RHYTHM_MOTION: 'RHYTHM',
  FIT_CHALLENGE: 'PROGRAM',
  REP_COUNTER: 'PROGRAM',
  MOTION_SEQUENCE: 'PROGRAM',
  INTERVAL_WORKOUT: 'PROGRAM',
  PROGRAM_FLOW: 'PROGRAM',
  HYBRID_SCENE: 'PROGRAM',
};

export function getMechanicKind(templateId: string): MechanicKind {
  return TEMPLATE_FAMILY[templateId] ?? 'PROGRAM';
}

// ============================================================================
// VARSAYILAN DEGERLER
// ============================================================================

export function createDefaultCommonSettings(templateId: string, overrides?: Partial<CommonGameSettings>): CommonGameSettings {
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

export function createDefaultGameSettings(templateId: string): GameSettings {
  const kind = getMechanicKind(templateId);
  const common = createDefaultCommonSettings(templateId);

  let mechanic: GameMechanic;
  switch (kind) {
    case 'MOTION_ARCADE':
      mechanic = {
        kind: 'MOTION_ARCADE',
        spawn: { strategy: 'RANDOM', intervalMs: 2000, maxActive: 1, initialDelayMs: 0 },
        objects: [{ id: 'obj_1', label: 'Nesne', assetKey: 'object', requiredMotion: 'SQUAT', points: 10, lifeMs: 3000 }],
        match: { strategy: 'BY_MOTION', matchWindowMs: 200 },
        onExpire: { action: 'NONE', penaltyPoints: 0, showFeedback: false },
        objectDefaults: { lifeMs: 3000, hitRadius: 0.15, fadeOutMs: 200, hitCooldownMs: 300 },
      };
      break;
    case 'POSE_CONTACT':
      mechanic = {
        kind: 'POSE_CONTACT',
        targets: [{ targetId: 't1', x: 0.5, y: 0.5, radius: 0.1, hitBy: ['LEFT_WRIST', 'RIGHT_WRIST'], assetKey: 'target', points: 10 }],
        spawn: { intervalMs: 1500, visibleMs: 2000, maxActiveTargets: 1, activateMode: 'RANDOM' },
        hitDetection: { minConfidence: 0.5, hitRadius: 0.15, hitCooldownMs: 300, loseLifeOnTimeout: false },
      };
      break;
    case 'QUIZ':
      mechanic = {
        kind: 'QUIZ',
        questions: [{ id: 'q1', prompt: 'Soru?', choices: ['A', 'B', 'C'], correctIndex: 0, points: 10 }],
        display: { shuffleQuestions: true, shuffleChoices: true, showCorrectAnswer: true, showProgressBar: true, allowSkip: false, autoAdvance: true, autoAdvanceDelayMs: 1500 },
      };
      break;
    case 'STUDY':
      mechanic = {
        kind: 'STUDY',
        studyType: 'FLASHCARD',
        cards: [{ id: 'c1', frontText: 'On', backText: 'Arka' }],
        display: { shuffleItems: true, showProgress: true, allowFlipBack: true },
      };
      break;
    case 'HOLD':
      mechanic = {
        kind: 'HOLD',
        pose: 'PLANK',
        targetHoldSec: 30,
        graceMs: 500,
        minConfidence: 0.6,
        display: { showProgressBar: true, showQualityScore: true, countdownStyle: 'PROGRESS_BAR' },
      };
      break;
    case 'RHYTHM':
      mechanic = {
        kind: 'RHYTHM',
        bpm: 120,
        notes: [{ noteId: 'n1', motion: 'SQUAT', timingMs: 1000, windowMs: 200, points: 10 }],
        display: { noteSpeed: 1.0, showBeatIndicator: true },
      };
      break;
    case 'PROGRAM':
    default:
      mechanic = {
        kind: 'PROGRAM',
        steps: [{ stepId: 's1', type: 'INSTRUCTION', title: 'Basla', durationSec: 3, nextOnComplete: true, autoAdvance: true }],
        display: { showStepIndicator: true, showRepCounter: false, showRestTimer: false },
      };
      break;
  }

  return { schemaVersion: '1.0', common, mechanic };
}
