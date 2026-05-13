import { GameDefinitionEntity, GameTemplateKey, createId } from './contracts';

const allowedTemplates = new Set<GameTemplateKey>([
  'FRUIT_SLASH', 'DODGE_RUN', 'FIT_CHALLENGE', 'SCENE_PLAY',
  'TARGET_HIT', 'ENDLESS_RUNNER',
  'WHACK_A_MOLE', 'POSE_CONTACT_TARGETS', 'CAMERA_ARCADE_OVERLAY',
  'RHYTHM_MOTION', 'POSE_HOLD', 'REP_COUNTER',
  'MOTION_SEQUENCE', 'INTERVAL_WORKOUT',
  'QUIZ', 'FLASHCARD', 'MEMORY_MATCH', 'TRUE_FALSE', 'MATCH_PAIRS',
  'REACTION', 'CATCH_FALLING', 'AVOID_OBSTACLE', 'COLLECT_ITEMS',
  'PROGRAM_FLOW', 'HYBRID_SCENE'
]);
const allowedOrientations = new Set(['PORTRAIT', 'LANDSCAPE', 'AUTO']);
const allowedCameraRequirements = new Set(['FULL_BODY', 'UPPER_BODY', 'HAND_TARGET']);

export function compareVersions(left: string, right: string): number {
  const leftParts = left.split('.').map((part) => Number(part) || 0);
  const rightParts = right.split('.').map((part) => Number(part) || 0);
  const size = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < size; index += 1) {
    const l = leftParts[index] ?? 0;
    const r = rightParts[index] ?? 0;
    if (l !== r) {
      return l > r ? 1 : -1;
    }
  }

  return 0;
}

const allowedCategories = new Set(['SPORT', 'FUN', 'EDUCATION']);

export function validateGameDefinition(game: GameDefinitionEntity): string[] {
  const errors: string[] = [];

  if (!allowedTemplates.has(game.templateKey)) {
    errors.push('unsupported_template');
  }
  const category = (game.segmentRuleJson as Record<string, unknown>)?.category as string | undefined;
  if (!category || !allowedCategories.has(category)) {
    errors.push('missing_or_invalid_category');
  }
  if (!allowedOrientations.has(game.orientation)) {
    errors.push('invalid_orientation');
  }
  if (!allowedCameraRequirements.has(game.cameraRequirement)) {
    errors.push('invalid_camera_requirement');
  }
  if (!hasRequiredAssets(game)) {
    errors.push('missing_required_assets');
  }
  if (!game.levels.length) {
    errors.push('missing_levels');
    return errors;
  }

  for (const level of game.levels) {
    if (!level.motionRules.length) {
      errors.push(`missing_motion_rules:${level.levelId}`);
    }
    if (!level.configJson || Object.keys(level.configJson).length === 0) {
      errors.push(`missing_level_config:${level.levelId}`);
    }
    if (!level.sceneConfig || Object.keys(level.sceneConfig).length === 0) {
      errors.push(`missing_scene_config:${level.levelId}`);
    }
    if (!level.interactionRules?.length) {
      errors.push(`missing_interaction_rules:${level.levelId}`);
    }
    if (game.templateKey === 'FRUIT_SLASH') {
      if (typeof level.configJson.spawnRateMs !== 'number') {
        errors.push(`missing_spawn_rate:${level.levelId}`);
      }
      if (typeof level.sceneConfig?.defaultHitRadius !== 'number') {
        errors.push(`missing_hit_radius:${level.levelId}`);
      }
    }
    if (game.templateKey === 'DODGE_RUN') {
      if (typeof level.configJson.obstacleSpawnMs !== 'number') {
        errors.push(`missing_obstacle_spawn:${level.levelId}`);
      }
      if (typeof level.configJson.lives !== 'number') {
        errors.push(`missing_lives:${level.levelId}`);
      }
      if (typeof level.sceneConfig?.travelMs !== 'number') {
        errors.push(`missing_travel_ms:${level.levelId}`);
      }
    }
    if (game.templateKey === 'FIT_CHALLENGE') {
      if (!level.taskRulesJson?.length) {
        errors.push(`missing_task_rules:${level.levelId}`);
      }
    }
    if (game.templateKey === 'SCENE_PLAY') {
      if (typeof level.configJson.spawnRateMs !== 'number') {
        errors.push(`missing_spawn_rate:${level.levelId}`);
      }
      if (!Array.isArray(level.sceneConfig?.objects) || level.sceneConfig.objects.length === 0) {
        errors.push(`missing_scene_objects:${level.levelId}`);
      }
      if (!level.interactionRules?.some((rule) => rule.action === 'REMOVE_OBJECT' || rule.action === 'ADD_SCORE')) {
        errors.push(`missing_scoring_interaction:${level.levelId}`);
      }
    }
  }

  return errors;
}

export function validateCoverAsset(assets: GameDefinitionEntity['assets']): string[] {
  const errors: string[] = [];
  const cover = assets.cover;

  if (!cover || cover.trim().length === 0) {
    errors.push('cover_missing');
    return errors;
  }

  if (cover.startsWith('local://')) {
    errors.push('cover_local_uri');
    return errors;
  }

  if (cover.startsWith('file://')) {
    errors.push('cover_file_uri');
    return errors;
  }

  const urlResult = parsePublicUrl(cover);
  if (!urlResult.ok) {
    errors.push(urlResult.code);
    return errors;
  }

  // SSRF: block private/localhost IP ranges
  const hostname = urlResult.url.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '[::1]' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('172.16.')
  ) {
    errors.push('cover_private_ip');
    return errors;
  }

  return errors;
}

interface UrlParseOk {
  ok: true;
  url: URL;
}

interface UrlParseFail {
  ok: false;
  code: string;
}

function parsePublicUrl(value: string): UrlParseOk | UrlParseFail {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return { ok: false, code: 'cover_invalid_url' };
    }
    return { ok: true, url };
  } catch {
    // No protocol at all → relative path or malformed
    if (value.startsWith('/') || value.startsWith('.') || value.startsWith('\\')) {
      return { ok: false, code: 'cover_relative_path' };
    }
    return { ok: false, code: 'cover_invalid_url' };
  }
}

function hasRequiredAssets(game: GameDefinitionEntity): boolean {
  const legacyReady = Boolean(game.assets.background && game.assets.character);
  const itemKeys = new Set(game.assets.items?.map((item) => item.key) ?? []);
  if (itemKeys.size === 0) return legacyReady;
  if (!itemKeys.has('background')) return false;
  if (game.templateKey === 'FRUIT_SLASH') {
    return itemKeys.has('fruit') && itemKeys.has('bonus');
  }
  if (game.templateKey === 'DODGE_RUN') {
    return itemKeys.has('runner') && (itemKeys.has('lowObstacle') || itemKeys.has('jumpObstacle'));
  }
  if (game.templateKey === 'FIT_CHALLENGE') {
    return itemKeys.has('coach') || itemKeys.has('squatIcon');
  }
  if (game.templateKey === 'SCENE_PLAY') {
    return itemKeys.size >= 2 || legacyReady;
  }
  return legacyReady;
}

export function validateGameAccess(game: GameDefinitionEntity, appVersion: string): string[] {
  const errors = validateGameDefinition(game);
  if (compareVersions(appVersion, game.minAppVersion) < 0) {
    errors.push('min_app_version_not_met');
  }
  if (game.status !== 'PUBLISHED') {
    errors.push('game_not_published');
  }
  return errors;
}

export function isScoreSubmissionSuspicious(score: number, durationMs: number): boolean {
  if (score < 0 || durationMs < 0) return true;
  const maxScorePerSecond = 80;
  return durationMs > 0 && score / (durationMs / 1000) > maxScorePerSecond;
}

export function createAuditEntry(
  actorId: string,
  action: string,
  entityType: string,
  entityId: string,
  beforeJson?: Record<string, unknown>,
  afterJson?: Record<string, unknown>
) {
  return {
    id: createId('audit'),
    actorId,
    action,
    entityType,
    entityId,
    beforeJson,
    afterJson,
    createdAt: new Date().toISOString()
  };
}
