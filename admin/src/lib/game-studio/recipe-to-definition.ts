import type { GameDefinitionDraft, GameLevelDto, MotionRuleDto, InteractionRuleDto, ProgramStepDto, MotionType, GameAssetDto } from '../alba-api';
import type { GameRecipe, CommandReactionRecipe, HoldChallengeRecipe, TargetHitRecipe, RepProgramRecipe, RunnerDodgeRecipe, FruitSlashRecipe } from './types';
import type { GameSettings, CommonGameSettings, GameMechanic, MotionArcadeMechanic, PoseContactMechanic, QuizMechanic, StudyMechanic, HoldMechanic, RhythmMechanic, ProgramMechanic } from './game-settings';

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
    config: { showQualityScore: true, advanceAutomatically: true, minConfidence: 0.6, lives: recipe.lives },
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
    config: { spawnIntervalMs: 900, visibleMs: 2000, lives: recipe.lives, maxActiveTargets: objects.length, loseLifeOnTimeout: true },
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
    config: { showQualityScore: true, advanceAutomatically: true, lives: recipe.lives },
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
    config: { spawnRateMs: recipe.spawnRateMs, comboMultiplier: true, penaltyObjects: recipe.penaltyObjects, penaltyPoints: recipe.penaltyPoints, lives: recipe.lives },
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

// ─── Unified GameSettings Converter ─────────────────────────────────────────

export function convertFromGameSettings(gs: GameSettings): GameDefinitionDraft {
  const { common, mechanic } = gs;
  const gameKey = slugify(common.title) || common.templateId.toLowerCase();
  const motionRules = buildMotionRules(common, mechanic);
  const interactionRules = buildInteractionRules(common, mechanic);
  const sceneConfig = buildSceneConfig(mechanic);
  const configJson = buildConfigJson(common, mechanic);
  const programSteps = buildProgramSteps(mechanic);
  const tags = buildTags(common.templateId, common.category);

  const durationSec = common.duration.mode === 'TIMED' ? common.duration.sec : 0;
  const targetScore = common.scoring.targetScore;

  const template = mapTemplateId(common.templateId);

  return {
    gameKey,
    template: template as any,
    title: common.title,
    description: common.description,
    category: common.category as any,
    orientation: common.presentation.orientation as any,
    cameraRequirement: common.presentation.cameraRequirement as any,
    supportedMotions: motionRules.map(r => r.motion).filter((v, i, a) => a.indexOf(v) === i),
    minAppVersion: '0.2.0',
    tags,
    levels: [{
      levelId: `${gameKey}_level_1`,
      durationSec,
      targetScore,
      difficulty: 'MEDIUM',
      motionRules,
      rewardRules: [],
      config: configJson,
      sceneConfig,
      interactionRules: interactionRules,
      tasks: [],
      programSteps: programSteps,
    }],
    assets: {
      cover: '',
      background: 'local://default/bg',
      character: 'local://default/char',
      items: [],
    },
    status: 'DRAFT',
    actorId: 'admin@local',
  };
}

function mapTemplateId(templateId: string): string {
  // GameSettings.templateId → GameDefinitionDraft.template mapping
  const map: Record<string, string> = {
    SCENE_PLAY: 'SCENE_PLAY',
    FRUIT_SLASH: 'FRUIT_SLASH',
    DODGE_RUN: 'DODGE_RUN',
    FIT_CHALLENGE: 'FIT_CHALLENGE',
    WHACK_A_MOLE: 'WHACK_A_MOLE',
    POSE_CONTACT_TARGETS: 'POSE_CONTACT_TARGETS',
    POSE_HOLD: 'POSE_HOLD',
    RHYTHM_MOTION: 'RHYTHM_MOTION',
    REP_COUNTER: 'REP_COUNTER',
    MOTION_SEQUENCE: 'MOTION_SEQUENCE',
    INTERVAL_WORKOUT: 'INTERVAL_WORKOUT',
    QUIZ: 'QUIZ',
    FLASHCARD: 'FLASHCARD',
    MEMORY_MATCH: 'MEMORY_MATCH',
    TRUE_FALSE: 'TRUE_FALSE',
    MATCH_PAIRS: 'MATCH_PAIRS',
    REACTION: 'REACTION',
    CATCH_FALLING: 'CATCH_FALLING',
    AVOID_OBSTACLE: 'AVOID_OBSTACLE',
    COLLECT_ITEMS: 'COLLECT_ITEMS',
    PROGRAM_FLOW: 'PROGRAM_FLOW',
    HYBRID_SCENE: 'HYBRID_SCENE',
    TARGET_HIT: 'TARGET_HIT',
    ENDLESS_RUNNER: 'ENDLESS_RUNNER',
    CAMERA_ARCADE_OVERLAY: 'CAMERA_ARCADE_OVERLAY',
  };
  return map[templateId] ?? templateId;
}

function buildMotionRules(common: CommonGameSettings, mechanic: GameMechanic): MotionRuleDto[] {
  const rules: MotionRuleDto[] = [];
  const motionSet = new Set<string>();

  if (mechanic.kind === 'MOTION_ARCADE') {
    for (const obj of mechanic.objects) {
      if (obj.requiredMotion && !motionSet.has(obj.requiredMotion)) {
        motionSet.add(obj.requiredMotion);
        rules.push({
          motion: obj.requiredMotion as MotionType,
          event: 'REP_COUNTED',
          points: obj.points,
          cooldownMs: 400,
        });
      }
    }
  } else if (mechanic.kind === 'POSE_CONTACT') {
    for (const t of mechanic.targets) {
      for (const kp of t.hitBy) {
        const motion = keypointToMotion(kp);
        if (motion && !motionSet.has(motion)) {
          motionSet.add(motion);
          rules.push({ motion: motion as MotionType, event: 'REP_COUNTED', points: t.points, cooldownMs: 400 });
        }
      }
    }
  } else if (mechanic.kind === 'PROGRAM') {
    for (const step of mechanic.steps) {
      if (step.motion && !motionSet.has(step.motion)) {
        motionSet.add(step.motion);
        rules.push({ motion: step.motion as MotionType, event: 'REP_COUNTED', points: step.pointsPerRep ?? 10, cooldownMs: 400 });
      }
    }
  } else if (mechanic.kind === 'RHYTHM') {
    for (const note of mechanic.notes) {
      if (note.motion && !motionSet.has(note.motion)) {
        motionSet.add(note.motion);
        rules.push({ motion: note.motion as MotionType, event: 'REP_COUNTED', points: note.points, cooldownMs: 200 });
      }
    }
  }

  // Penalty rule for bad form
  if (common.scoring.penaltyPerWrong > 0 && motionSet.size > 0) {
    const firstMotion = [...motionSet][0] as MotionType;
    rules.push({ motion: firstMotion, event: 'BAD_FORM', points: -common.scoring.penaltyPerWrong, cooldownMs: 500 });
  }

  return rules;
}

function keypointToMotion(kp: string): string | null {
  if (kp.includes('LEFT_WRIST') || kp.includes('LEFT_HAND')) return 'LEFT_HAND_HIT';
  if (kp.includes('RIGHT_WRIST') || kp.includes('RIGHT_HAND')) return 'RIGHT_HAND_HIT';
  return null;
}

function buildInteractionRules(common: CommonGameSettings, mechanic: GameMechanic): InteractionRuleDto[] {
  const rules: InteractionRuleDto[] = [];

  if (mechanic.kind === 'MOTION_ARCADE') {
    // Motion match rules
    for (const obj of mechanic.objects) {
      rules.push({
        input: 'MOTION_EVENT',
        event: 'REP_COUNTED',
        motion: obj.requiredMotion as MotionType,
        targetObjectType: obj.id,
        action: 'REMOVE_OBJECT',
        points: obj.points,
        cooldownMs: 200,
      });
    }
    // Bad form rule
    if (common.lives.mode === 'LIMITED' && common.lives.loseOnBadForm) {
      rules.push({
        input: 'MOTION_EVENT',
        event: 'BAD_FORM',
        action: 'DECREASE_LIFE',
        cooldownMs: 500,
      });
    } else if (common.scoring.penaltyPerWrong > 0) {
      rules.push({
        input: 'MOTION_EVENT',
        event: 'BAD_FORM',
        action: 'RESET_COMBO',
        points: -common.scoring.penaltyPerWrong,
        cooldownMs: 500,
      });
    }
    // Out of frame rule
    if (common.lives.loseOnOutOfFrame) {
      rules.push({
        input: 'MOTION_EVENT',
        event: 'USER_OUT_OF_FRAME',
        action: 'DECREASE_LIFE',
        cooldownMs: 2000,
      });
    } else {
      rules.push({
        input: 'MOTION_EVENT',
        event: 'USER_OUT_OF_FRAME',
        action: 'PAUSE_GAME',
        cooldownMs: 2000,
      });
    }
  } else if (mechanic.kind === 'POSE_CONTACT') {
    for (const t of mechanic.targets) {
      rules.push({
        input: 'POSE_CONTACT',
        keypoints: t.hitBy,
        targetObjectType: t.targetId,
        action: 'REMOVE_OBJECT',
        points: t.points,
        cooldownMs: mechanic.hitDetection.hitCooldownMs,
      });
    }
    if (common.lives.loseOnOutOfFrame || mechanic.hitDetection.loseLifeOnTimeout) {
      rules.push({ input: 'MOTION_EVENT', event: 'USER_OUT_OF_FRAME', action: 'DECREASE_LIFE', cooldownMs: 2000 });
    }
  }

  return rules;
}

function buildSceneConfig(mechanic: GameMechanic): Record<string, unknown> {
  if (mechanic.kind === 'MOTION_ARCADE') {
    const objects = mechanic.objects.map(obj => ({
      objectId: obj.id,
      objectType: obj.id,
      label: obj.label,
      assetKey: obj.assetKey,
      requiredMotion: obj.requiredMotion,
      points: obj.points,
      lifeMs: obj.lifeMs ?? mechanic.objectDefaults.lifeMs,
      hitRadius: mechanic.objectDefaults.hitRadius,
    }));
    return {
      type: 'OBJECT_SPAWN',
      mode: mechanic.spawn.strategy === 'SEQUENCE' ? 'SEQUENCE' : 'RANDOM',
      spawnRateMs: mechanic.spawn.intervalMs,
      maxObjects: mechanic.spawn.maxActive,
      objects,
    };
  }
  if (mechanic.kind === 'POSE_CONTACT') {
    return {
      type: 'OBJECT_SPAWN',
      mode: mechanic.spawn.activateMode,
      spawnRateMs: mechanic.spawn.intervalMs,
      maxActiveTargets: mechanic.spawn.maxActiveTargets,
      visibleMs: mechanic.spawn.visibleMs,
      targets: mechanic.targets,
    };
  }
  return { type: 'NONE' };
}

function buildConfigJson(common: CommonGameSettings, mechanic: GameMechanic): Record<string, unknown> {
  return {
    // Yeni format
    gameSettings: {
      schemaVersion: '1.0',
      common,
      mechanic,
    },
    // Legacy alanlar (geriye uyumluluk)
    durationSec: common.duration.mode === 'TIMED' ? common.duration.sec : 0,
    targetScore: common.scoring.targetScore,
    lives: common.lives.mode === 'LIMITED' ? common.lives.count : (common.lives.mode === 'UNLIMITED' ? 999 : 0),
    orientation: common.presentation.orientation,
    cameraRequirement: common.presentation.cameraRequirement,
    category: common.category,
  };
}

function buildProgramSteps(mechanic: GameMechanic): ProgramStepDto[] {
  if (mechanic.kind === 'PROGRAM') {
    return mechanic.steps.map(s => ({
      stepId: s.stepId,
      type: s.type,
      title: s.title,
      description: s.description,
      motion: s.motion as MotionType | undefined,
      targetCount: s.targetCount,
      holdSec: s.holdSec,
      durationSec: s.durationSec,
      nextOnComplete: s.nextOnComplete,
    }));
  }
  // MotionArcade / PoseContact için varsayılan PLAY_GAME adımı
  if (mechanic.kind === 'MOTION_ARCADE' || mechanic.kind === 'POSE_CONTACT' || mechanic.kind === 'RHYTHM') {
    return [{
      stepId: 'play',
      type: 'PLAY_GAME' as const,
      title: 'Oyun',
      durationSec: 0,
      nextOnComplete: false,
    }];
  }
  return [];
}

function buildTags(templateId: string, category: string): string[] {
  const tags: string[] = [templateId.toLowerCase(), category.toLowerCase()];
  if (templateId === 'SCENE_PLAY') tags.push('command', 'reaction');
  if (templateId === 'FRUIT_SLASH') tags.push('arcade', 'fruit');
  if (templateId === 'DODGE_RUN') tags.push('runner', 'dodge');
  if (templateId === 'QUIZ' || templateId === 'TRUE_FALSE') tags.push('education', 'quiz');
  if (templateId === 'FLASHCARD' || templateId === 'MEMORY_MATCH') tags.push('education', 'study');
  return tags;
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
