'use client';

import { useState } from 'react';
import type { GameDefinitionDto, GameDefinitionDraft, GameCategory } from '../../../../../lib/alba-api';
import { AssetPickerModal } from './asset-picker-modal';

type EditorTab = 'basic' | 'rules' | 'assets' | 'program' | 'advanced';

interface LeftEditorProps {
  draft: GameDefinitionDraft;
  game: GameDefinitionDto;
  activeTab: EditorTab;
  onTabChange: (tab: EditorTab) => void;
  onDraftChange: (draft: GameDefinitionDraft) => void;
}

const TABS: Array<{ id: EditorTab; label: string }> = [
  { id: 'basic', label: 'Temel Bilgiler' },
  { id: 'rules', label: 'Kurallar' },
  { id: 'assets', label: 'Assetler' },
  { id: 'program', label: 'Program Akışı' },
  { id: 'advanced', label: 'Gelişmiş' }
];

export function StudioLeftEditor({ draft, game, activeTab, onTabChange, onDraftChange }: LeftEditorProps) {
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const level = draft.levels?.[0] ?? game.levels?.[0];
  const motionRules = level?.motionRules ?? [];
  const interactionRules = level?.interactionRules ?? [];
  const programSteps = level?.programSteps ?? [];

  const updateField = (field: string, value: unknown) => {
    onDraftChange({ ...draft, [field]: value });
  };

  const updateLevel = (field: string, value: unknown) => {
    if (!level) return;
    onDraftChange({
      ...draft,
      levels: [{ ...level, [field]: value }]
    });
  };

  return (
    <div className="panel" style={{ padding: 0 }}>
      {/* Tab Bar */}
      <div className="studio-tab-bar">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`studio-tab ${activeTab === tab.id ? 'studio-tab-active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ padding: 'var(--space-xl)' }}>
        {/* BASIC Tab */}
        {activeTab === 'basic' && (
          <div className="stack">
            <label className="field">
              <span>Oyun Adı</span>
              <input
                value={draft.title}
                onChange={(e) => updateField('title', e.target.value)}
              />
            </label>
            <label className="field">
              <span>Açıklama</span>
              <textarea
                rows={3}
                value={draft.description}
                onChange={(e) => updateField('description', e.target.value)}
              />
            </label>
            <div className="field-grid">
              <label className="field">
                <span>Kategori</span>
                <select
                  value={draft.category}
                  onChange={(e) => updateField('category', e.target.value as GameCategory)}
                >
                  <option value="FUN">Eğlence</option>
                  <option value="SPORT">Spor</option>
                  <option value="EDUCATION">Eğitim</option>
                </select>
              </label>
              <label className="field">
                <span>Zorluk</span>
                <select
                  value={level?.difficulty ?? 'EASY'}
                  onChange={(e) => updateLevel('difficulty', e.target.value)}
                >
                  <option value="EASY">Kolay</option>
                  <option value="MEDIUM">Orta</option>
                  <option value="HARD">Zor</option>
                  <option value="CHALLENGE">Challenge</option>
                </select>
              </label>
              <label className="field">
                <span>Süre (saniye)</span>
                <input
                  type="number" min={5} max={600}
                  value={level?.durationSec ?? 60}
                  onChange={(e) => updateLevel('durationSec', parseInt(e.target.value) || 60)}
                />
              </label>
              <label className="field">
                <span>Hedef Skor</span>
                <input
                  type="number" min={0}
                  value={level?.targetScore ?? 0}
                  onChange={(e) => updateLevel('targetScore', parseInt(e.target.value) || 0)}
                />
              </label>
              <label className="field">
                <span>Etiketler (virgülle ayırın)</span>
                <input
                  value={draft.tags.join(', ')}
                  onChange={(e) => updateField('tags', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
                  placeholder="örn: reflex, fun, kids"
                />
              </label>
            </div>
          </div>
        )}

        {/* RULES Tab */}
        {activeTab === 'rules' && (
          <div className="stack">
            <div className="eyebrow">Motion Rules ({motionRules.length})</div>
            {motionRules.length === 0 ? (
              <p className="muted" style={{ fontSize: '0.78rem' }}>
                Henüz motion rule tanımlanmamış. Advanced sekmesinden ekleyebilirsiniz.
              </p>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {motionRules.map((rule, i) => (
                  <div key={i} className="inset-panel">
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: 'var(--accent-cyan)', fontSize: '0.78rem' }}>
                        {rule.motion}
                      </span>
                      <span className="badge badge-info" style={{ fontSize: '0.6rem' }}>
                        {rule.event}
                      </span>
                      <span style={{ color: rule.points >= 0 ? 'var(--accent-emerald)' : 'var(--accent-danger)', fontWeight: 600, fontSize: '0.78rem' }}>
                        {rule.points >= 0 ? '+' : ''}{rule.points} pts
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="eyebrow" style={{ marginTop: 12 }}>Interaction Rules ({interactionRules.length})</div>
            {interactionRules.length === 0 ? (
              <p className="muted" style={{ fontSize: '0.78rem' }}>
                Interaction rule yok. Advanced sekmesinden ekleyebilirsiniz.
              </p>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {interactionRules.slice(0, 10).map((rule, i) => (
                  <div key={i} className="inset-panel">
                    <div style={{ fontSize: '0.75rem' }}>
                      <span style={{ color: 'var(--accent-pink)', fontWeight: 600 }}>{rule.input}</span>
                      <span className="muted"> → </span>
                      <span style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>{rule.action}</span>
                      {rule.motion && <span className="muted"> ({rule.motion})</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ASSETS Tab */}
        {activeTab === 'assets' && (
          <div className="stack">
            <div className="eyebrow">Oyun Assetleri</div>

            {/* Cover Image */}
            <div className="field">
              <span>Kapak Görseli (Cover)</span>
              {draft.assets.cover ? (
                <div style={{ marginBottom: 8 }}>
                  <div className="asset-thumb-wrapper" style={{ maxWidth: 260, marginBottom: 8 }}>
                    <img
                      src={draft.assets.cover}
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
                  <input
                    value={draft.assets.cover}
                    onChange={(e) => onDraftChange({
                      ...draft,
                      assets: { ...draft.assets, cover: e.target.value }
                    })}
                  />
                </div>
              ) : (
                <input
                  value={draft.assets.cover ?? ''}
                  placeholder="Henüz kapak seçilmedi"
                  onChange={(e) => onDraftChange({
                    ...draft,
                    assets: { ...draft.assets, cover: e.target.value || undefined }
                  })}
                />
              )}
              <button
                type="button"
                className="secondary-button"
                style={{ marginTop: 6, fontSize: '0.72rem', padding: '6px 12px', minWidth: 'auto' }}
                onClick={() => setCoverPickerOpen(true)}
              >
                Asset Seç
              </button>
            </div>

            <label className="field">
              <span>Arkaplan URI</span>
              <input
                value={draft.assets.background}
                onChange={(e) => onDraftChange({
                  ...draft,
                  assets: { ...draft.assets, background: e.target.value }
                })}
              />
            </label>
            <label className="field">
              <span>Karakter URI</span>
              <input
                value={draft.assets.character}
                onChange={(e) => onDraftChange({
                  ...draft,
                  assets: { ...draft.assets, character: e.target.value }
                })}
              />
            </label>
            <label className="field">
              <span>Ses (opsiyonel)</span>
              <input
                value={draft.assets.soundtrack ?? ''}
                onChange={(e) => onDraftChange({
                  ...draft,
                  assets: { ...draft.assets, soundtrack: e.target.value || undefined }
                })}
              />
            </label>

            <div className="eyebrow" style={{ marginTop: 8 }}>
              Asset Öğeleri ({draft.assets.items?.length ?? 0})
            </div>
            {(draft.assets.items ?? []).length === 0 ? (
              <p className="muted" style={{ fontSize: '0.78rem' }}>Henüz asset öğesi eklenmemiş.</p>
            ) : (
              <div style={{ display: 'grid', gap: 6 }}>
                {(draft.assets.items ?? []).map((item, i) => (
                  <div key={i} className="inset-panel">
                    <span style={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {item.key}
                    </span>
                    <span className="muted" style={{ marginLeft: 8, fontSize: '0.65rem' }}>
                      {item.kind} · {item.format} · {item.uri}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PROGRAM Tab */}
        {activeTab === 'program' && (
          <div className="stack">
            <div className="eyebrow">Program Akışı ({programSteps.length} adım)</div>
            {programSteps.length === 0 ? (
              <p className="muted" style={{ fontSize: '0.78rem' }}>
                Bu oyunda program akışı tanımlanmamış. Advanced sekmesinden ekleyebilirsiniz.
              </p>
            ) : (
              <div className="program-builder" style={{ padding: 12, borderRadius: 12 }}>
                {programSteps.map((step, i) => (
                  <div key={i} className="program-step-card" style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{
                        width: 24, height: 24, borderRadius: '50%',
                        background: 'var(--accent-cyan)', color: '#000',
                        display: 'inline-grid', placeItems: 'center',
                        fontWeight: 800, fontSize: '0.65rem', flexShrink: 0
                      }}>
                        {i + 1}
                      </span>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                          {step.title || `Adım ${i + 1}`}
                        </span>
                        <span className="badge badge-info" style={{ marginLeft: 8, fontSize: '0.58rem' }}>
                          {step.type}
                        </span>
                      </div>
                    </div>
                    {step.motion && (
                      <p className="muted" style={{ margin: '4px 0 0 32px', fontSize: '0.7rem' }}>
                        Hareket: {step.motion} · Hedef: {step.targetCount ?? step.holdSec ?? step.durationSec ?? '—'}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ADVANCED Tab */}
        {activeTab === 'advanced' && (
          <div className="stack">
            <div style={{
              padding: 12, borderRadius: 8,
              background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
              marginBottom: 12
            }}>
              <p style={{ fontSize: '0.72rem', color: 'var(--accent-amber)', margin: 0 }}>
                Bu bölüm teknik ayarlar içerir. Yanlış değişiklikler oyunun mobilde çalışmasını engelleyebilir.
              </p>
            </div>

            <label className="field">
              <span>Game Key</span>
              <input
                value={draft.gameKey}
                onChange={(e) => updateField('gameKey', e.target.value)}
              />
            </label>
            <label className="field">
              <span>Min App Version</span>
              <input
                value={draft.minAppVersion}
                onChange={(e) => updateField('minAppVersion', e.target.value)}
              />
            </label>
            <label className="field">
              <span>Orientation</span>
              <select
                value={draft.orientation}
                onChange={(e) => updateField('orientation', e.target.value)}
              >
                <option value="PORTRAIT">Dikey</option>
                <option value="LANDSCAPE">Yatay</option>
              </select>
            </label>
            <label className="field">
              <span>Camera Requirement</span>
              <select
                value={draft.cameraRequirement}
                onChange={(e) => updateField('cameraRequirement', e.target.value)}
              >
                <option value="FULL_BODY">Tam Vücut</option>
                <option value="UPPER_BODY">Üst Vücut</option>
                <option value="HAND_TARGET">El Hedef</option>
              </select>
            </label>

            <details style={{ marginTop: 12 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                sceneConfig (JSON)
              </summary>
              <pre className="payload-preview" style={{ marginTop: 8, maxHeight: 200 }}>
                {JSON.stringify(level?.sceneConfig ?? {}, null, 2)}
              </pre>
            </details>

            <details style={{ marginTop: 8 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Tüm Level JSON
              </summary>
              <pre className="payload-preview" style={{ marginTop: 8, maxHeight: 300 }}>
                {JSON.stringify(draft.levels ?? [], null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>

      <AssetPickerModal
        open={coverPickerOpen}
        category="covers"
        onClose={() => setCoverPickerOpen(false)}
        onSelect={(asset) => {
          onDraftChange({
            ...draft,
            assets: { ...draft.assets, cover: asset.url }
          });
          setCoverPickerOpen(false);
        }}
      />
    </div>
  );
}
