import type { GameRecipe } from './types';
import type { StudioValidationIssue } from './types';

export function validateRecipeLocally(recipe: GameRecipe): StudioValidationIssue[] {
  const issues: StudioValidationIssue[] = [];

  // Title
  if (!recipe.title || recipe.title.trim().length === 0) {
    issues.push({
      severity: 'ERROR',
      code: 'MISSING_TITLE',
      title: 'Oyun başlığı eksik',
      message: 'Bu oyun yayınlanamaz. Oyun başlığı boş olamaz.',
      fieldPath: 'title',
      fixAction: { label: 'Başlık ekle', targetStep: 'BASIC' }
    });
  } else if (recipe.title.length < 2) {
    issues.push({
      severity: 'WARNING',
      code: 'SHORT_TITLE',
      title: 'Başlık çok kısa',
      message: 'Oyun başlığı en az 2 karakter olmalı.',
      fieldPath: 'title',
      fixAction: { label: 'Başlığı düzenle', targetStep: 'BASIC' }
    });
  }

  // Description
  if (!recipe.description || recipe.description.trim().length === 0) {
    issues.push({
      severity: 'WARNING',
      code: 'MISSING_DESCRIPTION',
      title: 'Açıklama eksik',
      message: 'Oyunun kısa bir açıklaması olması önerilir.',
      fieldPath: 'description',
      fixAction: { label: 'Açıklama ekle', targetStep: 'BASIC' }
    });
  }

  // Duration
  const duration = getDuration(recipe);
  if (duration < 5) {
    issues.push({
      severity: 'ERROR',
      code: 'DURATION_TOO_SHORT',
      title: 'Süre çok kısa',
      message: 'Oyun süresi en az 5 saniye olmalıdır.',
      fieldPath: 'duration',
      fixAction: { label: 'Süreyi artır', targetStep: 'BASIC' }
    });
  } else if (duration > 600) {
    issues.push({
      severity: 'WARNING',
      code: 'DURATION_TOO_LONG',
      title: 'Süre çok uzun',
      message: 'Oyun süresi 10 dakikadan uzun. Kullanıcılar için çok yorucu olabilir.',
      fieldPath: 'duration',
      fixAction: { label: 'Süreyi azalt', targetStep: 'BASIC' }
    });
  }

  // Recipe-specific validation
  switch (recipe.kind) {
    case 'COMMAND_REACTION':
      issues.push(...validateCommandReaction(recipe));
      break;
    case 'HOLD_CHALLENGE':
      issues.push(...validateHoldChallenge(recipe));
      break;
    case 'TARGET_HIT':
      issues.push(...validateTargetHit(recipe));
      break;
    case 'REP_PROGRAM':
      issues.push(...validateRepProgram(recipe));
      break;
    case 'RUNNER_DODGE':
      issues.push(...validateRunnerDodge(recipe));
      break;
    case 'FRUIT_SLASH':
      issues.push(...validateFruitSlash(recipe));
      break;
  }

  return issues;
}

function getDuration(recipe: GameRecipe): number {
  switch (recipe.kind) {
    case 'COMMAND_REACTION': return recipe.durationSec;
    case 'HOLD_CHALLENGE': return recipe.totalDurationSec;
    case 'TARGET_HIT': return recipe.durationSec;
    case 'REP_PROGRAM':
      return recipe.steps.reduce((sum, s) => {
        if (s.type === 'MOTION_REPS' && s.targetCount) return sum + s.targetCount * 2;
        if (s.type === 'HOLD_POSE' && s.holdSec) return sum + s.holdSec;
        return sum + (s.durationSec ?? 20);
      }, 0);
    case 'RUNNER_DODGE': return recipe.durationSec;
    case 'FRUIT_SLASH': return recipe.durationSec;
  }
}

function validateCommandReaction(recipe: GameRecipe): StudioValidationIssue[] {
  const issues: StudioValidationIssue[] = [];
  if (recipe.kind !== 'COMMAND_REACTION') return issues;

  if (recipe.commands.length === 0) {
    issues.push({
      severity: 'ERROR',
      code: 'NO_COMMANDS',
      title: 'Komut listesi boş',
      message: 'Bu oyun yayınlanamaz. En az bir komut tanımlanmalı.',
      fieldPath: 'commands',
      fixAction: { label: 'Komut ekle', targetStep: 'RULES' }
    });
  }

  recipe.commands.forEach((cmd, i) => {
    if (!cmd.label || cmd.label.trim().length === 0) {
      issues.push({
        severity: 'ERROR',
        code: 'MISSING_COMMAND_LABEL',
        title: `Komut ${i + 1} etiketi eksik`,
        message: `"${cmd.requiredMotion}" hareketi için komut etiketi girilmedi.`,
        fieldPath: `commands.${i}.label`,
        fixAction: { label: 'Etiket ekle', targetStep: 'RULES' }
      });
    }
    if (!cmd.assetKey) {
      issues.push({
        severity: 'ERROR',
        code: 'MISSING_ASSET',
        title: `"${cmd.label || `Komut ${i + 1}`}" görseli seçilmemiş`,
        message: `"${cmd.label || `Komut ${i + 1}`}" komutunun görseli eksik. Görseller adımından bir asset yükle veya hazır kart seç.`,
        fieldPath: `commands.${i}.assetKey`,
        fixAction: { label: 'Asset ekle', targetStep: 'ASSETS' }
      });
    }
  });

  return issues;
}

function validateHoldChallenge(recipe: GameRecipe): StudioValidationIssue[] {
  const issues: StudioValidationIssue[] = [];
  if (recipe.kind !== 'HOLD_CHALLENGE') return issues;

  if (recipe.targetHoldSec < 3) {
    issues.push({
      severity: 'ERROR',
      code: 'HOLD_TOO_SHORT',
      title: 'Tutma süresi çok kısa',
      message: 'Hedef tutma süresi en az 3 saniye olmalıdır.',
      fieldPath: 'targetHoldSec',
      fixAction: { label: 'Süreyi artır', targetStep: 'RULES' }
    });
  }

  return issues;
}

function validateTargetHit(recipe: GameRecipe): StudioValidationIssue[] {
  const issues: StudioValidationIssue[] = [];
  if (recipe.kind !== 'TARGET_HIT') return issues;

  if (recipe.targets.length === 0) {
    issues.push({
      severity: 'ERROR',
      code: 'NO_TARGETS',
      title: 'Hedef listesi boş',
      message: 'Bu oyun yayınlanamaz. En az bir hedef tanımlanmalı.',
      fieldPath: 'targets',
      fixAction: { label: 'Hedef ekle', targetStep: 'RULES' }
    });
  }

  recipe.targets.forEach((t, i) => {
    if (t.x < 0 || t.x > 1 || t.y < 0 || t.y > 1) {
      issues.push({
        severity: 'ERROR',
        code: 'TARGET_OUT_OF_BOUNDS',
        title: `"${t.label || `Hedef ${i + 1}`}" koordinatı geçersiz`,
        message: 'Hedef koordinatları 0 ile 1 arasında olmalıdır.',
        fieldPath: `targets.${i}`,
        fixAction: { label: 'Koordinatı düzelt', targetStep: 'RULES' }
      });
    }
    if (t.radius < 0.02 || t.radius > 0.35) {
      issues.push({
        severity: 'WARNING',
        code: 'TARGET_RADIUS_EXTREME',
        title: `"${t.label || `Hedef ${i + 1}`}" boyutu uç değerde`,
        message: 'Hedef yarıçapı 0.02-0.35 arasında önerilir.',
        fieldPath: `targets.${i}.radius`,
        fixAction: { label: 'Boyutu ayarla', targetStep: 'RULES' }
      });
    }
  });

  return issues;
}

function validateRepProgram(recipe: GameRecipe): StudioValidationIssue[] {
  const issues: StudioValidationIssue[] = [];
  if (recipe.kind !== 'REP_PROGRAM') return issues;

  if (recipe.steps.length === 0) {
    issues.push({
      severity: 'ERROR',
      code: 'NO_STEPS',
      title: 'Program adımı yok',
      message: 'Bu oyun yayınlanamaz. En az bir program adımı tanımlanmalı.',
      fieldPath: 'steps',
      fixAction: { label: 'Adım ekle', targetStep: 'RULES' }
    });
  }

  return issues;
}

function validateRunnerDodge(recipe: GameRecipe): StudioValidationIssue[] {
  const issues: StudioValidationIssue[] = [];
  if (recipe.kind !== 'RUNNER_DODGE') return issues;

  if (recipe.obstacles.length === 0) {
    issues.push({
      severity: 'ERROR',
      code: 'NO_OBSTACLES',
      title: 'Engel listesi boş',
      message: 'Bu oyun yayınlanamaz. En az bir engel tanımlanmalı.',
      fieldPath: 'obstacles',
      fixAction: { label: 'Engel ekle', targetStep: 'RULES' }
    });
  }

  return issues;
}

function validateFruitSlash(recipe: GameRecipe): StudioValidationIssue[] {
  const issues: StudioValidationIssue[] = [];
  if (recipe.kind !== 'FRUIT_SLASH') return issues;

  if (recipe.objects.length === 0) {
    issues.push({
      severity: 'ERROR',
      code: 'NO_OBJECTS',
      title: 'Nesne listesi boş',
      message: 'Bu oyun yayınlanamaz. En az bir nesne (meyve/bonus) tanımlanmalı.',
      fieldPath: 'objects',
      fixAction: { label: 'Nesne ekle', targetStep: 'RULES' }
    });
  }

  return issues;
}

export function mapBackendValidationToStudioIssues(
  backendResult: { errors?: Array<string | { severity?: string; scope?: string; code?: string; path?: string; message?: string }>; warnings?: Array<string | { severity?: string; scope?: string; code?: string; path?: string; message?: string }> } | null
): StudioValidationIssue[] {
  if (!backendResult) return [];

  const issues: StudioValidationIssue[] = [];

  (backendResult.errors ?? []).forEach((e) => {
    if (typeof e === 'string') {
      const mapped = mapErrorCodeToIssue(e);
      if (mapped) issues.push(mapped);
    } else {
      issues.push({
        severity: 'ERROR',
        code: e.code ?? 'BACKEND_ERROR',
        title: e.scope ?? 'Backend Hatası',
        message: e.message ?? 'Bilinmeyen backend hatası.',
        fieldPath: e.path
      });
    }
  });

  (backendResult.warnings ?? []).forEach((w) => {
    if (typeof w === 'string') {
      const mapped = mapErrorCodeToIssue(w);
      if (mapped) issues.push(mapped);
    } else {
      issues.push({
        severity: 'WARNING',
        code: w.code ?? 'BACKEND_WARNING',
        title: w.scope ?? 'Backend Uyarısı',
        message: w.message ?? 'Bilinmeyen backend uyarısı.',
        fieldPath: w.path
      });
    }
  });

  return issues;
}

function mapErrorCodeToIssue(code: string): StudioValidationIssue | null {
  switch (code) {
    case 'cover_missing':
      return {
        severity: 'ERROR',
        code: 'COVER_MISSING',
        title: 'Kapak görseli eksik',
        message: 'Asset Library\'den bir kapak görseli seçmeden oyunu yayınlayamazsın.',
        fieldPath: 'assets.cover',
        fixAction: { label: 'Kapak seç', targetStep: 'ASSETS' }
      };
    case 'cover_local_uri':
      return {
        severity: 'ERROR',
        code: 'COVER_LOCAL_URI',
        title: 'Kapak local:// olamaz',
        message: 'Kapak görseli local:// ile başlayamaz. Mobil uygulamanın erişebileceği public HTTPS URL seç.',
        fieldPath: 'assets.cover',
        fixAction: { label: 'Asset Seç', targetStep: 'ASSETS' }
      };
    case 'cover_file_uri':
      return {
        severity: 'ERROR',
        code: 'COVER_FILE_URI',
        title: 'Kapak file:// olamaz',
        message: 'Kapak görseli file:// ile başlayamaz. Public HTTPS URL kullan.',
        fieldPath: 'assets.cover',
        fixAction: { label: 'Asset Seç', targetStep: 'ASSETS' }
      };
    case 'cover_invalid_url':
      return {
        severity: 'ERROR',
        code: 'COVER_INVALID_URL',
        title: 'Geçersiz kapak URL',
        message: 'Kapak görseli geçerli bir http/https URL olmalıdır.',
        fieldPath: 'assets.cover',
        fixAction: { label: 'Asset Seç', targetStep: 'ASSETS' }
      };
    case 'cover_private_ip':
      return {
        severity: 'ERROR',
        code: 'COVER_PRIVATE_IP',
        title: 'Kapak erişilemez adres',
        message: 'Kapak görseli private/localhost adresine işaret edemez.',
        fieldPath: 'assets.cover',
        fixAction: { label: 'Asset Seç', targetStep: 'ASSETS' }
      };
    case 'cover_relative_path':
      return {
        severity: 'ERROR',
        code: 'COVER_RELATIVE_PATH',
        title: 'Kapak dosya yolu olamaz',
        message: 'Kapak görseli dosya yolu olamaz. Public HTTPS URL kullan.',
        fieldPath: 'assets.cover',
        fixAction: { label: 'Asset Seç', targetStep: 'ASSETS' }
      };
    case 'missing_required_assets':
      return {
        severity: 'ERROR',
        code: 'MISSING_REQUIRED_ASSETS',
        title: 'Zorunlu assetler eksik',
        message: 'Oyun için gerekli assetler (background, character, items) eksik.',
        fieldPath: 'assets'
      };
    default:
      return {
        severity: 'ERROR',
        code,
        title: code,
        message: 'Backend doğrulama hatası.'
      };
  }
}
