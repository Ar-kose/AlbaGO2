import { AlbaGoGamePackage } from './game-package.types';
import { GameDefinitionEntity, GameAssetEntity, GameLevelEntity, InteractionRuleEntity, MotionRuleEntity, createId } from '../common/contracts';

export function mapGamePackageToEntity(pkg: AlbaGoGamePackage): GameDefinitionEntity {
  const gameKey = slugify(pkg.game.title);
  const levelId = `${gameKey}_level_1`;

  const motionRules: MotionRuleEntity[] = (pkg.rules ?? []).map((r) => ({
    motion: r.motion as MotionRuleEntity['motion'],
    event: r.event as MotionRuleEntity['event'],
    points: r.points,
    cooldownMs: r.cooldownMs
  }));

  const validMotions = (pkg.rules ?? [])
    .map(r => r.motion)
    .filter(m => ['SQUAT', 'JUMPING_JACK', 'JUMP_ROPE', 'PLANK_HOLD', 'LEFT_HAND_HIT', 'RIGHT_HAND_HIT'].includes(m));

  const hasRules = (pkg.rules ?? []).length > 0;

  const interactionRules: InteractionRuleEntity[] = hasRules
    ? (pkg.rules ?? []).map((r) => ({
        input: 'MOTION_EVENT' as const,
        event: r.event as InteractionRuleEntity['event'],
        motion: r.motion as InteractionRuleEntity['motion'],
        action: 'ADD_SCORE' as const,
        points: r.points,
        cooldownMs: r.cooldownMs,
        targetObjectType: r.targetObjectType
      }))
    : [
        { input: 'POSE_CONTACT' as const, targetObjectType: 'fruit', keypoints: ['left_wrist', 'right_wrist'], action: 'REMOVE_OBJECT' as const, points: 15, cooldownMs: 120 },
        { input: 'MOTION_EVENT' as const, event: 'REP_COUNTED', motion: 'JUMPING_JACK' as MotionRuleEntity['motion'], action: 'ADD_SCORE' as const, points: 15, cooldownMs: 400 },
        { input: 'MOTION_EVENT' as const, event: 'REP_COUNTED', motion: 'SQUAT' as MotionRuleEntity['motion'], action: 'ADD_SCORE' as const, points: 10, cooldownMs: 500 },
        { input: 'MOTION_EVENT' as const, event: 'BAD_FORM', action: 'RESET_COMBO' as const, points: -5, cooldownMs: 250 }
      ];

  const defaultMotions: MotionRuleEntity['motion'][] = ['JUMPING_JACK', 'SQUAT'];

  const assetItems: GameAssetEntity[] = [];
  if (pkg.assets.background) {
    assetItems.push({
      key: 'background', kind: 'IMAGE', format: 'PNG', uri: pkg.assets.background
    });
  }
  if (pkg.assets.items) {
    for (const item of pkg.assets.items) {
      assetItems.push({
        key: item.key,
        kind: item.kind as GameAssetEntity['kind'],
        format: item.format as GameAssetEntity['format'],
        uri: item.uri
      });
    }
  }
  // Ensure required item keys for validation
  if (!assetItems.some(a => a.key === 'background')) {
    assetItems.push({ key: 'background', kind: 'IMAGE', format: 'PNG', uri: pkg.assets.background ?? `local://${gameKey}/background` });
  }
  if (pkg.game.template === 'FRUIT_SLASH') {
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

  const entity: GameDefinitionEntity = {
    id: createId('game'),
    gameKey,
    version: 1,
    templateKey: pkg.game.template as GameDefinitionEntity['templateKey'],
    title: pkg.game.title,
    description: pkg.game.description ?? '',
    status: 'DRAFT',
    minAppVersion: '0.2.0',
    orientation: pkg.game.orientation as GameDefinitionEntity['orientation'],
    cameraRequirement: pkg.game.cameraRequirement as GameDefinitionEntity['cameraRequirement'],
    segmentRuleJson: {
      audience: 'all',
      internalOnly: false,
      category: pkg.game.category,
      tags: pkg.game.tags ?? []
    },
    supportedMotions: (validMotions.length > 0 ? validMotions : defaultMotions) as GameDefinitionEntity['supportedMotions'],
    levels: [{
      levelId,
      durationSec: pkg.game.durationSec,
      targetScore: pkg.scoring?.targetScore ?? (pkg.rules ?? []).reduce((s, r) => s + r.points * 5, 100),
      difficulty: 'EASY',
      motionRules: motionRules.length > 0 ? motionRules : [
        { motion: 'JUMPING_JACK', event: 'REP_COUNTED', points: 15, cooldownMs: 400 },
        { motion: 'SQUAT', event: 'REP_COUNTED', points: 10, cooldownMs: 500 }
      ],
      rewardRules: pkg.scoring?.rewardType ? [{
        rewardType: pkg.scoring.rewardType,
        amount: pkg.scoring.rewardAmount ?? 1,
        minimumScore: pkg.scoring.targetScore
      }] : [],
      configJson: {
        spawnRateMs: 900,
        comboMultiplier: true,
        penaltyObjects: true,
        penaltyPoints: 10
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
      programSteps: [{
        stepId: `${gameKey}_play`,
        type: 'PLAY_GAME',
        title: 'Oyunu oyna',
        description: 'Hareket eventleriyle hedefleri topla.',
        durationSec: pkg.game.durationSec,
        successMessage: 'Oyun tamamlandı!',
        nextOnComplete: true
      }]
    }],
    assets: {
      cover: pkg.assets.cover,
      background: pkg.assets.background ?? `local://${gameKey}/background`,
      character: pkg.assets.background ?? `local://${gameKey}/hero`,
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
