// Template-specific validators for POSE_CONTACT_TARGETS, POSE_HOLD, RHYTHM_MOTION, QUIZ, FLASHCARD, MEMORY_MATCH

import { GameValidationIssue, GameValidationResult, okResult, failResult, POSE_KEYPOINTS } from '../validation-result';

type JsonObject = Record<string, unknown>;

// ---- POSE_CONTACT_TARGETS ----
export function validatePoseContactTargets(config: JsonObject, assetKeys: Set<string>): GameValidationResult {
  const errors: GameValidationIssue[] = [];
  const warnings: GameValidationIssue[] = [];
  const path = '$.config';

  const targets = config.targets as JsonObject[] | undefined;
  if (!targets || targets.length === 0) {
    errors.push({
      code: 'POSE_TARGETS_REQUIRED', severity: 'ERROR', scope: 'TEMPLATE',
      path: `${path}.targets`,
      message: 'En az bir temas hedefi (contact target) tanimlanmalidir. targets dizisine en az bir hedef nesne ekleyin.'
    });
  } else {
    const targetIds = new Set<string>();
    targets.forEach((target, index) => {
      const tp = `${path}.targets[${index}]`;
      const targetId = target.targetId as string | undefined;
      if (!targetId?.trim()) {
        errors.push({
          code: 'POSE_TARGET_ID_REQUIRED', severity: 'ERROR', scope: 'TEMPLATE',
          path: `${tp}.targetId`,
          message: `Hedef #${index + 1} icin targetId zorunludur.`
        });
      } else if (targetIds.has(targetId)) {
        errors.push({
          code: 'POSE_TARGET_ID_DUPLICATE', severity: 'ERROR', scope: 'TEMPLATE',
          path: `${tp}.targetId`,
          message: `"${targetId}" targetId degeri birden fazla hedefte kullanilmis. Her hedefin targetId degeri benzersiz olmalidir.`
        });
      }
      if (targetId) targetIds.add(targetId);

      const x = target.x as number | undefined;
      if (x === undefined || x < 0 || x > 1) {
        errors.push({
          code: 'POSE_TARGET_X_INVALID', severity: 'ERROR', scope: 'TEMPLATE',
          path: `${tp}.x`,
          message: `Hedef #${index + 1} icin x konumu 0 ile 1 arasinda olmalidir (ekranin sol-sag orani).`
        });
      }
      const y = target.y as number | undefined;
      if (y === undefined || y < 0 || y > 1) {
        errors.push({
          code: 'POSE_TARGET_Y_INVALID', severity: 'ERROR', scope: 'TEMPLATE',
          path: `${tp}.y`,
          message: `Hedef #${index + 1} icin y konumu 0 ile 1 arasinda olmalidir (ekranin ust-alt orani).`
        });
      }

      const hitBy = target.hitBy as string[] | undefined;
      if (!hitBy || hitBy.length === 0) {
        errors.push({
          code: 'POSE_TARGET_HITBY_REQUIRED', severity: 'ERROR', scope: 'TEMPLATE',
          path: `${tp}.hitBy`,
          message: `Hedef #${index + 1} icin hitBy alani zorunludur. Hedefe hangi vucut noktasiyla dokunulacagini belirtin (orn: "LEFT_WRIST", "RIGHT_WRIST").`
        });
      } else {
        hitBy.forEach((kp, ki) => {
          if (!POSE_KEYPOINTS.has(kp)) {
            errors.push({
              code: 'POSE_TARGET_HITBY_INVALID', severity: 'ERROR', scope: 'TEMPLATE',
              path: `${tp}.hitBy[${ki}]`,
              message: `"${kp}" gecerli bir vucut noktasi degil. Gecerli noktalar: LEFT_WRIST, RIGHT_WRIST, LEFT_INDEX, RIGHT_INDEX, LEFT_ELBOW, RIGHT_ELBOW, NOSE vb.`
            });
          }
        });
      }

      const assetKey = target.assetKey as string | undefined;
      if (assetKey && assetKeys.size > 0 && !assetKeys.has(assetKey)) {
        errors.push({
          code: 'POSE_TARGET_ASSET_MISSING', severity: 'ERROR', scope: 'ASSET',
          path: `${tp}.assetKey`,
          message: `"${assetKey}" asset'i Asset Library'de bulunamadi. Once asset'i yukleyin veya mevcut bir asset key kullanin.`
        });
      }
    });
  }

  return errors.length === 0 ? okResult(warnings) : failResult(errors, warnings);
}

// ---- POSE_HOLD ----
export function validatePoseHold(config: JsonObject, assetKeys: Set<string>): GameValidationResult {
  const errors: GameValidationIssue[] = [];
  const warnings: GameValidationIssue[] = [];
  const path = '$.config.hold';

  const hold = config.hold as JsonObject | undefined;
  if (!hold) {
    errors.push({
      code: 'POSEHOLD_CONFIG_REQUIRED', severity: 'ERROR', scope: 'TEMPLATE',
      path: '$.config.hold',
      message: 'POSE_HOLD template\'i icin "hold" yapilandirmasi zorunludur. Tutus suresi ve poz bilgilerini girin.'
    });
    return failResult(errors, warnings);
  }

  const targetHoldSec = hold.targetHoldSec as number | undefined;
  if (targetHoldSec === undefined || targetHoldSec < 3 || targetHoldSec > 300) {
    errors.push({
      code: 'POSEHOLD_DURATION_INVALID', severity: 'ERROR', scope: 'TEMPLATE',
      path: `${path}.targetHoldSec`,
      message: 'Tutus suresi (targetHoldSec) 3-300 saniye arasinda olmalidir.'
    });
  }

  const graceMs = hold.graceMs as number | undefined;
  if (graceMs !== undefined && (graceMs < 0 || graceMs > 5000)) {
    errors.push({
      code: 'POSEHOLD_GRACE_INVALID', severity: 'ERROR', scope: 'TEMPLATE',
      path: `${path}.graceMs`,
      message: 'Tolerans suresi (graceMs) 0-5000 milisaniye arasinda olmalidir.'
    });
  }

  const minConfidence = hold.minConfidence as number | undefined;
  if (minConfidence !== undefined && (minConfidence < 0 || minConfidence > 1)) {
    errors.push({
      code: 'POSEHOLD_CONFIDENCE_INVALID', severity: 'ERROR', scope: 'TEMPLATE',
      path: `${path}.minConfidence`,
      message: 'Minimum guven orani (minConfidence) 0 ile 1 arasinda olmalidir.'
    });
  }

  const pose = hold.pose as string | undefined;
  if (pose && !['PLANK', 'BALANCE', 'CUSTOM'].includes(pose)) {
    errors.push({
      code: 'POSEHOLD_POSE_INVALID', severity: 'ERROR', scope: 'TEMPLATE',
      path: `${path}.pose`,
      message: `Poz "${pose}" gecersiz. PLANK, BALANCE veya CUSTOM degerlerinden birini kullanin.`
    });
  }

  const cameraReq = (config.cameraRequirement as string) || 'FULL_BODY';
  if (cameraReq !== 'FULL_BODY') {
    warnings.push({
      code: 'POSEHOLD_CAMERA_WARNING', severity: 'WARNING', scope: 'TEMPLATE',
      path: '$.config.cameraRequirement',
      message: 'POSE_HOLD icin Tum Vucut (FULL_BODY) kamera modu onerilir.'
    });
  }

  return errors.length === 0 ? okResult(warnings) : failResult(errors, warnings);
}

// ---- RHYTHM_MOTION ----
export function validateRhythmMotion(config: JsonObject, assetKeys: Set<string>): GameValidationResult {
  const errors: GameValidationIssue[] = [];
  const warnings: GameValidationIssue[] = [];
  const path = '$.config';

  const notes = config.notes as JsonObject[] | undefined;
  if (notes && notes.length > 0) {
    const noteIds = new Set<string>();
    notes.forEach((note, index) => {
      const np = `${path}.notes[${index}]`;
      const noteId = note.noteId as string | undefined;
      if (noteId && noteIds.has(noteId)) {
        errors.push({
          code: 'RHYTHM_NOTE_ID_DUPLICATE', severity: 'ERROR', scope: 'TEMPLATE',
          path: `${np}.noteId`,
          message: `"${noteId}" nota kimligi birden fazla notada kullanilmis. Her nota benzersiz bir noteId degerine sahip olmalidir.`
        });
      }
      if (noteId) noteIds.add(noteId);

      const windowMs = note.windowMs as number | undefined;
      if (windowMs !== undefined && (windowMs < 50 || windowMs > 2000)) {
        errors.push({
          code: 'RHYTHM_WINDOW_INVALID', severity: 'ERROR', scope: 'TEMPLATE',
          path: `${np}.windowMs`,
          message: 'Zaman penceresi (windowMs) 50-2000 milisaniye arasinda olmalidir.'
        });
      }
    });
  }

  const bpm = config.bpm as number | undefined;
  if (bpm !== undefined && (bpm < 40 || bpm > 220)) {
    errors.push({
      code: 'RHYTHM_BPM_INVALID', severity: 'ERROR', scope: 'TEMPLATE',
      path: `${path}.bpm`,
      message: 'BPM degeri 40-220 arasinda olmalidir.'
    });
  }

  return errors.length === 0 ? okResult(warnings) : failResult(errors, warnings);
}

// ---- QUIZ ----
export function validateQuiz(config: JsonObject, assetKeys: Set<string>): GameValidationResult {
  const errors: GameValidationIssue[] = [];
  const path = '$.config';

  const questions = config.questions as JsonObject[] | undefined;
  if (!questions || questions.length === 0) {
    errors.push({
      code: 'QUIZ_QUESTIONS_REQUIRED', severity: 'ERROR', scope: 'TEMPLATE',
      path: `${path}.questions`,
      message: 'QUIZ template\'i icin en az bir soru tanimlanmalidir.'
    });
    return failResult(errors);
  }

  questions.forEach((q, qi) => {
    const qp = `${path}.questions[${qi}]`;
    if (!(q.prompt as string)?.trim()) {
      errors.push({
        code: 'QUIZ_PROMPT_REQUIRED', severity: 'ERROR', scope: 'TEMPLATE',
        path: `${qp}.prompt`,
        message: `Soru #${qi + 1} icin soru metni (prompt) zorunludur.`
      });
    }
    const choices = q.choices as string[] | undefined;
    if (!choices || choices.length < 2 || choices.length > 6) {
      errors.push({
        code: 'QUIZ_CHOICES_INVALID', severity: 'ERROR', scope: 'TEMPLATE',
        path: `${qp}.choices`,
        message: `Soru #${qi + 1} icin 2-6 arasi secenek tanimlanmalidir.`
      });
    }
    const correctIndex = q.correctIndex as number | undefined;
    if (correctIndex !== undefined && choices && (correctIndex < 0 || correctIndex >= choices.length)) {
      errors.push({
        code: 'QUIZ_CORRECT_OUT_OF_RANGE', severity: 'ERROR', scope: 'TEMPLATE',
        path: `${qp}.correctIndex`,
        message: `Soru #${qi + 1} icin dogru cevap indeksi (correctIndex) 0-${choices.length - 1} arasinda olmalidir.`
      });
    }
  });

  return errors.length === 0 ? okResult() : failResult(errors);
}

// ---- FLASHCARD ----
export function validateFlashcard(config: JsonObject, assetKeys: Set<string>): GameValidationResult {
  const errors: GameValidationIssue[] = [];
  const path = '$.config';

  const cards = config.cards as JsonObject[] | undefined;
  if (!cards || cards.length === 0) {
    errors.push({
      code: 'FLASHCARD_CARDS_REQUIRED', severity: 'ERROR', scope: 'TEMPLATE',
      path: `${path}.cards`,
      message: 'FLASHCARD template\'i icin en az bir kart tanimlanmalidir.'
    });
    return failResult(errors);
  }

  cards.forEach((card, ci) => {
    const cp = `${path}.cards[${ci}]`;
    const hasFrontText = !!(card.frontText as string)?.trim();
    const hasBackText = !!(card.backText as string)?.trim();
    const hasImage = !!(card.imageAssetKey as string);
    const hasAudio = !!(card.audioAssetKey as string);
    if (!hasFrontText && !hasBackText && !hasImage && !hasAudio) {
      errors.push({
        code: 'FLASHCARD_CONTENT_REQUIRED', severity: 'ERROR', scope: 'TEMPLATE',
        path: `${cp}`,
        message: `Kart #${ci + 1} icin en az bir icerik turu gereklidir: on yazi (frontText), arka yazi (backText), gorsel (imageAssetKey) veya ses (audioAssetKey).`
      });
    }
  });

  return errors.length === 0 ? okResult() : failResult(errors);
}

// ---- MEMORY_MATCH ----
export function validateMemoryMatch(config: JsonObject, assetKeys: Set<string>): GameValidationResult {
  const errors: GameValidationIssue[] = [];
  const path = '$.config';

  const pairs = config.pairs as JsonObject[] | undefined;
  if (!pairs || pairs.length < 2) {
    errors.push({
      code: 'MEMORY_PAIRS_REQUIRED', severity: 'ERROR', scope: 'TEMPLATE',
      path: `${path}.pairs`,
      message: 'MEMORY_MATCH template\'i icin en az 2 eslestirme cifti tanimlanmalidir.'
    });
    return failResult(errors);
  }

  pairs.forEach((pair, pi) => {
    const pp = `${path}.pairs[${pi}]`;
    const left = pair.left as JsonObject | undefined;
    const right = pair.right as JsonObject | undefined;
    if (!left && !right) {
      errors.push({
        code: 'MEMORY_PAIR_INVALID', severity: 'ERROR', scope: 'TEMPLATE',
        path: pp,
        message: `Eslestirme #${pi + 1} icin sol (left) ve sag (right) nesneleri tanimlanmalidir.`
      });
    } else {
      [left, right].forEach((side, si) => {
        if (!side) return;
        const hasText = !!(side.text as string)?.trim();
        const hasImage = !!(side.imageAssetKey as string);
        const hasAudio = !!(side.audioAssetKey as string);
        if (!hasText && !hasImage && !hasAudio) {
          errors.push({
            code: 'MEMORY_SIDE_CONTENT_REQUIRED', severity: 'ERROR', scope: 'TEMPLATE',
            path: `${pp}.${si === 0 ? 'left' : 'right'}`,
            message: `Eslestirme #${pi + 1} ${si === 0 ? 'sol' : 'sag'} tarafi icin en az bir icerik gereklidir: yazi (text), gorsel (imageAssetKey) veya ses (audioAssetKey).`
          });
        }
      });
    }
  });

  return errors.length === 0 ? okResult() : failResult(errors);
}
