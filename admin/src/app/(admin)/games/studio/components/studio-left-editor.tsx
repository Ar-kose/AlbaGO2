'use client';

import { useState, useMemo, useCallback } from 'react';
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

// ─── Standard dimensions ──────────────────────────────────────
const DIMENSIONS: Record<string, { w: number; h: number; label: string }> = {
  cover: { w: 512, h: 512, label: '512x512 px' },
  background: { w: 1920, h: 1080, label: '1920x1080 px' },
  character: { w: 512, h: 512, label: '512x512 px' },
  target: { w: 256, h: 256, label: '256x256 px' },
  icon: { w: 128, h: 128, label: '128x128 px' },
};

// ─── Template → audio events mapping ──────────────────────────
const TEMPLATE_AUDIO_EVENTS: Record<string, string[]> = {
  FRUIT_SLASH: ['HIT', 'MISS', 'GAME_START', 'GAME_END', 'SUCCESS', 'LIFE_LOST'],
  DODGE_RUN: ['HIT', 'MISS', 'SUCCESS'],
  FIT_CHALLENGE: ['HIT', 'MISS', 'PERFECT', 'GOOD', 'BAD', 'COMBO', 'GAME_START', 'GAME_END'],
  SCENE_PLAY: ['COUNTDOWN', 'GAME_START', 'SUCCESS', 'FAIL', 'GAME_END'],
  WHACK_A_MOLE: ['HIT', 'MISS'],
  POSE_CONTACT_TARGETS: ['HIT', 'MISS'],
};

const AUDIO_EVENT_LABELS: Record<string, string> = {
  HIT: 'Doğru vuruş', MISS: 'Kaçan hedef', GAME_START: 'Oyun başlangıcı',
  GAME_END: 'Oyun sonu', SUCCESS: 'Başarı anı', FAIL: 'Başarısızlık',
  LIFE_LOST: 'Can kaybı', PERFECT: 'Mükemmel', GOOD: 'İyi', BAD: 'Kötü',
  COMBO: 'Kombo', COUNTDOWN: 'Geri sayım',
};

const AUDIO_EVENT_ICONS: Record<string, string> = {
  HIT: '🎯', MISS: '❌', GAME_START: '🚀', GAME_END: '🏁',
  SUCCESS: '🏆', FAIL: '💥', LIFE_LOST: '💀', PERFECT: '⭐',
  GOOD: '👍', BAD: '👎', COMBO: '🔥', COUNTDOWN: '⏱',
};

export function StudioLeftEditor({ draft, game, activeTab, onTabChange, onDraftChange }: LeftEditorProps) {
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [bgPickerOpen, setBgPickerOpen] = useState(false);
  const [charPickerOpen, setCharPickerOpen] = useState(false);
  const [objectPickerKey, setObjectPickerKey] = useState<string | null>(null);
  const [audioPickerEvent, setAudioPickerEvent] = useState<string | null>(null);
  const [bgMusicPickerOpen, setBgMusicPickerOpen] = useState(false);
  const [dropActive, setDropActive] = useState(false);
  const [coverUploadState, setCoverUploadState] = useState<'idle' | 'uploading' | 'error'>('idle');

  const level = draft.levels?.[0] ?? game.levels?.[0];
  const motionRules = level?.motionRules ?? [];
  const interactionRules = level?.interactionRules ?? [];
  const programSteps = level?.programSteps ?? [];

  const template = draft.template || game.template;
  const audioEvents = TEMPLATE_AUDIO_EVENTS[template] ?? [];
  const supportsAudio = audioEvents.length > 0;

  const config = (level as any)?.config as Record<string, unknown> | undefined;
  const audioConfig = (config?.audio as Record<string, unknown>) || {};
  const bgMusic = (audioConfig.backgroundMusic as Record<string, unknown>) || {};
  const soundEffects = (audioConfig.soundEffects as Array<Record<string, unknown>>) || [];

  const updateField = (field: string, value: unknown) => {
    onDraftChange({ ...draft, [field]: value });
  };

  const updateLevel = (field: string, value: unknown) => {
    if (!level) return;
    onDraftChange({ ...draft, levels: [{ ...level, [field]: value }] });
  };

  const updateAssets = (patch: Partial<NonNullable<GameDefinitionDraft['assets']>>) => {
    onDraftChange({ ...draft, assets: { ...draft.assets, ...patch } });
  };

  const updateAssetItem = (key: string, uri: string) => {
    const items = [...(draft.assets.items ?? [])];
    const idx = items.findIndex(it => it.key === key);
    if (idx >= 0) {
      items[idx] = { ...items[idx], uri };
    } else {
      items.push({ key, kind: 'IMAGE' as const, format: 'PNG' as const, uri });
    }
    updateAssets({ items });
  };

  const removeAssetItem = (key: string) => {
    updateAssets({ items: (draft.assets.items ?? []).filter(it => it.key !== key) });
  };

  // Audio helpers
  const updateAudioConfig = (patch: Record<string, unknown>) => {
    const nextAudio = { ...audioConfig, ...patch };
    onDraftChange({
      ...draft,
      levels: [{ ...level!, config: { ...(config ?? {}), audio: nextAudio } }]
    });
  };

  const setSoundEffect = (eventName: string, assetKey: string) => {
    const existing = [...soundEffects];
    const idx = existing.findIndex(e => e.event === eventName);
    if (assetKey) {
      if (idx >= 0) {
        existing[idx] = { ...existing[idx], assetKey };
      } else {
        existing.push({ event: eventName, assetKey });
      }
    } else {
      if (idx >= 0) existing.splice(idx, 1);
    }
    updateAudioConfig({ soundEffects: existing, enabled: existing.length > 0 || !!bgMusic.assetKey });
  };

  const getSfxAssetKey = (eventName: string): string => {
    const sfx = soundEffects.find(e => e.event === eventName);
    return (sfx?.assetKey as string) ?? '';
  };

  // File upload handler for cover
  const handleCoverDrop = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setCoverUploadState('uploading');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('category', 'cover');
      const res = await fetch(`${process.env.NEXT_PUBLIC_ALBAGO_API_URL ?? 'http://localhost:3001/v1'}/internal/assets`, {
        method: 'POST',
        body: form,
      });
      if (!res.ok) throw new Error('Upload failed');
      const asset = await res.json();
      updateAssets({ cover: asset.uri });
      setCoverUploadState('idle');
    } catch {
      setCoverUploadState('error');
    }
  }, []);

  const objectAssetKeys = useMemo(() => {
    const keys = new Set<string>();
    (draft.assets.items ?? []).forEach(it => keys.add(it.key));
    // Always show core scene assets
    keys.add('background');
    keys.add('character');
    return [...keys];
  }, [draft.assets.items]);

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
              <input value={draft.title} onChange={(e) => updateField('title', e.target.value)} />
            </label>
            <label className="field">
              <span>Açıklama</span>
              <textarea rows={3} value={draft.description} onChange={(e) => updateField('description', e.target.value)} />
            </label>
            <div className="field-grid">
              <label className="field">
                <span>Kategori</span>
                <select value={draft.category} onChange={(e) => updateField('category', e.target.value as GameCategory)}>
                  <option value="FUN">Eğlence</option>
                  <option value="SPORT">Spor</option>
                  <option value="EDUCATION">Eğitim</option>
                </select>
              </label>
              <label className="field">
                <span>Zorluk</span>
                <select value={level?.difficulty ?? 'EASY'} onChange={(e) => updateLevel('difficulty', e.target.value)}>
                  <option value="EASY">Kolay</option>
                  <option value="MEDIUM">Orta</option>
                  <option value="HARD">Zor</option>
                  <option value="CHALLENGE">Challenge</option>
                </select>
              </label>
              <label className="field">
                <span>Süre (saniye)</span>
                <input type="number" min={5} max={600} value={level?.durationSec ?? 60} onChange={(e) => updateLevel('durationSec', parseInt(e.target.value) || 60)} />
              </label>
              <label className="field">
                <span>Hedef Skor</span>
                <input type="number" min={0} value={level?.targetScore ?? 0} onChange={(e) => updateLevel('targetScore', parseInt(e.target.value) || 0)} />
              </label>
              <label className="field">
                <span>Etiketler (virgülle ayırın)</span>
                <input value={draft.tags.join(', ')} onChange={(e) => updateField('tags', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} placeholder="örn: reflex, fun, kids" />
              </label>
            </div>
          </div>
        )}

        {/* RULES Tab */}
        {activeTab === 'rules' && (
          <div className="stack">
            <div className="eyebrow">Motion Rules ({motionRules.length})</div>
            {motionRules.length === 0 ? (
              <p className="muted" style={{ fontSize: '0.78rem' }}>Henüz motion rule tanımlanmamış. Advanced sekmesinden ekleyebilirsiniz.</p>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {motionRules.map((rule, i) => (
                  <div key={i} className="inset-panel">
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: 'var(--accent-cyan)', fontSize: '0.78rem' }}>{rule.motion}</span>
                      <span className="badge badge-info" style={{ fontSize: '0.6rem' }}>{rule.event}</span>
                      <span style={{ color: rule.points >= 0 ? 'var(--accent-emerald)' : 'var(--accent-danger)', fontWeight: 600, fontSize: '0.78rem' }}>{rule.points >= 0 ? '+' : ''}{rule.points} pts</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="eyebrow" style={{ marginTop: 12 }}>Interaction Rules ({interactionRules.length})</div>
            {interactionRules.length === 0 ? (
              <p className="muted" style={{ fontSize: '0.78rem' }}>Interaction rule yok. Advanced sekmesinden ekleyebilirsiniz.</p>
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

        {/* ─── ASSETS Tab (YENIDEN TASARLANDI) ────────────────────── */}
        {activeTab === 'assets' && (
          <div className="stack" style={{ gap: 16 }}>

            {/* 1. Cover Image */}
            <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 10, padding: 14, background: 'rgba(5,6,14,0.5)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <span className="badge badge-draft" style={{ fontSize: '0.58rem', marginRight: 6 }}>ZORUNLU</span>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Kapak Görseli (Cover)</span>
                </div>
                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>PNG/WebP · {DIMENSIONS.cover.label} · max 5MB</span>
              </div>

              <div
                style={{
                  display: 'flex', gap: 14, alignItems: 'flex-start',
                  border: dropActive ? '2px dashed var(--accent-primary)' : '2px dashed transparent',
                  borderRadius: 10, padding: dropActive ? 8 : 0, transition: 'border 0.2s'
                }}
                onDragOver={(e) => { e.preventDefault(); setDropActive(true); }}
                onDragLeave={() => setDropActive(false)}
                onDrop={(e) => { e.preventDefault(); setDropActive(false); const f = e.dataTransfer.files[0]; if (f) handleCoverDrop(f); }}
              >
                <div style={{ width: 140, height: 140, borderRadius: 10, flexShrink: 0,
                  background: draft.assets.cover ? 'transparent' : 'rgba(255,255,255,0.03)',
                  border: draft.assets.cover ? 'none' : '1px dashed var(--border-subtle)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {draft.assets.cover ? (
                    <img src={draft.assets.cover} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <div style={{ textAlign: 'center', opacity: 0.5 }}>
                      <span style={{ fontSize: '1.6rem', display: 'block' }}>🖼</span>
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Sürükle veya Tıkla</span>
                    </div>
                  )}
                  {coverUploadState === 'uploading' && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '0.7rem' }}>Yükleniyor...</span>
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, fontSize: '0.7rem' }}>
                  <p style={{ margin: '0 0 6px', color: 'var(--text-muted)' }}>Mobil oyun katalogunda görünen ana görsel. Oyununuzu temsil eden bir kapak seçin.</p>
                  {draft.assets.cover && (
                    <input value={draft.assets.cover} readOnly style={{ width: '100%', fontSize: '0.65rem', marginBottom: 6 }} />
                  )}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button type="button" className="secondary-button" style={{ fontSize: '0.68rem', padding: '5px 12px', minWidth: 'auto' }}
                      onClick={() => setCoverPickerOpen(true)}>
                      Kütüphaneden Seç
                    </button>
                    <label style={{ cursor: 'pointer', fontSize: '0.68rem', padding: '5px 12px', borderRadius: 8,
                      background: 'var(--accent-primary)', color: '#000', fontWeight: 600 }}>
                      Dosya Yükle
                      <input type="file" accept="image/png,image/webp" style={{ display: 'none' }}
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverDrop(f); }} />
                    </label>
                    {draft.assets.cover && (
                      <button type="button" className="ghost-button"
                        style={{ fontSize: '0.65rem', padding: '4px 10px', minWidth: 'auto', color: 'var(--accent-danger)' }}
                        onClick={() => { if (confirm('Kapak görseli kaldırılsın mı?')) updateAssets({ cover: undefined }); }}>
                        Temizle
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Scene Assets */}
            <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 10, padding: 14, background: 'rgba(5,6,14,0.5)' }}>
              <span className="eyebrow" style={{ marginBottom: 10, display: 'block' }}>Oyun İçi Görseller</span>

              {/* Background + Character row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 10, marginBottom: 14 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.78rem' }}>Arkaplan</span>
                    <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>{DIMENSIONS.background.label}</span>
                  </div>
                  <input value={draft.assets.background} placeholder="Arkaplan URI"
                    onChange={(e) => updateAssets({ background: e.target.value })}
                    style={{ width: '100%', fontSize: '0.7rem', marginBottom: 4 }} />
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button type="button" className="ghost-button" style={{ fontSize: '0.6rem', padding: '3px 8px', minWidth: 'auto' }}
                      onClick={() => setBgPickerOpen(true)}>Kütüphaneden Seç</button>
                    {draft.assets.background && draft.assets.background !== 'local://default/background' && (
                      <button type="button" className="ghost-button"
                        style={{ fontSize: '0.6rem', padding: '3px 6px', minWidth: 'auto', color: 'var(--accent-danger)' }}
                        onClick={() => { if (confirm('Arkaplan kaldırılsın mı?')) updateAssets({ background: '' }); }}>✕</button>
                    )}
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.78rem' }}>Karakter / Rehber</span>
                    <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>{DIMENSIONS.character.label}</span>
                  </div>
                  <input value={draft.assets.character} placeholder="Karakter URI"
                    onChange={(e) => updateAssets({ character: e.target.value })}
                    style={{ width: '100%', fontSize: '0.7rem', marginBottom: 4 }} />
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button type="button" className="ghost-button" style={{ fontSize: '0.6rem', padding: '3px 8px', minWidth: 'auto' }}
                      onClick={() => setCharPickerOpen(true)}>Kütüphaneden Seç</button>
                    {draft.assets.character && draft.assets.character !== 'local://default/character' && (
                      <button type="button" className="ghost-button"
                        style={{ fontSize: '0.6rem', padding: '3px 6px', minWidth: 'auto', color: 'var(--accent-danger)' }}
                        onClick={() => { if (confirm('Karakter görseli kaldırılsın mı?')) updateAssets({ character: '' }); }}>✕</button>
                    )}
                  </div>
                </div>
              </div>

              {/* Object Assets */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 700, fontSize: '0.78rem' }}>Oyun Nesneleri</span>
                <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>{(draft.assets.items ?? []).filter(it => it.key !== 'background' && it.key !== 'character').length} nesne</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
                {objectAssetKeys.map(key => {
                  const item = (draft.assets.items ?? []).find(it => it.key === key);
                  const uri = item?.uri ?? (key === 'background' ? draft.assets.background : key === 'character' ? draft.assets.character : '');
                  const isLocalUri = uri.startsWith('local://');
                  const showPreview = uri && !isLocalUri;
                  return (
                    <div key={key} style={{ border: '1px solid var(--border-subtle)', borderRadius: 8, padding: 8, textAlign: 'center' }}>
                      <div style={{ width: 70, height: 50, borderRadius: 6, margin: '0 auto 6px',
                        background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {showPreview ? (
                          <img src={uri} alt={key} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        ) : isLocalUri ? (
                          <span style={{ fontSize: '0.5rem', opacity: 0.3, textAlign: 'center', lineHeight: 1.2 }}>varsayılan</span>
                        ) : (
                          <span style={{ fontSize: '0.55rem', opacity: 0.4 }}>görsel</span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.65rem', fontWeight: 600, display: 'block' }}>{key}</span>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 4 }}>
                        <button type="button" style={{ fontSize: '0.55rem', padding: '2px 6px', border: '1px solid var(--border-subtle)', borderRadius: 4, background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
                          onClick={() => setObjectPickerKey(key)}>
                          {uri ? 'Değiştir' : 'Ekle'}
                        </button>
                        {uri && key !== 'background' && key !== 'character' && (
                          <button type="button" style={{ fontSize: '0.55rem', padding: '2px 6px', border: '1px solid var(--border-subtle)', borderRadius: 4, background: 'transparent', color: 'var(--accent-danger)', cursor: 'pointer' }}
                            onClick={() => removeAssetItem(key)}>X</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Audio Management — shown only for templates that support audio */}
            {supportsAudio && (
              <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 10, padding: 14, background: 'rgba(5,6,14,0.5)' }}>
                <span className="eyebrow" style={{ marginBottom: 10, display: 'block' }}>Ses Yönetimi ({template})</span>

                {/* Background Music */}
                <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(0,170,255,0.05)', border: '1px solid rgba(0,170,255,0.1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1rem' }}>🎵</span>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 600, fontSize: '0.78rem' }}>Arkaplan Müziği</span>
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginLeft: 6 }}>Döngüde çalar</span>
                    </div>
                    <input placeholder="MP3/WAV/OGG seçin..." value={(bgMusic.assetKey as string) ?? ''} readOnly
                      style={{ width: 200, fontSize: '0.65rem', height: 28 }}
                      onClick={() => setBgMusicPickerOpen(true)} />
                    <button type="button" className="ghost-button" style={{ fontSize: '0.6rem', padding: '3px 8px', minWidth: 'auto' }}
                      onClick={() => setBgMusicPickerOpen(true)}>Seç</button>
                    {(bgMusic.assetKey as string) && (
                      <button type="button" className="ghost-button" style={{ fontSize: '0.6rem', padding: '3px 8px', minWidth: 'auto', color: 'var(--accent-danger)' }}
                        onClick={() => updateAudioConfig({ backgroundMusic: undefined })}>X</button>
                    )}
                  </div>
                </div>

                {/* Sound Effects Grid */}
                <span style={{ fontWeight: 700, fontSize: '0.75rem', marginBottom: 6, display: 'block' }}>Olay Sesleri</span>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
                  Bu template şu ses olaylarını destekler. Her olaya bir ses dosyası atayabilirsin.
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 6 }}>
                  {audioEvents.map(event => (
                    <div key={event} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', border: '1px solid var(--border-subtle)', borderRadius: 6 }}>
                      <span style={{ fontSize: '0.8rem' }}>{AUDIO_EVENT_ICONS[event] ?? '🔊'}</span>
                      <span style={{ fontSize: '0.68rem', fontWeight: 600, minWidth: 70, whiteSpace: 'nowrap' }}>{event}</span>
                      <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {AUDIO_EVENT_LABELS[event] ?? ''}
                      </span>
                      <input
                        value={getSfxAssetKey(event)}
                        readOnly
                        placeholder="mp3..."
                        style={{ width: 90, fontSize: '0.6rem', height: 24, cursor: 'pointer' }}
                        onClick={() => setAudioPickerEvent(event)}
                      />
                      <button type="button" className="ghost-button" style={{ fontSize: '0.55rem', padding: '2px 6px', minWidth: 'auto' }}
                        onClick={() => setAudioPickerEvent(event)}>Seç</button>
                      {getSfxAssetKey(event) && (
                        <button type="button" className="ghost-button"
                          style={{ fontSize: '0.55rem', padding: '2px 4px', minWidth: 'auto', color: 'var(--accent-danger)' }}
                          onClick={() => { if (confirm(`${event} sesi kaldırılsın mı?`)) setSoundEffect(event, ''); }}>✕</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Template has no audio support */}
            {!supportsAudio && (
              <div style={{ padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {template} template'i ses efektlerini desteklemez.
                </span>
              </div>
            )}

            {/* Quick Upload Bar */}
            <div style={{ border: '1px dashed var(--border-subtle)', borderRadius: 10, padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>PNG, WebP, SVG, MP3, WAV, OGG · max 5MB</span>
              <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                Yükleme için Asset Kütüphanesi sayfasını kullanın
              </span>
            </div>
          </div>
        )}

        {/* PROGRAM Tab */}
        {activeTab === 'program' && (
          <div className="stack">
            <div className="eyebrow">Program Akışı ({programSteps.length} adım)</div>
            {programSteps.length === 0 ? (
              <p className="muted" style={{ fontSize: '0.78rem' }}>Bu oyunda program akışı tanımlanmamış. Advanced sekmesinden ekleyebilirsiniz.</p>
            ) : (
              <div className="program-builder" style={{ padding: 12, borderRadius: 12 }}>
                {programSteps.map((step, i) => (
                  <div key={i} className="program-step-card" style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent-cyan)', color: '#000', display: 'inline-grid', placeItems: 'center', fontWeight: 800, fontSize: '0.65rem', flexShrink: 0 }}>{i + 1}</span>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-primary)' }}>{step.title || `Adım ${i + 1}`}</span>
                        <span className="badge badge-info" style={{ marginLeft: 8, fontSize: '0.58rem' }}>{step.type}</span>
                      </div>
                    </div>
                    {step.motion && (
                      <p className="muted" style={{ margin: '4px 0 0 32px', fontSize: '0.7rem' }}>Hareket: {step.motion} · Hedef: {step.targetCount ?? step.holdSec ?? step.durationSec ?? '—'}</p>
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
            <div style={{ padding: 12, borderRadius: 8, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', marginBottom: 12 }}>
              <p style={{ fontSize: '0.72rem', color: 'var(--accent-amber)', margin: 0 }}>Bu bölüm teknik ayarlar içerir. Yanlış değişiklikler oyunun mobilde çalışmasını engelleyebilir.</p>
            </div>
            <label className="field"><span>Game Key</span><input value={draft.gameKey} onChange={(e) => updateField('gameKey', e.target.value)} /></label>
            <label className="field"><span>Min App Version</span><input value={draft.minAppVersion} onChange={(e) => updateField('minAppVersion', e.target.value)} /></label>
            <label className="field"><span>Orientation</span>
              <select value={draft.orientation} onChange={(e) => updateField('orientation', e.target.value)}>
                <option value="PORTRAIT">Dikey</option><option value="LANDSCAPE">Yatay</option>
              </select>
            </label>
            <label className="field"><span>Camera Requirement</span>
              <select value={draft.cameraRequirement} onChange={(e) => updateField('cameraRequirement', e.target.value)}>
                <option value="FULL_BODY">Tam Vücut</option><option value="UPPER_BODY">Üst Vücut</option><option value="HAND_TARGET">El Hedef</option>
              </select>
            </label>
            <details style={{ marginTop: 12 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>sceneConfig (JSON)</summary>
              <pre className="payload-preview" style={{ marginTop: 8, maxHeight: 200 }}>{JSON.stringify(level?.sceneConfig ?? {}, null, 2)}</pre>
            </details>
            <details style={{ marginTop: 8 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Tüm Level JSON</summary>
              <pre className="payload-preview" style={{ marginTop: 8, maxHeight: 300 }}>{JSON.stringify(draft.levels ?? [], null, 2)}</pre>
            </details>
          </div>
        )}
      </div>

      {/* ─── Asset Picker Modals ────────────────────────────── */}
      <AssetPickerModal open={coverPickerOpen} category="covers" onClose={() => setCoverPickerOpen(false)}
        onSelect={(asset) => { updateAssets({ cover: asset.url }); setCoverPickerOpen(false); }} />
      <AssetPickerModal open={bgPickerOpen} category="backgrounds" onClose={() => setBgPickerOpen(false)}
        onSelect={(asset) => { updateAssets({ background: asset.url }); setBgPickerOpen(false); }} />
      <AssetPickerModal open={charPickerOpen} category="characters" onClose={() => setCharPickerOpen(false)}
        onSelect={(asset) => { updateAssets({ character: asset.url }); setCharPickerOpen(false); }} />
      <AssetPickerModal open={objectPickerKey !== null} category="all"
        onClose={() => setObjectPickerKey(null)}
        onSelect={(asset) => { if (objectPickerKey) { updateAssetItem(objectPickerKey, asset.url); } setObjectPickerKey(null); }} />
      {/* Audio pickers — reuse modal with kind filter */}
      <AssetPickerModal open={bgMusicPickerOpen} category="music" kind="AUDIO"
        onClose={() => setBgMusicPickerOpen(false)}
        onSelect={(asset) => { updateAudioConfig({ backgroundMusic: { assetKey: asset.key, volume: 0.8 } }); setBgMusicPickerOpen(false); }} />
      <AssetPickerModal open={audioPickerEvent !== null} category="sfx" kind="AUDIO"
        onClose={() => setAudioPickerEvent(null)}
        onSelect={(asset) => { if (audioPickerEvent) { setSoundEffect(audioPickerEvent, asset.key); } setAudioPickerEvent(null); }} />
    </div>
  );
}
