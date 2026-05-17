// Unified Game Settings Validator
// Tek bir validator ile tum mechanic ailelerini dogrular

import { GameValidationResult, GameValidationIssue, mergeResults, okResult, failResult, validateRange, validateRequiredString } from '../validation-result';
import {
  GameSettings,
  CommonGameSettings,
  GameMechanic,
  MotionArcadeMechanic,
  PoseContactMechanic,
  QuizMechanic,
  StudyMechanic,
  HoldMechanic,
  RhythmMechanic,
  ProgramMechanic,
  isGameSettings,
} from '../../game-settings';
import { GameTemplateKey } from '../../contracts';

type JsonObject = Record<string, unknown>;

// ============================================================================
// ANA DISPATCHER
// ============================================================================

export function validateGameSettings(config: JsonObject): GameValidationResult {
  const gs = config.gameSettings as GameSettings | undefined;
  if (!gs || !isGameSettings(gs)) {
    return okResult(); // gameSettings yoksa pass-through (eski oyun)
  }

  const results: GameValidationResult[] = [];

  // Ortak ayarlari dogrula
  results.push(validateCommonSettings(gs.common));

  // Mekanik ayarlari dogrula
  results.push(validateMechanic(gs.mechanic, gs.common.templateId));

  return mergeResults(results);
}

// ============================================================================
// ORTAK AYARLAR VALIDASYONU
// ============================================================================

function validateCommonSettings(c: CommonGameSettings): GameValidationResult {
  const errors: GameValidationIssue[] = [];
  const warnings: GameValidationIssue[] = [];

  // Title
  const titleErr = validateRequiredString(c.title, 'common.title', 'MISSING_TITLE', 'Oyun adi zorunludur');
  if (titleErr) errors.push(titleErr);
  else if (c.title.length < 2) errors.push({ code: 'SHORT_TITLE', severity: 'ERROR', scope: 'CONTRACT', path: 'common.title', message: 'Oyun adi en az 2 karakter olmalidir' });
  else if (c.title.length > 80) errors.push({ code: 'LONG_TITLE', severity: 'ERROR', scope: 'CONTRACT', path: 'common.title', message: 'Oyun adi en fazla 80 karakter olmalidir' });

  // Description
  if (c.description && c.description.length > 500) {
    errors.push({ code: 'LONG_DESC', severity: 'WARNING', scope: 'CONTRACT', path: 'common.description', message: 'Aciklama 500 karakteri asiyor' });
  }

  // Category
  if (!['FUN', 'SPORT', 'EDUCATION'].includes(c.category)) {
    errors.push({ code: 'INVALID_CATEGORY', severity: 'ERROR', scope: 'CONTRACT', path: 'common.category', message: 'Gecersiz kategori' });
  }

  // Lives
  if (!['NONE', 'LIMITED', 'UNLIMITED'].includes(c.lives.mode)) {
    errors.push({ code: 'INVALID_LIVES_MODE', severity: 'ERROR', scope: 'CONTRACT', path: 'common.lives.mode', message: 'Gecersiz can modu. NONE, LIMITED veya UNLIMITED olmalidir' });
  }
  if (c.lives.mode === 'LIMITED') {
    const countErr = validateRange(c.lives.count, 1, 10, 'common.lives.count', 'INVALID_LIVES_COUNT', 'Can sayisi 1-10 arasinda olmalidir');
    if (countErr) errors.push(countErr);
  }
  const graceErr = validateRange(c.lives.gracePeriodSec, 0, 60, 'common.lives.gracePeriodSec', 'INVALID_GRACE', 'Grace period 0-60 sn arasinda olmalidir');
  if (graceErr) errors.push(graceErr);

  // Duration
  if (!['TIMED', 'UNTIL_COMPLETE', 'ENDLESS'].includes(c.duration.mode)) {
    errors.push({ code: 'INVALID_DURATION_MODE', severity: 'ERROR', scope: 'CONTRACT', path: 'common.duration.mode', message: 'Gecersiz sure modu' });
  }
  if (c.duration.mode === 'TIMED') {
    const durErr = validateRange(c.duration.sec, 5, 900, 'common.duration.sec', 'INVALID_DURATION', 'Sure 5-900 sn arasinda olmalidir');
    if (durErr) errors.push(durErr);
  }
  const cdErr = validateRange(c.duration.countdownSec, 0, 10, 'common.duration.countdownSec', 'INVALID_COUNTDOWN', 'Geri sayim 0-10 sn arasinda olmalidir');
  if (cdErr) warnings.push({ ...cdErr, severity: 'WARNING' });

  // Scoring
  if (c.scoring.targetScore < 0) errors.push({ code: 'NEGATIVE_TARGET_SCORE', severity: 'ERROR', scope: 'CONTRACT', path: 'common.scoring.targetScore', message: 'Hedef skor negatif olamaz' });
  if (c.scoring.pointsPerCorrect < 0) errors.push({ code: 'NEGATIVE_POINTS', severity: 'ERROR', scope: 'CONTRACT', path: 'common.scoring.pointsPerCorrect', message: 'Puan negatif olamaz' });
  if (c.scoring.penaltyPerWrong < 0) errors.push({ code: 'NEGATIVE_PENALTY', severity: 'ERROR', scope: 'CONTRACT', path: 'common.scoring.penaltyPerWrong', message: 'Ceza puani negatif olamaz' });

  // Completion
  const validCompletions = ['DURATION', 'SCORE_TARGET', 'ALL_TASKS_DONE', 'LIVES_DEPLETED', 'MANUAL'];
  if (!validCompletions.includes(c.completion.primary)) {
    errors.push({ code: 'INVALID_COMPLETION', severity: 'ERROR', scope: 'CONTRACT', path: 'common.completion.primary', message: 'Gecersiz bitis kosulu' });
  }

  // Presentation
  if (!['PORTRAIT', 'LANDSCAPE', 'AUTO'].includes(c.presentation.orientation)) {
    errors.push({ code: 'INVALID_ORIENTATION', severity: 'ERROR', scope: 'CONTRACT', path: 'common.presentation.orientation', message: 'Gecersiz ekran yonu' });
  }
  const validCameras = ['FULL_BODY', 'UPPER_BODY', 'HAND_TARGET', 'NONE'];
  if (!validCameras.includes(c.presentation.cameraRequirement)) {
    errors.push({ code: 'INVALID_CAMERA', severity: 'ERROR', scope: 'CONTRACT', path: 'common.presentation.cameraRequirement', message: 'Gecersiz kamera gereksinimi' });
  }

  // Feedback
  const validPrompts = ['ON_CHANGE', 'ALWAYS_VISIBLE', 'HIDDEN'];
  if (!validPrompts.includes(c.feedback.promptUpdateStrategy)) {
    errors.push({ code: 'INVALID_PROMPT_STRATEGY', severity: 'ERROR', scope: 'CONTRACT', path: 'common.feedback.promptUpdateStrategy', message: 'Gecersiz yonerge stratejisi' });
  }

  return { valid: errors.length === 0, publishable: errors.length === 0, errors, warnings };
}

// ============================================================================
// MEKANİK DISPATCHER
// ============================================================================

function validateMechanic(m: GameMechanic, templateId: GameTemplateKey): GameValidationResult {
  switch (m.kind) {
    case 'MOTION_ARCADE':  return validateMotionArcade(m);
    case 'POSE_CONTACT':   return validatePoseContact(m);
    case 'QUIZ':           return validateQuizMechanic(m);
    case 'STUDY':          return validateStudy(m);
    case 'HOLD':           return validateHold(m);
    case 'RHYTHM':         return validateRhythm(m);
    case 'PROGRAM':        return validateProgram(m);
    default:
      return failResult([{ code: 'UNKNOWN_MECHANIC', severity: 'ERROR', scope: 'TEMPLATE', path: 'mechanic.kind', message: `Bilinmeyen mekanik: ${(m as GameMechanic).kind}` }]);
  }
}

// ============================================================================
// MOTION ARCADE VALIDATOR
// ============================================================================

function validateMotionArcade(m: MotionArcadeMechanic): GameValidationResult {
  const errors: GameValidationIssue[] = [];
  const warnings: GameValidationIssue[] = [];

  // Spawn
  if (!['RANDOM', 'SEQUENCE', 'WAVE'].includes(m.spawn.strategy)) {
    errors.push({ code: 'INVALID_SPAWN_STRATEGY', severity: 'ERROR', scope: 'TEMPLATE', path: 'mechanic.spawn.strategy', message: 'Gecersiz spawn stratejisi' });
  }
  if (m.spawn.intervalMs < 200) {
    errors.push({ code: 'SPAWN_INTERVAL_TOO_SHORT', severity: 'ERROR', scope: 'TEMPLATE', path: 'mechanic.spawn.intervalMs', message: 'Spawn araligi en az 200ms olmalidir' });
  }
  if (m.spawn.maxActive < 1 || m.spawn.maxActive > 20) {
    errors.push({ code: 'INVALID_MAX_ACTIVE', severity: 'ERROR', scope: 'TEMPLATE', path: 'mechanic.spawn.maxActive', message: 'Max aktif nesne 1-20 arasinda olmalidir' });
  }

  // Objects
  if (!m.objects || m.objects.length === 0) {
    errors.push({ code: 'NO_OBJECTS', severity: 'ERROR', scope: 'TEMPLATE', path: 'mechanic.objects', message: 'En az bir nesne tanimlanmalidir' });
  } else {
    m.objects.forEach((obj, i) => {
      if (!obj.label?.trim()) errors.push({ code: 'MISSING_OBJECT_LABEL', severity: 'ERROR', scope: 'TEMPLATE', path: `mechanic.objects[${i}].label`, message: `Nesne ${i + 1}: etiket zorunludur` });
      if (!obj.assetKey?.trim()) errors.push({ code: 'MISSING_ASSET_KEY', severity: 'ERROR', scope: 'TEMPLATE', path: `mechanic.objects[${i}].assetKey`, message: `Nesne ${i + 1}: assetKey zorunludur` });
      if (obj.points < 0) errors.push({ code: 'NEGATIVE_OBJECT_POINTS', severity: 'ERROR', scope: 'TEMPLATE', path: `mechanic.objects[${i}].points`, message: `Nesne ${i + 1}: puan negatif olamaz` });
      if (obj.lifeMs !== undefined && obj.lifeMs < 500) errors.push({ code: 'OBJECT_LIFE_TOO_SHORT', severity: 'ERROR', scope: 'TEMPLATE', path: `mechanic.objects[${i}].lifeMs`, message: `Nesne ${i + 1}: omur en az 500ms olmalidir` });
    });
  }

  // Match
  const validMatches = ['BY_MOTION', 'BY_POSE_LANDMARK', 'BY_TARGET_ID', 'ANY_CORRECT'];
  if (!validMatches.includes(m.match.strategy)) {
    errors.push({ code: 'INVALID_MATCH_STRATEGY', severity: 'ERROR', scope: 'TEMPLATE', path: 'mechanic.match.strategy', message: 'Gecersiz eslestirme stratejisi' });
  }

  // OnExpire
  const validExpireActions = ['NONE', 'MISS_PENALTY', 'LOSE_LIFE'];
  if (!validExpireActions.includes(m.onExpire.action)) {
    errors.push({ code: 'INVALID_EXPIRE_ACTION', severity: 'ERROR', scope: 'TEMPLATE', path: 'mechanic.onExpire.action', message: 'Gecersiz expire aksiyonu' });
  }

  // Object defaults
  if (m.objectDefaults.lifeMs < 500) errors.push({ code: 'DEFAULT_LIFE_TOO_SHORT', severity: 'ERROR', scope: 'TEMPLATE', path: 'mechanic.objectDefaults.lifeMs', message: 'Varsayilan omur en az 500ms olmalidir' });
  if (m.objectDefaults.hitRadius <= 0 || m.objectDefaults.hitRadius > 1) errors.push({ code: 'INVALID_HIT_RADIUS', severity: 'ERROR', scope: 'TEMPLATE', path: 'mechanic.objectDefaults.hitRadius', message: 'Hit radius 0-1 arasinda olmalidir' });

  // Penalty objects
  if (m.penaltyObjects?.enabled) {
    if (!m.penaltyObjects.objects || m.penaltyObjects.objects.length === 0) {
      errors.push({ code: 'NO_PENALTY_OBJECTS', severity: 'ERROR', scope: 'TEMPLATE', path: 'mechanic.penaltyObjects.objects', message: 'Ceza nesneleri aktif ama hic nesne tanimlanmamis' });
    }
  }

  return { valid: errors.length === 0, publishable: errors.length === 0, errors, warnings };
}

// ============================================================================
// POSE CONTACT VALIDATOR
// ============================================================================

function validatePoseContact(m: PoseContactMechanic): GameValidationResult {
  const errors: GameValidationIssue[] = [];
  const warnings: GameValidationIssue[] = [];

  if (!m.targets || m.targets.length === 0) {
    errors.push({ code: 'NO_TARGETS', severity: 'ERROR', scope: 'TEMPLATE', path: 'mechanic.targets', message: 'En az bir hedef tanimlanmalidir' });
  } else {
    const ids = new Set<string>();
    m.targets.forEach((t, i) => {
      if (!t.targetId?.trim()) errors.push({ code: 'MISSING_TARGET_ID', severity: 'ERROR', scope: 'TEMPLATE', path: `mechanic.targets[${i}].targetId`, message: `Hedef ${i + 1}: targetId zorunludur` });
      else if (ids.has(t.targetId)) errors.push({ code: 'DUPLICATE_TARGET_ID', severity: 'ERROR', scope: 'TEMPLATE', path: `mechanic.targets[${i}].targetId`, message: `Hedef ${i + 1}: targetId tekrar ediyor: ${t.targetId}` });
      else ids.add(t.targetId);

      if (t.x < 0 || t.x > 1) errors.push({ code: 'TARGET_X_OUT_OF_BOUNDS', severity: 'ERROR', scope: 'TEMPLATE', path: `mechanic.targets[${i}].x`, message: `Hedef ${i + 1}: x 0-1 arasinda olmalidir` });
      if (t.y < 0 || t.y > 1) errors.push({ code: 'TARGET_Y_OUT_OF_BOUNDS', severity: 'ERROR', scope: 'TEMPLATE', path: `mechanic.targets[${i}].y`, message: `Hedef ${i + 1}: y 0-1 arasinda olmalidir` });
      if (t.radius < 0.02 || t.radius > 0.35) errors.push({ code: 'TARGET_RADIUS_EXTREME', severity: 'WARNING', scope: 'TEMPLATE', path: `mechanic.targets[${i}].radius`, message: `Hedef ${i + 1}: radius 0.02-0.35 arasinda olmalidir` });
      if (!t.hitBy || t.hitBy.length === 0) errors.push({ code: 'NO_HIT_BY', severity: 'ERROR', scope: 'TEMPLATE', path: `mechanic.targets[${i}].hitBy`, message: `Hedef ${i + 1}: hitBy bos olamaz` });
      if (!t.assetKey?.trim()) errors.push({ code: 'MISSING_TARGET_ASSET', severity: 'ERROR', scope: 'TEMPLATE', path: `mechanic.targets[${i}].assetKey`, message: `Hedef ${i + 1}: assetKey zorunludur` });
    });
  }

  if (m.spawn.intervalMs < 200) errors.push({ code: 'SPAWN_INTERVAL_TOO_SHORT', severity: 'ERROR', scope: 'TEMPLATE', path: 'mechanic.spawn.intervalMs', message: 'Spawn araligi en az 200ms olmalidir' });
  if (m.spawn.visibleMs < 500) errors.push({ code: 'VISIBLE_TOO_SHORT', severity: 'ERROR', scope: 'TEMPLATE', path: 'mechanic.spawn.visibleMs', message: 'Gorunme suresi en az 500ms olmalidir' });
  if (m.hitDetection.minConfidence < 0 || m.hitDetection.minConfidence > 1) errors.push({ code: 'INVALID_MIN_CONFIDENCE', severity: 'ERROR', scope: 'TEMPLATE', path: 'mechanic.hitDetection.minConfidence', message: 'minConfidence 0-1 arasinda olmalidir' });

  return { valid: errors.length === 0, publishable: errors.length === 0, errors, warnings };
}

// ============================================================================
// QUIZ VALIDATOR
// ============================================================================

function validateQuizMechanic(m: QuizMechanic): GameValidationResult {
  const errors: GameValidationIssue[] = [];
  const warnings: GameValidationIssue[] = [];

  if (!m.questions || m.questions.length === 0) {
    errors.push({ code: 'NO_QUESTIONS', severity: 'ERROR', scope: 'TEMPLATE', path: 'mechanic.questions', message: 'En az bir soru tanimlanmalidir' });
  } else {
    m.questions.forEach((q, i) => {
      if (!q.prompt?.trim()) errors.push({ code: 'MISSING_PROMPT', severity: 'ERROR', scope: 'TEMPLATE', path: `mechanic.questions[${i}].prompt`, message: `Soru ${i + 1}: prompt zorunludur` });
      if (!q.choices || q.choices.length < 2) errors.push({ code: 'TOO_FEW_CHOICES', severity: 'ERROR', scope: 'TEMPLATE', path: `mechanic.questions[${i}].choices`, message: `Soru ${i + 1}: en az 2 secenek olmalidir` });
      else if (q.choices.length > 6) errors.push({ code: 'TOO_MANY_CHOICES', severity: 'WARNING', scope: 'TEMPLATE', path: `mechanic.questions[${i}].choices`, message: `Soru ${i + 1}: en fazla 6 secenek onerilir` });
      if (q.correctIndex < 0 || (q.choices && q.correctIndex >= q.choices.length)) {
        errors.push({ code: 'INVALID_CORRECT_INDEX', severity: 'ERROR', scope: 'TEMPLATE', path: `mechanic.questions[${i}].correctIndex`, message: `Soru ${i + 1}: correctIndex gecersiz` });
      }
      if (q.points < 0) errors.push({ code: 'NEGATIVE_QUESTION_POINTS', severity: 'ERROR', scope: 'TEMPLATE', path: `mechanic.questions[${i}].points`, message: `Soru ${i + 1}: puan negatif olamaz` });
    });
  }

  return { valid: errors.length === 0, publishable: errors.length === 0, errors, warnings };
}

// ============================================================================
// STUDY VALIDATOR
// ============================================================================

function validateStudy(m: StudyMechanic): GameValidationResult {
  const errors: GameValidationIssue[] = [];
  const warnings: GameValidationIssue[] = [];

  const validTypes = ['FLASHCARD', 'MEMORY_MATCH', 'MATCH_PAIRS'];
  if (!validTypes.includes(m.studyType)) {
    errors.push({ code: 'INVALID_STUDY_TYPE', severity: 'ERROR', scope: 'TEMPLATE', path: 'mechanic.studyType', message: 'Gecersiz study tipi' });
  }

  if (m.studyType === 'FLASHCARD') {
    if (!m.cards || m.cards.length === 0) {
      errors.push({ code: 'NO_CARDS', severity: 'ERROR', scope: 'TEMPLATE', path: 'mechanic.cards', message: 'En az bir kart tanimlanmalidir' });
    } else {
      m.cards.forEach((c, i) => {
        const hasContent = (c.frontText?.trim()) || (c.backText?.trim()) || c.imageAssetKey || c.audioAssetKey;
        if (!hasContent) errors.push({ code: 'EMPTY_CARD', severity: 'ERROR', scope: 'TEMPLATE', path: `mechanic.cards[${i}]`, message: `Kart ${i + 1}: en az bir icerik alani doldurulmalidir` });
      });
    }
  } else {
    // MEMORY_MATCH / MATCH_PAIRS
    if (!m.pairs || m.pairs.length < 2) {
      errors.push({ code: 'TOO_FEW_PAIRS', severity: 'ERROR', scope: 'TEMPLATE', path: 'mechanic.pairs', message: 'En az 2 cift tanimlanmalidir' });
    } else {
      m.pairs.forEach((p, i) => {
        const leftHas = p.left.text || p.left.imageAssetKey || p.left.audioAssetKey;
        const rightHas = p.right.text || p.right.imageAssetKey || p.right.audioAssetKey;
        if (!leftHas || !rightHas) errors.push({ code: 'INCOMPLETE_PAIR', severity: 'ERROR', scope: 'TEMPLATE', path: `mechanic.pairs[${i}]`, message: `Cift ${i + 1}: her iki taraf da en az bir icerik icermelidir` });
      });
    }
  }

  return { valid: errors.length === 0, publishable: errors.length === 0, errors, warnings };
}

// ============================================================================
// HOLD VALIDATOR
// ============================================================================

function validateHold(m: HoldMechanic): GameValidationResult {
  const errors: GameValidationIssue[] = [];
  const warnings: GameValidationIssue[] = [];

  const validPoses = ['PLANK', 'BALANCE', 'CUSTOM'];
  if (!validPoses.includes(m.pose)) {
    errors.push({ code: 'INVALID_POSE', severity: 'ERROR', scope: 'TEMPLATE', path: 'mechanic.pose', message: 'Gecersiz poz. PLANK, BALANCE veya CUSTOM olmalidir' });
  }

  const holdErr = validateRange(m.targetHoldSec, 3, 300, 'mechanic.targetHoldSec', 'INVALID_HOLD_SEC', 'Hedef tutma suresi 3-300 sn arasinda olmalidir');
  if (holdErr) errors.push(holdErr);

  const graceErr = validateRange(m.graceMs, 0, 5000, 'mechanic.graceMs', 'INVALID_GRACE_MS', 'Grace ms 0-5000 arasinda olmalidir');
  if (graceErr) warnings.push({ ...graceErr, severity: 'WARNING' });

  const confErr = validateRange(m.minConfidence, 0, 1, 'mechanic.minConfidence', 'INVALID_MIN_CONFIDENCE', 'minConfidence 0-1 arasinda olmalidir');
  if (confErr) errors.push(confErr);

  return { valid: errors.length === 0, publishable: errors.length === 0, errors, warnings };
}

// ============================================================================
// RHYTHM VALIDATOR
// ============================================================================

function validateRhythm(m: RhythmMechanic): GameValidationResult {
  const errors: GameValidationIssue[] = [];
  const warnings: GameValidationIssue[] = [];

  const bpmErr = validateRange(m.bpm, 40, 220, 'mechanic.bpm', 'INVALID_BPM', 'BPM 40-220 arasinda olmalidir');
  if (bpmErr) errors.push(bpmErr);

  if (m.notes && m.notes.length > 0) {
    const ids = new Set<string>();
    m.notes.forEach((n, i) => {
      if (!n.noteId) errors.push({ code: 'MISSING_NOTE_ID', severity: 'ERROR', scope: 'TEMPLATE', path: `mechanic.notes[${i}].noteId`, message: `Nota ${i + 1}: noteId zorunludur` });
      else if (ids.has(n.noteId)) errors.push({ code: 'DUPLICATE_NOTE_ID', severity: 'ERROR', scope: 'TEMPLATE', path: `mechanic.notes[${i}].noteId`, message: `Nota ${i + 1}: noteId tekrar ediyor` });
      else ids.add(n.noteId);

      const winErr = validateRange(n.windowMs, 50, 2000, `mechanic.notes[${i}].windowMs`, 'INVALID_WINDOW', `Nota ${i + 1}: windowMs 50-2000 arasinda olmalidir`);
      if (winErr) errors.push(winErr);
    });
  }

  return { valid: errors.length === 0, publishable: errors.length === 0, errors, warnings };
}

// ============================================================================
// PROGRAM VALIDATOR
// ============================================================================

function validateProgram(m: ProgramMechanic): GameValidationResult {
  const errors: GameValidationIssue[] = [];
  const warnings: GameValidationIssue[] = [];

  if (!m.steps || m.steps.length === 0) {
    errors.push({ code: 'NO_STEPS', severity: 'ERROR', scope: 'TEMPLATE', path: 'mechanic.steps', message: 'En az bir adim tanimlanmalidir' });
  } else {
    const validStepTypes = ['INSTRUCTION', 'PLAY_GAME', 'MOTION_REPS', 'HOLD_POSE', 'REST'];
    m.steps.forEach((s, i) => {
      if (!validStepTypes.includes(s.type)) {
        errors.push({ code: 'INVALID_STEP_TYPE', severity: 'ERROR', scope: 'TEMPLATE', path: `mechanic.steps[${i}].type`, message: `Adim ${i + 1}: gecersiz tip: ${s.type}` });
      }
      if (!s.title?.trim()) {
        errors.push({ code: 'MISSING_STEP_TITLE', severity: 'ERROR', scope: 'TEMPLATE', path: `mechanic.steps[${i}].title`, message: `Adim ${i + 1}: baslik zorunludur` });
      }
      if (s.type === 'MOTION_REPS') {
        if (!s.motion) errors.push({ code: 'MISSING_MOTION', severity: 'ERROR', scope: 'TEMPLATE', path: `mechanic.steps[${i}].motion`, message: `Adim ${i + 1}: MOTION_REPS icin hareket zorunludur` });
        if (!s.targetCount || s.targetCount < 1) errors.push({ code: 'INVALID_TARGET_COUNT', severity: 'ERROR', scope: 'TEMPLATE', path: `mechanic.steps[${i}].targetCount`, message: `Adim ${i + 1}: targetCount en az 1 olmalidir` });
      }
      if (s.type === 'HOLD_POSE' && (!s.holdSec || s.holdSec < 1)) {
        errors.push({ code: 'INVALID_HOLD_SEC', severity: 'ERROR', scope: 'TEMPLATE', path: `mechanic.steps[${i}].holdSec`, message: `Adim ${i + 1}: HOLD_POSE icin holdSec en az 1 olmalidir` });
      }
      if ((s.type === 'REST' || s.type === 'INSTRUCTION') && (!s.durationSec || s.durationSec < 1)) {
        errors.push({ code: 'INVALID_DURATION', severity: 'ERROR', scope: 'TEMPLATE', path: `mechanic.steps[${i}].durationSec`, message: `Adim ${i + 1}: ${s.type} icin durationSec en az 1 olmalidir` });
      }
    });
  }

  return { valid: errors.length === 0, publishable: errors.length === 0, errors, warnings };
}
