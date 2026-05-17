import type { GamePreset } from './types';

export const GAME_PRESETS: GamePreset[] = [
  {
    id: 'deve-cuce',
    displayName: 'Komut Takip Oyunu',
    description: 'Ekranda beliren komutlara doğru hareketle cevap ver. Deve-Cüce, sağ-sol, hızlı komut refleks oyunları.',
    template: 'SCENE_PLAY',
    icon: '📢',
    category: 'FUN',
    supportedMotions: ['SQUAT', 'JUMPING_JACK'],
    whatYouCanBuild: 'Deve-Cüce, sağ-sol refleks, komut takip, hareket eşleştirme oyunları',
    requiresAppUpdate: false,
    recipe: {
      kind: 'COMMAND_REACTION',
      title: '',
      description: '',
      category: 'FUN',
      durationSec: 45,
      lives: 3,
      commands: [
        { label: 'Cüce', requiredMotion: 'SQUAT', assetKey: 'cuceCard', points: 10, lifeMs: 2400 },
        { label: 'Deve', requiredMotion: 'JUMPING_JACK', assetKey: 'deveCard', points: 12, lifeMs: 2400 }
      ],
      wrongMovePenalty: 5,
      cameraRequirement: 'FULL_BODY',
      orientation: 'LANDSCAPE'
    }
  },
  {
    id: 'plank-challenge',
    displayName: 'Poz Tutma (Plank)',
    description: 'Belirli bir pozu sabit tutma yarışı. Plank, denge, sabit poz meydan okumaları.',
    template: 'FIT_CHALLENGE',
    icon: '🧘',
    category: 'SPORT',
    supportedMotions: ['PLANK_HOLD', 'BALANCE', 'POSE_STABLE'],
    whatYouCanBuild: 'Plank yarışı, denge tutma, poz sabitleme, core dayanıklılık oyunları',
    requiresAppUpdate: false,
    recipe: {
      kind: 'HOLD_CHALLENGE',
      title: '',
      description: '',
      lives: 3,
      holdMotion: 'PLANK_HOLD',
      targetHoldSec: 30,
      totalDurationSec: 45,
      successPoints: 100,
      graceMs: 500,
      cameraRequirement: 'FULL_BODY',
      orientation: 'PORTRAIT'
    }
  },
  {
    id: 'hedefe-vur',
    displayName: 'Hedefe Vur',
    description: 'Ekrandaki hedeflere el/kol ile temas et. Bileklerini hedef noktasına getir, skor yap.',
    template: 'POSE_CONTACT_TARGETS',
    icon: '🎯',
    category: 'FUN',
    supportedMotions: ['LEFT_HAND_HIT', 'RIGHT_HAND_HIT'],
    whatYouCanBuild: 'Hedefe vur, whack-a-mole, el-göz koordinasyon, refleks hedef oyunları',
    requiresAppUpdate: false,
    recipe: {
      kind: 'TARGET_HIT',
      title: '',
      description: '',
      lives: 3,
      durationSec: 60,
      targets: [
        { label: 'Sol Hedef', x: 0.20, y: 0.78, radius: 0.10, hitBy: ['LEFT_WRIST', 'RIGHT_WRIST'], points: 10, assetKey: 'target_left' },
        { label: 'Orta Hedef', x: 0.50, y: 0.78, radius: 0.10, hitBy: ['LEFT_WRIST', 'RIGHT_WRIST'], points: 10, assetKey: 'target_center' },
        { label: 'Sağ Hedef', x: 0.80, y: 0.78, radius: 0.10, hitBy: ['LEFT_WRIST', 'RIGHT_WRIST'], points: 10, assetKey: 'target_right' }
      ],
      spawnMode: 'RANDOM',
      cameraRequirement: 'UPPER_BODY',
      orientation: 'LANDSCAPE'
    }
  },
  {
    id: 'meyve-kesme',
    displayName: 'Meyve Kesme',
    description: 'Hareketlerle ekrandaki meyveleri topla, bombalardan kaç. Meyve Kesme tarzı arcade oyun.',
    template: 'FRUIT_SLASH',
    icon: '🍉',
    category: 'FUN',
    supportedMotions: ['SQUAT', 'JUMPING_JACK', 'JUMP_ROPE'],
    whatYouCanBuild: 'Meyve kesme, nesne yakalama, arcade toplama, refleks kesme oyunları',
    requiresAppUpdate: false,
    recipe: {
      kind: 'FRUIT_SLASH',
      title: '',
      description: '',
      lives: 3,
      durationSec: 60,
      targetScore: 420,
      spawnRateMs: 900,
      objects: [
        { label: 'Meyve', requiredMotion: 'JUMPING_JACK', assetKey: 'fruit', points: 15 },
        { label: 'Bonus', requiredMotion: 'SQUAT', assetKey: 'bonus', points: 10 }
      ],
      penaltyObjects: true,
      penaltyPoints: 10,
      cameraRequirement: 'HAND_TARGET',
      orientation: 'LANDSCAPE'
    }
  },
  {
    id: 'engel-kacis',
    displayName: 'Engel Kaçış',
    description: 'Zıpla, eğil, kaç! Önüne çıkan engelleri doğru hareketle aş.',
    template: 'DODGE_RUN',
    icon: '🏃',
    category: 'FUN',
    supportedMotions: ['SQUAT', 'JUMPING_JACK', 'JUMP_ROPE'],
    whatYouCanBuild: 'Engel kaçış, lane runner, zıpla-kaç refleks, koşu parkuru oyunları',
    requiresAppUpdate: false,
    recipe: {
      kind: 'RUNNER_DODGE',
      title: '',
      description: '',
      durationSec: 60,
      lives: 3,
      obstacleSpawnMs: 1400,
      obstacles: [
        { label: 'Alçak Engel', requiredMotion: 'SQUAT', assetKey: 'lowObstacle', points: 10 },
        { label: 'Yüksek Engel', requiredMotion: 'JUMPING_JACK', assetKey: 'jumpObstacle', points: 15 }
      ],
      cameraRequirement: 'FULL_BODY',
      orientation: 'LANDSCAPE'
    }
  },
  {
    id: 'spor-challenge',
    displayName: 'Spor Programı',
    description: 'Squat, jumping jack, plank gibi hareketleri içeren set antrenman programı.',
    template: 'FIT_CHALLENGE',
    icon: '🏋️',
    category: 'SPORT',
    supportedMotions: ['SQUAT', 'JUMPING_JACK', 'JUMP_ROPE', 'PLANK_HOLD'],
    whatYouCanBuild: 'Set antrenman, spor programı, playlist workout, fitness challenge',
    requiresAppUpdate: false,
    recipe: {
      kind: 'REP_PROGRAM',
      title: '',
      description: '',
      lives: 3,
      steps: [
        { type: 'MOTION_REPS', title: 'Squat Seti', motion: 'SQUAT', targetCount: 10, successMessage: 'Squat tamam!' },
        { type: 'REST', title: 'Dinlenme', durationSec: 20, successMessage: 'Dinlenme bitti.' },
        { type: 'MOTION_REPS', title: 'Jumping Jack', motion: 'JUMPING_JACK', targetCount: 10, successMessage: 'Jumping jack tamam!' },
        { type: 'HOLD_POSE', title: 'Plank', holdSec: 30, successMessage: 'Harika, program bitti!' }
      ],
      category: 'SPORT',
      orientation: 'PORTRAIT'
    }
  }
];

export function getPresetById(id: string): GamePreset | undefined {
  return GAME_PRESETS.find((p) => p.id === id);
}
