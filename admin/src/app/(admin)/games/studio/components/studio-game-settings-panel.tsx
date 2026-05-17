'use client';

import type { CommonGameSettings, LivesSettings, DurationSettings, ScoringSettings, CompletionSettings, PresentationSettings, FeedbackSettings, GameMechanic } from '../../../../../lib/game-studio/game-settings';
import { createDefaultCommonSettings, createDefaultGameSettings } from '../../../../../lib/game-studio/game-settings';

interface Props {
  draft: any;
  level: any;
  onDraftChange: (draft: any) => void;
}

function getCommonSettings(draft: any, level: any): CommonGameSettings {
  const config = level?.config as Record<string, unknown> | undefined;
  const gs = config?.gameSettings as { common?: CommonGameSettings } | undefined;
  if (gs?.common) return gs.common;

  // Create from legacy fields
  const templateId = draft.template ?? 'SCENE_PLAY';
  const orientation = (draft.orientation ?? level?.config?.orientation ?? config?.orientation ?? 'LANDSCAPE') as 'PORTRAIT' | 'LANDSCAPE' | 'AUTO';
  const camera = (draft.cameraRequirement ?? config?.cameraRequirement ?? 'FULL_BODY') as 'FULL_BODY' | 'UPPER_BODY' | 'HAND_TARGET' | 'NONE';
  const legacyLives = (config?.lives as number) ?? 3;

  return createDefaultCommonSettings(templateId, {
    title: (draft.title ?? '') as string,
    description: (draft.description ?? '') as string,
    category: (draft.category ?? 'FUN') as 'FUN' | 'SPORT' | 'EDUCATION',
    lives: {
      mode: (legacyLives > 0 ? 'LIMITED' : 'NONE') as 'NONE' | 'LIMITED' | 'UNLIMITED',
      count: legacyLives,
      gracePeriodSec: (config?.gracePeriodSec as number) ?? 20,
      loseOnBadForm: (config?.loseOnBadForm as boolean) ?? false,
      loseOnExpire: (config?.loseOnExpire as boolean) ?? true,
      loseOnOutOfFrame: (config?.loseOnOutOfFrame as boolean) ?? false,
    },
    duration: {
      mode: ((level?.durationSec ?? 0) > 0 ? 'TIMED' : 'UNTIL_COMPLETE') as 'TIMED' | 'UNTIL_COMPLETE' | 'ENDLESS',
      sec: (level?.durationSec as number) ?? 60,
      countdownSec: (config?.countdownSec as number) ?? 3,
    },
    scoring: {
      targetScore: (level?.targetScore as number) ?? 0,
      pointsPerCorrect: 10,
      penaltyPerWrong: 5,
      comboEnabled: (config?.comboEnabled as boolean) ?? false,
      comboMultiplier: typeof config?.comboMultiplier === 'number' ? (config.comboMultiplier as number) : 0.1,
      maxComboMultiplier: 3.0,
      streakBonus: 0,
    },
    presentation: { orientation, cameraRequirement: camera, showTimer: true, showScore: true, showLives: legacyLives > 0, showCombo: true },
  });
}

function writeCommonSettings(draft: any, level: any, common: CommonGameSettings): any {
  const config = (level?.config ?? {}) as Record<string, unknown>;
  const existingGs = (config.gameSettings ?? {}) as Record<string, unknown>;
  // Mechanic yoksa template'e gore varsayilan olustur
  const mechanic = (existingGs.mechanic as GameMechanic | undefined)
    ?? createDefaultGameSettings(common.templateId).mechanic;
  const nextGs = { ...existingGs, common, mechanic, schemaVersion: '1.0' };

  // Also write legacy fields for backward compatibility
  const nextConfig: Record<string, unknown> = {
    ...config,
    gameSettings: nextGs,
    durationSec: common.duration.mode === 'TIMED' ? common.duration.sec : 0,
    targetScore: common.scoring.targetScore,
    lives: common.lives.mode === 'LIMITED' ? common.lives.count : (common.lives.mode === 'UNLIMITED' ? 999 : 0),
    orientation: common.presentation.orientation,
    cameraRequirement: common.presentation.cameraRequirement,
    category: common.category,
    gracePeriodSec: common.lives.gracePeriodSec,
    loseOnBadForm: common.lives.loseOnBadForm,
    loseOnExpire: common.lives.loseOnExpire,
    loseOnOutOfFrame: common.lives.loseOnOutOfFrame,
    comboEnabled: common.scoring.comboEnabled,
    comboMultiplier: common.scoring.comboMultiplier,
  };

  const nextDraft = {
    ...draft,
    title: common.title,
    description: common.description,
    category: common.category,
    orientation: common.presentation.orientation,
    cameraRequirement: common.presentation.cameraRequirement,
    levels: [{ ...level!, config: nextConfig }],
  };
  return nextDraft;
}

export function StudioGameSettingsPanel({ draft, level, onDraftChange }: Props) {
  const common = getCommonSettings(draft, level);

  const update = (patch: Partial<CommonGameSettings>) => {
    const next = { ...common, ...patch };
    onDraftChange(writeCommonSettings(draft, level, next));
  };

  const updateLives = (p: Partial<LivesSettings>) => update({ lives: { ...common.lives, ...p } });
  const updateDuration = (p: Partial<DurationSettings>) => update({ duration: { ...common.duration, ...p } });
  const updateScoring = (p: Partial<ScoringSettings>) => update({ scoring: { ...common.scoring, ...p } });
  const updateCompletion = (p: Partial<CompletionSettings>) => update({ completion: { ...common.completion, ...p } });
  const updatePresentation = (p: Partial<PresentationSettings>) => update({ presentation: { ...common.presentation, ...p } });
  const updateFeedback = (p: Partial<FeedbackSettings>) => update({ feedback: { ...common.feedback, ...p } });

  return (
    <div className="stack" style={{ gap: 'var(--space-lg)' }}>
      {/* Can Sistemi */}
      <section>
        <h4 className="eyebrow">Can Sistemi</h4>
        <div className="field-grid">
          <label className="field">
            <span>Can Modu</span>
            <select value={common.lives.mode} onChange={e => updateLives({ mode: e.target.value as LivesSettings['mode'] })}>
              <option value="NONE">Cansız</option>
              <option value="LIMITED">Limitli Can</option>
              <option value="UNLIMITED">Sınırsız Can</option>
            </select>
          </label>
          {common.lives.mode === 'LIMITED' && (
            <label className="field">
              <span>Can Sayısı</span>
              <input type="number" min={1} max={10} value={common.lives.count}
                onChange={e => updateLives({ count: parseInt(e.target.value) || 3 })} />
            </label>
          )}
          <label className="field">
            <span>Grace Period (sn)</span>
            <input type="number" min={0} max={60} value={common.lives.gracePeriodSec}
              onChange={e => updateLives({ gracePeriodSec: parseInt(e.target.value) || 0 })} />
          </label>
        </div>
        {common.lives.mode !== 'NONE' && (
          <div className="field-grid" style={{ marginTop: 8 }}>
            <label className="field"><span className="checkbox-label">
              <input type="checkbox" checked={common.lives.loseOnBadForm} onChange={e => updateLives({ loseOnBadForm: e.target.checked })} />
              Yanlış formda can eksilt
            </span></label>
            <label className="field"><span className="checkbox-label">
              <input type="checkbox" checked={common.lives.loseOnExpire} onChange={e => updateLives({ loseOnExpire: e.target.checked })} />
              Nesne kaçınca can eksilt
            </span></label>
            <label className="field"><span className="checkbox-label">
              <input type="checkbox" checked={common.lives.loseOnOutOfFrame} onChange={e => updateLives({ loseOnOutOfFrame: e.target.checked })} />
              Kadraj dışı can eksilt
            </span></label>
          </div>
        )}
      </section>

      {/* Süre */}
      <section>
        <h4 className="eyebrow">Süre</h4>
        <div className="field-grid">
          <label className="field">
            <span>Süre Modu</span>
            <select value={common.duration.mode} onChange={e => updateDuration({ mode: e.target.value as DurationSettings['mode'] })}>
              <option value="TIMED">Süreli</option>
              <option value="UNTIL_COMPLETE">Görev Tamamlanana Kadar</option>
              <option value="ENDLESS">Sınırsız</option>
            </select>
          </label>
          {common.duration.mode === 'TIMED' && (
            <label className="field">
              <span>Süre (saniye)</span>
              <input type="number" min={5} max={900} value={common.duration.sec}
                onChange={e => updateDuration({ sec: parseInt(e.target.value) || 60 })} />
            </label>
          )}
          <label className="field">
            <span>Geri Sayım (sn)</span>
            <input type="number" min={0} max={10} value={common.duration.countdownSec}
              onChange={e => updateDuration({ countdownSec: parseInt(e.target.value) || 0 })} />
          </label>
        </div>
      </section>

      {/* Skorlama */}
      <section>
        <h4 className="eyebrow">Skorlama</h4>
        <div className="field-grid">
          <label className="field">
            <span>Hedef Skor</span>
            <input type="number" min={0} value={common.scoring.targetScore}
              onChange={e => updateScoring({ targetScore: parseInt(e.target.value) || 0 })} />
          </label>
          <label className="field">
            <span>Doğru Hareket Puanı</span>
            <input type="number" min={0} value={common.scoring.pointsPerCorrect}
              onChange={e => updateScoring({ pointsPerCorrect: parseInt(e.target.value) || 0 })} />
          </label>
          <label className="field">
            <span>Yanlış Ceza Puanı</span>
            <input type="number" min={0} value={common.scoring.penaltyPerWrong}
              onChange={e => updateScoring({ penaltyPerWrong: parseInt(e.target.value) || 0 })} />
          </label>
        </div>
        <div className="field-grid" style={{ marginTop: 8 }}>
          <label className="field"><span className="checkbox-label">
            <input type="checkbox" checked={common.scoring.comboEnabled}
              onChange={e => updateScoring({ comboEnabled: e.target.checked })} />
            Kombo aktif
          </span></label>
          {common.scoring.comboEnabled && (
            <>
              <label className="field">
                <span>Kombo Çarpanı</span>
                <input type="number" min={0.1} max={1} step={0.1} value={common.scoring.comboMultiplier}
                  onChange={e => updateScoring({ comboMultiplier: parseFloat(e.target.value) || 0.1 })} />
              </label>
              <label className="field">
                <span>Max Çarpan</span>
                <input type="number" min={1} max={10} step={0.5} value={common.scoring.maxComboMultiplier}
                  onChange={e => updateScoring({ maxComboMultiplier: parseFloat(e.target.value) || 3 })} />
              </label>
            </>
          )}
        </div>
      </section>

      {/* Bitiş Koşulu */}
      <section>
        <h4 className="eyebrow">Bitiş Koşulu</h4>
        <div className="field-grid">
          <label className="field">
            <span>Birincil Koşul</span>
            <select value={common.completion.primary} onChange={e => updateCompletion({ primary: e.target.value as CompletionSettings['primary'] })}>
              <option value="DURATION">Süre Dolunca</option>
              <option value="SCORE_TARGET">Hedef Skora Ulaşınca</option>
              <option value="ALL_TASKS_DONE">Tüm Görevler Tamamlanınca</option>
              <option value="LIVES_DEPLETED">Canlar Bitince</option>
              <option value="MANUAL">Manuel Durdurma</option>
            </select>
          </label>
          <label className="field"><span className="checkbox-label">
            <input type="checkbox" checked={common.completion.allowEarlyFinish}
              onChange={e => updateCompletion({ allowEarlyFinish: e.target.checked })} />
            Erken bitişe izin ver
          </span></label>
          <label className="field"><span className="checkbox-label">
            <input type="checkbox" checked={common.completion.showResultScreen}
              onChange={e => updateCompletion({ showResultScreen: e.target.checked })} />
            Sonuç ekranı göster
          </span></label>
        </div>
      </section>

      {/* Sunum */}
      <section>
        <h4 className="eyebrow">Sunum</h4>
        <div className="field-grid">
          <label className="field">
            <span>Ekran Yönü</span>
            <select value={common.presentation.orientation} onChange={e => updatePresentation({ orientation: e.target.value as 'PORTRAIT' | 'LANDSCAPE' | 'AUTO' })}>
              <option value="PORTRAIT">Dikey</option>
              <option value="LANDSCAPE">Yatay</option>
              <option value="AUTO">Otomatik</option>
            </select>
          </label>
          <label className="field">
            <span>Kamera Gereksinimi</span>
            <select value={common.presentation.cameraRequirement} onChange={e => updatePresentation({ cameraRequirement: e.target.value as 'FULL_BODY' | 'UPPER_BODY' | 'HAND_TARGET' | 'NONE' })}>
              <option value="FULL_BODY">Tam Vücut</option>
              <option value="UPPER_BODY">Üst Vücut</option>
              <option value="HAND_TARGET">El Hedef</option>
              <option value="NONE">Kamera Yok</option>
            </select>
          </label>
        </div>
        <div className="field-grid" style={{ marginTop: 8 }}>
          <label className="field"><span className="checkbox-label">
            <input type="checkbox" checked={common.presentation.showTimer} onChange={e => updatePresentation({ showTimer: e.target.checked })} />
            Zamanlayıcı göster
          </span></label>
          <label className="field"><span className="checkbox-label">
            <input type="checkbox" checked={common.presentation.showScore} onChange={e => updatePresentation({ showScore: e.target.checked })} />
            Skor göster
          </span></label>
          <label className="field"><span className="checkbox-label">
            <input type="checkbox" checked={common.presentation.showLives} onChange={e => updatePresentation({ showLives: e.target.checked })} />
            Can göster
          </span></label>
          <label className="field"><span className="checkbox-label">
            <input type="checkbox" checked={common.presentation.showCombo} onChange={e => updatePresentation({ showCombo: e.target.checked })} />
            Kombo göster
          </span></label>
        </div>
      </section>

      {/* Geri Bildirim */}
      <section>
        <h4 className="eyebrow">Geri Bildirim</h4>
        <div className="field-grid">
          <label className="field"><span className="checkbox-label">
            <input type="checkbox" checked={common.feedback.visualEffectOnCorrect} onChange={e => updateFeedback({ visualEffectOnCorrect: e.target.checked })} />
            Doğru harekette görsel efekt
          </span></label>
          <label className="field"><span className="checkbox-label">
            <input type="checkbox" checked={common.feedback.visualEffectOnWrong} onChange={e => updateFeedback({ visualEffectOnWrong: e.target.checked })} />
            Yanlış harekette görsel efekt
          </span></label>
          <label className="field"><span className="checkbox-label">
            <input type="checkbox" checked={common.feedback.vibrateOnCorrect} onChange={e => updateFeedback({ vibrateOnCorrect: e.target.checked })} />
            Doğru harekette titreşim
          </span></label>
          <label className="field"><span className="checkbox-label">
            <input type="checkbox" checked={common.feedback.vibrateOnWrong} onChange={e => updateFeedback({ vibrateOnWrong: e.target.checked })} />
            Yanlış harekette titreşim
          </span></label>
          <label className="field"><span className="checkbox-label">
            <input type="checkbox" checked={common.feedback.soundOnCorrect} onChange={e => updateFeedback({ soundOnCorrect: e.target.checked })} />
            Doğru harekette ses
          </span></label>
          <label className="field"><span className="checkbox-label">
            <input type="checkbox" checked={common.feedback.soundOnWrong} onChange={e => updateFeedback({ soundOnWrong: e.target.checked })} />
            Yanlış harekette ses
          </span></label>
          <label className="field"><span className="checkbox-label">
            <input type="checkbox" checked={common.feedback.showPromptText} onChange={e => updateFeedback({ showPromptText: e.target.checked })} />
            Yönerge metni göster
          </span></label>
          <label className="field">
            <span>Yönerge Stratejisi</span>
            <select value={common.feedback.promptUpdateStrategy} onChange={e => updateFeedback({ promptUpdateStrategy: e.target.value as 'ON_CHANGE' | 'ALWAYS_VISIBLE' | 'HIDDEN' })}>
              <option value="ON_CHANGE">Değişince Göster</option>
              <option value="ALWAYS_VISIBLE">Her Zaman Görünür</option>
              <option value="HIDDEN">Gizli</option>
            </select>
          </label>
        </div>
      </section>
    </div>
  );
}
