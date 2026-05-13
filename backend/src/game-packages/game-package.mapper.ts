import { GameDefinitionEntity, GameAssetEntity, GameLevelEntity, InteractionRuleEntity, MotionRuleEntity, createId } from '../common/contracts';

const VALID_MOTIONS = ['SQUAT', 'JUMPING_JACK', 'JUMP_ROPE', 'PLANK_HOLD', 'LEFT_HAND_HIT', 'RIGHT_HAND_HIT'];

interface AlbaGoPackage {
  schemaVersion: string;
  packageType: string;
  runtimeTarget?: { template?: string; minAppVersion?: string };
  game: {
    title: string;
    template?: string;
    category: string;
    orientation: string;
    cameraRequirement: string;
    durationSec: number;
    description?: string;
    tags?: string[];
    slug?: string;
    difficulty?: string;
  };
  assets: {
    cover?: string;
    background?: string;
    items?: Array<{ key: string; uri: string; kind?: string; format?: string }>;
    targets?: Array<{ key: string; url: string; label?: string; role?: string }>;
  };
  rules?: Array<{ motion: string; event?: string; action?: string; points?: number; cooldownMs?: number; targetKey?: string }>;
  scoring?: {
    targetScore?: number;
    baseCorrect?: number;
    comboBonus?: number;
    wrongPenalty?: number;
    badFormPenalty?: number;
    rewardType?: string;
    rewardAmount?: number;
  };
  startGate?: {
    requireCameraPermission?: boolean;
    requireBodyInFrame?: boolean;
    countdownSec?: number;
    stableBodyMs?: number;
    resetCountdownOnBodyLost?: boolean;
  };
}

export function mapGamePackageToEntity(pkg: AlbaGoPackage): GameDefinitionEntity {
  const gameKey = slugify(pkg.game.slug || pkg.game.title);
  const levelId = `${gameKey}_level_1`;
  const template = pkg.game.template || pkg.runtimeTarget?.template || 'FRUIT_SLASH';

  // Collect motion bindings from both formats
  const rulesObj = pkg.rules as any;
  const motionBindings: Array<{ motion: string; action?: string; event?: string; points?: number; cooldownMs?: number; targetKey?: string }> =
    (rulesObj?.motionBindings as any[]) || (Array.isArray(pkg.rules) ? pkg.rules : []);

  const validMotions = motionBindings
    .map(r => r.motion)
    .filter(m => VALID_MOTIONS.includes(m));

  // Map AI actions to standard ones
  const actionMap: Record<string, string> = {
    SLASH_TARGET: 'REMOVE_OBJECT',
    HIT_BONUS: 'ADD_SCORE',
    PENALTY: 'RESET_COMBO',
    ADD_SCORE: 'ADD_SCORE',
    REMOVE_OBJECT: 'REMOVE_OBJECT',
  };

  // Motion rules
  const motionRules: MotionRuleEntity[] = motionBindings
    .filter(r => r.motion !== 'BAD_FORM')
    .map(r => {
      const points = r.action === 'PENALTY' ? -(pkg.scoring?.badFormPenalty || 5) :
                     r.action === 'SLASH_TARGET' || r.action === 'HIT_BONUS' ?
                     (pkg.scoring?.baseCorrect || 10) : (r.points || 10);
      return {
        motion: r.motion as MotionRuleEntity['motion'],
        event: r.motion === 'BAD_FORM' ? 'BAD_FORM' as const : 'REP_COUNTED' as const,
        points,
        cooldownMs: r.cooldownMs || 400
      };
    });

  // Add bad form penalty if present
  if (motionBindings.some(r => r.motion === 'BAD_FORM')) {
    const penaltyMotion = validMotions[0] || 'SQUAT';
    motionRules.push({
      motion: penaltyMotion as MotionRuleEntity['motion'],
      event: 'BAD_FORM' as const,
      points: -(pkg.scoring?.badFormPenalty || 5),
      cooldownMs: 250
    });
  }

  // Interaction rules
  const interactionRules: InteractionRuleEntity[] = [
    ...motionBindings
      .filter(r => r.motion !== 'BAD_FORM')
      .map((r): InteractionRuleEntity => ({
        input: 'MOTION_EVENT' as const,
        event: 'REP_COUNTED' as const,
        motion: r.motion as InteractionRuleEntity['motion'],
        action: (actionMap[r.action || ''] || 'ADD_SCORE') as InteractionRuleEntity['action'],
        points: r.action === 'SLASH_TARGET' || r.action === 'HIT_BONUS' ?
                (pkg.scoring?.baseCorrect || 10) : (r.points || 10),
        cooldownMs: r.cooldownMs || 500,
        targetObjectType: r.targetKey
      })),
    ...(motionBindings.some(r => r.motion === 'BAD_FORM') ? [{
      input: 'MOTION_EVENT' as const,
      event: 'BAD_FORM' as InteractionRuleEntity['event'],
      action: 'RESET_COMBO' as const,
      points: -(pkg.scoring?.badFormPenalty || 5),
      cooldownMs: 250
    } as InteractionRuleEntity] : []),
    {
      input: 'MOTION_EVENT' as const,
      event: 'USER_OUT_OF_FRAME' as InteractionRuleEntity['event'],
      action: 'PAUSE_GAME' as const,
      cooldownMs: 0
    } as InteractionRuleEntity
  ];

  // Asset items — from both items (standard) and targets (AI format)
  const assetItems: GameAssetEntity[] = [];

  // Standard items
  if (pkg.assets.items) {
    for (const item of pkg.assets.items) {
      assetItems.push({
        key: item.key,
        kind: (item.kind as GameAssetEntity['kind']) || 'IMAGE',
        format: (item.format as GameAssetEntity['format']) || 'PNG',
        uri: item.uri
      });
    }
  }

  // AI targets → items
  if (pkg.assets.targets) {
    for (const t of pkg.assets.targets) {
      assetItems.push({
        key: t.key,
        kind: 'IMAGE' as const,
        format: 'PNG' as const,
        uri: t.url
      });
    }
  }

  // Ensure required item keys for validation
  if (!assetItems.some(a => a.key === 'background')) {
    assetItems.push({ key: 'background', kind: 'IMAGE', format: 'PNG', uri: pkg.assets.background || `local://${gameKey}/background` });
  }
  if (template === 'FRUIT_SLASH') {
    if (!assetItems.some(a => a.key === 'fruit')) {
      assetItems.push({ key: 'fruit', kind: 'IMAGE', format: 'PNG', uri: 'local://fruit-slash/fruit' });
    }
    if (!assetItems.some(a => a.key === 'bonus')) {
      assetItems.push({ key: 'bonus', kind: 'IMAGE', format: 'PNG', uri: 'local://fruit-slash/bonus' });
    }
    if (!assetItems.some(a => a.key === 'bomb')) {
      assetItems.push({ key: 'bomb', kind: 'IMAGE', format: 'PNG', uri: 'local://fruit-slash/bomb' });
    }
  }

  const targetScore = pkg.scoring?.targetScore
    || ((pkg.scoring?.baseCorrect || 10) * 20);

  // Start gate → program steps
  const countdownSec = pkg.startGate?.countdownSec ?? 3;
  const programSteps = countdownSec > 0 ? [{
    stepId: `${gameKey}_countdown`,
    type: 'REST' as const,
    title: 'Hazırlan',
    description: 'Vücudunu kadraja al ve hazırlan.',
    durationSec: countdownSec,
    successMessage: 'Başla!',
    nextOnComplete: true
  }, {
    stepId: `${gameKey}_play`,
    type: 'PLAY_GAME' as const,
    title: 'Oyunu oyna',
    description: 'Hareket eventleriyle hedefleri topla.',
    durationSec: pkg.game.durationSec,
    successMessage: 'Oyun tamamlandı!',
    nextOnComplete: true
  }] : [{
    stepId: `${gameKey}_play`,
    type: 'PLAY_GAME' as const,
    title: 'Oyunu oyna',
    description: 'Hareket eventleriyle hedefleri topla.',
    durationSec: pkg.game.durationSec,
    successMessage: 'Oyun tamamlandı!',
    nextOnComplete: true
  }];

  const entity: GameDefinitionEntity = {
    id: createId('game'),
    gameKey,
    version: 1,
    templateKey: template as GameDefinitionEntity['templateKey'],
    title: pkg.game.title,
    description: pkg.game.description || '',
    status: 'DRAFT',
    minAppVersion: pkg.runtimeTarget?.minAppVersion || '0.2.0',
    orientation: pkg.game.orientation as GameDefinitionEntity['orientation'],
    cameraRequirement: pkg.game.cameraRequirement as GameDefinitionEntity['cameraRequirement'],
    segmentRuleJson: {
      audience: 'all',
      internalOnly: false,
      category: pkg.game.category,
      tags: pkg.game.tags || []
    },
    supportedMotions: (validMotions.length > 0 ? validMotions : ['JUMPING_JACK', 'SQUAT']) as GameDefinitionEntity['supportedMotions'],
    levels: [{
      levelId,
      durationSec: pkg.game.durationSec,
      targetScore,
      difficulty: (pkg.game.difficulty || 'EASY') as GameLevelEntity['difficulty'],
      motionRules,
      rewardRules: (pkg.scoring?.rewardType || targetScore > 0) ? [{
        rewardType: pkg.scoring?.rewardType || 'STAR',
        amount: pkg.scoring?.rewardAmount || 3,
        minimumScore: Math.ceil(targetScore * 0.7)
      }] : [],
      configJson: {
        spawnRateMs: 900,
        comboMultiplier: true,
        penaltyObjects: true,
        penaltyPoints: pkg.scoring?.wrongPenalty || 5
      },
      sceneConfig: {
        laneCount: 3,
        maxObjects: 5,
        defaultHitRadius: 0.18,
        defaultObjectLifeMs: 2600,
        spawn: { objectTypes: ['fruit', 'bonus', 'bomb'] }
      },
      interactionRules,
      taskRulesJson: [],
      programSteps
    }],
    assets: {
      cover: pkg.assets.cover,
      background: pkg.assets.background || `local://${gameKey}/background`,
      character: pkg.assets.background || `local://${gameKey}/hero`,
      items: assetItems
    }
  };

  return entity;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 60) || 'imported_game';
}
