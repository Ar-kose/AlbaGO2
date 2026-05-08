export type GameDefinitionV3ValidationStatus = 'passed' | 'failed';

export interface GameDefinitionV3ValidationIssue {
  code: string;
  path: string;
  message: string;
}

export interface GameDefinitionV3ValidationResult {
  status: GameDefinitionV3ValidationStatus;
  errors: GameDefinitionV3ValidationIssue[];
  warnings: GameDefinitionV3ValidationIssue[];
}

type JsonObject = Record<string, unknown>;

const runtimeVersion = '2.0.0';
const supportedSchemaVersions = new Set(['3.0']);
const supportedCategories = new Set(['fun', 'sport', 'education']);
const supportedOrientations = new Set(['portrait', 'landscape']);
const supportedCameraRequirements = new Set(['full_body', 'upper_body', 'hand_target']);
const supportedCapabilities = new Set([
  'MOTION_EVENT',
  'POSE_CONTACT',
  'SCENE_OBJECTS',
  'PROGRAM_STEPS',
  'AUDIO',
  'TIMER'
]);
const supportedMotions = new Set(['SQUAT', 'JUMPING_JACK', 'JUMP_ROPE', 'PLANK_HOLD']);
const supportedConditions = new Set([
  'MOTION_EVENT',
  'POSE_CONTACT',
  'TIMER_EXPIRED',
  'OBJECT_EXPIRED',
  'STEP_COMPLETED',
  'SCORE_REACHED',
  'LIFE_ZERO',
  'QUIZ_ANSWERED'
]);
const supportedActions = new Set([
  'ADD_SCORE',
  'REMOVE_OBJECT',
  'SPAWN_OBJECT',
  'DECREASE_LIFE',
  'INCREASE_LIFE',
  'RESET_COMBO',
  'ADD_COMBO',
  'PAUSE_GAME',
  'RESUME_GAME',
  'ADVANCE_STEP',
  'COMPLETE_LEVEL',
  'PLAY_SOUND',
  'SHOW_EFFECT',
  'SHOW_MESSAGE',
  'PROGRESS_TASK',
  'GRANT_REWARD_REQUEST'
]);
const supportedStepTypes = new Set(['INSTRUCTION', 'PLAY_GAME', 'MOTION_REPS', 'HOLD_POSE', 'REST']);
const supportedAssetFormats = new Set(['PNG', 'WEBP', 'SVG', 'MP3']);

export function validateGameDefinitionV3(definition: unknown): GameDefinitionV3ValidationResult {
  const errors: GameDefinitionV3ValidationIssue[] = [];
  const warnings: GameDefinitionV3ValidationIssue[] = [];
  const root = asObject(definition);

  if (!root) {
    push(errors, 'INVALID_SCHEMA', '$', 'GameDefinition v3 payload must be a JSON object.');
    return result(errors, warnings);
  }

  requireEnum(root, 'schemaVersion', '$.schemaVersion', supportedSchemaVersions, 'UNSUPPORTED_SCHEMA_VERSION', errors);
  requireString(root, 'gameKey', '$.gameKey', errors);
  requirePositiveInteger(root, 'version', '$.version', errors);
  requireString(root, 'title', '$.title', errors);
  requireEnum(root, 'category', '$.category', supportedCategories, 'INVALID_CATEGORY', errors);
  requireEnum(root, 'orientation', '$.orientation', supportedOrientations, 'INVALID_ORIENTATION', errors);
  requireEnum(
    root,
    'cameraRequirement',
    '$.cameraRequirement',
    supportedCameraRequirements,
    'INVALID_CAMERA_REQUIREMENT',
    errors
  );
  requireSemver(root, 'minAppVersion', '$.minAppVersion', errors);
  requireSemver(root, 'minRuntimeVersion', '$.minRuntimeVersion', errors);

  const minRuntime = stringValue(root.minRuntimeVersion);
  if (minRuntime && compareVersions(minRuntime, runtimeVersion) > 0) {
    push(
      errors,
      'UNSUPPORTED_RUNTIME_VERSION',
      '$.minRuntimeVersion',
      `Runtime ${runtimeVersion} cannot publish a game requiring ${minRuntime}.`
    );
  }

  const requestedCapabilities = stringArray(root.capabilities, '$.capabilities', errors);
  requestedCapabilities.forEach((capability, index) => {
    if (!supportedCapabilities.has(capability)) {
      push(
        errors,
        'UNSUPPORTED_CAPABILITY',
        `$.capabilities[${index}]`,
        `Unsupported capability: ${capability}`
      );
    }
  });

  const requestedMotions = stringArray(root.supportedMotions, '$.supportedMotions', errors);
  const requestedMotionSet = new Set(requestedMotions);
  requestedMotions.forEach((motion, index) => {
    if (!supportedMotions.has(motion)) {
      push(errors, 'UNSUPPORTED_MOTION', `$.supportedMotions[${index}]`, `Unsupported motion: ${motion}`);
    }
  });

  const assetKeys = validateAssetManifest(root.assetManifest, errors);
  const levels = arrayValue(root.levels);
  if (!levels || levels.length === 0) {
    push(errors, 'MISSING_LEVELS', '$.levels', 'At least one level is required.');
  } else {
    levels.forEach((level, index) =>
      validateLevel(level, index, requestedMotionSet, assetKeys, errors, warnings)
    );
  }

  return result(errors, warnings);
}

function validateAssetManifest(manifest: unknown, errors: GameDefinitionV3ValidationIssue[]): Set<string> {
  const keys = new Set<string>();
  const manifestObject = asObject(manifest);
  if (!manifestObject) {
    push(errors, 'MISSING_ASSET_MANIFEST', '$.assetManifest', 'assetManifest is required.');
    return keys;
  }

  const items = arrayValue(manifestObject.items);
  if (!items) {
    push(errors, 'MISSING_ASSET_ITEMS', '$.assetManifest.items', 'assetManifest.items must be an array.');
    return keys;
  }

  items.forEach((item, index) => {
    const path = `$.assetManifest.items[${index}]`;
    const asset = asObject(item);
    if (!asset) {
      push(errors, 'INVALID_ASSET', path, 'Asset item must be an object.');
      return;
    }
    const key = requireString(asset, 'key', `${path}.key`, errors);
    if (key) {
      if (keys.has(key)) {
        push(errors, 'DUPLICATE_ASSET_KEY', `${path}.key`, `Duplicate asset key: ${key}`);
      }
      keys.add(key);
    }
    requireEnum(asset, 'kind', `${path}.kind`, new Set(['IMAGE', 'AUDIO']), 'INVALID_ASSET_KIND', errors);
    requireEnum(asset, 'format', `${path}.format`, supportedAssetFormats, 'UNSUPPORTED_ASSET_FORMAT', errors);
    requireString(asset, 'uri', `${path}.uri`, errors);
    const bytes = numberValue(asset.bytes);
    if (bytes !== undefined && (bytes <= 0 || bytes > 5 * 1024 * 1024)) {
      push(errors, 'ASSET_SIZE_OUT_OF_RANGE', `${path}.bytes`, 'Asset size must be between 1 byte and 5 MB.');
    }
  });

  return keys;
}

function validateLevel(
  rawLevel: unknown,
  index: number,
  requestedMotions: Set<string>,
  assetKeys: Set<string>,
  errors: GameDefinitionV3ValidationIssue[],
  warnings: GameDefinitionV3ValidationIssue[]
) {
  const path = `$.levels[${index}]`;
  const level = asObject(rawLevel);
  if (!level) {
    push(errors, 'INVALID_LEVEL', path, 'Level must be an object.');
    return;
  }

  requireString(level, 'levelId', `${path}.levelId`, errors);
  const durationSec = requirePositiveInteger(level, 'durationSec', `${path}.durationSec`, errors);
  const targetScore = requirePositiveInteger(level, 'targetScore', `${path}.targetScore`, errors);
  requireString(level, 'difficulty', `${path}.difficulty`, errors);

  if (durationSec !== undefined && targetScore !== undefined && targetScore > durationSec * 20) {
    push(
      warnings,
      'HIGH_TARGET_SCORE',
      `${path}.targetScore`,
      'Target score may be unreachable for the configured duration.'
    );
  }

  const objectIds = validateScene(level.scene, path, requestedMotions, assetKeys, errors);
  validateRules(level.rules, path, requestedMotions, objectIds, errors);
  validateProgram(level.programSteps, path, requestedMotions, errors, warnings);
}

function validateScene(
  rawScene: unknown,
  levelPath: string,
  requestedMotions: Set<string>,
  assetKeys: Set<string>,
  errors: GameDefinitionV3ValidationIssue[]
): Set<string> {
  const objectIds = new Set<string>();
  const path = `${levelPath}.scene`;
  const scene = asObject(rawScene);
  if (!scene) {
    push(errors, 'MISSING_SCENE', path, 'scene is required.');
    return objectIds;
  }

  requireString(scene, 'type', `${path}.type`, errors);
  const maxObjects = numberValue(scene.maxObjects);
  if (maxObjects !== undefined && (!Number.isInteger(maxObjects) || maxObjects < 1 || maxObjects > 20)) {
    push(errors, 'MAX_OBJECTS_OUT_OF_RANGE', `${path}.maxObjects`, 'maxObjects must be between 1 and 20.');
  }
  const spawnRateMs = numberValue(scene.spawnRateMs);
  if (spawnRateMs !== undefined && (spawnRateMs < 250 || spawnRateMs > 10_000)) {
    push(errors, 'SPAWN_RATE_OUT_OF_RANGE', `${path}.spawnRateMs`, 'spawnRateMs must be between 250 and 10000.');
  }

  const objects = arrayValue(scene.objects);
  if (!objects || objects.length === 0) {
    push(errors, 'MISSING_SCENE_OBJECTS', `${path}.objects`, 'At least one scene object is required.');
    return objectIds;
  }

  objects.forEach((item, index) => {
    const objectPath = `${path}.objects[${index}]`;
    const object = asObject(item);
    if (!object) {
      push(errors, 'INVALID_SCENE_OBJECT', objectPath, 'Scene object must be an object.');
      return;
    }
    const objectId = requireString(object, 'objectId', `${objectPath}.objectId`, errors);
    if (objectId) {
      if (objectIds.has(objectId)) {
        push(errors, 'DUPLICATE_OBJECT_ID', `${objectPath}.objectId`, `Duplicate scene object id: ${objectId}`);
      }
      objectIds.add(objectId);
    }
    const assetKey = requireString(object, 'assetKey', `${objectPath}.assetKey`, errors);
    if (assetKey && assetKeys.size > 0 && !assetKeys.has(assetKey)) {
      push(errors, 'UNKNOWN_ASSET_KEY', `${objectPath}.assetKey`, `Scene object references missing asset: ${assetKey}`);
    }
    const motion = requireString(object, 'requiredMotion', `${objectPath}.requiredMotion`, errors);
    if (motion && !requestedMotions.has(motion)) {
      push(
        errors,
        'MOTION_NOT_DECLARED',
        `${objectPath}.requiredMotion`,
        `Scene object uses motion not listed in supportedMotions: ${motion}`
      );
    }
    const lifeMs = numberValue(object.lifeMs);
    if (lifeMs !== undefined && (lifeMs < 250 || lifeMs > 30_000)) {
      push(errors, 'OBJECT_LIFE_OUT_OF_RANGE', `${objectPath}.lifeMs`, 'lifeMs must be between 250 and 30000.');
    }
  });

  return objectIds;
}

function validateRules(
  rawRules: unknown,
  levelPath: string,
  requestedMotions: Set<string>,
  objectIds: Set<string>,
  errors: GameDefinitionV3ValidationIssue[]
) {
  const path = `${levelPath}.rules`;
  const rules = arrayValue(rawRules);
  if (!rules || rules.length === 0) {
    push(errors, 'MISSING_RULES', path, 'At least one rule is required.');
    return;
  }

  rules.forEach((item, ruleIndex) => {
    const rulePath = `${path}[${ruleIndex}]`;
    const rule = asObject(item);
    if (!rule) {
      push(errors, 'INVALID_RULE', rulePath, 'Rule must be an object.');
      return;
    }
    requireString(rule, 'ruleId', `${rulePath}.ruleId`, errors);
    const when = asObject(rule.when);
    if (!when) {
      push(errors, 'MISSING_CONDITION', `${rulePath}.when`, 'Rule condition is required.');
    } else {
      const conditionType = requireEnum(
        when,
        'type',
        `${rulePath}.when.type`,
        supportedConditions,
        'UNKNOWN_CONDITION',
        errors
      );
      const motion = stringValue(when.motion);
      if (motion && !requestedMotions.has(motion)) {
        push(errors, 'MOTION_NOT_DECLARED', `${rulePath}.when.motion`, `Rule uses undeclared motion: ${motion}`);
      }
      const targetObjectId = stringValue(when.targetObjectId);
      if (targetObjectId && !objectIds.has(targetObjectId)) {
        push(
          errors,
          'UNKNOWN_TARGET_OBJECT',
          `${rulePath}.when.targetObjectId`,
          `Rule targets missing scene object: ${targetObjectId}`
        );
      }
      if (conditionType === 'MOTION_EVENT' && !stringValue(when.event)) {
        push(errors, 'MISSING_MOTION_EVENT', `${rulePath}.when.event`, 'MOTION_EVENT rules require an event.');
      }
    }

    const actions = arrayValue(rule.then);
    if (!actions || actions.length === 0) {
      push(errors, 'MISSING_ACTIONS', `${rulePath}.then`, 'Rule must contain at least one action.');
    } else {
      actions.forEach((actionItem, actionIndex) => {
        const actionPath = `${rulePath}.then[${actionIndex}]`;
        const action = asObject(actionItem);
        if (!action) {
          push(errors, 'INVALID_ACTION', actionPath, 'Action must be an object.');
          return;
        }
        requireEnum(action, 'type', `${actionPath}.type`, supportedActions, 'UNKNOWN_ACTION', errors);
        const target = stringValue(action.target);
        if (target && !objectIds.has(target)) {
          push(errors, 'UNKNOWN_TARGET_OBJECT', `${actionPath}.target`, `Action targets missing scene object: ${target}`);
        }
      });
    }

    const cooldownMs = numberValue(rule.cooldownMs);
    if (cooldownMs !== undefined && cooldownMs < 0) {
      push(errors, 'INVALID_COOLDOWN', `${rulePath}.cooldownMs`, 'cooldownMs must be zero or greater.');
    }
  });
}

function validateProgram(
  rawSteps: unknown,
  levelPath: string,
  requestedMotions: Set<string>,
  errors: GameDefinitionV3ValidationIssue[],
  warnings: GameDefinitionV3ValidationIssue[]
) {
  if (rawSteps === undefined) return;
  const path = `${levelPath}.programSteps`;
  const steps = arrayValue(rawSteps);
  if (!steps) {
    push(errors, 'INVALID_PROGRAM_STEPS', path, 'programSteps must be an array.');
    return;
  }
  const stepIds = new Set<string>();
  steps.forEach((item, index) => {
    const stepPath = `${path}[${index}]`;
    const step = asObject(item);
    if (!step) {
      push(errors, 'INVALID_PROGRAM_STEP', stepPath, 'Program step must be an object.');
      return;
    }
    const stepId = requireString(step, 'stepId', `${stepPath}.stepId`, errors);
    if (stepId) {
      if (stepIds.has(stepId)) {
        push(errors, 'DUPLICATE_STEP_ID', `${stepPath}.stepId`, `Duplicate program step id: ${stepId}`);
      }
      stepIds.add(stepId);
    }
    requireString(step, 'title', `${stepPath}.title`, errors);
    const type = requireEnum(step, 'type', `${stepPath}.type`, supportedStepTypes, 'UNSUPPORTED_STEP_TYPE', errors);
    const motion = stringValue(step.motion);
    if (motion && !requestedMotions.has(motion)) {
      push(errors, 'MOTION_NOT_DECLARED', `${stepPath}.motion`, `Program step uses undeclared motion: ${motion}`);
    }
    if (type === 'MOTION_REPS') {
      if (!positiveIntegerValue(step.targetCount)) {
        push(errors, 'MISSING_STEP_TARGET', `${stepPath}.targetCount`, 'MOTION_REPS requires a positive targetCount.');
      }
      if (!motion) {
        push(errors, 'MISSING_STEP_MOTION', `${stepPath}.motion`, 'MOTION_REPS requires a motion.');
      }
    }
    if (type === 'HOLD_POSE') {
      if (!positiveIntegerValue(step.holdSec)) {
        push(errors, 'MISSING_HOLD_DURATION', `${stepPath}.holdSec`, 'HOLD_POSE requires a positive holdSec.');
      }
    }
    if (type === 'REST') {
      if (!positiveIntegerValue(step.durationSec)) {
        push(errors, 'MISSING_STEP_DURATION', `${stepPath}.durationSec`, 'REST requires a positive durationSec.');
      }
    }
    if (type === 'INSTRUCTION') {
      if (step.durationSec !== undefined && !positiveIntegerValue(step.durationSec)) {
        push(errors, 'INVALID_STEP_DURATION', `${stepPath}.durationSec`, 'durationSec must be a positive integer.');
      }
      if (step.durationSec === undefined) {
        push(
          warnings,
          'INSTRUCTION_NO_DURATION',
          `${stepPath}.durationSec`,
          'INSTRUCTION step has no durationSec; Android v1 will default to 3 seconds. Consider adding an explicit durationSec.'
        );
      }
    }
    if (type === 'PLAY_GAME' && step.durationSec !== undefined) {
      if (!positiveIntegerValue(step.durationSec)) {
        push(errors, 'INVALID_STEP_DURATION', `${stepPath}.durationSec`, 'durationSec must be a positive integer.');
      }
    }
  });
}

function requireString(
  object: JsonObject,
  key: string,
  path: string,
  errors: GameDefinitionV3ValidationIssue[]
): string | undefined {
  const value = stringValue(object[key]);
  if (!value) {
    push(errors, 'MISSING_REQUIRED_FIELD', path, `${key} is required.`);
  }
  return value;
}

function requireSemver(object: JsonObject, key: string, path: string, errors: GameDefinitionV3ValidationIssue[]) {
  const value = requireString(object, key, path, errors);
  if (value && !/^\d+\.\d+\.\d+$/.test(value)) {
    push(errors, 'INVALID_VERSION', path, `${key} must use MAJOR.MINOR.PATCH format.`);
  }
}

function requireEnum(
  object: JsonObject,
  key: string,
  path: string,
  allowed: Set<string>,
  code: string,
  errors: GameDefinitionV3ValidationIssue[]
): string | undefined {
  const value = requireString(object, key, path, errors);
  if (value && !allowed.has(value)) {
    push(errors, code, path, `Unsupported ${key}: ${value}`);
  }
  return value;
}

function requirePositiveInteger(
  object: JsonObject,
  key: string,
  path: string,
  errors: GameDefinitionV3ValidationIssue[]
): number | undefined {
  const value = numberValue(object[key]);
  if (!positiveIntegerValue(object[key])) {
    push(errors, 'INVALID_NUMBER', path, `${key} must be a positive integer.`);
    return undefined;
  }
  return value;
}

function stringArray(
  value: unknown,
  path: string,
  errors: GameDefinitionV3ValidationIssue[]
): string[] {
  const items = arrayValue(value);
  if (!items) {
    push(errors, 'INVALID_ARRAY', path, `${path} must be an array.`);
    return [];
  }
  return items.map((item, index) => {
    const text = stringValue(item);
    if (!text) {
      push(errors, 'INVALID_ARRAY_ITEM', `${path}[${index}]`, 'Array item must be a non-empty string.');
    }
    return text ?? '';
  }).filter(Boolean);
}

function asObject(value: unknown): JsonObject | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as JsonObject)
    : undefined;
}

function arrayValue(value: unknown): unknown[] | undefined {
  return Array.isArray(value) ? value : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function positiveIntegerValue(value: unknown): boolean {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function compareVersions(left: string, right: string): number {
  const leftParts = left.split('.').map((part) => Number(part) || 0);
  const rightParts = right.split('.').map((part) => Number(part) || 0);
  const size = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < size; index += 1) {
    const l = leftParts[index] ?? 0;
    const r = rightParts[index] ?? 0;
    if (l !== r) return l > r ? 1 : -1;
  }
  return 0;
}

function push(
  issues: GameDefinitionV3ValidationIssue[],
  code: string,
  path: string,
  message: string
) {
  issues.push({ code, path, message });
}

function result(
  errors: GameDefinitionV3ValidationIssue[],
  warnings: GameDefinitionV3ValidationIssue[]
): GameDefinitionV3ValidationResult {
  return {
    status: errors.length > 0 ? 'failed' : 'passed',
    errors,
    warnings
  };
}
