import { GameDefinitionEntity, GameTemplateKey } from '../../contracts';
import { TEMPLATE_REGISTRY } from '../game-template-registry';
import { GameValidationIssue, GameValidationResult, okResult, failResult } from '../validation-result';

const TITLE_MIN = 2;
const TITLE_MAX = 80;
const DESC_MAX = 500;
const DURATION_MIN_SEC = 5;
const DURATION_MAX_SEC = 900;
const TARGET_SCORE_MIN = 0;
const TARGET_SCORE_MAX = 100_000;

export function validateCommon(game: GameDefinitionEntity): GameValidationResult {
  const errors: GameValidationIssue[] = [];
  const warnings: GameValidationIssue[] = [];
  const template = game.templateKey as GameTemplateKey;

  // template exists in registry
  const meta = TEMPLATE_REGISTRY[template];
  if (!meta) {
    errors.push({
      code: 'UNKNOWN_TEMPLATE', severity: 'ERROR', scope: 'CONTRACT',
      path: '$.template', message: `Template '${template}' is not registered.`
    });
    return failResult(errors, warnings);
  }

  // gameKey
  if (!game.gameKey?.trim()) {
    errors.push({
      code: 'MISSING_GAME_KEY', severity: 'ERROR', scope: 'CONTRACT',
      path: '$.gameKey', message: 'gameKey is required.'
    });
  } else if (!/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(game.gameKey)) {
    errors.push({
      code: 'INVALID_GAME_KEY', severity: 'ERROR', scope: 'CONTRACT',
      path: '$.gameKey', message: 'gameKey must be slug format (lowercase alphanumeric, dash, underscore).'
    });
  }

  // title
  if (!game.title?.trim()) {
    errors.push({
      code: 'MISSING_TITLE', severity: 'ERROR', scope: 'CONTRACT',
      path: '$.title', message: 'Title is required.'
    });
  } else if (game.title.length < TITLE_MIN || game.title.length > TITLE_MAX) {
    errors.push({
      code: 'TITLE_LENGTH_INVALID', severity: 'ERROR', scope: 'CONTRACT',
      path: '$.title', message: `Title must be between ${TITLE_MIN} and ${TITLE_MAX} characters.`
    });
  }

  // description length
  if (game.description && game.description.length > DESC_MAX) {
    errors.push({
      code: 'DESCRIPTION_TOO_LONG', severity: 'WARNING', scope: 'CONTRACT',
      path: '$.description', message: `Description exceeds ${DESC_MAX} characters.`
    });
  }

  // category
  const validCategories = new Set(['SPORT', 'FUN', 'EDUCATION']);
  const category = (game.segmentRuleJson as Record<string, unknown>)?.category as string;
  if (category && !validCategories.has(category)) {
    errors.push({
      code: 'INVALID_CATEGORY', severity: 'ERROR', scope: 'CONTRACT',
      path: '$.category', message: `Category '${category}' is not valid. Use SPORT, FUN, or EDUCATION.`
    });
  }

  // minAppVersion semver check
  if (game.minAppVersion && !/^\d+\.\d+\.\d+$/.test(game.minAppVersion)) {
    errors.push({
      code: 'INVALID_APP_VERSION', severity: 'ERROR', scope: 'CONTRACT',
      path: '$.minAppVersion', message: 'minAppVersion must be semver (MAJOR.MINOR.PATCH).'
    });
  }

  // publish gate: supportLevel
  const supportLevel = meta.supportLevel;
  if (game.status === 'PUBLISHED' && supportLevel !== 'ANDROID_SUPPORTED') {
    errors.push({
      code: 'TEMPLATE_NOT_ANDROID_SUPPORTED', severity: 'ERROR', scope: 'PUBLISH',
      path: '$.supportLevel',
      message: `Template '${template}' has supportLevel '${supportLevel}'. Only ANDROID_SUPPORTED templates can be published to mobile.`
    });
  }

  // camera requirement compatibility
  if (meta.requiresCamera && game.cameraRequirement) {
    if (!meta.allowedCameraRequirements.includes(game.cameraRequirement)) {
      errors.push({
        code: 'CAMERA_REQUIREMENT_INCOMPATIBLE', severity: 'ERROR', scope: 'TEMPLATE',
        path: '$.cameraRequirement',
        message: `Camera requirement '${game.cameraRequirement}' not allowed for template '${template}'. Allowed: ${meta.allowedCameraRequirements.join(', ')}.`
      });
    }
  }

  // levels
  if (!game.levels || game.levels.length === 0) {
    errors.push({
      code: 'MISSING_LEVELS', severity: 'ERROR', scope: 'CONTRACT',
      path: '$.levels', message: 'At least one level is required.'
    });
  } else {
    game.levels.forEach((level, index) => {
      const path = `$.levels[${index}]`;

      if (level.durationSec !== undefined) {
        if (level.durationSec < DURATION_MIN_SEC || level.durationSec > DURATION_MAX_SEC) {
          errors.push({
            code: 'DURATION_OUT_OF_RANGE', severity: 'ERROR', scope: 'CONTRACT',
            path: `${path}.durationSec`,
            message: `Duration must be between ${DURATION_MIN_SEC} and ${DURATION_MAX_SEC} seconds.`
          });
        }
      }

      if (level.targetScore !== undefined) {
        if (level.targetScore < TARGET_SCORE_MIN || level.targetScore > TARGET_SCORE_MAX) {
          errors.push({
            code: 'TARGET_SCORE_OUT_OF_RANGE', severity: 'ERROR', scope: 'CONTRACT',
            path: `${path}.targetScore`,
            message: `Target score must be between ${TARGET_SCORE_MIN} and ${TARGET_SCORE_MAX}.`
          });
        }
      }
    });
  }

  return errors.length === 0 ? okResult(warnings) : failResult(errors, warnings);
}
