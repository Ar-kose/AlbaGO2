import { GameValidationIssue, GameValidationResult, okResult, failResult, POSE_KEYPOINTS } from '../validation-result';

type JsonObject = Record<string, unknown>;

export function validateWhackAMole(config: JsonObject, assetKeys: Set<string>): GameValidationResult {
  const errors: GameValidationIssue[] = [];
  const warnings: GameValidationIssue[] = [];
  const path = '$.config';

  // durationSec
  const durationSec = config.durationSec as number | undefined;
  if (durationSec !== undefined && (durationSec < 5 || durationSec > 900)) {
    errors.push({
      code: 'WHACK_DURATION_INVALID', severity: 'ERROR', scope: 'TEMPLATE',
      path: `${path}.durationSec`, message: 'Duration must be between 5 and 900 seconds.'
    });
  }

  // score
  const score = config.score as JsonObject | undefined;
  if (score) {
    if (score.hitPoints !== undefined && ((score.hitPoints as number) < 0)) {
      errors.push({
        code: 'WHACK_SCORE_HIT_INVALID', severity: 'ERROR', scope: 'TEMPLATE',
        path: `${path}.score.hitPoints`, message: 'hitPoints must be >= 0.'
      });
    }
  }

  // lives
  const lives = config.lives as JsonObject | undefined;
  if (lives && lives.enabled === true) {
    const count = lives.count as number | undefined;
    if (count !== undefined && (count < 1 || count > 10)) {
      errors.push({
        code: 'WHACK_LIVES_INVALID', severity: 'ERROR', scope: 'TEMPLATE',
        path: `${path}.lives.count`, message: 'Lives count must be between 1 and 10.'
      });
    }
  }

  // camera
  const cameraReq = (config.cameraRequirement as string) || 'FULL_BODY';
  if (!['UPPER_BODY', 'FULL_BODY'].includes(cameraReq)) {
    errors.push({
      code: 'WHACK_CAMERA_REQUIREMENT_INVALID', severity: 'ERROR', scope: 'TEMPLATE',
      path: `${path}.cameraRequirement`,
      message: `cameraRequirement must be UPPER_BODY or FULL_BODY for WHACK_A_MOLE. Got: ${cameraReq}.`
    });
  }

  // targets
  const targets = config.targets as JsonObject[] | undefined;
  if (!targets || targets.length === 0) {
    errors.push({
      code: 'WHACK_TARGETS_REQUIRED', severity: 'ERROR', scope: 'TEMPLATE',
      path: `${path}.targets`, message: 'At least one target is required for WHACK_A_MOLE.'
    });
    return failResult(errors, warnings);
  }

  const targetIds = new Set<string>();
  targets.forEach((target, index) => {
    const tp = `${path}.targets[${index}]`;

    // targetId
    const targetId = target.targetId as string | undefined;
    if (!targetId?.trim()) {
      errors.push({
        code: 'WHACK_TARGET_ID_REQUIRED', severity: 'ERROR', scope: 'TEMPLATE',
        path: `${tp}.targetId`, message: `Target ${index} is missing targetId.`
      });
    } else if (!/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(targetId)) {
      errors.push({
        code: 'WHACK_TARGET_ID_INVALID', severity: 'ERROR', scope: 'TEMPLATE',
        path: `${tp}.targetId`, message: `targetId must be slug format.`
      });
    } else if (targetIds.has(targetId)) {
      errors.push({
        code: 'WHACK_TARGET_ID_DUPLICATE', severity: 'ERROR', scope: 'TEMPLATE',
        path: `${tp}.targetId`, message: `Duplicate targetId '${targetId}'. targetIds must be unique.`
      });
    }
    if (targetId) targetIds.add(targetId);

    // x
    const x = target.x as number | undefined;
    if (x === undefined || x < 0 || x > 1) {
      errors.push({
        code: 'WHACK_TARGET_X_INVALID', severity: 'ERROR', scope: 'TEMPLATE',
        path: `${tp}.x`, message: 'Target x must be a number between 0 and 1.'
      });
    }

    // y
    const y = target.y as number | undefined;
    if (y === undefined || y < 0 || y > 1) {
      errors.push({
        code: 'WHACK_TARGET_Y_INVALID', severity: 'ERROR', scope: 'TEMPLATE',
        path: `${tp}.y`, message: 'Target y must be a number between 0 and 1.'
      });
    }

    // radius
    const radius = target.radius as number | undefined;
    if (radius !== undefined && (radius < 0.02 || radius > 0.35)) {
      errors.push({
        code: 'WHACK_TARGET_RADIUS_INVALID', severity: 'ERROR', scope: 'TEMPLATE',
        path: `${tp}.radius`, message: 'Target radius must be between 0.02 and 0.35.'
      });
    }

    // assetKey
    const assetKey = target.assetKey as string | undefined;
    if (assetKey != null && assetKey.trim()) {
      if (!assetKeys.has(assetKey)) {
        errors.push({
          code: 'WHACK_TARGET_ASSET_MISSING', severity: 'ERROR', scope: 'ASSET',
          path: `${tp}.assetKey`, message: `Target asset '${assetKey}' not found in assets.`
        });
      }
    } else {
      errors.push({
        code: 'WHACK_TARGET_ASSET_MISSING', severity: 'ERROR', scope: 'ASSET',
        path: `${tp}.assetKey`, message: 'Target requires an assetKey.'
      });
    }

    // hitBy
    const hitBy = target.hitBy as string[] | undefined;
    if (!hitBy || hitBy.length === 0) {
      errors.push({
        code: 'WHACK_TARGET_HITBY_REQUIRED', severity: 'ERROR', scope: 'TEMPLATE',
        path: `${tp}.hitBy`, message: 'hitBy must be a non-empty array of pose keypoints.'
      });
    } else {
      hitBy.forEach((kp, ki) => {
        if (!POSE_KEYPOINTS.has(kp)) {
          errors.push({
            code: 'WHACK_TARGET_HITBY_INVALID', severity: 'ERROR', scope: 'TEMPLATE',
            path: `${tp}.hitBy[${ki}]`, message: `Invalid pose keypoint '${kp}'. Use MediaPipe pose landmark names.`
          });
        }
      });
    }

    // points
    const points = target.points as number | undefined;
    if (points !== undefined && points < 0) {
      errors.push({
        code: 'WHACK_TARGET_POINTS_INVALID', severity: 'ERROR', scope: 'TEMPLATE',
        path: `${tp}.points`, message: 'Target points must be >= 0.'
      });
    }
  });

  // spawn
  const spawn = config.spawn as JsonObject | undefined;
  if (spawn) {
    const intervalMs = spawn.intervalMs as number | undefined;
    if (intervalMs !== undefined && (intervalMs < 100 || intervalMs > 10_000)) {
      errors.push({
        code: 'WHACK_SPAWN_INTERVAL_INVALID', severity: 'ERROR', scope: 'TEMPLATE',
        path: `${path}.spawn.intervalMs`, message: 'Spawn interval must be between 100ms and 10000ms.'
      });
    }

    const visibleMs = spawn.visibleMs as number | undefined;
    if (visibleMs !== undefined && (visibleMs < 100 || visibleMs > 30_000)) {
      errors.push({
        code: 'WHACK_VISIBLE_MS_INVALID', severity: 'ERROR', scope: 'TEMPLATE',
        path: `${path}.spawn.visibleMs`, message: 'Visible duration must be between 100ms and 30000ms.'
      });
    }

    const maxActive = spawn.maxActiveTargets as number | undefined;
    if (maxActive !== undefined && maxActive < 1) {
      errors.push({
        code: 'WHACK_MAX_ACTIVE_INVALID', severity: 'ERROR', scope: 'TEMPLATE',
        path: `${path}.spawn.maxActiveTargets`, message: 'maxActiveTargets must be at least 1.'
      });
    }

    if (maxActive !== undefined && maxActive > targets.length) {
      warnings.push({
        code: 'WHACK_MAX_ACTIVE_EXCEEDS_TARGETS', severity: 'WARNING', scope: 'TEMPLATE',
        path: `${path}.spawn.maxActiveTargets`,
        message: `maxActiveTargets (${maxActive}) exceeds total targets (${targets.length}). Will be clamped at runtime.`
      });
    }
  }

  // orientation warning
  const orientation = config.orientation as string | undefined;
  if (orientation === 'PORTRAIT') {
    warnings.push({
      code: 'WHACK_PORTRAIT_WARNING', severity: 'WARNING', scope: 'TEMPLATE',
      path: `${path}.orientation`,
      message: 'LANDSCAPE is recommended for WHACK_A_MOLE. PORTRAIT may limit target visibility.'
    });
  }

  return errors.length === 0 ? okResult(warnings) : failResult(errors, warnings);
}
