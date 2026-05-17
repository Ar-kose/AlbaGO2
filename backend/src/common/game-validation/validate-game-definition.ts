import { GameDefinitionEntity, GameTemplateKey } from '../contracts';
import { getTemplateMeta } from './game-template-registry';
import { GameValidationResult, mergeResults, okResult } from './validation-result';
import { validateCommon } from './validators/common-validator';
import { validateWhackAMole } from './validators/whack-a-mole-validator';
import { validatePoseContactTargets, validatePoseHold, validateRhythmMotion, validateQuiz, validateFlashcard, validateMemoryMatch } from './validators/template-validators';
import { validateGameSettings } from './validators/unified-game-validator';
import { collectAssetKeys, validateAssets, validateAudioConfig, validateCoverAsset } from './validators/asset-validator';

type JsonObject = Record<string, unknown>;

export function validateGameDefinition(game: GameDefinitionEntity): GameValidationResult {
  const results: GameValidationResult[] = [];

  // Common validation (all templates)
  results.push(validateCommon(game));

  // Cover asset validation (publish gate — mobile catalog display)
  results.push(validateCoverAsset(game.assets as { cover?: string } | undefined));

  const template = game.templateKey as GameTemplateKey;
  const meta = getTemplateMeta(template);
  if (!meta) {
    return mergeResults(results);
  }

  // Asset validation
  const assetKeys = collectAssetKeys(game as unknown as { assets?: { items?: Array<{ key: string; kind: string; format: string; uri: string }> } });
  results.push(validateAssets(
    game.assets as { items?: Array<{ key: string; kind: string; format: string; uri: string; bytes?: number }> } | undefined,
    meta.requiredImageAssetKeys,
    [] // referenced keys gathered from template-specific config
  ));

  // Template-specific config validation
  const config = extractConfig(game);
  results.push(validateTemplateConfig(template, config, assetKeys));

  return mergeResults(results);
}

function extractConfig(game: GameDefinitionEntity): JsonObject {
  // Merge level configs into a flat config for validation
  const config: JsonObject = {};
  if (game.levels && game.levels.length > 0) {
    const level = game.levels[0];
    if (level.configJson && typeof level.configJson === 'object') {
      Object.assign(config, level.configJson as JsonObject);
    }
    if (level.sceneConfig && typeof level.sceneConfig === 'object') {
      config.scene = level.sceneConfig;
    }
  }
  if (game.orientation) config.orientation = game.orientation;
  if (game.cameraRequirement) config.cameraRequirement = game.cameraRequirement;
  return config;
}

function validateTemplateConfig(
  template: GameTemplateKey,
  config: JsonObject,
  assetKeys: Set<string>
): GameValidationResult {
  // Unified game settings validation (yeni format — tum template'leri kapsar)
  if (config.gameSettings) {
    return validateGameSettings(config);
  }

  // Eski per-template validators (geriye uyumluluk)
  switch (template) {
    case 'WHACK_A_MOLE':
      return validateWhackAMole(config, assetKeys);

    case 'POSE_CONTACT_TARGETS':
      return validatePoseContactTargets(config, assetKeys);

    case 'POSE_HOLD':
      return validatePoseHold(config, assetKeys);

    case 'RHYTHM_MOTION':
      return validateRhythmMotion(config, assetKeys);

    case 'QUIZ':
      return validateQuiz(config, assetKeys);

    case 'FLASHCARD':
      return validateFlashcard(config, assetKeys);

    case 'MEMORY_MATCH':
      return validateMemoryMatch(config, assetKeys);

    // Existing templates pass through with existing validation
    case 'FRUIT_SLASH':
    case 'DODGE_RUN':
    case 'FIT_CHALLENGE':
    case 'SCENE_PLAY':
    case 'TARGET_HIT':
    case 'ENDLESS_RUNNER':
    default:
      return okResult();
  }
}

// Convenience: aggregate all referenced asset keys from template config
export function collectReferencedAssetKeys(config: JsonObject, template: GameTemplateKey): string[] {
  const keys: string[] = [];
  if (template === 'WHACK_A_MOLE' || template === 'POSE_CONTACT_TARGETS') {
    const targets = config.targets as JsonObject[] | undefined;
    if (targets) {
      targets.forEach(t => {
        const assetKey = t.assetKey as string | undefined;
        if (assetKey) keys.push(assetKey);
      });
    }
  }
  // Audio references
  const audio = config.audio as JsonObject | undefined;
  if (audio) {
    const bg = audio.backgroundMusic as JsonObject | undefined;
    if (bg?.assetKey) keys.push(bg.assetKey as string);
    const sfx = audio.soundEffects as JsonObject[] | undefined;
    if (sfx) {
      sfx.forEach(e => { if (e.assetKey) keys.push(e.assetKey as string); });
    }
  }
  return keys;
}
