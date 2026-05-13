import { GameValidationIssue, GameValidationResult, okResult, failResult, ALLOWED_IMAGE_FORMATS, ALLOWED_AUDIO_FORMATS } from '../validation-result';

type JsonObject = Record<string, unknown>;

export function collectAssetKeys(game: { assets?: { items?: Array<{ key: string; kind: string; format: string; uri: string }> } }): Set<string> {
  const keys = new Set<string>();
  if (game.assets?.items) {
    for (const item of game.assets.items) {
      if (item.key) keys.add(item.key);
    }
  }
  return keys;
}

export function validateAssets(
  assets: { items?: Array<{ key: string; kind: string; format: string; uri: string; bytes?: number }> } | undefined,
  requiredKeys: string[],
  referencedKeys: string[]
): GameValidationResult {
  const errors: GameValidationIssue[] = [];
  const warnings: GameValidationIssue[] = [];
  const items = assets?.items ?? [];
  const assetKeys = new Map<string, JsonObject>();
  for (const item of items) {
    if (item.key) assetKeys.set(item.key, item as unknown as JsonObject);
  }

  // Required asset keys
  for (const key of requiredKeys) {
    if (!assetKeys.has(key)) {
      errors.push({
        code: 'REQUIRED_ASSET_MISSING', severity: 'ERROR', scope: 'ASSET',
        path: `$.assets.items`, message: `Required asset '${key}' is missing.`
      });
    }
  }

  // Referenced asset keys
  for (const key of referencedKeys) {
    if (key && !assetKeys.has(key)) {
      errors.push({
        code: 'REFERENCED_ASSET_MISSING', severity: 'ERROR', scope: 'ASSET',
        path: `$.assets.items`, message: `Referenced asset '${key}' not found in asset manifest.`
      });
    }
  }

  // Validate each asset item
  items.forEach((item, index) => {
    const path = `$.assets.items[${index}]`;

    if (!item.uri?.trim()) {
      errors.push({
        code: 'ASSET_URI_MISSING', severity: 'ERROR', scope: 'ASSET',
        path: `${path}.uri`, message: 'Asset URI is required.'
      });
    }

    if (item.kind === 'IMAGE' && item.format && !ALLOWED_IMAGE_FORMATS.has(item.format)) {
      errors.push({
        code: 'ASSET_IMAGE_FORMAT_INVALID', severity: 'ERROR', scope: 'ASSET',
        path: `${path}.format`, message: `Image format '${item.format}' not allowed. Use: ${[...ALLOWED_IMAGE_FORMATS].join(', ')}.`
      });
    }

    if (item.kind === 'AUDIO' && item.format && !ALLOWED_AUDIO_FORMATS.has(item.format)) {
      errors.push({
        code: 'AUDIO_FORMAT_INVALID', severity: 'ERROR', scope: 'AUDIO',
        path: `${path}.format`, message: `Audio format '${item.format}' not allowed. Use: ${[...ALLOWED_AUDIO_FORMATS].join(', ')}.`
      });
    }

    if (item.bytes !== undefined && (item.bytes <= 0 || item.bytes > 5 * 1024 * 1024)) {
      errors.push({
        code: 'ASSET_SIZE_INVALID', severity: 'ERROR', scope: 'ASSET',
        path: `${path}.bytes`, message: 'Asset size must be 1 byte to 5 MB.'
      });
    }
  });

  return errors.length === 0 ? okResult(warnings) : failResult(errors, warnings);
}

export function validateCoverAsset(assets: { cover?: string } | undefined): GameValidationResult {
  const errors: GameValidationIssue[] = [];
  const cover = assets?.cover;

  if (!cover || cover.trim().length === 0) {
    errors.push({
      code: 'COVER_MISSING',
      severity: 'ERROR',
      scope: 'ASSET',
      path: '$.assets.cover',
      message: 'Kapak görseli eksik. Asset Library\'den bir kapak görseli seçmeden oyunu yayınlayamazsın.'
    });
    return failResult(errors);
  }

  if (cover.startsWith('local://')) {
    errors.push({
      code: 'COVER_LOCAL_URI',
      severity: 'ERROR',
      scope: 'ASSET',
      path: '$.assets.cover',
      message: 'Kapak görseli local:// ile başlayamaz. Mobil uygulamanın erişebileceği public HTTPS URL seç.'
    });
    return failResult(errors);
  }

  if (cover.startsWith('file://')) {
    errors.push({
      code: 'COVER_FILE_URI',
      severity: 'ERROR',
      scope: 'ASSET',
      path: '$.assets.cover',
      message: 'Kapak görseli file:// ile başlayamaz. Public HTTPS URL kullan.'
    });
    return failResult(errors);
  }

  let hostname = '';
  try {
    const url = new URL(cover);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      errors.push({
        code: 'COVER_INVALID_URL',
        severity: 'ERROR',
        scope: 'ASSET',
        path: '$.assets.cover',
        message: 'Kapak görseli http/https URL olmalıdır.'
      });
      return failResult(errors);
    }
    hostname = url.hostname.toLowerCase();
  } catch {
    // Relative path or malformed
    if (cover.startsWith('/') || cover.startsWith('.') || cover.startsWith('\\')) {
      errors.push({
        code: 'COVER_RELATIVE_PATH',
        severity: 'ERROR',
        scope: 'ASSET',
        path: '$.assets.cover',
        message: 'Kapak görseli dosya yolu olamaz. Public HTTPS URL kullan.'
      });
    } else {
      errors.push({
        code: 'COVER_INVALID_URL',
        severity: 'ERROR',
        scope: 'ASSET',
        path: '$.assets.cover',
        message: 'Kapak görseli geçersiz URL formatında. Düzeltip tekrar dene.'
      });
    }
    return failResult(errors);
  }

  // SSRF protection: block private/localhost IPs
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '[::1]' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('172.16.')
  ) {
    errors.push({
      code: 'COVER_PRIVATE_IP',
      severity: 'ERROR',
      scope: 'SECURITY',
      path: '$.assets.cover',
      message: 'Kapak görseli private/localhost adresine işaret edemez.'
    });
    return failResult(errors);
  }

  return okResult();
}

export function validateAudioConfig(
  audio: JsonObject | undefined,
  assetKeys: Set<string>
): GameValidationResult {
  const errors: GameValidationIssue[] = [];
  const warnings: GameValidationIssue[] = [];
  const path = '$.config.audio';

  if (!audio || audio.enabled === false) {
    return okResult();
  }

  // background music
  const bg = audio.backgroundMusic as JsonObject | undefined;
  if (bg) {
    const bgKey = bg.assetKey as string | undefined;
    if (bgKey) {
      if (!assetKeys.has(bgKey)) {
        errors.push({
          code: 'AUDIO_ASSET_MISSING', severity: 'ERROR', scope: 'AUDIO',
          path: `${path}.backgroundMusic.assetKey`,
          message: `Background music asset '${bgKey}' not found in asset manifest.`
        });
      }
    }
    const volume = bg.volume as number | undefined;
    if (volume !== undefined && (volume < 0 || volume > 1)) {
      errors.push({
        code: 'AUDIO_VOLUME_INVALID', severity: 'ERROR', scope: 'AUDIO',
        path: `${path}.backgroundMusic.volume`, message: 'Volume must be 0..1.'
      });
    }
  }

  // sound effects
  const sfx = audio.soundEffects as JsonObject[] | undefined;
  if (sfx) {
    sfx.forEach((effect, index) => {
      const ep = `${path}.soundEffects[${index}]`;
      const event = effect.event as string | undefined;
      if (event && !['COUNTDOWN', 'GAME_START', 'HIT', 'MISS', 'PERFECT', 'GOOD', 'BAD', 'COMBO', 'LIFE_LOST', 'LEVEL_UP', 'SUCCESS', 'FAIL', 'GAME_END', 'INSTRUCTION'].includes(event)) {
        errors.push({ code: 'AUDIO_EVENT_INVALID', severity: 'ERROR', scope: 'AUDIO', path: `${ep}.event`, message: `Invalid audio event '${event}'.` });
      }
      const assetKey = effect.assetKey as string | undefined;
      if (assetKey && !assetKeys.has(assetKey)) {
        errors.push({ code: 'AUDIO_ASSET_MISSING', severity: 'ERROR', scope: 'AUDIO', path: `${ep}.assetKey`, message: `Audio asset '${assetKey}' not found.` });
      }
      const volume = effect.volume as number | undefined;
      if (volume !== undefined && (volume < 0 || volume > 1)) {
        errors.push({ code: 'AUDIO_VOLUME_INVALID', severity: 'ERROR', scope: 'AUDIO', path: `${ep}.volume`, message: 'Volume must be 0..1.' });
      }
    });
  }

  return errors.length === 0 ? okResult(warnings) : failResult(errors, warnings);
}
