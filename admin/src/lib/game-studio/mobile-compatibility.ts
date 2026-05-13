import type { GameRecipe } from './types';
import type { RuntimeCapabilities, CompatibilityResult, StudioValidationIssue } from './types';
import type { GameTemplate, MotionType } from '../alba-api';

const DEFAULT_CAPABILITIES: RuntimeCapabilities = {
  supportedTemplates: [
    'SCENE_PLAY', 'FRUIT_SLASH', 'DODGE_RUN', 'FIT_CHALLENGE',
    'WHACK_A_MOLE', 'POSE_CONTACT_TARGETS'
  ],
  supportedMotions: [
    'SQUAT', 'JUMPING_JACK', 'JUMP_ROPE',
    'PLANK_HOLD', 'LEFT_HAND_HIT', 'RIGHT_HAND_HIT',
    'BALANCE', 'POSE_STABLE'
  ],
  minAppVersion: '0.2.0',
  maxDurationSec: 600,
  maxTargets: 20
};

function recipeTemplate(recipe: GameRecipe): GameTemplate {
  switch (recipe.kind) {
    case 'COMMAND_REACTION': return 'SCENE_PLAY';
    case 'HOLD_CHALLENGE': return 'FIT_CHALLENGE';
    case 'TARGET_HIT': return 'POSE_CONTACT_TARGETS';
    case 'REP_PROGRAM': return 'FIT_CHALLENGE';
    case 'RUNNER_DODGE': return 'DODGE_RUN';
    case 'FRUIT_SLASH': return 'FRUIT_SLASH';
  }
}

function recipeMotions(recipe: GameRecipe): MotionType[] {
  switch (recipe.kind) {
    case 'COMMAND_REACTION':
      return Array.from(new Set(recipe.commands.map((c) => c.requiredMotion)));
    case 'HOLD_CHALLENGE':
      return [recipe.holdMotion as unknown as MotionType];
    case 'TARGET_HIT':
      return ['LEFT_HAND_HIT', 'RIGHT_HAND_HIT'];
    case 'REP_PROGRAM':
      return Array.from(new Set(recipe.steps.filter((s) => s.motion).map((s) => s.motion!)));
    case 'RUNNER_DODGE':
      return Array.from(new Set(recipe.obstacles.map((o) => o.requiredMotion)));
    case 'FRUIT_SLASH':
      return Array.from(new Set(recipe.objects.map((o) => o.requiredMotion)));
  }
}

export function checkMobileCompatibility(
  recipe: GameRecipe,
  runtimeCapabilities: RuntimeCapabilities = DEFAULT_CAPABILITIES
): CompatibilityResult {
  const issues: StudioValidationIssue[] = [];
  const template = recipeTemplate(recipe);
  const motions = recipeMotions(recipe);

  if (!runtimeCapabilities.supportedTemplates.includes(template)) {
    issues.push({
      severity: 'ERROR',
      code: 'TEMPLATE_NOT_SUPPORTED',
      title: 'Mobil runtime bu oyun tipini desteklemiyor',
      message: `"${template}" şablonu mevcut mobil uygulama sürümünde desteklenmiyor. App güncellemesi gerekebilir.`,
      fixAction: { label: 'Farklı şablon seç', targetStep: 'TEMPLATE' }
    });
  }

  for (const motion of motions) {
    if (!runtimeCapabilities.supportedMotions.includes(motion)) {
      issues.push({
        severity: 'ERROR',
        code: 'MOTION_NOT_SUPPORTED',
        title: `"${motion}" hareketi desteklenmiyor`,
        message: `"${motion}" hareketi mevcut mobil uygulama sürümünde desteklenmiyor.`,
        fixAction: { label: 'Hareketi değiştir', targetStep: 'RULES' }
      });
    }
  }

  const duration = recipe.kind === 'HOLD_CHALLENGE' ? recipe.totalDurationSec :
    recipe.kind === 'REP_PROGRAM' ? recipe.steps.reduce((s, step) => s + (step.durationSec ?? step.targetCount ?? 0), 0) :
    'durationSec' in recipe ? (recipe as any).durationSec : 60;

  if (duration > runtimeCapabilities.maxDurationSec) {
    issues.push({
      severity: 'WARNING',
      code: 'DURATION_EXCEEDS_LIMIT',
      title: 'Süre limit aşımı',
      message: `Oyun süresi ${duration}s, mobil runtime maksimum ${runtimeCapabilities.maxDurationSec}s destekliyor.`,
      fixAction: { label: 'Süreyi azalt', targetStep: 'BASIC' }
    });
  }

  if (recipe.kind === 'TARGET_HIT' && recipe.targets.length > runtimeCapabilities.maxTargets) {
    issues.push({
      severity: 'WARNING',
      code: 'TOO_MANY_TARGETS',
      title: 'Çok fazla hedef',
      message: `${recipe.targets.length} hedef tanımlanmış. Mobilde performans sorunu yaşanabilir.`,
      fixAction: { label: 'Hedefleri azalt', targetStep: 'RULES' }
    });
  }

  return {
    compatible: issues.filter((i) => i.severity === 'ERROR').length === 0,
    issues
  };
}
