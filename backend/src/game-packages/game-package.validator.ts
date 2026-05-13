import {
  AlbaGoGamePackage,
  PackageValidationResult,
  PackageValidationIssue,
  RuntimeCompatibility
} from './game-package.types';

const SUPPORTED_TEMPLATES = ['FRUIT_SLASH'];
const SUPPORTED_CATEGORIES = ['FUN', 'SPORT', 'EDUCATION'];
const SUPPORTED_ORIENTATIONS = ['PORTRAIT', 'LANDSCAPE', 'AUTO'];
const SUPPORTED_CAMERA_REQUIREMENTS = ['FULL_BODY', 'UPPER_BODY', 'HAND_TARGET'];
const SUPPORTED_MOTIONS = [
  'SQUAT', 'JUMPING_JACK', 'JUMP_ROPE', 'PLANK_HOLD',
  'LEFT_HAND_HIT', 'RIGHT_HAND_HIT'
];
const SUPPORTED_EVENTS = ['REP_COUNTED', 'BAD_FORM', 'USER_OUT_OF_FRAME', 'PAUSED', 'RESUMED'];
const SUPPORTED_ACTIONS = [
  'ADD_SCORE', 'REMOVE_OBJECT', 'SPAWN_OBJECT', 'RESET_COMBO',
  'DECREASE_LIFE', 'PAUSE_GAME', 'RESUME_GAME', 'COMPLETE_LEVEL',
  'SHOW_EFFECT', 'SHOW_MESSAGE', 'PROGRESS_TASK'
];

const FORBIDDEN_FIELDS = [
  'token', 'secret', 'apiKey', 'password', 'privateKey',
  'DATABASE_URL', 'SUPABASE_SERVICE_ROLE', 'PHP_ASSET_TOKEN', 'ASSET_TOKEN',
  'script', 'code', 'javascript', 'lua', 'eval', 'functionBody', 'customExpression'
];

const PRIVATE_IP_PATTERNS = [
  /^127\.0\.0\.\d+$/,
  /^0\.0\.0\.0$/,
  /^localhost$/i,
  /^\[::1\]$/,
  /^192\.168\.\d+\.\d+$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
];

export function validateGamePackage(pkg: unknown): PackageValidationResult {
  const errors: PackageValidationIssue[] = [];
  const warnings: PackageValidationIssue[] = [];

  if (!pkg || typeof pkg !== 'object') {
    return { valid: false, errors: [{ code: 'invalid_json', field: '$', message: 'JSON okunamadı. Geçerli bir JSON nesnesi gerekli.' }], warnings: [] };
  }

  const p = pkg as Record<string, unknown>;

  // schemaVersion
  if (p.schemaVersion !== '1.0') {
    errors.push({ code: 'invalid_schema_version', field: '$.schemaVersion', message: 'schemaVersion "1.0" olmalıdır.' });
  }

  // packageType
  if (p.packageType !== 'ALBAGO_GAME_PACKAGE') {
    errors.push({ code: 'invalid_package_type', field: '$.packageType', message: 'packageType "ALBAGO_GAME_PACKAGE" olmalıdır.' });
  }

  if (errors.length > 0) return { valid: false, errors, warnings };

  const game = p.game as Record<string, unknown> | undefined;
  if (!game || typeof game !== 'object') {
    errors.push({ code: 'missing_game', field: '$.game', message: 'game alanı zorunludur.' });
    return { valid: false, errors, warnings };
  }

  // title
  if (!game.title || typeof game.title !== 'string' || !game.title.trim()) {
    errors.push({ code: 'missing_game_title', field: '$.game.title', message: 'Oyun başlığı zorunludur.' });
  }

  // template
  const template = String(game.template ?? '');
  if (!SUPPORTED_TEMPLATES.includes(template)) {
    errors.push({
      code: 'unsupported_template', field: '$.game.template',
      message: `"${template}" mobil runtime tarafından desteklenmiyor. Destekli template: ${SUPPORTED_TEMPLATES.join(', ')}.`
    });
  }

  // category
  const category = String(game.category ?? '').toUpperCase();
  if (!SUPPORTED_CATEGORIES.includes(category)) {
    errors.push({
      code: 'invalid_category', field: '$.game.category',
      message: `Kategori "${category}" geçersiz. Destekli: ${SUPPORTED_CATEGORIES.join(', ')}.`
    });
  }

  // orientation
  const orientation = String(game.orientation ?? '');
  if (!SUPPORTED_ORIENTATIONS.includes(orientation)) {
    errors.push({
      code: 'invalid_orientation', field: '$.game.orientation',
      message: `Orientation "${orientation}" geçersiz. Destekli: ${SUPPORTED_ORIENTATIONS.join(', ')}.`
    });
  }

  // cameraRequirement
  const cameraRequirement = String(game.cameraRequirement ?? '');
  if (!SUPPORTED_CAMERA_REQUIREMENTS.includes(cameraRequirement)) {
    errors.push({
      code: 'invalid_camera_requirement', field: '$.game.cameraRequirement',
      message: `Kamera gereksinimi "${cameraRequirement}" geçersiz. Destekli: ${SUPPORTED_CAMERA_REQUIREMENTS.join(', ')}.`
    });
  }

  // duration
  const durationSec = Number(game.durationSec ?? 0);
  if (!durationSec || durationSec < 5 || durationSec > 600) {
    errors.push({
      code: 'invalid_duration', field: '$.game.durationSec',
      message: 'Süre 5-600 saniye arasında olmalıdır.'
    });
  }

  // assets
  const assets = p.assets as Record<string, unknown> | undefined;
  if (!assets || typeof assets !== 'object') {
    errors.push({ code: 'missing_assets', field: '$.assets', message: 'assets alanı zorunludur.' });
  } else {
    // cover validation
    const cover = assets.cover as string | undefined;
    if (!cover || typeof cover !== 'string' || !cover.trim()) {
      errors.push({
        code: 'missing_cover', field: '$.assets.cover',
        message: 'Kapak görseli eksik. Asset Library\'den public URL\'ye sahip bir kapak seçmelisin.'
      });
    } else {
      const coverErrors = validateAssetUrl(cover, '$.assets.cover');
      errors.push(...coverErrors);
    }

    // background
    const bg = assets.background as string | undefined;
    if (bg && typeof bg === 'string') {
      errors.push(...validateAssetUrl(bg, '$.assets.background'));
    }

    // items
    const items = assets.items as Array<Record<string, unknown>> | undefined;
    if (items && Array.isArray(items)) {
      items.forEach((item, i) => {
        if (item.uri) {
          errors.push(...validateAssetUrl(String(item.uri), `$.assets.items[${i}].uri`));
        }
      });
    }
  }

  // rules
  const rules = p.rules as Array<Record<string, unknown>> | undefined;
  if (rules && Array.isArray(rules)) {
    rules.forEach((rule, i) => {
      const motion = String(rule.motion ?? '');
      if (motion && !SUPPORTED_MOTIONS.includes(motion)) {
        errors.push({
          code: 'unsupported_motion', field: `$.rules[${i}].motion`,
          message: `Hareket "${motion}" desteklenmiyor. Destekli: ${SUPPORTED_MOTIONS.join(', ')}.`
        });
      }
      const event = String(rule.event ?? '');
      if (event && !SUPPORTED_EVENTS.includes(event)) {
        errors.push({
          code: 'unsupported_event', field: `$.rules[${i}].event`,
          message: `Event "${event}" desteklenmiyor.`
        });
      }
    });
  }

  // security scan: forbidden fields
  checkForbiddenFields(p, '$', errors);

  // runtime compatibility
  const runtimeCompatibility: RuntimeCompatibility = {
    templateSupported: SUPPORTED_TEMPLATES.includes(template),
    motionsSupported: !errors.some(e => e.code === 'unsupported_motion'),
    rulesSupported: !errors.some(e => e.code === 'unsupported_event'),
    unsupportedItems: errors.filter(e =>
      ['unsupported_template', 'unsupported_motion', 'unsupported_event'].includes(e.code)
    ).map(e => e.code)
  };

  const summary = {
    title: String(game.title ?? ''),
    template,
    category,
    orientation,
    durationSec
  };

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    summary,
    runtimeCompatibility
  };
}

function validateAssetUrl(url: string, field: string): PackageValidationIssue[] {
  const errors: PackageValidationIssue[] = [];

  if (url.startsWith('local://')) {
    errors.push({
      code: 'local_uri_not_allowed', field,
      message: 'local:// URI kabul edilmez. Public HTTPS URL kullan.'
    });
    return errors;
  }

  if (url.startsWith('file://')) {
    errors.push({
      code: 'local_uri_not_allowed', field,
      message: 'file:// URI kabul edilmez. Public HTTPS URL kullan.'
    });
    return errors;
  }

  if (url.startsWith('/') || url.startsWith('.') || url.startsWith('\\')) {
    errors.push({
      code: 'invalid_asset_url', field,
      message: 'Dosya yolu kabul edilmez. Tam http/https URL kullan.'
    });
    return errors;
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      errors.push({ code: 'invalid_asset_url', field, message: 'Sadece http/https URL kabul edilir.' });
      return errors;
    }

    const hostname = parsed.hostname.toLowerCase();
    if (PRIVATE_IP_PATTERNS.some(p => p.test(hostname))) {
      errors.push({
        code: 'invalid_asset_url', field,
        message: 'Private/localhost adresleri kabul edilmez.'
      });
    }
  } catch {
    errors.push({
      code: 'invalid_asset_url', field,
      message: 'Geçersiz URL formatı. Tam http/https URL gerekli.'
    });
  }

  return errors;
}

function checkForbiddenFields(obj: Record<string, unknown>, path: string, errors: PackageValidationIssue[]): void {
  for (const key of Object.keys(obj)) {
    const currentPath = `${path}.${key}`;
    if (FORBIDDEN_FIELDS.includes(key)) {
      errors.push({
        code: 'forbidden_field', field: currentPath,
        message: `"${key}" alanı güvenlik nedeniyle kabul edilmez.`
      });
    }
    const value = obj[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      checkForbiddenFields(value as Record<string, unknown>, currentPath, errors);
    }
  }
}
