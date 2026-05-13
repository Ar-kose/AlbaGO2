import type { GameCategory, GameDefinitionDraft, GameTemplate, MotionType, CameraRequirement, GameOrientation } from '../alba-api';

// ─── Recipe Types ───────────────────────────────────────────────────────────

export type GameRecipe =
  | CommandReactionRecipe
  | HoldChallengeRecipe
  | TargetHitRecipe
  | RepProgramRecipe
  | RunnerDodgeRecipe
  | FruitSlashRecipe;

export interface CommandReactionRecipe {
  kind: 'COMMAND_REACTION';
  title: string;
  description: string;
  category: GameCategory;
  durationSec: number;
  lives: number;
  commands: Array<{
    label: string;
    requiredMotion: MotionType;
    assetKey?: string;
    points: number;
    lifeMs: number;
  }>;
  wrongMovePenalty: number;
  cameraRequirement: CameraRequirement;
  orientation: GameOrientation;
}

export interface HoldChallengeRecipe {
  kind: 'HOLD_CHALLENGE';
  title: string;
  description: string;
  holdMotion: 'PLANK_HOLD' | 'BALANCE' | 'POSE_STABLE';
  targetHoldSec: number;
  totalDurationSec: number;
  successPoints: number;
  graceMs: number;
  cameraRequirement: CameraRequirement;
  orientation: GameOrientation;
}

export interface TargetHitRecipe {
  kind: 'TARGET_HIT';
  title: string;
  description: string;
  durationSec: number;
  targets: Array<{
    label: string;
    x: number;
    y: number;
    radius: number;
    hitBy: Array<'LEFT_WRIST' | 'RIGHT_WRIST'>;
    points: number;
    assetKey?: string;
  }>;
  spawnMode: 'STATIC' | 'SEQUENCE' | 'RANDOM';
  cameraRequirement: CameraRequirement;
  orientation: GameOrientation;
}

export interface RepProgramRecipe {
  kind: 'REP_PROGRAM';
  title: string;
  description: string;
  steps: Array<{
    type: 'MOTION_REPS' | 'HOLD_POSE' | 'REST' | 'INSTRUCTION';
    title: string;
    motion?: MotionType;
    targetCount?: number;
    holdSec?: number;
    durationSec?: number;
    successMessage?: string;
  }>;
  category: GameCategory;
  orientation: GameOrientation;
}

export interface RunnerDodgeRecipe {
  kind: 'RUNNER_DODGE';
  title: string;
  description: string;
  durationSec: number;
  lives: number;
  obstacleSpawnMs: number;
  obstacles: Array<{
    label: string;
    requiredMotion: MotionType;
    assetKey?: string;
    points: number;
  }>;
  cameraRequirement: CameraRequirement;
  orientation: GameOrientation;
}

export interface FruitSlashRecipe {
  kind: 'FRUIT_SLASH';
  title: string;
  description: string;
  durationSec: number;
  targetScore: number;
  spawnRateMs: number;
  objects: Array<{
    label: string;
    requiredMotion: MotionType;
    assetKey?: string;
    points: number;
  }>;
  penaltyObjects: boolean;
  penaltyPoints: number;
  cameraRequirement: CameraRequirement;
  orientation: GameOrientation;
}

// ─── Preset ─────────────────────────────────────────────────────────────────

export interface GamePreset {
  id: string;
  displayName: string;
  description: string;
  template: GameTemplate;
  icon: string;
  category: GameCategory;
  recipe: GameRecipe;
  supportedMotions: MotionType[];
  whatYouCanBuild: string;
  requiresAppUpdate: boolean;
}

// ─── Preview Engine ─────────────────────────────────────────────────────────

export interface PreviewState {
  elapsedSec: number;
  remainingSec: number;
  score: number;
  combo: number;
  lives: number;
  activePrompt?: {
    label: string;
    requiredMotion: MotionType;
    assetKey?: string;
    expiresInMs: number;
  };
  feedback?: {
    text: string;
    kind: 'POSITIVE' | 'NEGATIVE' | 'INFO';
  };
  progress?: {
    value: number;
    max: number;
    label: string;
  };
}

export interface MockMotionEvent {
  motion: MotionType;
  event: 'REP_COUNTED' | 'BAD_FORM' | 'USER_OUT_OF_FRAME' | 'POSE_STARTED' | 'POSE_HELD' | 'POSE_LOST';
  timestampMs: number;
}

// ─── Validation ─────────────────────────────────────────────────────────────

export interface StudioValidationIssue {
  severity: 'ERROR' | 'WARNING' | 'INFO';
  code: string;
  title: string;
  message: string;
  fieldPath?: string;
  fixAction?: {
    label: string;
    targetStep: WizardStep;
  };
}

// ─── Compatibility ──────────────────────────────────────────────────────────

export interface RuntimeCapabilities {
  supportedTemplates: GameTemplate[];
  supportedMotions: MotionType[];
  minAppVersion: string;
  maxDurationSec: number;
  maxTargets: number;
}

export interface CompatibilityResult {
  compatible: boolean;
  issues: StudioValidationIssue[];
}

// ─── Wizard ─────────────────────────────────────────────────────────────────

export type WizardStep = 'TYPE' | 'TEMPLATE' | 'BASIC' | 'RULES' | 'ASSETS' | 'REVIEW';

export interface WizardState {
  step: WizardStep;
  recipe: GameRecipe | null;
  presetId: string | null;
}
