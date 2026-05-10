// Template-specific validators for POSE_CONTACT_TARGETS, POSE_HOLD, RHYTHM_MOTION, QUIZ, FLASHCARD, MEMORY_MATCH

import { GameValidationIssue, GameValidationResult, okResult, failResult, POSE_KEYPOINTS } from '../validation-result';

type JsonObject = Record<string, unknown>;

// ---- POSE_CONTACT_TARGETS ----
export function validatePoseContactTargets(config: JsonObject, assetKeys: Set<string>): GameValidationResult {
  const errors: GameValidationIssue[] = [];
  const warnings: GameValidationIssue[] = [];
  const path = '$.config';

  const targets = config.targets as JsonObject[] | undefined;
  if (!targets || targets.length === 0) {
    errors.push({ code: 'POSE_TARGETS_REQUIRED', severity: 'ERROR', scope: 'TEMPLATE', path: `${path}.targets`, message: 'At least one contact target is required.' });
  } else {
    const targetIds = new Set<string>();
    targets.forEach((target, index) => {
      const tp = `${path}.targets[${index}]`;
      const targetId = target.targetId as string | undefined;
      if (!targetId?.trim()) {
        errors.push({ code: 'POSE_TARGET_ID_REQUIRED', severity: 'ERROR', scope: 'TEMPLATE', path: `${tp}.targetId`, message: 'targetId is required.' });
      } else if (targetIds.has(targetId)) {
        errors.push({ code: 'POSE_TARGET_ID_DUPLICATE', severity: 'ERROR', scope: 'TEMPLATE', path: `${tp}.targetId`, message: `Duplicate targetId '${targetId}'.` });
      }
      if (targetId) targetIds.add(targetId);

      const x = target.x as number | undefined;
      if (x === undefined || x < 0 || x > 1) {
        errors.push({ code: 'POSE_TARGET_X_INVALID', severity: 'ERROR', scope: 'TEMPLATE', path: `${tp}.x`, message: 'Target x must be 0..1.' });
      }
      const y = target.y as number | undefined;
      if (y === undefined || y < 0 || y > 1) {
        errors.push({ code: 'POSE_TARGET_Y_INVALID', severity: 'ERROR', scope: 'TEMPLATE', path: `${tp}.y`, message: 'Target y must be 0..1.' });
      }

      const hitBy = target.hitBy as string[] | undefined;
      if (!hitBy || hitBy.length === 0) {
        errors.push({ code: 'POSE_TARGET_HITBY_REQUIRED', severity: 'ERROR', scope: 'TEMPLATE', path: `${tp}.hitBy`, message: 'hitBy keypoints required.' });
      } else {
        hitBy.forEach((kp, ki) => {
          if (!POSE_KEYPOINTS.has(kp)) {
            errors.push({ code: 'POSE_TARGET_HITBY_INVALID', severity: 'ERROR', scope: 'TEMPLATE', path: `${tp}.hitBy[${ki}]`, message: `Invalid keypoint: ${kp}` });
          }
        });
      }

      const assetKey = target.assetKey as string | undefined;
      if (assetKey && assetKeys.size > 0 && !assetKeys.has(assetKey)) {
        errors.push({ code: 'POSE_TARGET_ASSET_MISSING', severity: 'ERROR', scope: 'ASSET', path: `${tp}.assetKey`, message: `Asset '${assetKey}' not found.` });
      }
    });
  }

  return errors.length === 0 ? okResult(warnings) : failResult(errors, warnings);
}

// ---- POSE_HOLD ----
export function validatePoseHold(config: JsonObject, assetKeys: Set<string>): GameValidationResult {
  const errors: GameValidationIssue[] = [];
  const warnings: GameValidationIssue[] = [];
  const path = '$.config.hold';

  const hold = config.hold as JsonObject | undefined;
  if (!hold) {
    errors.push({ code: 'POSEHOLD_CONFIG_REQUIRED', severity: 'ERROR', scope: 'TEMPLATE', path: '$.config.hold', message: 'hold configuration is required for POSE_HOLD.' });
    return failResult(errors, warnings);
  }

  const targetHoldSec = hold.targetHoldSec as number | undefined;
  if (targetHoldSec === undefined || targetHoldSec < 3 || targetHoldSec > 300) {
    errors.push({ code: 'POSEHOLD_DURATION_INVALID', severity: 'ERROR', scope: 'TEMPLATE', path: `${path}.targetHoldSec`, message: 'targetHoldSec must be between 3 and 300 seconds.' });
  }

  const graceMs = hold.graceMs as number | undefined;
  if (graceMs !== undefined && (graceMs < 0 || graceMs > 5000)) {
    errors.push({ code: 'POSEHOLD_GRACE_INVALID', severity: 'ERROR', scope: 'TEMPLATE', path: `${path}.graceMs`, message: 'graceMs must be between 0 and 5000.' });
  }

  const minConfidence = hold.minConfidence as number | undefined;
  if (minConfidence !== undefined && (minConfidence < 0 || minConfidence > 1)) {
    errors.push({ code: 'POSEHOLD_CONFIDENCE_INVALID', severity: 'ERROR', scope: 'TEMPLATE', path: `${path}.minConfidence`, message: 'minConfidence must be 0..1.' });
  }

  const pose = hold.pose as string | undefined;
  if (pose && !['PLANK', 'BALANCE', 'CUSTOM'].includes(pose)) {
    errors.push({ code: 'POSEHOLD_POSE_INVALID', severity: 'ERROR', scope: 'TEMPLATE', path: `${path}.pose`, message: `pose must be PLANK, BALANCE, or CUSTOM. Got: ${pose}.` });
  }

  const cameraReq = (config.cameraRequirement as string) || 'FULL_BODY';
  if (cameraReq !== 'FULL_BODY') {
    warnings.push({ code: 'POSEHOLD_CAMERA_WARNING', severity: 'WARNING', scope: 'TEMPLATE', path: '$.config.cameraRequirement', message: 'FULL_BODY recommended for POSE_HOLD.' });
  }

  return errors.length === 0 ? okResult(warnings) : failResult(errors, warnings);
}

// ---- RHYTHM_MOTION skeleton ----
export function validateRhythmMotion(config: JsonObject, assetKeys: Set<string>): GameValidationResult {
  const errors: GameValidationIssue[] = [];
  const warnings: GameValidationIssue[] = [];
  const path = '$.config';

  const notes = config.notes as JsonObject[] | undefined;
  if (notes && notes.length > 0) {
    const noteIds = new Set<string>();
    notes.forEach((note, index) => {
      const np = `${path}.notes[${index}]`;
      const noteId = note.noteId as string | undefined;
      if (noteId && noteIds.has(noteId)) {
        errors.push({ code: 'RHYTHM_NOTE_ID_DUPLICATE', severity: 'ERROR', scope: 'TEMPLATE', path: `${np}.noteId`, message: `Duplicate noteId: ${noteId}` });
      }
      if (noteId) noteIds.add(noteId);

      const windowMs = note.windowMs as number | undefined;
      if (windowMs !== undefined && (windowMs < 50 || windowMs > 2000)) {
        errors.push({ code: 'RHYTHM_WINDOW_INVALID', severity: 'ERROR', scope: 'TEMPLATE', path: `${np}.windowMs`, message: 'windowMs must be 50..2000.' });
      }
    });
  }

  const bpm = config.bpm as number | undefined;
  if (bpm !== undefined && (bpm < 40 || bpm > 220)) {
    errors.push({ code: 'RHYTHM_BPM_INVALID', severity: 'ERROR', scope: 'TEMPLATE', path: `${path}.bpm`, message: 'bpm must be 40..220.' });
  }

  return errors.length === 0 ? okResult(warnings) : failResult(errors, warnings);
}

// ---- QUIZ ----
export function validateQuiz(config: JsonObject, assetKeys: Set<string>): GameValidationResult {
  const errors: GameValidationIssue[] = [];
  const path = '$.config';

  const questions = config.questions as JsonObject[] | undefined;
  if (!questions || questions.length === 0) {
    errors.push({ code: 'QUIZ_QUESTIONS_REQUIRED', severity: 'ERROR', scope: 'TEMPLATE', path: `${path}.questions`, message: 'At least one question is required for QUIZ.' });
    return failResult(errors);
  }

  questions.forEach((q, qi) => {
    const qp = `${path}.questions[${qi}]`;
    if (!(q.prompt as string)?.trim()) {
      errors.push({ code: 'QUIZ_PROMPT_REQUIRED', severity: 'ERROR', scope: 'TEMPLATE', path: `${qp}.prompt`, message: 'Question prompt is required.' });
    }
    const choices = q.choices as string[] | undefined;
    if (!choices || choices.length < 2 || choices.length > 6) {
      errors.push({ code: 'QUIZ_CHOICES_INVALID', severity: 'ERROR', scope: 'TEMPLATE', path: `${qp}.choices`, message: 'Question must have 2-6 choices.' });
    }
    const correctIndex = q.correctIndex as number | undefined;
    if (correctIndex !== undefined && choices && (correctIndex < 0 || correctIndex >= choices.length)) {
      errors.push({ code: 'QUIZ_CORRECT_OUT_OF_RANGE', severity: 'ERROR', scope: 'TEMPLATE', path: `${qp}.correctIndex`, message: `correctIndex ${correctIndex} out of range (0-${choices.length - 1}).` });
    }
  });

  return errors.length === 0 ? okResult() : failResult(errors);
}

// ---- FLASHCARD ----
export function validateFlashcard(config: JsonObject, assetKeys: Set<string>): GameValidationResult {
  const errors: GameValidationIssue[] = [];
  const path = '$.config';

  const cards = config.cards as JsonObject[] | undefined;
  if (!cards || cards.length === 0) {
    errors.push({ code: 'FLASHCARD_CARDS_REQUIRED', severity: 'ERROR', scope: 'TEMPLATE', path: `${path}.cards`, message: 'At least one card is required for FLASHCARD.' });
    return failResult(errors);
  }

  cards.forEach((card, ci) => {
    const cp = `${path}.cards[${ci}]`;
    const hasFrontText = !!(card.frontText as string)?.trim();
    const hasBackText = !!(card.backText as string)?.trim();
    const hasImage = !!(card.imageAssetKey as string);
    const hasAudio = !!(card.audioAssetKey as string);
    if (!hasFrontText && !hasBackText && !hasImage && !hasAudio) {
      errors.push({ code: 'FLASHCARD_CONTENT_REQUIRED', severity: 'ERROR', scope: 'TEMPLATE', path: `${cp}`, message: 'Card must have at least one of: frontText, backText, imageAssetKey, audioAssetKey.' });
    }
  });

  return errors.length === 0 ? okResult() : failResult(errors);
}

// ---- MEMORY_MATCH ----
export function validateMemoryMatch(config: JsonObject, assetKeys: Set<string>): GameValidationResult {
  const errors: GameValidationIssue[] = [];
  const path = '$.config';

  const pairs = config.pairs as JsonObject[] | undefined;
  if (!pairs || pairs.length < 2) {
    errors.push({ code: 'MEMORY_PAIRS_REQUIRED', severity: 'ERROR', scope: 'TEMPLATE', path: `${path}.pairs`, message: 'At least 2 pairs are required for MEMORY_MATCH.' });
    return failResult(errors);
  }

  pairs.forEach((pair, pi) => {
    const pp = `${path}.pairs[${pi}]`;
    const left = pair.left as JsonObject | undefined;
    const right = pair.right as JsonObject | undefined;
    if (!left && !right) {
      errors.push({ code: 'MEMORY_PAIR_INVALID', severity: 'ERROR', scope: 'TEMPLATE', path: pp, message: 'Each pair must have left and right objects.' });
    } else {
      [left, right].forEach((side, si) => {
        if (!side) return;
        const hasText = !!(side.text as string)?.trim();
        const hasImage = !!(side.imageAssetKey as string);
        const hasAudio = !!(side.audioAssetKey as string);
        if (!hasText && !hasImage && !hasAudio) {
          errors.push({ code: 'MEMORY_SIDE_CONTENT_REQUIRED', severity: 'ERROR', scope: 'TEMPLATE', path: `${pp}.${si === 0 ? 'left' : 'right'}`, message: 'Each side must have text, imageAssetKey, or audioAssetKey.' });
        }
      });
    }
  });

  return errors.length === 0 ? okResult() : failResult(errors);
}
