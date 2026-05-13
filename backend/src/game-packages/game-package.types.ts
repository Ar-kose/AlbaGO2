export interface AlbaGoGamePackage {
  schemaVersion: string;
  packageType: string;
  game: GamePackageGame;
  assets: GamePackageAssets;
  rules?: GamePackageRule[];
  scoring?: GamePackageScoring;
  startGate?: GamePackageStartGate;
  testPlan?: GamePackageTestPlan;
}

export interface GamePackageGame {
  title: string;
  template: string;
  category: string;
  orientation: string;
  cameraRequirement: string;
  durationSec: number;
  description?: string;
  tags?: string[];
}

export interface GamePackageAssets {
  cover?: string;
  background?: string;
  items?: GamePackageAssetItem[];
}

export interface GamePackageAssetItem {
  key: string;
  uri: string;
  kind: string;
  format: string;
}

export interface GamePackageRule {
  motion: string;
  event: string;
  points: number;
  cooldownMs: number;
  targetObjectType?: string;
}

export interface GamePackageScoring {
  targetScore: number;
  rewardType?: string;
  rewardAmount?: number;
}

export interface GamePackageStartGate {
  bodyInFrameRequired: boolean;
  countdownSec: number;
}

export interface GamePackageTestPlan {
  cameraRequired: boolean;
  motionsToTest: string[];
}

export interface PackageValidationIssue {
  code: string;
  field: string;
  message: string;
}

export interface PackageValidationResult {
  valid: boolean;
  errors: PackageValidationIssue[];
  warnings: PackageValidationIssue[];
  summary?: PackageSummary;
  runtimeCompatibility?: RuntimeCompatibility;
}

export interface PackageSummary {
  title: string;
  template: string;
  category: string;
  orientation: string;
  durationSec: number;
}

export interface RuntimeCompatibility {
  templateSupported: boolean;
  motionsSupported: boolean;
  rulesSupported: boolean;
  unsupportedItems: string[];
}
