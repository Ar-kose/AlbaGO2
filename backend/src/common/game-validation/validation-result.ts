// Game Validation Result — unified validation output contract for all validators

export type ValidationSeverity = 'ERROR' | 'WARNING';

export type ValidationScope =
  | 'CONTRACT'
  | 'TEMPLATE'
  | 'ASSET'
  | 'AUDIO'
  | 'PUBLISH'
  | 'ANDROID_RUNTIME'
  | 'SECURITY';

export interface GameValidationIssue {
  code: string;
  severity: ValidationSeverity;
  scope: ValidationScope;
  path: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface GameValidationResult {
  valid: boolean;
  publishable: boolean;
  errors: GameValidationIssue[];
  warnings: GameValidationIssue[];
}

// Pose keypoints supported by MediaPipe pose model
export const POSE_KEYPOINTS = new Set([
  'NOSE',
  'LEFT_EYE_INNER', 'LEFT_EYE', 'LEFT_EYE_OUTER',
  'RIGHT_EYE_INNER', 'RIGHT_EYE', 'RIGHT_EYE_OUTER',
  'LEFT_EAR', 'RIGHT_EAR',
  'MOUTH_LEFT', 'MOUTH_RIGHT',
  'LEFT_SHOULDER', 'RIGHT_SHOULDER',
  'LEFT_ELBOW', 'RIGHT_ELBOW',
  'LEFT_WRIST', 'RIGHT_WRIST',
  'LEFT_PINKY', 'RIGHT_PINKY',
  'LEFT_INDEX', 'RIGHT_INDEX',
  'LEFT_THUMB', 'RIGHT_THUMB',
  'LEFT_HIP', 'RIGHT_HIP',
  'LEFT_KNEE', 'RIGHT_KNEE',
  'LEFT_ANKLE', 'RIGHT_ANKLE',
  'LEFT_HEEL', 'RIGHT_HEEL',
  'LEFT_FOOT_INDEX', 'RIGHT_FOOT_INDEX'
]);

export const AUDIO_EVENTS = new Set([
  'COUNTDOWN', 'GAME_START', 'HIT', 'MISS',
  'PERFECT', 'GOOD', 'BAD', 'COMBO',
  'LIFE_LOST', 'LEVEL_UP', 'SUCCESS', 'FAIL',
  'GAME_END', 'INSTRUCTION'
]);

export const ALLOWED_IMAGE_FORMATS = new Set(['PNG', 'WEBP', 'SVG']);
export const ALLOWED_AUDIO_FORMATS = new Set(['MP3', 'WAV', 'OGG']);

// Shared validation helpers

export function validateRange(
  value: number | undefined,
  min: number,
  max: number,
  path: string,
  code: string,
  message: string,
  scope: ValidationScope = 'TEMPLATE'
): GameValidationIssue | null {
  if (value === undefined) return null;
  if (value < min || value > max) {
    return { code, severity: 'ERROR', scope, path, message };
  }
  return null;
}

export function validateRequiredString(
  value: string | undefined,
  path: string,
  code: string,
  message: string,
  scope: ValidationScope = 'CONTRACT'
): GameValidationIssue | null {
  if (!value || !value.trim()) {
    return { code, severity: 'ERROR', scope, path, message };
  }
  return null;
}

export function validateSlug(
  value: string | undefined,
  path: string,
  code: string,
  message: string
): GameValidationIssue | null {
  if (!value || !value.trim()) {
    return { code, severity: 'ERROR', scope: 'CONTRACT', path, message };
  }
  if (!/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(value)) {
    return { code, severity: 'ERROR', scope: 'CONTRACT', path, message };
  }
  return null;
}

export function mergeResults(results: GameValidationResult[]): GameValidationResult {
  const errors: GameValidationIssue[] = [];
  const warnings: GameValidationIssue[] = [];
  for (const r of results) {
    errors.push(...r.errors);
    warnings.push(...r.warnings);
  }
  return {
    valid: errors.length === 0,
    publishable: errors.length === 0,
    errors,
    warnings
  };
}

export function okResult(warnings: GameValidationIssue[] = []): GameValidationResult {
  return { valid: true, publishable: true, errors: [], warnings };
}

export function failResult(errors: GameValidationIssue[], warnings: GameValidationIssue[] = []): GameValidationResult {
  return { valid: false, publishable: false, errors, warnings };
}
