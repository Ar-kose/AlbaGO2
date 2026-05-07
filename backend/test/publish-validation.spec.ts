import {
  compareVersions,
  isScoreSubmissionSuspicious,
  validateGameDefinition
} from '../src/common/publish-validation';
import { seededGames } from '../src/common/contracts';

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
});
