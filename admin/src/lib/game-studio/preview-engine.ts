import type { PreviewState, MockMotionEvent } from './types';
import type { GameRecipe, CommandReactionRecipe, HoldChallengeRecipe } from './types';

export function createInitialPreviewState(recipe: GameRecipe): PreviewState {
  const durationSec = getDurationSec(recipe);
  return {
    elapsedSec: 0,
    remainingSec: durationSec,
    score: 0,
    combo: 0,
    lives: getLives(recipe),
    progress: getInitialProgress(recipe)
  };
}

function getDurationSec(recipe: GameRecipe): number {
  switch (recipe.kind) {
    case 'COMMAND_REACTION': return recipe.durationSec;
    case 'HOLD_CHALLENGE': return recipe.totalDurationSec;
    case 'TARGET_HIT': return recipe.durationSec;
    case 'REP_PROGRAM': return recipe.steps.reduce((sum, s) => sum + (s.durationSec ?? s.targetCount ?? 0), 0);
    case 'RUNNER_DODGE': return recipe.durationSec;
    case 'FRUIT_SLASH': return recipe.durationSec;
  }
}

function getLives(recipe: GameRecipe): number {
  switch (recipe.kind) {
    case 'COMMAND_REACTION': return recipe.lives;
    case 'HOLD_CHALLENGE': return 1;
    case 'TARGET_HIT': return 3;
    case 'REP_PROGRAM': return 1;
    case 'RUNNER_DODGE': return recipe.lives;
    case 'FRUIT_SLASH': return 3;
  }
}

function getInitialProgress(recipe: GameRecipe): PreviewState['progress'] {
  if (recipe.kind === 'HOLD_CHALLENGE') {
    return { value: 0, max: recipe.targetHoldSec, label: 'Hold' };
  }
  if (recipe.kind === 'REP_PROGRAM') {
    const motionStep = recipe.steps.find(s => s.type === 'MOTION_REPS');
    if (motionStep && motionStep.targetCount) {
      return { value: 0, max: motionStep.targetCount, label: motionStep.title };
    }
  }
  return undefined;
}

export function simulateRecipeEvent(state: PreviewState, event: MockMotionEvent, recipe: GameRecipe): PreviewState {
  const next = { ...state };

  if (event.event === 'USER_OUT_OF_FRAME') {
    next.feedback = { text: 'Kullanıcı kadraj dışında', kind: 'NEGATIVE' };
    return next;
  }

  switch (recipe.kind) {
    case 'COMMAND_REACTION':
      return simulateCommandReaction(next, event, recipe);
    case 'HOLD_CHALLENGE':
      return simulateHoldChallenge(next, event, recipe);
    case 'TARGET_HIT':
      return simulateTargetHit(next, event, recipe);
    case 'REP_PROGRAM':
      return simulateRepProgram(next, event, recipe);
    case 'RUNNER_DODGE':
      return simulateRunnerDodge(next, event, recipe);
    case 'FRUIT_SLASH':
      return simulateFruitSlash(next, event, recipe);
    default:
      return next;
  }
}

function simulateCommandReaction(
  state: PreviewState,
  event: MockMotionEvent,
  recipe: CommandReactionRecipe
): PreviewState {
  const next = { ...state };

  if (event.event === 'BAD_FORM') {
    next.combo = 0;
    next.score = Math.max(0, next.score - recipe.wrongMovePenalty);
    next.lives = Math.max(0, next.lives - 1);
    next.feedback = { text: `Yanlış hareket! -${recipe.wrongMovePenalty}`, kind: 'NEGATIVE' };
    return next;
  }

  if (event.event === 'REP_COUNTED') {
    const matched = recipe.commands.find(c => c.requiredMotion === event.motion);
    if (matched) {
      next.combo += 1;
      const bonus = next.combo > 1 ? Math.floor(next.combo / 3) * matched.points : 0;
      next.score += matched.points + bonus;
      next.feedback = {
        text: `+${matched.points + bonus} ${matched.label}`,
        kind: 'POSITIVE'
      };
      // Pick a new random prompt
      const otherCommands = recipe.commands.filter(c => c.requiredMotion !== event.motion);
      const nextCmd = otherCommands[Math.floor(Math.random() * otherCommands.length)] ?? recipe.commands[0];
      next.activePrompt = {
        label: nextCmd.label,
        requiredMotion: nextCmd.requiredMotion,
        assetKey: nextCmd.assetKey,
        expiresInMs: nextCmd.lifeMs
      };
    } else {
      next.combo = 0;
      next.score = Math.max(0, next.score - recipe.wrongMovePenalty);
      next.feedback = { text: `Beklenmeyen hareket! -${recipe.wrongMovePenalty}`, kind: 'NEGATIVE' };
    }
  }

  return next;
}

function simulateHoldChallenge(
  state: PreviewState,
  event: MockMotionEvent,
  recipe: HoldChallengeRecipe
): PreviewState {
  const next = { ...state };

  if (event.event === 'POSE_HELD' || event.event === 'REP_COUNTED') {
    const increment = 1;
    next.progress = {
      value: Math.min(recipe.targetHoldSec, (next.progress?.value ?? 0) + increment),
      max: recipe.targetHoldSec,
      label: 'Hold'
    };
    if (next.progress.value >= recipe.targetHoldSec) {
      next.score += recipe.successPoints;
      next.feedback = { text: `+${recipe.successPoints} Poz tamamlandı!`, kind: 'POSITIVE' };
    } else {
      next.feedback = { text: `${next.progress.value}s / ${recipe.targetHoldSec}s`, kind: 'POSITIVE' };
    }
  }

  if (event.event === 'POSE_LOST' || event.event === 'BAD_FORM') {
    next.progress = { value: Math.max(0, (next.progress?.value ?? 0) - 3), max: recipe.targetHoldSec, label: 'Hold' };
    next.feedback = { text: 'Poz bozuldu!', kind: 'NEGATIVE' };
  }

  return next;
}

function simulateTargetHit(state: PreviewState, event: MockMotionEvent, recipe: GameRecipe): PreviewState {
  const next = { ...state };

  if (event.event === 'REP_COUNTED') {
    const points = event.motion === 'LEFT_HAND_HIT' || event.motion === 'RIGHT_HAND_HIT' ? 10 : 0;
    if (points > 0) {
      next.combo += 1;
      next.score += points;
      next.feedback = { text: `+${points} Hedef vuruldu!`, kind: 'POSITIVE' };
    }
  }

  if (event.event === 'BAD_FORM') {
    next.combo = 0;
    next.lives = Math.max(0, next.lives - 1);
    next.feedback = { text: 'Iska! -1 can', kind: 'NEGATIVE' };
  }

  return next;
}

function simulateRepProgram(state: PreviewState, event: MockMotionEvent, recipe: GameRecipe): PreviewState {
  const next = { ...state };

  if (event.event === 'REP_COUNTED' && next.progress) {
    next.progress = { ...next.progress, value: next.progress.value + 1 };
    next.combo += 1;
    next.score += 10;
    next.feedback = { text: `+10 Rep! ${next.progress.value}/${next.progress.max}`, kind: 'POSITIVE' };

    if (next.progress.value >= next.progress.max) {
      next.feedback = { text: 'Set tamamlandı!', kind: 'POSITIVE' };
      next.progress = { value: 0, max: next.progress.max, label: next.progress.label };
    }
  }

  if (event.event === 'BAD_FORM') {
    next.combo = 0;
    next.score = Math.max(0, next.score - 3);
    next.feedback = { text: 'Form bozuk! -3', kind: 'NEGATIVE' };
  }

  return next;
}

function simulateRunnerDodge(state: PreviewState, event: MockMotionEvent, recipe: GameRecipe): PreviewState {
  const next = { ...state };

  if (event.event === 'REP_COUNTED') {
    const points = event.motion === 'JUMPING_JACK' ? 15 : 10;
    next.combo += 1;
    next.score += points;
    next.feedback = { text: `+${points} Engel geçildi!`, kind: 'POSITIVE' };
  }

  if (event.event === 'BAD_FORM') {
    next.combo = 0;
    next.lives = Math.max(0, next.lives - 1);
    next.feedback = { text: 'Engele çarptın! -1 can', kind: 'NEGATIVE' };
  }

  return next;
}

function simulateFruitSlash(state: PreviewState, event: MockMotionEvent, recipe: GameRecipe): PreviewState {
  const next = { ...state };

  if (event.event === 'REP_COUNTED') {
    const points = event.motion === 'JUMPING_JACK' ? 15 : event.motion === 'SQUAT' ? 10 : 3;
    next.combo += 1;
    next.score += points;
    next.feedback = { text: `+${points} Meyve!`, kind: 'POSITIVE' };
  }

  if (event.event === 'BAD_FORM') {
    next.combo = 0;
    next.score = Math.max(0, next.score - 10);
    next.feedback = { text: 'Bomba! -10', kind: 'NEGATIVE' };
  }

  return next;
}
