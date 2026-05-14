import {
  compareVersions,
  isScoreSubmissionSuspicious,
  validateGameAccess,
  validateGameDefinition
} from '../src/common/publish-validation';
import { GameDefinitionEntity, seededGames } from '../src/common/contracts';

describe('publish validation helpers', () => {
  it('compares semantic versions in ascending order', () => {
    expect(compareVersions('1.2.0', '1.1.9')).toBe(1);
    expect(compareVersions('0.1.0', '0.1.0')).toBe(0);
    expect(compareVersions('0.0.9', '0.1.0')).toBe(-1);
  });

  it('accepts published seeded demo games as valid publishable content', () => {
    const publishedGames = seededGames.filter((game) => game.status === 'PUBLISHED');
    expect(publishedGames.map((game) => game.templateKey)).toEqual([
      'FRUIT_SLASH',
      'DODGE_RUN',
      'FIT_CHALLENGE',
      'SCENE_PLAY'
    ]);
    for (const game of publishedGames) {
      expect(validateGameDefinition(game)).toEqual([]);
    }
  });

  it('flags suspicious score velocity', () => {
    expect(isScoreSubmissionSuspicious(1000, 5000)).toBe(true);
    expect(isScoreSubmissionSuspicious(120, 5000)).toBe(false);
  });

  // ── P3 Scene Play publish acceptance tests ──

  it('accepts a minimal valid SCENE_PLAY definition', () => {
    const definition: GameDefinitionEntity = minimalValidScenePlay();
    const errors = validateGameDefinition(definition);
    expect(errors).toEqual([]);
  });

  it('rejects SCENE_PLAY missing scene objects', () => {
    const definition: GameDefinitionEntity = minimalValidScenePlay();
    definition.levels[0].sceneConfig = { maxObjects: 1 };
    const errors = validateGameDefinition(definition);
    expect(errors).toContain('missing_scene_objects:level_1');
  });

  it('rejects SCENE_PLAY missing scene config entirely', () => {
    const definition: GameDefinitionEntity = minimalValidScenePlay();
    definition.levels[0].sceneConfig = {};
    const errors = validateGameDefinition(definition);
    expect(errors).toContain('missing_scene_objects:level_1');
  });

  it('rejects SCENE_PLAY with empty scene objects array', () => {
    const definition: GameDefinitionEntity = minimalValidScenePlay();
    definition.levels[0].sceneConfig = { objects: [] };
    const errors = validateGameDefinition(definition);
    expect(errors).toContain('missing_scene_objects:level_1');
  });

  it('allows access to published SCENE_PLAY with compatible app version', () => {
    const scenePlayGame = seededGames.find(
      (g) => g.templateKey === 'SCENE_PLAY' && g.status === 'PUBLISHED'
    )!;
    const errors = validateGameAccess(scenePlayGame, '0.1.0');
    expect(errors).toEqual([]);
  });

  it('rejects access to published SCENE_PLAY with incompatible app version', () => {
    const scenePlayGame = seededGames.find(
      (g) => g.templateKey === 'SCENE_PLAY' && g.status === 'PUBLISHED'
    )!;
    const errors = validateGameAccess(scenePlayGame, '0.0.1');
    expect(errors).toContain('min_app_version_not_met');
  });

  it('rejects non-published internal-only game from public access', () => {
    const internalGame = seededGames.find(
      (g) => g.segmentRuleJson.internalOnly === true
    )!;
    const errors = validateGameAccess(internalGame, '0.1.0');
    expect(errors).toContain('game_not_published');
  });

  it('validateGameAccess does not check internalOnly flag alone', () => {
    const definition: GameDefinitionEntity = {
      ...minimalValidScenePlay(),
      status: 'PUBLISHED',
      segmentRuleJson: { internalOnly: true, audience: 'internal', category: 'FUN' }
    };
    const errors = validateGameAccess(definition, '0.1.0');
    expect(errors).toEqual([]);
  });

  it('rejects access when game status is not PUBLISHED', () => {
    const definition: GameDefinitionEntity = {
      ...minimalValidScenePlay(),
      status: 'DRAFT'
    };
    const errors = validateGameAccess(definition, '0.1.0');
    expect(errors).toContain('game_not_published');
  });
});

function minimalValidScenePlay(): GameDefinitionEntity {
  return {
    id: 'test_minimal_scene_play',
    gameKey: 'minimal_scene_play_test',
    version: 1,
    templateKey: 'SCENE_PLAY',
    title: 'Minimal Scene Play Test',
    description: 'A minimal valid SCENE_PLAY definition for unit testing',
    status: 'PUBLISHED',
    minAppVersion: '0.1.0',
    orientation: 'LANDSCAPE',
    cameraRequirement: 'FULL_BODY',
    segmentRuleJson: { audience: 'all', internalOnly: false, category: 'EDUCATION', tags: ['test'] },
    supportedMotions: ['SQUAT'],
    levels: [
      {
        levelId: 'level_1',
        durationSec: 60,
        targetScore: 100,
        difficulty: 'EASY',
        motionRules: [
          { motion: 'SQUAT', event: 'REP_COUNTED', points: 10, cooldownMs: 500 }
        ],
        rewardRules: [
          { rewardType: 'STAR', amount: 1, minimumScore: 100 }
        ],
        configJson: {
          spawnRateMs: 2000,
          lives: 3,
          damageOnMiss: 1
        },
        sceneConfig: {
          maxObjects: 1,
          defaultObjectLifeMs: 3000,
          objects: [
            {
              objectType: 'prompt_1',
              assetKey: 'promptAsset1',
              requiredMotion: 'SQUAT',
              lifeMs: 3000,
              hitRadius: 0.2,
              points: 10
            }
          ]
        },
        interactionRules: [
          {
            input: 'MOTION_EVENT',
            event: 'REP_COUNTED',
            motion: 'SQUAT',
            targetObjectType: 'prompt_1',
            action: 'REMOVE_OBJECT',
            points: 10,
            cooldownMs: 500
          }
        ]
      }
    ],
    assets: {
      background: 'local://minimal/bg',
      character: 'local://minimal/character',
      items: [
        { key: 'background', kind: 'IMAGE', format: 'PNG', uri: 'local://minimal/bg' },
        { key: 'promptAsset1', kind: 'IMAGE', format: 'PNG', uri: 'local://minimal/prompt1' }
      ]
    },
    publishedAt: '2026-01-01T00:00:00.000Z'
  };
}
