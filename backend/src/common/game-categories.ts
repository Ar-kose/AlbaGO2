// Category taxonomy for AlbaGo game catalog
// Shared across backend, admin, and Android

export interface GameCategoryDefinition {
  key: string;
  title: string;
  description: string;
  icon: string;
  sortOrder: number;
  colorToken: string;
  mobileVisible: boolean;
}

export const GAME_CATEGORIES: GameCategoryDefinition[] = [
  {
    key: 'reflex', title: 'Refleks & Koordinasyon',
    description: 'Hizli tepki, hedef yakalama ve el-goz koordinasyonu oyunlari.',
    icon: 'zap', sortOrder: 1, colorToken: '#ff7a45', mobileVisible: true
  },
  {
    key: 'motion', title: 'Hareket & Kardiyo',
    description: 'Aktif hareketli oyunlar, squat, jumping jack ve kardiyo.',
    icon: 'activity', sortOrder: 2, colorToken: '#10b981', mobileVisible: true
  },
  {
    key: 'balance', title: 'Denge & Poz',
    description: 'Poz tutma, denge ve vucut kontrolu egzersizleri.',
    icon: 'crosshair', sortOrder: 3, colorToken: '#6366f1', mobileVisible: true
  },
  {
    key: 'education', title: 'Egitim & Bilgi',
    description: 'Quiz, flashcard ve ogrenme oyunlari.',
    icon: 'book-open', sortOrder: 4, colorToken: '#8b5cf6', mobileVisible: false
  },
  {
    key: 'memory', title: 'Hafiza & Dikkat',
    description: 'Hafiza eslestirme, dikkat ve konsantrasyon oyunlari.',
    icon: 'brain', sortOrder: 5, colorToken: '#ec4899', mobileVisible: false
  },
  {
    key: 'warmup', title: 'Isinma & Esneme',
    description: 'Dusuk tempolu hareket, isinma ve esneme rutinleri.',
    icon: 'sunrise', sortOrder: 6, colorToken: '#f59e0b', mobileVisible: true
  },
  {
    key: 'experimental', title: 'Deneysel',
    description: 'Test asamasindaki deneysel oyunlar.',
    icon: 'flask', sortOrder: 99, colorToken: '#64748b', mobileVisible: false
  }
];

export function getCategoryByKey(key: string): GameCategoryDefinition | undefined {
  return GAME_CATEGORIES.find(c => c.key === key);
}

export function getPublicCategories(): GameCategoryDefinition[] {
  return GAME_CATEGORIES.filter(c => c.mobileVisible).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getAllCategories(): GameCategoryDefinition[] {
  return [...GAME_CATEGORIES].sort((a, b) => a.sortOrder - b.sortOrder);
}
