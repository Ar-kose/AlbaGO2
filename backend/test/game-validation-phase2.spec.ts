import { GameDefinitionEntity } from '../src/common/contracts';
import { validateGameDefinition } from '../src/common/game-validation/validate-game-definition';
import { validateCommon } from '../src/common/game-validation/validators/common-validator';
import { validateWhackAMole } from '../src/common/game-validation/validators/whack-a-mole-validator';
import { validatePoseContactTargets, validatePoseHold, validateQuiz, validateFlashcard, validateMemoryMatch } from '../src/common/game-validation/validators/template-validators';
import { validateAudioConfig, validateAssets } from '../src/common/game-validation/validators/asset-validator';
import { seededGames } from '../src/common/contracts';

function makeGame(overrides: Record<string, unknown> = {}): GameDefinitionEntity {
  const base = seededGames.find(g => g.templateKey === 'FRUIT_SLASH')!;
  return {
    ...base,
    status: 'DRAFT',
    ...overrides
  } as GameDefinitionEntity;
}

function makeWhackAMoleConfig() {
  return {
    durationSec: 60,
    cameraRequirement: 'UPPER_BODY',
    orientation: 'LANDSCAPE',
    score: { hitPoints: 10 },
    lives: { enabled: true, count: 3 },
    spawn: { mode: 'RANDOM_TARGET', intervalMs: 900, visibleMs: 1400, maxActiveTargets: 2 },
    targets: [
      { targetId: 'hole_left', x: 0.14, y: 0.78, radius: 0.10, assetKey: 'mole_green', hitBy: ['LEFT_WRIST', 'RIGHT_WRIST'], points: 10 },
      { targetId: 'hole_right', x: 0.86, y: 0.78, radius: 0.10, assetKey: 'mole_green', hitBy: ['LEFT_WRIST', 'RIGHT_WRIST'], points: 10 }
    ]
  };
}

// ======== COMMON VALIDATION ========
describe('Common Validation', () => {
  it('passes valid FRUIT_SLASH game', () => {
    const game = makeGame();
    const result = validateCommon(game);
    expect(result.valid).toBe(true);
  });

  it('fails unknown template', () => {
    const game = makeGame({ templateKey: 'NONEXISTENT' as any });
    const result = validateCommon(game);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'UNKNOWN_TEMPLATE')).toBe(true);
  });

  it('fails missing gameKey', () => {
    const game = makeGame({ gameKey: '' });
    const result = validateCommon(game);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'MISSING_GAME_KEY')).toBe(true);
  });

  it('fails invalid gameKey slug', () => {
    const game = makeGame({ gameKey: 'Bad Key!' });
    const result = validateCommon(game);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'INVALID_GAME_KEY')).toBe(true);
  });

  it('fails missing title', () => {
    const game = makeGame({ title: '' });
    const result = validateCommon(game);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'MISSING_TITLE')).toBe(true);
  });

  it('fails EXPERIMENTAL template publish', () => {
    const game = makeGame({ templateKey: 'TARGET_HIT' as any, status: 'PUBLISHED' });
    const result = validateCommon(game);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'TEMPLATE_NOT_ANDROID_SUPPORTED')).toBe(true);
  });

  it('fails WEB_PREVIEW_ONLY template publish', () => {
    const game = makeGame({ templateKey: 'CAMERA_ARCADE_OVERLAY' as any, status: 'PUBLISHED' });
    const result = validateCommon(game);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'TEMPLATE_NOT_ANDROID_SUPPORTED')).toBe(true);
  });

  it('fails invalid minAppVersion', () => {
    const game = makeGame({ minAppVersion: 'not-semver' });
    const result = validateCommon(game);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'INVALID_APP_VERSION')).toBe(true);
  });

  it('fails incompatible camera requirement', () => {
    const game = makeGame({ templateKey: 'WHACK_A_MOLE' as any, cameraRequirement: 'HAND_TARGET' as any });
    const result = validateCommon(game);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'CAMERA_REQUIREMENT_INCOMPATIBLE')).toBe(true);
  });

  it('fails duration out of range', () => {
    const game = makeGame();
    game.levels[0].durationSec = 2; // too short
    const result = validateCommon(game);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'DURATION_OUT_OF_RANGE')).toBe(true);
  });

  it('passes WHACK_A_MOLE with UPPER_BODY camera', () => {
    // WHACK_A_MOLE allows UPPER_BODY and FULL_BODY
    const config = makeWhackAMoleConfig();
    config.cameraRequirement = 'UPPER_BODY';
    const result = validateWhackAMole(config, new Set(['mole_green']));
    expect(result.valid).toBe(true);
  });
});

// ======== WHACK_A_MOLE VALIDATION ========
describe('WHACK_A_MOLE Validation', () => {
  it('passes valid WHACK_A_MOLE config', () => {
    const config = makeWhackAMoleConfig();
    const result = validateWhackAMole(config, new Set(['mole_green']));
    expect(result.valid).toBe(true);
    expect(result.publishable).toBe(true);
  });

  it('fails missing targets', () => {
    const config = { ...makeWhackAMoleConfig(), targets: [] };
    const result = validateWhackAMole(config, new Set(['mole_green']));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'WHACK_TARGETS_REQUIRED')).toBe(true);
  });

  it('fails duplicate targetId', () => {
    const config = makeWhackAMoleConfig();
    config.targets[1].targetId = 'hole_left'; // duplicate
    const result = validateWhackAMole(config, new Set(['mole_green']));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'WHACK_TARGET_ID_DUPLICATE')).toBe(true);
  });

  it('fails invalid x coordinate', () => {
    const config = makeWhackAMoleConfig();
    (config.targets[0] as any).x = 1.5;
    const result = validateWhackAMole(config, new Set(['mole_green']));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'WHACK_TARGET_X_INVALID')).toBe(true);
  });

  it('fails invalid y coordinate', () => {
    const config = makeWhackAMoleConfig();
    (config.targets[0] as any).y = -0.1;
    const result = validateWhackAMole(config, new Set(['mole_green']));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'WHACK_TARGET_Y_INVALID')).toBe(true);
  });

  it('fails invalid radius', () => {
    const config = makeWhackAMoleConfig();
    (config.targets[0] as any).radius = 0.001;
    const result = validateWhackAMole(config, new Set(['mole_green']));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'WHACK_TARGET_RADIUS_INVALID')).toBe(true);
  });

  it('fails missing target asset', () => {
    const config = makeWhackAMoleConfig();
    const result = validateWhackAMole(config, new Set<string>()); // empty asset set
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'WHACK_TARGET_ASSET_MISSING')).toBe(true);
  });

  it('fails empty hitBy', () => {
    const config = makeWhackAMoleConfig();
    (config.targets[0] as any).hitBy = [];
    const result = validateWhackAMole(config, new Set(['mole_green']));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'WHACK_TARGET_HITBY_REQUIRED')).toBe(true);
  });

  it('fails invalid hitBy keypoint', () => {
    const config = makeWhackAMoleConfig();
    (config.targets[0] as any).hitBy = ['LEFT_KNEE', 'INVALID_KEYPOINT'];
    const result = validateWhackAMole(config, new Set(['mole_green']));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'WHACK_TARGET_HITBY_INVALID')).toBe(true);
  });

  it('fails invalid lives count', () => {
    const config = makeWhackAMoleConfig();
    config.lives = { enabled: true, count: 15 };
    const result = validateWhackAMole(config, new Set(['mole_green']));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'WHACK_LIVES_INVALID')).toBe(true);
  });

  it('fails invalid camera requirement', () => {
    const config = { ...makeWhackAMoleConfig(), cameraRequirement: 'HAND_TARGET' };
    const result = validateWhackAMole(config, new Set(['mole_green']));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'WHACK_CAMERA_REQUIREMENT_INVALID')).toBe(true);
  });

  it('fails invalid spawn interval', () => {
    const config = makeWhackAMoleConfig();
    config.spawn.intervalMs = 5;
    const result = validateWhackAMole(config, new Set(['mole_green']));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'WHACK_SPAWN_INTERVAL_INVALID')).toBe(true);
  });

  it('warns maxActive exceeds targets', () => {
    const config = makeWhackAMoleConfig();
    config.spawn.maxActiveTargets = 10;
    const result = validateWhackAMole(config, new Set(['mole_green']));
    expect(result.warnings.some(w => w.code === 'WHACK_MAX_ACTIVE_EXCEEDS_TARGETS')).toBe(true);
  });
});

// ======== POSE_CONTACT_TARGETS ========
describe('POSE_CONTACT_TARGETS Validation', () => {
  it('passes valid config', () => {
    const config = {
      targets: [
        { targetId: 't1', x: 0.2, y: 0.5, hitBy: ['LEFT_WRIST'], radius: 0.1 }
      ]
    };
    const result = validatePoseContactTargets(config, new Set());
    expect(result.valid).toBe(true);
  });

  it('fails missing targets', () => {
    const result = validatePoseContactTargets({ targets: [] }, new Set());
    expect(result.valid).toBe(false);
  });

  it('fails duplicate targetId', () => {
    const config = {
      targets: [
        { targetId: 't1', x: 0.2, y: 0.5, hitBy: ['LEFT_WRIST'] },
        { targetId: 't1', x: 0.8, y: 0.5, hitBy: ['RIGHT_WRIST'] }
      ]
    };
    const result = validatePoseContactTargets(config, new Set());
    expect(result.valid).toBe(false);
  });
});

// ======== POSE_HOLD ========
describe('POSE_HOLD Validation', () => {
  it('passes valid config', () => {
    const config = { hold: { pose: 'PLANK', targetHoldSec: 30, graceMs: 500, minConfidence: 0.6 }, cameraRequirement: 'FULL_BODY' };
    const result = validatePoseHold(config, new Set());
    expect(result.valid).toBe(true);
  });

  it('fails missing hold config', () => {
    const result = validatePoseHold({}, new Set());
    expect(result.valid).toBe(false);
  });

  it('fails invalid hold duration', () => {
    const config = { hold: { pose: 'PLANK', targetHoldSec: 500, graceMs: 500, minConfidence: 0.6 } };
    const result = validatePoseHold(config, new Set());
    expect(result.valid).toBe(false);
  });
});

// ======== AUDIO VALIDATION ========
describe('Audio Validation', () => {
  it('passes when audio disabled', () => {
    const result = validateAudioConfig({ enabled: false }, new Set());
    expect(result.valid).toBe(true);
  });

  it('passes optional audio missing', () => {
    const result = validateAudioConfig({ enabled: true, soundEffects: [] }, new Set(['hit_sfx']));
    expect(result.valid).toBe(true);
  });

  it('fails referenced audio missing', () => {
    const result = validateAudioConfig(
      { enabled: true, soundEffects: [{ event: 'HIT', assetKey: 'hit_sfx', volume: 0.8 }] },
      new Set<string>() // empty — hit_sfx not found
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'AUDIO_ASSET_MISSING')).toBe(true);
  });

  it('fails invalid volume', () => {
    const result = validateAudioConfig(
      { enabled: true, backgroundMusic: { assetKey: 'bg', volume: 1.5 } },
      new Set(['bg'])
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'AUDIO_VOLUME_INVALID')).toBe(true);
  });

  it('fails invalid audio event', () => {
    const result = validateAudioConfig(
      { enabled: true, soundEffects: [{ event: 'EXPLOSION', assetKey: 'sfx', volume: 0.5 }] },
      new Set(['sfx'])
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'AUDIO_EVENT_INVALID')).toBe(true);
  });
});

// ======== EDUCATION TEMPLATES ========
describe('Education Templates', () => {
  it('passes valid QUIZ config', () => {
    const config = { questions: [{ prompt: 'What is 2+2?', choices: ['1', '2', '4', '8'], correctIndex: 2 }] };
    const result = validateQuiz(config, new Set());
    expect(result.valid).toBe(true);
  });

  it('fails QUIZ with no questions', () => {
    const result = validateQuiz({ questions: [] }, new Set());
    expect(result.valid).toBe(false);
  });

  it('fails QUIZ with too few choices', () => {
    const config = { questions: [{ prompt: 'Q', choices: ['A'], correctIndex: 0 }] };
    const result = validateQuiz(config, new Set());
    expect(result.valid).toBe(false);
  });

  it('fails QUIZ correctIndex out of range', () => {
    const config = { questions: [{ prompt: 'Q', choices: ['A', 'B', 'C'], correctIndex: 5 }] };
    const result = validateQuiz(config, new Set());
    expect(result.valid).toBe(false);
  });

  it('passes valid FLASHCARD config', () => {
    const config = { cards: [{ cardId: 'c1', frontText: 'Hello', backText: 'Merhaba' }] };
    const result = validateFlashcard(config, new Set());
    expect(result.valid).toBe(true);
  });

  it('fails empty FLASHCARD', () => {
    const result = validateFlashcard({ cards: [] }, new Set());
    expect(result.valid).toBe(false);
  });

  it('fails FLASHCARD with no content', () => {
    const config = { cards: [{ cardId: 'c1' }] };
    const result = validateFlashcard(config, new Set());
    expect(result.valid).toBe(false);
  });

  it('passes valid MEMORY_MATCH config', () => {
    const config = {
      pairs: [
        { pairId: 'p1', left: { text: 'Cat' }, right: { text: 'Kedi' } },
        { pairId: 'p2', left: { text: 'Dog' }, right: { text: 'Kopek' } }
      ]
    };
    const result = validateMemoryMatch(config, new Set());
    expect(result.valid).toBe(true);
  });

  it('fails MEMORY_MATCH with less than 2 pairs', () => {
    const config = { pairs: [{ pairId: 'p1', left: { text: 'A' }, right: { text: 'B' } }] };
    const result = validateMemoryMatch(config, new Set());
    expect(result.valid).toBe(false);
  });
});

// ======== ASSET VALIDATION ========
describe('Asset Validation', () => {
  it('passes valid assets', () => {
    const assets = { items: [{ key: 'bg', kind: 'IMAGE', format: 'PNG', uri: 'file://bg.png', bytes: 1024 }] };
    const result = validateAssets(assets, ['bg'], []);
    expect(result.valid).toBe(true);
  });

  it('fails missing required asset', () => {
    const result = validateAssets({ items: [] }, ['required_bg'], []);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'REQUIRED_ASSET_MISSING')).toBe(true);
  });

  it('fails invalid image format', () => {
    const assets = { items: [{ key: 'bg', kind: 'IMAGE', format: 'GIF', uri: 'file://bg.gif' }] };
    const result = validateAssets(assets, [], []);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'ASSET_IMAGE_FORMAT_INVALID')).toBe(true);
  });
});

// ======== INTEGRATION ========
describe('Game Validation Integration', () => {
  it('validates seeded public games pass common validation', () => {
    const publicTemplates = ['FRUIT_SLASH', 'DODGE_RUN', 'FIT_CHALLENGE', 'SCENE_PLAY'];
    for (const templateKey of publicTemplates) {
      const game = seededGames.find(g => g.templateKey === templateKey);
      expect(game).toBeDefined();
      // Fix duration to be in valid range for test
      if (game && game.levels) {
        for (const level of game.levels) {
          (level as any).durationSec = 60;
        }
      }
      const result = validateCommon(game!);
      expect(result.valid).toBe(true);
    }
  });

  it('fails WHACK_A_MOLE without targets', () => {
    const game = makeGame({
      templateKey: 'WHACK_A_MOLE' as any,
      cameraRequirement: 'UPPER_BODY' as any,
      orientation: 'LANDSCAPE',
      supportedMotions: ['LEFT_HAND_HIT' as any],
      assets: { background: '', character: '', items: [] },
      levels: [{
        levelId: 'level_1', durationSec: 60, targetScore: 100, difficulty: 'EASY',
        motionRules: [{ motion: 'LEFT_HAND_HIT' as any, event: 'REP_COUNTED', points: 10, cooldownMs: 300 }],
        rewardRules: [], configJson: { targets: [], spawn: {} }, sceneConfig: {}, interactionRules: [], taskRulesJson: []
      }]
    });
    const result = validateGameDefinition(game);
    expect(result.errors.some(e => e.code === 'WHACK_TARGETS_REQUIRED')).toBe(true);
  });
});
