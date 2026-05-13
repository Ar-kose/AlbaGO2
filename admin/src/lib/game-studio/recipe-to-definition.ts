import type { GameDefinitionDraft, GameLevelDto, MotionRuleDto, InteractionRuleDto, ProgramStepDto, MotionType, GameAssetDto } from '../alba-api';
import type { GameRecipe, CommandReactionRecipe, HoldChallengeRecipe, TargetHitRecipe, RepProgramRecipe, RunnerDodgeRecipe, FruitSlashRecipe } from './types';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0,60) || 'game';
}

function makeMotionRules(motions: MotionType[], pointsMap: Record<string, number>): MotionRuleDto[] {
  return motions.map((motion) => ({
    motion,
    event: 'REP_COUNTED' as const,
    points: pointsMap[motion] ?? 10,
    cooldownMs: 400
  }));
}

function makeDefaultMotionRules(motions: MotionType[], penaltyMotion?: MotionType): MotionRuleDto[] {
  const rules: MotionRuleDto[] = motions.map((m) => {
    let pts = 10;
    if (m === 'JUMPING_JACK') pts = 12;
    if (m === 'JUMP_ROPE') pts = 3;
    if (m === 'LEFT_HAND_HIT' || m === 'RIGHT_HAND_HIT') pts = 10;
    return { motion: m, event: 'REP_COUNTED', points: pts, cooldownMs: 400 };
  });
  if (penaltyMotion) {
    rules.push({ motion: penaltyMotion, event: 'BAD_FORM', points: -5, cooldownMs: 250 });
  }
  return rules;
}

function recipeToGameKey(recipe: GameRecipe): string {
  return slugify(recipe.title || recipe.kind);
}

// ─── Command Reaction → SCENE_PLAY ──────────────────────────────────────────

function convertCommandReaction(recipe: CommandReactionRecipe): GameDefinitionDraft {
  const motions = Array.from(new Set(recipe.commands.map((c) => c.requiredMotion)));
  const penaltyMotion = motions[0] ?? 'SQUAT';

  const objects = recipe.commands.map((cmd, i) => ({
    objectId: `prompt_${i + 1}`,
    objectType: `prompt_${i + 1}`,
    label: cmd.label,
    assetKey: cmd.assetKey ?? 'cuceCard',
    requiredMotion: cmd.requiredMotion,
    points: cmd.points,
    lifeMs: cmd.lifeMs
  }));

  const interactionRules: InteractionRuleDto[] = recipe.commands.map((cmd, i) => ({
    input: 'MOTION_EVENT',
    event: 'REP_COUNTED',
    motion: cmd.requiredMotion,
    targetObjectType: `prompt_${i + 1}`,
    action: 'REMOVE_OBJECT',
    points: cmd.points,
    cooldownMs: 500
  }));

  interactionRules.push({
    input: 'MOTION_EVENT',
    event: 'BAD_FORM',
    action: 'RESET_COMBO',
    points: -recipe.wrongMovePenalty,
    cooldownMs: 250
  });

  interactionRules.push({
    input: 'MOTION_EVENT',
    event: 'USER_OUT_OF_FRAME',
    action: 'PAUSE_GAME',
    cooldownMs: 0
  });

  const level: GameLevelDto = {
    levelId: `${recipeToGameKey(recipe)}_level_1`,
    durationSec: recipe.durationSec,
    targetScore: recipe.commands.reduce((sum, c) => sum + c.points * Math.ceil(recipe.durationSec / (c.lifeMs / 1000)), 50),
    difficulty: 'EASY',
    motionRules: makeMotionRules(motions, Object.fromEntries(recipe.commands.map(c => [c.requiredMotion, c.points]))),
    rewardRules: [{ rewardType: 'STAR', amount: 1, minimumScore: Math.ceil(recipe.commands.reduce((sum, c) => sum + c.points, 0) * 3) }],
    config: { spawnRateMs: recipe.commands[0]?.lifeMs ?? 2400, lives: recipe.lives, damageOnMiss: 1 },
    sceneConfig: {
      type: 'PROMPT_SEQUENCE',
      maxObjects: 1,
      defaultObjectLifeMs: recipe.commands[0]?.lifeMs ?? 2400,
      objects
    },
    interactionRules,
    tasks: [],
    programSteps: [
      {
        stepId: `${recipeToGameKey(recipe)}_play`,
        type: 'PLAY_GAME',
        title: 'Komutları takip et',
        description: 'Doğru hareketle komutu temizle.',
        durationSec: recipe.durationSec,
        successMessage: 'Oyun tamamlandı!',
        nextOnComplete: true
      }
    ]
  };

  return {
    gameKey: recipeToGameKey(recipe),
    template: 'SCENE_PLAY',
    title: recipe.title,
    description: recipe.description,
    minAppVersion: '0.2.0',
    category: recipe.category,
    tags: ['command', 'reaction', 'scene-play'],
    orientation: recipe.orientation,
    cameraRequirement: recipe.cameraRequirement,
    supportedMotions: motions,
    levels: [level],
    assets: {
      background: `local://scene-play/${recipeToGameKey(recipe)}/background`,
      character: `local://scene-play/${recipeToGameKey(recipe)}/guide`,
      soundtrack: '',
      items: [
        { key: 'background', kind: 'IMAGE', format: 'PNG', uri: `local://scene-play/${recipeToGameKey(recipe)}/background` },
        { key: 'guide', kind: 'IMAGE', format: 'PNG', uri: `local://scene-play/${recipeToGameKey(recipe)}/guide` },
        ...recipe.commands.filter(c => c.assetKey).map(c => ({
          key: c.assetKey!,
          kind: 'IMAGE' as const,
          format: 'PNG' as const,
          uri: `local://scene-play/${recipeToGameKey(recipe)}/${c.assetKey}`
        }))
      ]
    },
    status: 'DRAFT',
    actorId: 'admin@local'
  };
}

// ─── Hold Challenge → FIT_CHALLENGE ──────────────────────────────────────────

function convertHoldChallenge(recipe: HoldChallengeRecipe): GameDefinitionDraft {
  const motion: MotionType = 'PLANK_HOLD';
  const key = recipeToGameKey(recipe);
  const level: GameLevelDto = {
    levelId: `${key}_level_1`,
    durationSec: recipe.totalDurationSec,
    targetScore: recipe.successPoints,
    difficulty: 'MEDIUM',
    motionRules: [
      { motion: 'PLANK_HOLD', event: 'REP_COUNTED', points: Math.ceil(recipe.successPoints / recipe.targetHoldSec), cooldownMs: 1000 }
    ],
    rewardRules: [{ rewardType: 'BADGE', amount: 1, minimumScore: recipe.successPoints }],
    config: { showQualityScore: true, advanceAutomatically: true, minConfidence: 0.6 },
    sceneConfig: { showQualityScore: true, taskCardStyle: 'stacked', completionEffect: 'pulse', maxObjects: 1 },
    interactionRules: [
      { input: 'MOTION_EVENT', event: 'BAD_FORM', action: 'RESET_COMBO', points: -3, cooldownMs: 250 },
      { input: 'MOTION_EVENT', event: 'USER_OUT_OF_FRAME', action: 'PAUSE_GAME', cooldownMs: 0 }
    ],
    tasks: [],
    programSteps: [
      {
        stepId: `${key}_hold`,
        type: 'HOLD_POSE',
        title: recipe.holdMotion === 'PLANK_HOLD' ? 'Plank tut' : 'Pozisyonu koru',
        description: `${recipe.targetHoldSec} saniye boyunca pozu sabit tut.`,
        holdSec: recipe.targetHoldSec,
        successMessage: 'Harika! Pozu tamamladın.'
      }
    ]
  };

  return {
    gameKey: key,
    template: 'FIT_CHALLENGE',
    title: recipe.title,
    description: recipe.description,
    minAppVersion: '0.2.0',
    category: 'SPORT',
    tags: ['hold', 'challenge', 'plank'],
    orientation: recipe.orientation,
    cameraRequirement: recipe.cameraRequirement,
    supportedMotions: [motion],
    levels: [level],
    assets: {
      background: `local://fit-challenge/${key}/background`,
      character: `local://fit-challenge/${key}/coach`,
      soundtrack: '',
      items: [
        { key: 'background', kind: 'IMAGE', format: 'PNG', uri: `local://fit-challenge/${key}/background` },
        { key: 'coach', kind: 'IMAGE', format: 'PNG', uri: `local://fit-challenge/${key}/coach` }
      ]
    },
    status: 'DRAFT',
    actorId: 'admin@local'
  };
}

// ─── Target Hit → POSE_CONTACT_TARGETS ──────────────────────────────────────

function convertTargetHit(recipe: TargetHitRecipe): GameDefinitionDraft {
  const key = recipeToGameKey(recipe);
  const objects = recipe.targets.map((t, i) => ({
    objectId: `target_${i + 1}`,
    objectType: `target_${i + 1}`,
    label: t.label,
    assetKey: t.assetKey ?? 'target_default',
    requiredMotion: t.hitBy.includes('LEFT_WRIST') ? 'LEFT_HAND_HIT' as MotionType : 'RIGHT_HAND_HIT' as MotionType,
    lifeMs: recipe.spawnMode === 'STATIC' ? 999999 : 2000,
    points: t.points,
    x: t.x,
    y: t.y,
    radius: t.radius,
    hitBy: t.hitBy
  }));

  const interactionRules: InteractionRuleDto[] = objects.map((obj) => ({
    input: 'POSE_CONTACT',
    targetObjectType: obj.objectType,
    keypoints: ['LEFT_WRIST', 'RIGHT_WRIST'],
    action: 'REMOVE_OBJECT',
    points: obj.points,
    cooldownMs: 300
  }));

  interactionRules.push({
    input: 'MOTION_EVENT',
    event: 'BAD_FORM',
    action: 'DECREASE_LIFE',
    points: 0,
    cooldownMs: 1000
  });

  const level: GameLevelDto = {
    levelId: `${key}_level_1`,
    durationSec: recipe.durationSec,
    targetScore: recipe.targets.reduce((sum, t) => sum + t.points * 10, 100),
    difficulty: 'EASY',
    motionRules: [
      { motion: 'LEFT_HAND_HIT', event: 'REP_COUNTED', points: 10, cooldownMs: 300 },
      { motion: 'RIGHT_HAND_HIT', event: 'REP_COUNTED', points: 10, cooldownMs: 300 }
    ],
    rewardRules: [{ rewardType: 'STAR', amount: 1, minimumScore: 100 }],
    config: { spawnIntervalMs: 900, visibleMs: 2000, lives: 3, maxActiveTargets: objects.length, loseLifeOnTimeout: true },
    sceneConfig: {
      type: 'OBJECT_SPAWN',
      maxObjects: objects.length,
      spawnRateMs: 900,
      objects: objects.map((obj) => ({
        objectId: obj.objectId,
        label: obj.label,
        assetKey: obj.assetKey,
        requiredMotion: obj.requiredMotion,
        lifeMs: obj.lifeMs,
        points: obj.points,
        x: (obj as any).x,
        y: (obj as any).y,
        radius: (obj as any).radius,
        hitBy: (obj as any).hitBy
      }))
    },
    interactionRules,
    tasks: [],
    programSteps: []
  };

  return {
    gameKey: key,
    template: 'POSE_CONTACT_TARGETS',
    title: recipe.title,
    description: recipe.description,
    minAppVersion: '0.2.0',
    category: 'FUN',
    tags: ['target', 'hit', 'reflex'],
    orientation: recipe.orientation,
    cameraRequirement: recipe.cameraRequirement,
    supportedMotions: ['LEFT_HAND_HIT', 'RIGHT_HAND_HIT'],
    levels: [level],
    assets: {
      background: `local://whack-a-mole/${key}/background`,
      character: `local://whack-a-mole/${key}/mole`,
      soundtrack: '',
      items: [
        { key: 'background', kind: 'IMAGE', format: 'PNG', uri: `local://whack-a-mole/${key}/background` },
        { key: 'mole', kind: 'IMAGE', format: 'PNG', uri: `local://whack-a-mole/${key}/mole` },
        ...recipe.targets.filter(t => t.assetKey).map(t => ({
          key: t.assetKey!,
          kind: 'IMAGE' as const,
          format: 'PNG' as const,
          uri: `local://whack-a-mole/${key}/${t.assetKey}`
        }))
      ]
    },
    status: 'DRAFT',
    actorId: 'admin@local'
  };
}

// ─── Rep Program → FIT_CHALLENGE ────────────────────────────────────────────

function convertRepProgram(recipe: RepProgramRecipe): GameDefinitionDraft {
  const key = recipeToGameKey(recipe);
  const motions = Array.from(new Set(recipe.steps.filter(s => s.motion).map(s => s.motion!)));
  const allMotions = motions.length > 0 ? motions : ['SQUAT' as MotionType];

  const programSteps: ProgramStepDto[] = recipe.steps.map((step, i) => ({
    stepId: `${key}_step_${i + 1}`,
    type: step.type,
    title: step.title,
    motion: step.motion,
    targetCount: step.targetCount,
    holdSec: step.holdSec,
    durationSec: step.durationSec,
    successMessage: step.successMessage,
    nextOnComplete: i < recipe.steps.length - 1
  }));

  const tasks = recipe.steps
    .filter(s => s.type === 'MOTION_REPS' && s.motion)
    .map(s => ({
      motion: s.motion!,
      targetCount: s.targetCount ?? 10,
      pointsPerRep: 10
    }));

  const totalSec = recipe.steps.reduce((sum, s) => {
    if (s.type === 'MOTION_REPS' && s.targetCount) return sum + s.targetCount * 2;
    if (s.type === 'HOLD_POSE' && s.holdSec) return sum + s.holdSec;
    return sum + (s.durationSec ?? 20);
  }, 0);

  const level: GameLevelDto = {
    levelId: `${key}_level_1`,
    durationSec: totalSec || 120,
    targetScore: tasks.reduce((sum, t) => sum + t.targetCount * t.pointsPerRep, 0),
    difficulty: 'CHALLENGE',
    motionRules: makeDefaultMotionRules(allMotions, allMotions[0]),
    rewardRules: [{ rewardType: 'BADGE', amount: 1, minimumScore: Math.ceil(tasks.reduce((sum, t) => sum + t.targetCount * t.pointsPerRep, 0) * 0.7) }],
    config: { showQualityScore: true, advanceAutomatically: true },
    sceneConfig: { showQualityScore: true, taskCardStyle: 'stacked', completionEffect: 'pulse', maxObjects: tasks.length },
    interactionRules: [
      ...tasks.map(t => ({
        input: 'MOTION_EVENT' as const,
        event: 'REP_COUNTED' as const,
        motion: t.motion,
        action: 'PROGRESS_TASK' as const,
        points: t.pointsPerRep,
        cooldownMs: 500
      })),
      { input: 'MOTION_EVENT' as const, event: 'BAD_FORM', action: 'RESET_COMBO' as const, points: -3, cooldownMs: 250 },
      { input: 'MOTION_EVENT' as const, event: 'USER_OUT_OF_FRAME', action: 'PAUSE_GAME' as const, cooldownMs: 0 }
    ],
    tasks,
    programSteps
  };

  return {
    gameKey: key,
    template: 'FIT_CHALLENGE',
    title: recipe.title,
    description: recipe.description,
    minAppVersion: '0.2.0',
    category: recipe.category,
    tags: ['program', 'workout', 'fitness'],
    orientation: recipe.orientation,
    cameraRequirement: 'FULL_BODY',
    supportedMotions: allMotions,
    levels: [level],
    assets: {
      background: `local://fit-challenge/${key}/background`,
      character: `local://fit-challenge/${key}/coach`,
      soundtrack: '',
      items: allMotions.map(m => ({
        key: `${m.toLowerCase()}_icon`,
        kind: 'IMAGE' as const,
        format: 'PNG' as const,
        uri: `local://fit-challenge/${key}/${m.toLowerCase()}`
      }))
    },
    status: 'DRAFT',
    actorId: 'admin@local'
  };
}

// ─── Runner Dodge → DODGE_RUN ───────────────────────────────────────────────

function convertRunnerDodge(recipe: RunnerDodgeRecipe): GameDefinitionDraft {
  const key = recipeToGameKey(recipe);
  const motions = Array.from(new Set(recipe.obstacles.map(o => o.requiredMotion)));
  if (motions.length === 0) motions.push('SQUAT');

  const level: GameLevelDto = {
    levelId: `${key}_level_1`,
    durationSec: recipe.durationSec,
    targetScore: recipe.obstacles.reduce((sum, o) => sum + o.points * 10, 100),
    difficulty: 'MEDIUM',
    motionRules: makeDefaultMotionRules(motions, motions[0]),
    rewardRules: [{ rewardType: 'ENERGY', amount: 1, minimumScore: 100 }],
    config: { lives: recipe.lives, obstacleSpawnMs: recipe.obstacleSpawnMs, pauseOnOutOfFrame: true, damageOnMiss: 1 },
    sceneConfig: {
      lanes: ['low', 'high'],
      travelMs: 2100,
      obstacleWindowMs: recipe.obstacleSpawnMs,
      objects: recipe.obstacles.map((o, i) => ({
        objectType: `obstacle_${i + 1}`,
        label: o.label,
        assetKey: o.assetKey ?? 'obstacle',
        requiredMotion: o.requiredMotion,
        points: o.points,
        lifeMs: 2100
      }))
    },
    interactionRules: [
      ...recipe.obstacles.map(o => ({
        input: 'MOTION_EVENT' as const,
        event: 'REP_COUNTED' as const,
        motion: o.requiredMotion,
        action: 'REMOVE_OBJECT' as const,
        points: o.points,
        cooldownMs: 500
      })),
      { input: 'MOTION_EVENT' as const, event: 'BAD_FORM', action: 'DECREASE_LIFE' as const, points: -5, cooldownMs: 250 },
      { input: 'MOTION_EVENT' as const, event: 'USER_OUT_OF_FRAME', action: 'PAUSE_GAME' as const, cooldownMs: 0 }
    ],
    tasks: [],
    programSteps: [
      {
        stepId: `${key}_dodge`,
        type: 'PLAY_GAME',
        title: 'Engelleri aş',
        description: 'Doğru hareketle engeli geç.',
        durationSec: recipe.durationSec,
        successMessage: 'Parkur tamamlandı!',
        nextOnComplete: true
      }
    ]
  };

  return {
    gameKey: key,
    template: 'DODGE_RUN',
    title: recipe.title,
    description: recipe.description,
    minAppVersion: '0.2.0',
    category: 'FUN',
    tags: ['runner', 'dodge', 'reaction'],
    orientation: recipe.orientation,
    cameraRequirement: recipe.cameraRequirement,
    supportedMotions: motions,
    levels: [level],
    assets: {
      background: `local://dodge-run/${key}/background`,
      character: `local://dodge-run/${key}/runner`,
      soundtrack: '',
      items: [
        { key: 'background', kind: 'IMAGE', format: 'PNG', uri: `local://dodge-run/${key}/background` },
        { key: 'runner', kind: 'IMAGE', format: 'PNG', uri: `local://dodge-run/${key}/runner` },
        ...recipe.obstacles.filter(o => o.assetKey).map(o => ({
          key: o.assetKey!,
          kind: 'IMAGE' as const,
          format: 'PNG' as const,
          uri: `local://dodge-run/${key}/${o.assetKey}`
        }))
      ]
    },
    status: 'DRAFT',
    actorId: 'admin@local'
  };
}

// ─── Fruit Slash → FRUIT_SLASH ──────────────────────────────────────────────

function convertFruitSlash(recipe: FruitSlashRecipe): GameDefinitionDraft {
  const key = recipeToGameKey(recipe);
  const motions = Array.from(new Set(recipe.objects.map(o => o.requiredMotion)));

  const level: GameLevelDto = {
    levelId: `${key}_level_1`,
    durationSec: recipe.durationSec,
    targetScore: recipe.targetScore,
    difficulty: 'EASY',
    motionRules: makeDefaultMotionRules(motions, motions[0]),
    rewardRules: [{ rewardType: 'STAR', amount: 3, minimumScore: recipe.targetScore }],
    config: { spawnRateMs: recipe.spawnRateMs, comboMultiplier: true, penaltyObjects: recipe.penaltyObjects, penaltyPoints: recipe.penaltyPoints },
    sceneConfig: {
      laneCount: 3,
      maxObjects: 5,
      defaultHitRadius: 0.18,
      defaultObjectLifeMs: 2600,
      spawn: { objectTypes: recipe.objects.map(o => o.assetKey ?? 'object') }
    },
    interactionRules: [
      ...recipe.objects.map(o => ({
        input: 'POSE_CONTACT' as const,
        targetObjectType: 'fruit_target',
        keypoints: ['left_wrist', 'right_wrist'],
        action: 'REMOVE_OBJECT' as const,
        points: o.points,
        cooldownMs: 120
      })),
      { input: 'MOTION_EVENT' as const, event: 'BAD_FORM', action: 'RESET_COMBO' as const, points: -recipe.penaltyPoints, cooldownMs: 250 }
    ],
    tasks: [],
    programSteps: [
      {
        stepId: `${key}_play`,
        type: 'PLAY_GAME',
        title: 'Meyveleri topla',
        description: 'Hareketle meyveleri kes.',
        durationSec: recipe.durationSec,
        successMessage: 'Meyve turu tamamlandı!',
        nextOnComplete: true
      }
    ]
  };

  return {
    gameKey: key,
    template: 'FRUIT_SLASH',
    title: recipe.title,
    description: recipe.description,
    minAppVersion: '0.2.0',
    category: 'FUN',
    tags: ['fruit', 'slash', 'arcade'],
    orientation: recipe.orientation,
    cameraRequirement: recipe.cameraRequirement,
    supportedMotions: motions,
    levels: [level],
    assets: {
      background: `local://fruit-slash/${key}/background`,
      character: `local://fruit-slash/${key}/hero`,
      soundtrack: '',
      items: [
        { key: 'background', kind: 'IMAGE', format: 'PNG', uri: `local://fruit-slash/${key}/background` },
        { key: 'hero', kind: 'IMAGE', format: 'PNG', uri: `local://fruit-slash/${key}/hero` },
        ...recipe.objects.filter(o => o.assetKey).map(o => ({
          key: o.assetKey!,
          kind: 'IMAGE' as const,
          format: 'PNG' as const,
          uri: `local://fruit-slash/${key}/${o.assetKey}`
        }))
      ]
    },
    status: 'DRAFT',
    actorId: 'admin@local'
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

export function recipeToGameDefinition(recipe: GameRecipe): GameDefinitionDraft {
  switch (recipe.kind) {
    case 'COMMAND_REACTION':
      return convertCommandReaction(recipe);
    case 'HOLD_CHALLENGE':
      return convertHoldChallenge(recipe);
    case 'TARGET_HIT':
      return convertTargetHit(recipe);
    case 'REP_PROGRAM':
      return convertRepProgram(recipe);
    case 'RUNNER_DODGE':
      return convertRunnerDodge(recipe);
    case 'FRUIT_SLASH':
      return convertFruitSlash(recipe);
    default:
      throw new Error(`Unknown recipe kind: ${(recipe as any).kind}`);
  }
}
