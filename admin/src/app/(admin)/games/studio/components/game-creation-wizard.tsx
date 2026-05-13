'use client';

import { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getPresetById } from '../../../../../lib/game-studio/presets';
import { recipeToGameDefinition } from '../../../../../lib/game-studio/recipe-to-definition';
import { validateRecipeLocally } from '../../../../../lib/game-studio/validation-copy';
import { createGameDefinition } from '../../../../../lib/alba-api';
import { MobileGamePreview } from './mobile-game-preview';
import { MockMotionConsole } from './mock-motion-console';
import { AssetPickerModal } from './asset-picker-modal';
import type { GameRecipe, WizardStep, StudioValidationIssue, PreviewState, MockMotionEvent } from '../../../../../lib/game-studio/types';
import type { GameDefinitionDraft } from '../../../../../lib/alba-api';
import { createInitialPreviewState, simulateRecipeEvent } from '../../../../../lib/game-studio/preview-engine';

const STEP_LABELS: Record<WizardStep, string> = {
  TYPE: 'Oyun Tipi',
  TEMPLATE: 'Şablon',
  BASIC: 'Temel Bilgiler',
  RULES: 'Kurallar',
  ASSETS: 'Görseller',
  REVIEW: 'Kontrol & Yayın'
};

const STEP_ORDER: WizardStep[] = ['TYPE', 'TEMPLATE', 'BASIC', 'RULES', 'ASSETS', 'REVIEW'];

interface WizardProps {
  presetId: string;
}

export function GameCreationWizard({ presetId }: WizardProps) {
  const router = useRouter();
  const preset = getPresetById(presetId);

  const [step, setStep] = useState<WizardStep>('BASIC');
  const [recipe, setRecipe] = useState<GameRecipe>(() => {
    if (!preset) throw new Error(`Preset not found: ${presetId}`);
    return JSON.parse(JSON.stringify(preset.recipe));
  });
  const [draft, setDraft] = useState<GameDefinitionDraft | null>(null);
  const [previewState, setPreviewState] = useState<PreviewState>(() => createInitialPreviewState(recipe));
  const [issues, setIssues] = useState<StudioValidationIssue[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [draftId, setDraftId] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);

  if (!preset) {
    return (
      <div className="panel" style={{ textAlign: 'center', padding: '3rem' }}>
        <p className="muted">Şablon bulunamadı. Lütfen geçerli bir preset seçin.</p>
        <button className="secondary-button" onClick={() => router.push('/games/new')}>
          Şablon Galerisine Dön
        </button>
      </div>
    );
  }

  const runValidation = useCallback((r: GameRecipe) => {
    const localIssues = validateRecipeLocally(r);
    setIssues(localIssues);
  }, []);

  const updateRecipe = (updates: Partial<GameRecipe>) => {
    const next = { ...recipe, ...updates } as GameRecipe;
    setRecipe(next);
    runValidation(next);
  };

  const updateCommandReaction = (field: string, value: unknown) => {
    if (recipe.kind !== 'COMMAND_REACTION') return;
    updateRecipe({ [field]: value });
  };

  const handleMotionEvent = (event: MockMotionEvent) => {
    setPreviewState((prev) => simulateRecipeEvent(prev, event, recipe));
  };

  const handleSaveDraft = async () => {
    setIsBusy(true);
    setMessage('');
    try {
      const gameDraft = recipeToGameDefinition(recipe);
      if (coverUrl) {
        gameDraft.assets = { ...gameDraft.assets, cover: coverUrl };
      }
      setDraft(gameDraft);

      if (draftId) {
        const { updateGameDefinition } = await import('../../../../../lib/alba-api');
        await updateGameDefinition(draftId, gameDraft);
        setMessage('Taslak güncellendi.');
      } else {
        const result = await createGameDefinition(gameDraft);
        setDraftId(result.id);
        setMessage(`Taslak kaydedildi. ID: ${result.id}`);
      }
    } catch (err: any) {
      setMessage(`Hata: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const currentStepIndex = STEP_ORDER.indexOf(step);

  const goToStep = (target: WizardStep) => setStep(target);
  const nextStep = () => {
    const idx = STEP_ORDER.indexOf(step);
    if (idx < STEP_ORDER.length - 1) setStep(STEP_ORDER[idx + 1]);
  };
  const prevStep = () => {
    const idx = STEP_ORDER.indexOf(step);
    if (idx > 0) setStep(STEP_ORDER[idx - 1]);
  };

  const errors = issues.filter((i) => i.severity === 'ERROR');
  const warnings = issues.filter((i) => i.severity === 'WARNING');

  return (
    <div className="wizard-container">
      {/* Step Indicator */}
      <div className="wizard-stepper">
        {STEP_ORDER.map((s, i) => (
          <button
            key={s}
            type="button"
            className={`wizard-step-dot ${i === currentStepIndex ? 'wizard-step-active' : ''} ${i < currentStepIndex ? 'wizard-step-done' : ''}`}
            onClick={() => i <= currentStepIndex && goToStep(s)}
            disabled={i > currentStepIndex}
          >
            <span className="wizard-step-num">{i + 1}</span>
            <span className="wizard-step-label">{STEP_LABELS[s]}</span>
          </button>
        ))}
      </div>

      <div className="workspace-layout" style={{ marginTop: 24 }}>
        {/* Left: Form */}
        <div style={{ minWidth: 0 }}>
          <div className="panel">
            <div className="eyebrow">{STEP_LABELS[step]}</div>

            {/* BASIC Step */}
            {step === 'BASIC' && (
              <div className="stack">
                <label className="field">
                  <span>Oyun Adı</span>
                  <input
                    value={recipe.title}
                    onChange={(e) => updateRecipe({ title: e.target.value })}
                    placeholder="örn: Deve-Cüce Refleks"
                  />
                </label>
                <label className="field">
                  <span>Açıklama</span>
                  <textarea
                    rows={3}
                    value={recipe.description}
                    onChange={(e) => updateRecipe({ description: e.target.value })}
                    placeholder="Oyunun kısa açıklaması..."
                  />
                </label>

                <div className="field-grid">
                  {'category' in recipe && (
                    <label className="field">
                      <span>Kategori</span>
                      <select
                        value={(recipe as any).category ?? 'FUN'}
                        onChange={(e) => updateRecipe({ category: e.target.value as any } as any)}
                      >
                        <option value="FUN">Eğlence</option>
                        <option value="SPORT">Spor</option>
                        <option value="EDUCATION">Eğitim</option>
                      </select>
                    </label>
                  )}

                  {'durationSec' in recipe && (
                    <label className="field">
                      <span>Süre (saniye)</span>
                      <input
                        type="number"
                        min={5}
                        max={600}
                        value={(recipe as any).durationSec ?? 60}
                        onChange={(e) => updateRecipe({ durationSec: parseInt(e.target.value) || 60 } as any)}
                      />
                    </label>
                  )}

                  {recipe.kind === 'HOLD_CHALLENGE' && (
                    <>
                      <label className="field">
                        <span>Toplam Süre (sn)</span>
                        <input
                          type="number"
                          min={5}
                          max={600}
                          value={recipe.totalDurationSec}
                          onChange={(e) => updateRecipe({ totalDurationSec: parseInt(e.target.value) || 45 } as any)}
                        />
                      </label>
                    </>
                  )}

                  {'cameraRequirement' in recipe && (
                    <label className="field">
                      <span>Kamera Gereksinimi</span>
                      <select
                        value={(recipe as any).cameraRequirement ?? 'FULL_BODY'}
                        onChange={(e) => updateRecipe({ cameraRequirement: e.target.value as any } as any)}
                      >
                        <option value="FULL_BODY">Tam Vücut</option>
                        <option value="UPPER_BODY">Üst Vücut</option>
                        <option value="HAND_TARGET">El Hedef</option>
                      </select>
                    </label>
                  )}

                  <label className="field">
                    <span>Yön</span>
                    <select
                      value={(recipe as any).orientation ?? 'PORTRAIT'}
                      onChange={(e) => updateRecipe({ orientation: e.target.value as any } as any)}
                    >
                      <option value="PORTRAIT">Dikey</option>
                      <option value="LANDSCAPE">Yatay</option>
                    </select>
                  </label>
                </div>
              </div>
            )}

            {/* RULES Step */}
            {step === 'RULES' && recipe.kind === 'COMMAND_REACTION' && (
              <div className="stack">
                <div className="field-grid">
                  <label className="field">
                    <span>Can Hakkı</span>
                    <input
                      type="number" min={1} max={10}
                      value={recipe.lives}
                      onChange={(e) => updateCommandReaction('lives', parseInt(e.target.value) || 3)}
                    />
                  </label>
                  <label className="field">
                    <span>Yanlış Hareket Cezası</span>
                    <input
                      type="number" min={0} max={50}
                      value={recipe.wrongMovePenalty}
                      onChange={(e) => updateCommandReaction('wrongMovePenalty', parseInt(e.target.value) || 5)}
                    />
                  </label>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      Komutlar ({recipe.commands.length})
                    </span>
                    <button
                      type="button"
                      className="secondary-button"
                      style={{ fontSize: '0.72rem', padding: '6px 12px', minWidth: 'auto' }}
                      onClick={() => {
                        const next = [...recipe.commands, { label: '', requiredMotion: 'SQUAT', assetKey: '', points: 10, lifeMs: 2400 }];
                        updateRecipe({ commands: next } as any);
                      }}
                    >
                      + Komut Ekle
                    </button>
                  </div>
                  {recipe.commands.map((cmd, i) => (
                    <div key={i} className="inset-panel" style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: '0.78rem', color: 'var(--accent-cyan)' }}>
                          Komut {i + 1}
                        </span>
                        {recipe.commands.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const next = recipe.commands.filter((_, idx) => idx !== i);
                              updateRecipe({ commands: next } as any);
                            }}
                            style={{ background: 'none', border: '1px solid var(--stroke)', color: 'var(--muted)', borderRadius: 6, padding: '2px 8px', cursor: 'pointer', fontSize: '0.7rem' }}
                          >
                            X
                          </button>
                        )}
                      </div>
                      <div className="field-grid">
                        <label className="field">
                          <span>Etiket</span>
                          <input
                            value={cmd.label}
                            onChange={(e) => {
                              const next = [...recipe.commands];
                              next[i] = { ...next[i], label: e.target.value };
                              updateRecipe({ commands: next } as any);
                            }}
                            placeholder="örn: Cüce"
                          />
                        </label>
                        <label className="field">
                          <span>Hareket</span>
                          <select
                            value={cmd.requiredMotion}
                            onChange={(e) => {
                              const next = [...recipe.commands];
                              next[i] = { ...next[i], requiredMotion: e.target.value as any };
                              updateRecipe({ commands: next } as any);
                            }}
                          >
                            <option value="SQUAT">Squat</option>
                            <option value="JUMPING_JACK">Jumping Jack</option>
                            <option value="JUMP_ROPE">Jump Rope</option>
                          </select>
                        </label>
                        <label className="field">
                          <span>Puan</span>
                          <input
                            type="number" min={1} max={100}
                            value={cmd.points}
                            onChange={(e) => {
                              const next = [...recipe.commands];
                              next[i] = { ...next[i], points: parseInt(e.target.value) || 10 };
                              updateRecipe({ commands: next } as any);
                            }}
                          />
                        </label>
                        <label className="field">
                          <span>Görünme Süresi (ms)</span>
                          <input
                            type="number" min={500} max={10000}
                            value={cmd.lifeMs}
                            onChange={(e) => {
                              const next = [...recipe.commands];
                              next[i] = { ...next[i], lifeMs: parseInt(e.target.value) || 2400 };
                              updateRecipe({ commands: next } as any);
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 'RULES' && recipe.kind === 'HOLD_CHALLENGE' && (
              <div className="stack">
                <div className="field-grid">
                  <label className="field">
                    <span>Hedef Tutma Süresi (sn)</span>
                    <input
                      type="number" min={3} max={300}
                      value={recipe.targetHoldSec}
                      onChange={(e) => updateRecipe({ targetHoldSec: parseInt(e.target.value) || 30 } as any)}
                    />
                  </label>
                  <label className="field">
                    <span>Başarı Puanı</span>
                    <input
                      type="number" min={10} max={1000}
                      value={recipe.successPoints}
                      onChange={(e) => updateRecipe({ successPoints: parseInt(e.target.value) || 100 } as any)}
                    />
                  </label>
                  <label className="field">
                    <span>Tolerans (ms)</span>
                    <input
                      type="number" min={0} max={5000}
                      value={recipe.graceMs}
                      onChange={(e) => updateRecipe({ graceMs: parseInt(e.target.value) || 500 } as any)}
                    />
                  </label>
                </div>
              </div>
            )}

            {step === 'RULES' && recipe.kind === 'TARGET_HIT' && (
              <div className="stack">
                <div className="field-grid">
                  <label className="field">
                    <span>Hedef Modu</span>
                    <select
                      value={recipe.spawnMode}
                      onChange={(e) => updateRecipe({ spawnMode: e.target.value as any })}
                    >
                      <option value="STATIC">Sabit</option>
                      <option value="SEQUENCE">Sıralı</option>
                      <option value="RANDOM">Rastgele</option>
                    </select>
                  </label>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      Hedefler ({recipe.targets.length})
                    </span>
                    <button
                      type="button"
                      className="secondary-button"
                      style={{ fontSize: '0.72rem', padding: '6px 12px', minWidth: 'auto' }}
                      onClick={() => {
                        const next = [...recipe.targets, { label: '', x: 0.5, y: 0.78, radius: 0.1, hitBy: ['LEFT_WRIST', 'RIGHT_WRIST'], points: 10 }];
                        updateRecipe({ targets: next } as any);
                      }}
                    >
                      + Hedef Ekle
                    </button>
                  </div>
                </div>
              </div>
            )}

            {step === 'RULES' && recipe.kind === 'REP_PROGRAM' && (
              <div className="stack">
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      Program Adımları ({recipe.steps.length})
                    </span>
                    <button
                      type="button"
                      className="secondary-button"
                      style={{ fontSize: '0.72rem', padding: '6px 12px', minWidth: 'auto' }}
                      onClick={() => {
                        const next = [...recipe.steps, { type: 'MOTION_REPS' as const, title: '', motion: 'SQUAT' as any, targetCount: 10 }];
                        updateRecipe({ steps: next } as any);
                      }}
                    >
                      + Adım Ekle
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ASSETS Step */}
            {step === 'ASSETS' && (
              <div className="stack">
                <div className="field">
                  <span>Kapak Görseli (Cover)</span>
                  {coverUrl ? (
                    <div style={{ marginBottom: 8 }}>
                      <div className="asset-thumb-wrapper" style={{ maxWidth: 260, marginBottom: 8 }}>
                        <img
                          src={coverUrl}
                          alt="Cover"
                          className="asset-thumb"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                        <div className="asset-thumb-fallback hidden">
                          <span style={{ fontSize: '1.5rem' }}>🖼</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                          value={coverUrl}
                          readOnly
                          style={{ flex: 1, fontSize: '0.72rem' }}
                        />
                        <button
                          type="button"
                          className="ghost-button"
                          style={{ fontSize: '0.68rem', padding: '4px 10px', minWidth: 'auto' }}
                          onClick={() => setCoverUrl(null)}
                        >
                          Temizle
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="muted" style={{ fontSize: '0.78rem', margin: '4px 0 10px' }}>
                      Henüz kapak seçilmedi. Asset kütüphanesinden bir cover görseli seçin.
                    </p>
                  )}
                  <button
                    type="button"
                    className="secondary-button"
                    style={{ fontSize: '0.72rem', padding: '6px 12px', minWidth: 'auto' }}
                    onClick={() => setCoverPickerOpen(true)}
                  >
                    Asset Seç
                  </button>
                </div>
                <p className="muted" style={{ margin: '12px 0 0', fontSize: '0.72rem' }}>
                  Diğer assetler (arka plan, karakter, hedefler) şimdilik varsayılan olarak atanır.
                </p>
              </div>
            )}

            {/* REVIEW Step */}
            {step === 'REVIEW' && (
              <div className="stack">
                <div className={`validation-summary ${errors.length > 0 ? 'validation-fail' : warnings.length > 0 ? 'validation-warn' : 'validation-pass'}`}>
                  <p className="eyebrow" style={{ marginBottom: 8 }}>Kontrol Sonucu</p>
                  {errors.length === 0 && warnings.length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: 'var(--accent-emerald)', fontSize: '1.1rem' }}>&#10003;</span>
                      <span style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>Yayına hazır</span>
                    </div>
                  ) : (
                    <>
                      {errors.length > 0 && (
                        <div style={{ marginBottom: 12 }}>
                          <p style={{ color: 'var(--accent-danger)', fontWeight: 700, fontSize: '0.78rem', margin: '0 0 8px' }}>
                            {errors.length} hata bulundu
                          </p>
                          {errors.map((e, i) => (
                            <div key={i} style={{
                              background: 'rgba(251,113,133,0.06)', borderRadius: 8,
                              padding: '0.5rem 0.7rem', marginBottom: 6, fontSize: '0.8rem',
                              border: '1px solid rgba(251,113,133,0.12)'
                            }}>
                              <p style={{ margin: 0, fontWeight: 600, color: 'var(--accent-danger)' }}>{e.title}</p>
                              <p style={{ margin: '4px 0', color: 'var(--text-secondary)' }}>{e.message}</p>
                              {e.fixAction && (
                                <button
                                  type="button"
                                  className="ghost-button"
                                  style={{ fontSize: '0.68rem', padding: '4px 10px', minWidth: 'auto' }}
                                  onClick={() => goToStep(e.fixAction!.targetStep)}
                                >
                                  {e.fixAction.label}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {warnings.length > 0 && (
                        <div>
                          <p style={{ color: 'var(--accent-amber)', fontWeight: 700, fontSize: '0.78rem', margin: '0 0 8px' }}>
                            {warnings.length} uyarı
                          </p>
                          {warnings.map((w, i) => (
                            <div key={i} style={{
                              background: 'rgba(245,158,11,0.06)', borderRadius: 8,
                              padding: '0.4rem 0.7rem', marginBottom: 4, fontSize: '0.78rem',
                              border: '1px solid rgba(245,158,11,0.12)'
                            }}>
                              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{w.message}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="button-row" style={{ marginTop: 24 }}>
              {step !== 'BASIC' && (
                <button type="button" className="ghost-button" onClick={prevStep}>
                  Geri
                </button>
              )}
              {step !== 'REVIEW' ? (
                <button type="button" className="primary-button" onClick={nextStep}>
                  İleri
                </button>
              ) : (
                <button
                  type="button"
                  className="primary-button"
                  disabled={errors.length > 0 || isBusy}
                  onClick={handleSaveDraft}
                >
                  {isBusy ? 'Kaydediliyor...' : draftId ? 'Güncelle' : 'Taslak Kaydet'}
                </button>
              )}
            </div>

            {message && (
              <p style={{
                marginTop: 12, padding: '8px 12px', borderRadius: 8,
                background: message.startsWith('Hata') ? 'rgba(251,113,133,0.1)' : 'rgba(52,211,153,0.1)',
                color: message.startsWith('Hata') ? 'var(--accent-danger)' : 'var(--accent-emerald)',
                fontSize: '0.82rem'
              }}>
                {message}
              </p>
            )}
          </div>
        </div>

        {/* Right: Preview + Validation */}
        <div style={{ display: 'grid', gap: 16 }}>
          <MobileGamePreview recipe={recipe} previewState={previewState} />
          <MockMotionConsole onSendEvent={handleMotionEvent} recipe={recipe} />
          <div className="status-card">
            <p className="eyebrow" style={{ marginBottom: 8 }}>Validation</p>
            {errors.length === 0 && warnings.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: 'var(--accent-emerald)' }}>&#10003;</span>
                <span style={{ color: 'var(--accent-emerald)', fontWeight: 700, fontSize: '0.82rem' }}>
                  Mobil uyumlu
                </span>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 12 }}>
                  <span style={{ color: errors.length > 0 ? 'var(--accent-danger)' : 'var(--accent-amber)', fontSize: '0.78rem', fontWeight: 600 }}>
                    {errors.length > 0 ? `✕ ${errors.length} hata` : `! ${warnings.length} uyarı`}
                  </span>
                </div>
                {errors.slice(0, 3).map((e, i) => (
                  <p key={i} style={{ color: 'var(--accent-danger)', fontSize: '0.7rem', margin: '2px 0' }}>
                    {e.title}
                  </p>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      <AssetPickerModal
        open={coverPickerOpen}
        category="covers"
        onClose={() => setCoverPickerOpen(false)}
        onSelect={(asset) => {
          setCoverUrl(asset.url);
          setCoverPickerOpen(false);
        }}
      />
    </div>
  );
}
