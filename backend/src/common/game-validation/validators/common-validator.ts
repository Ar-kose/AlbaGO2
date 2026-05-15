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

function cameraLabel(cr: string): string {
  switch (cr) {
    case 'FULL_BODY': return 'Tum Vucut (FULL_BODY)';
    case 'UPPER_BODY': return 'Ust Vucut (UPPER_BODY)';
    case 'HAND_TARGET': return 'El Hedefi (HAND_TARGET)';
    default: return cr;
  }
}

export function validateCommon(game: GameDefinitionEntity): GameValidationResult {
  const errors: GameValidationIssue[] = [];
  const warnings: GameValidationIssue[] = [];
  const template = game.templateKey as GameTemplateKey;

  // template exists in registry
  const meta = TEMPLATE_REGISTRY[template];
  if (!meta) {
    errors.push({
      code: 'UNKNOWN_TEMPLATE', severity: 'ERROR', scope: 'CONTRACT',
      path: '$.template', message: `"${template}" adinda bir oyun template'i sistemde kayitli degil. Gecerli bir template secin.`
    });
    return failResult(errors, warnings);
  }

  // gameKey
  if (!game.gameKey?.trim()) {
    errors.push({
      code: 'MISSING_GAME_KEY', severity: 'ERROR', scope: 'CONTRACT',
      path: '$.gameKey', message: 'Oyun anahtari (gameKey) zorunludur.'
    });
  } else if (!/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(game.gameKey)) {
    errors.push({
      code: 'INVALID_GAME_KEY', severity: 'ERROR', scope: 'CONTRACT',
      path: '$.gameKey', message: 'gameKey sadece kucuk harf, rakam, tire ve alt cizgi icerebilir. Ornek: "meyve-kesme".'
    });
  }

  // title
  if (!game.title?.trim()) {
    errors.push({
      code: 'MISSING_TITLE', severity: 'ERROR', scope: 'CONTRACT',
      path: '$.title', message: 'Oyun basligi zorunludur.'
    });
  } else if (game.title.length < TITLE_MIN || game.title.length > TITLE_MAX) {
    errors.push({
      code: 'TITLE_LENGTH_INVALID', severity: 'ERROR', scope: 'CONTRACT',
      path: '$.title', message: `Oyun basligi ${TITLE_MIN}-${TITLE_MAX} karakter arasinda olmalidir.`
    });
  }

  // description length
  if (game.description && game.description.length > DESC_MAX) {
    errors.push({
      code: 'DESCRIPTION_TOO_LONG', severity: 'WARNING', scope: 'CONTRACT',
      path: '$.description', message: `Aciklama ${DESC_MAX} karakterden uzun olamaz.`
    });
  }

  // category
  const validCategories = ['SPORT', 'FUN', 'EDUCATION'] as const;
  const category = (game.segmentRuleJson as Record<string, unknown>)?.category as string;
  if (category && !(validCategories as readonly string[]).includes(category)) {
    errors.push({
      code: 'INVALID_CATEGORY', severity: 'ERROR', scope: 'CONTRACT',
      path: '$.category', message: `"${category}" gecerli bir kategori degil. Sunlardan birini kullanin: Spor (SPORT), Eglence (FUN), Egitim (EDUCATION).`
    });
  }

  // minAppVersion semver check
  if (game.minAppVersion && !/^\d+\.\d+\.\d+$/.test(game.minAppVersion)) {
    errors.push({
      code: 'INVALID_APP_VERSION', severity: 'ERROR', scope: 'CONTRACT',
      path: '$.minAppVersion', message: 'minAppVersion semver formatinda olmalidir. Ornek: "2.0.0".'
    });
  }

  // publish gate: supportLevel
  const supportLevel = meta.supportLevel;
  if (game.status === 'PUBLISHED' && supportLevel !== 'ANDROID_SUPPORTED') {
    const label = supportLevel === 'WEB_PREVIEW_ONLY' ? 'sadece web onizleme' : 'deneysel';
    errors.push({
      code: 'TEMPLATE_NOT_ANDROID_SUPPORTED', severity: 'ERROR', scope: 'PUBLISH',
      path: '$.supportLevel',
      message: `"${meta.label}" template'i ${label} seviyesinde oldugu icin mobil uygulamada yayinlanamaz. Yalnizca ANDROID_SUPPORTED template'ler yayinlanabilir.`
    });
  }

  // camera requirement compatibility
  if (meta.requiresCamera && game.cameraRequirement) {
    if (!meta.allowedCameraRequirements.includes(game.cameraRequirement)) {
      const allowedLabels = meta.allowedCameraRequirements.map(cameraLabel);
      const usedLabel = cameraLabel(game.cameraRequirement);
      errors.push({
        code: 'CAMERA_REQUIREMENT_INCOMPATIBLE', severity: 'ERROR', scope: 'TEMPLATE',
        path: '$.cameraRequirement',
        message: `"${meta.label}" template'i ${usedLabel} kamera modunu desteklemiyor. Bu template icin yalnizca ${allowedLabels.join(' veya ')} kullanabilirsiniz.`
      });
    }
  }

  // levels
  if (!game.levels || game.levels.length === 0) {
    errors.push({
      code: 'MISSING_LEVELS', severity: 'ERROR', scope: 'CONTRACT',
      path: '$.levels', message: 'En az bir seviye (level) tanimlanmalidir.'
    });
  } else {
    game.levels.forEach((level, index) => {
      const path = `$.levels[${index}]`;

      if (level.durationSec !== undefined) {
        if (level.durationSec < DURATION_MIN_SEC || level.durationSec > DURATION_MAX_SEC) {
          errors.push({
            code: 'DURATION_OUT_OF_RANGE', severity: 'ERROR', scope: 'CONTRACT',
            path: `${path}.durationSec`,
            message: `Sure ${DURATION_MIN_SEC}-${DURATION_MAX_SEC} saniye arasinda olmalidir.`
          });
        }
      }

      if (level.targetScore !== undefined) {
        if (level.targetScore < TARGET_SCORE_MIN || level.targetScore > TARGET_SCORE_MAX) {
          errors.push({
            code: 'TARGET_SCORE_OUT_OF_RANGE', severity: 'ERROR', scope: 'CONTRACT',
            path: `${path}.targetScore`,
            message: `Hedef skor ${TARGET_SCORE_MIN}-${TARGET_SCORE_MAX} arasinda olmalidir.`
          });
        }
      }
    });
  }

  return errors.length === 0 ? okResult(warnings) : failResult(errors, warnings);
}
