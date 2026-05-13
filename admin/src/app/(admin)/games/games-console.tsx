'use client';

import { Dispatch, SetStateAction, startTransition, useEffect, useMemo, useState } from 'react';
import {
  WhackAMoleConfigForm, WhackAMolePreview,
  QuizConfigForm, QuizPreview,
  FlashcardConfigForm, FlashcardPreview,
  MemoryMatchConfigForm, MemoryMatchPreview,
  PoseHoldConfigForm, PoseHoldPreview,
  FruitSlashPreview,
  ScenePlayPreview,
  DodgeRunPreview,
  FitChallengePreview
} from './components/template-forms';
import {
  buildDemoDraft,
  createGameDefinition,
  GameDefinitionDraft,
  GameDefinitionDto,
  getGameValidation,
  isPublicDemoTemplate,
  listAuditLogs,
  listGameDefinitions,
  publicDemoTemplates,
  publishGameDefinition,
  PublicDemoTemplate,
  rollbackGameDefinition,
  templateLabel,
  toGameDefinitionV3,
  updateGameDefinition,
  uploadGameAsset,
  validateGameDraft
} from '../../../lib/alba-api';
import { RightInspector } from '../../components/right-inspector';

interface ConsoleState {
  games: GameDefinitionDto[];
  auditLogs: Array<{
    id: string;
    actorId: string;
    action: string;
    entityType: string;
    entityId: string;
    createdAt: string;
  }>;
  validationErrors: string[];
}

function cloneDraft(source: GameDefinitionDraft): GameDefinitionDraft {
  return {
    ...source,
    supportedMotions: [...source.supportedMotions],
    levels: source.levels.map((level) => ({
      ...level,
      motionRules: level.motionRules.map((rule) => ({ ...rule })),
      rewardRules: level.rewardRules.map((rule) => ({ ...rule })),
      config: { ...level.config },
      sceneConfig: { ...level.sceneConfig },
      interactionRules: level.interactionRules.map((rule) => ({
        ...rule,
        keypoints: rule.keypoints ? [...rule.keypoints] : undefined
      })),
      tasks: level.tasks.map((task) => ({ ...task })),
      programSteps: level.programSteps.map((step) => ({ ...step }))
    })),
    assets: {
      ...source.assets,
      items: source.assets.items?.map((item) => ({ ...item }))
    },
    tags: [...source.tags]
  };
}

function createDraftFor(template: PublicDemoTemplate): GameDefinitionDraft {
  return cloneDraft(buildDemoDraft(template));
}

export function GamesConsole() {
  const [state, setState] = useState<ConsoleState>({
    games: [],
    auditLogs: [],
    validationErrors: []
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<GameDefinitionDraft>(createDraftFor('FRUIT_SLASH'));
  const [message, setMessage] = useState<string>('AlbaGo demo oyun konsolu backend baglantisini bekliyor.');
  const [isBusy, setIsBusy] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | GameDefinitionDraft['category']>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'PUBLISHED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [validationResult, setValidationResult] = useState<{ errors: Array<any>; warnings: Array<any> } | null>(null);
  const [jsonExpanded, setJsonExpanded] = useState(false);

  const availableCategories = useMemo(() => {
    const cats = new Set(state.games
      .filter((game) => isPublicDemoTemplate(game.template))
      .map((game) => game.category)
      .filter(Boolean));
    return Array.from(cats).sort();
  }, [state.games]);

  const publicGames = useMemo(
    () =>
      state.games
        .filter((game) => isPublicDemoTemplate(game.template))
        .filter((game) => categoryFilter === 'ALL' || game.category === categoryFilter)
        .filter((game) => statusFilter === 'ALL' || game.status === statusFilter)
        .filter((game) =>
          !searchQuery.trim() ||
          game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          game.gameKey.toLowerCase().includes(searchQuery.toLowerCase())
        ),
    [categoryFilter, statusFilter, searchQuery, state.games]
  );

  async function refresh(selectedGameId?: string | null) {
    try {
      const [games, auditLogs] = await Promise.all([listGameDefinitions(), listAuditLogs()]);
      const visibleGames = games.filter((game) => isPublicDemoTemplate(game.template));
      const nextSelectedId = selectedGameId ?? selectedId ?? visibleGames[0]?.id ?? null;
      const selectedGame = games.find((game) => game.id === nextSelectedId);
      const validation =
        nextSelectedId && selectedGame ? await getGameValidation(nextSelectedId) : null;

      startTransition(() => {
        setState({
          games,
          auditLogs,
          validationErrors: validation?.errors ?? []
        });
        setSelectedId(nextSelectedId);
        setDraft(
          selectedGame && isPublicDemoTemplate(selectedGame.template)
            ? mapGameToDraft(selectedGame)
            : createDraftFor('FRUIT_SLASH')
        );
        setMessage(
          selectedGame
            ? `${selectedGame.title} secildi.`
            : 'Yeni AlbaGo demo oyunu taslagi hazirlandi.'
        );
      });
    } catch (error) {
      const details = error instanceof Error ? error.message : 'unknown_error';
      setMessage(`Backend okunamadi: ${details}`);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const selectedGame = useMemo(
    () => state.games.find((game) => game.id === selectedId) ?? null,
    [selectedId, state.games]
  );

  function updateLevel(
    updater: (level: GameDefinitionDraft['levels'][number]) => GameDefinitionDraft['levels'][number]
  ) {
    setDraft((current) => ({
      ...current,
      levels: [updater(current.levels[0])]
    }));
  }

  function resetForTemplate(template: PublicDemoTemplate) {
    setSelectedId(null);
    setDraft(createDraftFor(template));
    setState((current) => ({ ...current, validationErrors: [] }));
    setValidationResult(null);
    setMessage(`Yeni ${templateLabel(template)} taslagi hazirlandi.`);
  }

  async function saveDraft() {
    setIsBusy(true);
    try {
      const payload = { ...draft, actorId: 'admin@local', status: 'DRAFT' as const };
      const saved = selectedId
        ? await updateGameDefinition(selectedId, payload)
        : await createGameDefinition(payload);
      await refresh(saved.id);
      setMessage(`${saved.title} taslak olarak kaydedildi.`);
    } catch (error) {
      const details = error instanceof Error ? error.message : 'unknown_error';
      setMessage(`Kayit basarisiz: ${details}`);
    } finally {
      setIsBusy(false);
    }
  }

  async function publishSelected() {
    if (!selectedId) {
      setMessage('Publish icin once bir oyun kaydedin.');
      return;
    }
    setIsBusy(true);
    try {
      const result = await publishGameDefinition(selectedId, 'admin@local');
      if (result.published && result.game) {
        await refresh(result.game.id);
        const warnCount = result.validation?.warnings?.length ?? 0;
        setMessage(`${result.game.title} yayina alindi.${warnCount > 0 ? ` ${warnCount} uyari var.` : ''}`);
      } else {
        const errorCount = result.validation?.errors?.length ?? 0;
        setMessage(`Publish engellendi: ${errorCount} hata bulundu.`);
        if (result.validation) {
          setValidationResult(result.validation);
        }
      }
    } catch (error) {
      const details = error instanceof Error ? error.message : 'unknown_error';
      setMessage(`Publish basarisiz: ${details}`);
    } finally {
      setIsBusy(false);
    }
  }

  async function rollbackSelected() {
    if (!selectedId) {
      setMessage('Rollback icin secili oyun bulunamadi.');
      return;
    }
    setIsBusy(true);
    try {
      const rolledBack = await rollbackGameDefinition(selectedId, 'admin@local');
      await refresh(rolledBack.id);
      setMessage(`${rolledBack.title} review durumuna alindi.`);
    } catch (error) {
      const details = error instanceof Error ? error.message : 'unknown_error';
      setMessage(`Rollback basarisiz: ${details}`);
    } finally {
      setIsBusy(false);
    }
  }

  const isPublishable = selectedId != null && (validationResult?.errors?.length ?? 0) === 0;

  return (
    <div className="workspace-layout">
      {/* ═══ GAME LIST (LEFT) ═══ */}
      <article className="panel" style={{ padding: 'var(--space-xl)' }}>
        <div className="stack">
          <div>
            <p className="eyebrow">Oyun Katalogu</p>
            <h2 style={{ fontSize: 18, fontWeight: 650, margin: '0 0 2px' }}>Oyunlar</h2>
            <p className="muted" style={{ fontSize: '0.8rem' }}>
              {publicGames.length} oyun listeleniyor
            </p>
          </div>

          <input
            className="search-input"
            type="search"
            placeholder="Oyun veya key ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <div className="category-tabs" role="tablist" aria-label="Kategori filtresi">
            <button
              className={`category-tab${categoryFilter === 'ALL' ? ' category-tab-active' : ''}`}
              onClick={() => setCategoryFilter('ALL')}
              type="button"
            >
              Tumu
            </button>
            {availableCategories.map((category) => (
              <button
                key={category}
                className={`category-tab${categoryFilter === category ? ' category-tab-active' : ''}`}
                onClick={() => setCategoryFilter(category)}
                type="button"
              >
                {categoryLabel(category)}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(['ALL', 'DRAFT', 'PUBLISHED'] as const).map((s) => (
              <button
                key={s}
                className={`category-tab${statusFilter === s ? ' category-tab-active' : ''}`}
                onClick={() => setStatusFilter(s)}
                type="button"
                style={{ fontSize: '0.72rem', padding: '5px 10px' }}
              >
                {s === 'ALL' ? 'Tum Durumlar' : s === 'DRAFT' ? 'Taslak' : 'Yayinda'}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {publicDemoTemplates.map((template) => (
              <button
                key={template}
                className="ghost-button"
                onClick={() => resetForTemplate(template)}
                type="button"
                style={{ minWidth: 0, fontSize: '0.72rem', padding: '5px 10px' }}
              >
                + {templateLabel(template)}
              </button>
            ))}
          </div>

          <div className="list">
            {publicGames.map((game) => (
              <button
                key={game.id}
                className={`list-card${game.id === selectedId ? ' list-card-active' : ''}`}
                onClick={() => void refresh(game.id)}
                type="button"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <strong style={{ fontSize: '0.88rem' }}>{game.title}</strong>
                  {game.status === 'PUBLISHED' ? (
                    <span className="badge-success">Published</span>
                  ) : (
                    <span className="badge-draft">{game.status}</span>
                  )}
                </div>
                <span className="muted" style={{ fontSize: '0.74rem' }}>
                  {categoryLabel(game.category)} · {templateLabel(game.template)}
                </span>
                <span className="muted" style={{ fontSize: '0.7rem' }}>
                  {game.supportedMotions?.length ? 'Mobile · ' : ''}v{game.version}
                </span>
              </button>
            ))}
          </div>
        </div>
      </article>

      {/* ═══ EDITOR (CENTER) ═══ */}
      <div className="stack" style={{ minWidth: 0 }}>
        {/* Sticky Action Bar */}
        <div className="action-bar">
          <button className="secondary-button" disabled={isBusy} onClick={() => void saveDraft()} type="button">
            Save Draft
          </button>
          <button className="ghost-button" disabled={isBusy} onClick={() => {
            validateGameDraft(draft).then(setValidationResult).catch(() => {});
          }} type="button">
            Validate
          </button>
          <button className="primary-button" disabled={isBusy || !isPublishable} onClick={() => void publishSelected()} type="button">
            Publish
          </button>
          <button className="danger-button" disabled={isBusy || !selectedId} onClick={() => void rollbackSelected()} type="button">
            Rollback
          </button>
          <button className="ghost-button" disabled={isBusy} onClick={() => void refresh(selectedId)} type="button" style={{ minWidth: 0 }}>
            Refresh
          </button>
        </div>

        {/* Message */}
        {message && (
          <div style={{
            padding: '10px 16px',
            borderRadius: 10,
            background: 'rgba(34, 211, 238, 0.08)',
            border: '1px solid rgba(34, 211, 238, 0.18)',
            color: 'var(--accent-cyan)',
            fontSize: '0.82rem',
            fontWeight: 500
          }}>
            {message}
          </div>
        )}

        {/* Section: Basic Info */}
        <div className="panel" style={{ padding: 'var(--space-xl)' }}>
          <p className="eyebrow">Basic Info</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 650 }}>
              {selectedGame?.title ?? templateLabel(draft.template)}
            </h2>
            <span className={selectedGame?.status === 'PUBLISHED' ? 'badge-success' : 'badge-draft'}>
              {selectedGame?.status ?? 'NEW'}
            </span>
          </div>

          <div className="field-grid">
            <label className="field">
              <span>Template</span>
              <select
                value={draft.template}
                onChange={(event) => resetForTemplate(event.target.value as PublicDemoTemplate)}
              >
                {publicDemoTemplates.map((template) => (
                  <option key={template} value={template}>{templateLabel(template)}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Game key</span>
              <input
                value={draft.gameKey}
                onChange={(event) => setDraft((current) => ({ ...current, gameKey: event.target.value }))}
              />
            </label>
          </div>

          <div style={{ marginTop: 14 }}>
            <label className="field">
              <span>Title</span>
              <input
                value={draft.title}
                onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              />
            </label>
          </div>

          <div style={{ marginTop: 14 }}>
            <label className="field">
              <span>Description</span>
              <textarea
                rows={4}
                value={draft.description}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, description: event.target.value }))
                }
              />
            </label>
          </div>
        </div>

        {/* Section: Category & Targeting */}
        <div className="panel" style={{ padding: 'var(--space-xl)' }}>
          <p className="eyebrow">Category &amp; Targeting</p>
          <div className="field-grid">
            <label className="field">
              <span>Kategori</span>
              <select
                value={draft.category}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    category: event.target.value as GameDefinitionDraft['category']
                  }))
                }
              >
                <option value="SPORT">Spor</option>
                <option value="FUN">Eglence</option>
                <option value="EDUCATION">Egitim</option>
              </select>
            </label>
            <label className="field">
              <span>Etiketler</span>
              <input
                value={draft.tags.join(', ')}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    tags: event.target.value.split(',').map((item) => item.trim()).filter(Boolean)
                  }))
                }
                placeholder="playlist, cocuk, refleks"
              />
            </label>
            <label className="field">
              <span>Difficulty</span>
              <select
                value={draft.levels[0].config.difficulty as string ?? 'EASY'}
                onChange={(event) =>
                  updateLevel((level) => ({
                    ...level,
                    config: { ...level.config, difficulty: event.target.value }
                  }))
                }
              >
                <option value="EASY">Kolay</option>
                <option value="MEDIUM">Orta</option>
                <option value="HARD">Zor</option>
              </select>
            </label>
            <label className="field">
              <span>Duration (sec)</span>
              <input
                type="number"
                value={draft.levels[0].durationSec}
                onChange={(event) =>
                  updateLevel((level) => ({
                    ...level,
                    durationSec: Number(event.target.value) || 0
                  }))
                }
              />
            </label>
            <label className="field">
              <span>Orientation</span>
              <select
                value={draft.orientation}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    orientation: event.target.value as GameDefinitionDraft['orientation']
                  }))
                }
              >
                <option value="PORTRAIT">Dikey</option>
                <option value="LANDSCAPE">Yatay</option>
              </select>
            </label>
            <label className="field">
              <span>Camera requirement</span>
              <select
                value={draft.cameraRequirement}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    cameraRequirement: event.target.value as GameDefinitionDraft['cameraRequirement']
                  }))
                }
              >
                <option value="FULL_BODY">Tam vucut</option>
                <option value="UPPER_BODY">Ust vucut</option>
                <option value="HAND_TARGET">El / hedef temasi</option>
              </select>
            </label>
          </div>
        </div>

        {/* Section: Gameplay Rules */}
        <div className="panel" style={{ padding: 'var(--space-xl)' }}>
          <p className="eyebrow">Gameplay Rules</p>
          <div className="field-grid">
            <label className="field">
              <span>Target score</span>
              <input
                type="number"
                value={draft.levels[0].targetScore}
                onChange={(event) =>
                  updateLevel((level) => ({
                    ...level,
                    targetScore: Number(event.target.value) || 0
                  }))
                }
              />
            </label>
            <label className="field">
              <span>Min app version</span>
              <input
                value={draft.minAppVersion}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, minAppVersion: event.target.value }))
                }
              />
            </label>
            <label className="field">
              <span>Default hit radius</span>
              <input
                type="number"
                step="0.01"
                value={Number(draft.levels[0].sceneConfig.defaultHitRadius ?? 0.18)}
                onChange={(event) =>
                  updateLevel((level) => ({
                    ...level,
                    sceneConfig: {
                      ...level.sceneConfig,
                      defaultHitRadius: Number(event.target.value) || 0.18
                    }
                  }))
                }
              />
            </label>
          </div>
        </div>

        {/* Section: Template Config */}
        <TemplateConfigEditor draft={draft} updateLevel={updateLevel} />

        {/* Section: Program Flow */}
        <ProgramFlowEditor level={draft.levels[0]} updateLevel={updateLevel} />

        {/* Section: Template-Specific Config */}
        <div className="panel" style={{ padding: 'var(--space-xl)' }}>
          <p className="eyebrow">Template Config</p>
          <TemplateSpecificForm draft={draft} setDraft={setDraft} />
        </div>

        {/* Section: Motion Rules */}
        {draft.levels[0].motionRules.length > 0 && (
          <div className="panel" style={{ padding: 'var(--space-xl)' }}>
            <p className="eyebrow">Motion Rules</p>
            <div className="field-grid">
              {draft.levels[0].motionRules.map((rule, index) => (
                <div className="rule-card" key={`${rule.motion}-${index}-${rule.event}`}>
                  <p style={{ color: 'var(--accent-pink)', fontWeight: 700, fontSize: '0.74rem', margin: '0 0 8px' }}>
                    {rule.motion} / {rule.event}
                  </p>
                  <label className="field">
                    <span>Points</span>
                    <input
                      type="number"
                      value={rule.points}
                      onChange={(event) =>
                        updateLevel((level) => ({
                          ...level,
                          motionRules: level.motionRules.map((item, i) =>
                            i === index ? { ...item, points: Number(event.target.value) || 0 } : item
                          )
                        }))
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Cooldown</span>
                    <input
                      type="number"
                      value={rule.cooldownMs}
                      onChange={(event) =>
                        updateLevel((level) => ({
                          ...level,
                          motionRules: level.motionRules.map((item, i) =>
                            i === index ? { ...item, cooldownMs: Number(event.target.value) || 0 } : item
                          )
                        }))
                      }
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section: Assets */}
        <div className="panel" style={{ padding: 'var(--space-xl)' }}>
          <p className="eyebrow">Assets</p>
          <div className="field-grid">
            <label className="field">
              <span>Background asset</span>
              <input
                value={draft.assets.background}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    assets: { ...current.assets, background: event.target.value }
                  }))
                }
              />
            </label>
            <label className="field">
              <span>Character asset</span>
              <input
                value={draft.assets.character}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    assets: { ...current.assets, character: event.target.value }
                  }))
                }
              />
            </label>
            <label className="field">
              <span>Soundtrack asset</span>
              <input
                value={draft.assets.soundtrack ?? ''}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    assets: { ...current.assets, soundtrack: event.target.value }
                  }))
                }
              />
            </label>
          </div>
          <div style={{ marginTop: 14 }}>
            <AssetUploadPanel draft={draft} setDraft={setDraft} setMessage={setMessage} />
          </div>
        </div>

        {/* Section: Preview */}
        <div className="panel" style={{ padding: 'var(--space-xl)' }}>
          <p className="eyebrow">Preview</p>
          <TemplatePreview draft={draft} />
        </div>

        {/* Section: Advanced JSON (collapsible) */}
        <div>
          <button
            className={`collapsible-toggle${jsonExpanded ? ' open' : ''}`}
            onClick={() => setJsonExpanded((v) => !v)}
            type="button"
          >
            Developer Payload (JSON)
          </button>
          {jsonExpanded && (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8, justifyContent: 'flex-end' }}>
                <button
                  className="ghost-button"
                  type="button"
                  style={{ minWidth: 0, fontSize: '0.72rem', padding: '5px 10px' }}
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(toGameDefinitionV3(draft), null, 2));
                  }}
                >
                  Copy
                </button>
              </div>
              <pre className="payload-preview">
                {JSON.stringify(toGameDefinitionV3(draft), null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* ═══ RIGHT INSPECTOR ═══ */}
      <RightInspector
        selectedGame={selectedGame}
        validationResult={validationResult}
        serverErrors={state.validationErrors}
        auditLogs={state.auditLogs}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════ */

function AssetUploadPanel({
  draft,
  setDraft,
  setMessage
}: {
  draft: GameDefinitionDraft;
  setDraft: Dispatch<SetStateAction<GameDefinitionDraft>>;
  setMessage: Dispatch<SetStateAction<string>>;
}) {
  const [assetKey, setAssetKey] = useState(defaultAssetKey(draft.template));
  const [uploading, setUploading] = useState(false);
  const items = draft.assets.items ?? [];

  async function upload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await uploadGameAsset(file);
      const item = { ...uploaded, key: assetKey.trim() || uploaded.key };
      setDraft((current) => ({
        ...current,
        assets: {
          ...current.assets,
          items: [...(current.assets.items ?? []).filter((c) => c.key !== item.key), item]
        }
      }));
      setMessage(`${item.key} asset yuklendi.`);
    } catch (error) {
      setMessage(`Asset yukleme basarisiz: ${error instanceof Error ? error.message : 'unknown_error'}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{
      border: '1px solid var(--border-subtle)',
      borderRadius: 13,
      padding: 14,
      background: 'rgba(255,255,255,0.025)'
    }}>
      <p style={{ color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.78rem', margin: '0 0 10px' }}>
        Asset Manifest
      </p>
      <div className="field-grid">
        <label className="field">
          <span>Asset key</span>
          <input value={assetKey} onChange={(e) => setAssetKey(e.target.value)} />
        </label>
        <label className="field">
          <span>Upload</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              accept="image/png,image/webp,image/svg+xml"
              disabled={uploading}
              type="file"
              onChange={(e) => void upload(e.target.files?.[0])}
              style={{ flex: 1 }}
            />
          </div>
        </label>
      </div>
      <div className="asset-grid" style={{ marginTop: 10 }}>
        {items.length === 0 ? (
          <p className="muted" style={{ fontSize: '0.76rem' }}>Henuz typed asset yok.</p>
        ) : (
          items.map((asset) => (
            <div className="asset-card" key={`${asset.key}-${asset.uri}`}>
              <strong style={{ fontSize: '0.8rem' }}>{asset.key}</strong>
              <span className="muted" style={{ fontSize: '0.72rem' }}>
                {asset.format} · {asset.bytes ? `${Math.round(asset.bytes / 1024)} KB` : 'local'}
              </span>
              <span className="muted" style={{ fontSize: '0.68rem' }}>{asset.uri}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function TemplateConfigEditor({
  draft,
  updateLevel
}: {
  draft: GameDefinitionDraft;
  updateLevel: (updater: (level: GameDefinitionDraft['levels'][number]) => GameDefinitionDraft['levels'][number]) => void;
}) {
  const level = draft.levels[0];

  if (draft.template === 'SCENE_PLAY') {
    return (
      <div className="panel" style={{ padding: 'var(--space-xl)' }}>
        <p className="eyebrow">Scene Play Builder</p>
        <h3 style={{ fontSize: 15, marginTop: 0, marginBottom: 6 }}>No-code komut ve nesne akisi</h3>
        <p className="muted" style={{ fontSize: '0.8rem', marginBottom: 14 }}>
          Objeler oyun sirasinda sirayla/sureli gelir. Her obje bir hareket ister;
          dogru MotionEvent gelirse skor artar.
        </p>
        <div className="field-grid">
          <ConfigNumberField
            label="Spawn rate (ms)"
            value={Number(level.config.spawnRateMs ?? 1800)}
            onChange={(v) => updateLevel((c) => ({ ...c, config: { ...c.config, spawnRateMs: v } }))}
          />
          <ConfigNumberField
            label="Lives"
            value={Number(level.config.lives ?? 3)}
            onChange={(v) => updateLevel((c) => ({ ...c, config: { ...c.config, lives: v } }))}
          />
          <ConfigNumberField
            label="Object life (ms)"
            value={Number(level.sceneConfig.defaultObjectLifeMs ?? 2400)}
            onChange={(v) => updateLevel((c) => ({ ...c, sceneConfig: { ...c.sceneConfig, defaultObjectLifeMs: v } }))}
          />
        </div>
        <div style={{ marginTop: 14 }}>
          <SceneObjectEditor level={level} updateLevel={updateLevel} />
        </div>
      </div>
    );
  }

  if (draft.template === 'FRUIT_SLASH') {
    return (
      <div className="panel" style={{ padding: 'var(--space-xl)' }}>
        <p className="eyebrow">Template Config</p>
        <div className="field-grid">
          <ConfigNumberField label="Spawn rate (ms)" value={Number(level.config.spawnRateMs ?? 900)}
            onChange={(v) => updateLevel((c) => ({ ...c, config: { ...c.config, spawnRateMs: v } }))} />
          <ConfigNumberField label="Object life (ms)" value={Number(level.sceneConfig.defaultObjectLifeMs ?? 2600)}
            onChange={(v) => updateLevel((c) => ({ ...c, sceneConfig: { ...c.sceneConfig, defaultObjectLifeMs: v } }))} />
          <ConfigNumberField label="Penalty points" value={Number(level.config.penaltyPoints ?? 10)}
            onChange={(v) => updateLevel((c) => ({ ...c, config: { ...c.config, penaltyPoints: v } }))} />
        </div>
      </div>
    );
  }

  if (draft.template === 'DODGE_RUN') {
    return (
      <div className="panel" style={{ padding: 'var(--space-xl)' }}>
        <p className="eyebrow">Template Config</p>
        <div className="field-grid">
          <ConfigNumberField label="Lives" value={Number(level.config.lives ?? 3)}
            onChange={(v) => updateLevel((c) => ({ ...c, config: { ...c.config, lives: v } }))} />
          <ConfigNumberField label="Obstacle spawn (ms)" value={Number(level.config.obstacleSpawnMs ?? 1400)}
            onChange={(v) => updateLevel((c) => ({ ...c, config: { ...c.config, obstacleSpawnMs: v } }))} />
          <ConfigNumberField label="Travel speed (ms)" value={Number(level.sceneConfig.travelMs ?? 2100)}
            onChange={(v) => updateLevel((c) => ({ ...c, sceneConfig: { ...c.sceneConfig, travelMs: v } }))} />
          <ConfigNumberField label="Miss damage" value={Number(level.config.damageOnMiss ?? 1)}
            onChange={(v) => updateLevel((c) => ({ ...c, config: { ...c.config, damageOnMiss: v } }))} />
        </div>
      </div>
    );
  }

  return (
    <div className="panel" style={{ padding: 'var(--space-xl)' }}>
      <p className="eyebrow">Template Config</p>
      <div className="field-grid">
        <ConfigNumberField label="Squat target"
          value={level.tasks.find((t) => t.motion === 'SQUAT')?.targetCount ?? 10}
          onChange={(v) => updateLevel((c) => ({
            ...c, tasks: c.tasks.map((t) => t.motion === 'SQUAT' ? { ...t, targetCount: v } : t)
          }))} />
        <ConfigNumberField label="Jumping Jack target"
          value={level.tasks.find((t) => t.motion === 'JUMPING_JACK')?.targetCount ?? 10}
          onChange={(v) => updateLevel((c) => ({
            ...c, tasks: c.tasks.map((t) => t.motion === 'JUMPING_JACK' ? { ...t, targetCount: v } : t)
          }))} />
        <ConfigNumberField label="Jump Rope target"
          value={level.tasks.find((t) => t.motion === 'JUMP_ROPE')?.targetCount ?? 20}
          onChange={(v) => updateLevel((c) => ({
            ...c, tasks: c.tasks.map((t) => t.motion === 'JUMP_ROPE' ? { ...t, targetCount: v } : t)
          }))} />
      </div>
      <div className="field-grid" style={{ marginTop: 14 }}>
        <ConfigNumberField label="Squat points"
          value={level.tasks.find((t) => t.motion === 'SQUAT')?.pointsPerRep ?? 10}
          onChange={(v) => updateLevel((c) => ({
            ...c, tasks: c.tasks.map((t) => t.motion === 'SQUAT' ? { ...t, pointsPerRep: v } : t)
          }))} />
        <ConfigNumberField label="Jumping Jack points"
          value={level.tasks.find((t) => t.motion === 'JUMPING_JACK')?.pointsPerRep ?? 12}
          onChange={(v) => updateLevel((c) => ({
            ...c, tasks: c.tasks.map((t) => t.motion === 'JUMPING_JACK' ? { ...t, pointsPerRep: v } : t)
          }))} />
        <ConfigNumberField label="Jump Rope points"
          value={level.tasks.find((t) => t.motion === 'JUMP_ROPE')?.pointsPerRep ?? 3}
          onChange={(v) => updateLevel((c) => ({
            ...c, tasks: c.tasks.map((t) => t.motion === 'JUMP_ROPE' ? { ...t, pointsPerRep: v } : t)
          }))} />
      </div>
    </div>
  );
}

type SceneObjectDraft = {
  objectType?: string;
  label?: string;
  assetKey?: string;
  requiredMotion?: string;
  points?: number;
  lifeMs?: number;
  hitRadius?: number;
  isPenalty?: boolean;
};

function SceneObjectEditor({
  level,
  updateLevel
}: {
  level: GameDefinitionDraft['levels'][number];
  updateLevel: (updater: (level: GameDefinitionDraft['levels'][number]) => GameDefinitionDraft['levels'][number]) => void;
}) {
  const objects = Array.isArray(level.sceneConfig.objects)
    ? (level.sceneConfig.objects as SceneObjectDraft[])
    : [];

  function updateObject(index: number, patch: Partial<SceneObjectDraft>) {
    updateLevel((current) => {
      const currentObjects = Array.isArray(current.sceneConfig.objects)
        ? ([...(current.sceneConfig.objects as SceneObjectDraft[])] as SceneObjectDraft[])
        : [];
      currentObjects[index] = { ...currentObjects[index], ...patch };
      return {
        ...current,
        sceneConfig: { ...current.sceneConfig, objects: currentObjects },
        interactionRules: sceneObjectsToRules(currentObjects)
      };
    });
  }

  function addObject() {
    updateLevel((current) => {
      const currentObjects = Array.isArray(current.sceneConfig.objects)
        ? ([...(current.sceneConfig.objects as SceneObjectDraft[])] as SceneObjectDraft[])
        : [];
      const nextObjects = [
        ...currentObjects,
        {
          objectType: `prompt_${currentObjects.length + 1}`,
          label: 'Yeni komut',
          assetKey: `prompt${currentObjects.length + 1}`,
          requiredMotion: 'SQUAT',
          points: 10,
          lifeMs: Number(current.sceneConfig.defaultObjectLifeMs ?? 2400),
          hitRadius: 0.2
        }
      ];
      return {
        ...current,
        sceneConfig: { ...current.sceneConfig, objects: nextObjects },
        interactionRules: sceneObjectsToRules(nextObjects)
      };
    });
  }

  function removeObject(index: number) {
    updateLevel((current) => {
      const currentObjects = Array.isArray(current.sceneConfig.objects)
        ? ([...(current.sceneConfig.objects as SceneObjectDraft[])] as SceneObjectDraft[])
        : [];
      const nextObjects = currentObjects.filter((_, i) => i !== index);
      return {
        ...current,
        sceneConfig: { ...current.sceneConfig, objects: nextObjects },
        interactionRules: sceneObjectsToRules(nextObjects)
      };
    });
  }

  return (
    <div className="stack">
      <button className="secondary-button" type="button" onClick={addObject} style={{ minWidth: 0 }}>
        + Komut / obje ekle
      </button>
      {objects.length === 0 ? (
        <p className="muted" style={{ fontSize: '0.78rem' }}>Henuz scene objesi yok.</p>
      ) : (
        objects.map((object, index) => (
          <div className="rule-card" key={`${object.objectType}-${index}`}>
            <div className="section-header">
              <p style={{ color: 'var(--accent-pink)', fontWeight: 700, fontSize: '0.74rem', margin: 0 }}>
                Scene object #{index + 1}
              </p>
              <button className="ghost-button" type="button" onClick={() => removeObject(index)} style={{ minWidth: 0, padding: '4px 10px', fontSize: '0.7rem' }}>
                Kaldir
              </button>
            </div>
            <div className="field-grid">
              <label className="field"><span>Object type</span>
                <input value={object.objectType ?? ''} onChange={(e) => updateObject(index, { objectType: e.target.value })} />
              </label>
              <label className="field"><span>Label</span>
                <input value={object.label ?? ''} onChange={(e) => updateObject(index, { label: e.target.value })} />
              </label>
              <label className="field"><span>Asset key</span>
                <input value={object.assetKey ?? ''} onChange={(e) => updateObject(index, { assetKey: e.target.value })} />
              </label>
              <label className="field"><span>Required motion</span>
                <select value={object.requiredMotion ?? 'SQUAT'} onChange={(e) => updateObject(index, { requiredMotion: e.target.value })}>
                  <option value="SQUAT">Squat / Cuce</option>
                  <option value="JUMPING_JACK">Jumping Jack / Deve</option>
                  <option value="JUMP_ROPE">Jump Rope</option>
                </select>
              </label>
              <ConfigNumberField label="Points" value={Number(object.points ?? 10)} onChange={(v) => updateObject(index, { points: v })} />
              <ConfigNumberField label="Life (ms)" value={Number(object.lifeMs ?? 2400)} onChange={(v) => updateObject(index, { lifeMs: v })} />
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function sceneObjectsToRules(objects: SceneObjectDraft[]) {
  return [
    ...objects
      .filter((o) => o.objectType && o.requiredMotion)
      .map((o) => ({
        input: 'MOTION_EVENT' as const,
        event: 'REP_COUNTED' as const,
        motion: o.requiredMotion as GameDefinitionDraft['supportedMotions'][number],
        targetObjectType: o.objectType,
        action: 'REMOVE_OBJECT' as const,
        points: Number(o.points ?? 0),
        cooldownMs: 400
      })),
    { input: 'MOTION_EVENT' as const, event: 'BAD_FORM' as const, action: 'RESET_COMBO' as const, points: -5, cooldownMs: 250 },
    { input: 'MOTION_EVENT' as const, event: 'USER_OUT_OF_FRAME' as const, action: 'PAUSE_GAME' as const, cooldownMs: 0 }
  ];
}

function ProgramFlowEditor({
  level,
  updateLevel
}: {
  level: GameDefinitionDraft['levels'][number];
  updateLevel: (updater: (level: GameDefinitionDraft['levels'][number]) => GameDefinitionDraft['levels'][number]) => void;
}) {
  const steps = level.programSteps ?? [];

  function updateStep(index: number, patch: Partial<GameDefinitionDraft['levels'][number]['programSteps'][number]>) {
    updateLevel((current) => ({
      ...current,
      programSteps: current.programSteps.map((s, i) => i === index ? { ...s, ...patch } : s)
    }));
  }

  function addStep(type: GameDefinitionDraft['levels'][number]['programSteps'][number]['type']) {
    updateLevel((current) => ({
      ...current,
      programSteps: [
        ...current.programSteps,
        {
          stepId: `program_step_${current.programSteps.length + 1}`,
          type,
          title: type === 'HOLD_POSE' ? 'Plank tutusu' : type === 'REST' ? 'Dinlenme' : 'Yeni aktivite',
          motion: type === 'MOTION_REPS' ? 'SQUAT' : undefined,
          targetCount: type === 'MOTION_REPS' ? 10 : undefined,
          holdSec: type === 'HOLD_POSE' ? 30 : undefined,
          durationSec: type === 'REST' ? 20 : undefined,
          successMessage: 'Adim tamamlandi.',
          nextOnComplete: true
        }
      ]
    }));
  }

  function removeStep(index: number) {
    updateLevel((current) => ({
      ...current,
      programSteps: current.programSteps.filter((_, i) => i !== index)
    }));
  }

  return (
    <div className="panel program-builder" style={{ padding: 'var(--space-xl)' }}>
      <p className="eyebrow">Program / Playlist Flow</p>
      <h3 style={{ fontSize: 15, marginTop: 0, marginBottom: 6 }}>Spor, egitim veya eglence akisini sirala</h3>
      <p className="muted" style={{ fontSize: '0.8rem', marginBottom: 14 }}>
        Squat seti, plank tutusu, dinlenme ve sonraki aktivite gibi adimlari burada baglayabilirsin.
      </p>
      <div className="button-row">
        <button className="secondary-button" type="button" onClick={() => addStep('MOTION_REPS')} style={{ minWidth: 0, fontSize: '0.76rem' }}>
          + Tekrar hedefi
        </button>
        <button className="secondary-button" type="button" onClick={() => addStep('HOLD_POSE')} style={{ minWidth: 0, fontSize: '0.76rem' }}>
          + Plank / pozisyon
        </button>
        <button className="secondary-button" type="button" onClick={() => addStep('REST')} style={{ minWidth: 0, fontSize: '0.76rem' }}>
          + Dinlenme
        </button>
        <button className="secondary-button" type="button" onClick={() => addStep('INSTRUCTION')} style={{ minWidth: 0, fontSize: '0.76rem' }}>
          + Yonlendirme
        </button>
      </div>
      {steps.length === 0 ? (
        <p className="muted" style={{ fontSize: '0.78rem', marginTop: 10 }}>Program akisi yok. Tek sahneli oyun gibi calisir.</p>
      ) : (
        steps.map((step, index) => (
          <div className="program-step-card" key={`${step.stepId}-${index}`} style={{ marginTop: 10 }}>
            <div className="section-header">
              <p style={{ color: 'var(--accent-pink)', fontWeight: 700, fontSize: '0.74rem', margin: 0 }}>
                #{index + 1} {step.type}
              </p>
              <button className="ghost-button" type="button" onClick={() => removeStep(index)} style={{ minWidth: 0, padding: '4px 10px', fontSize: '0.7rem' }}>
                Kaldir
              </button>
            </div>
            <div className="field-grid" style={{ marginTop: 10 }}>
              <label className="field"><span>Baslik</span>
                <input value={step.title} onChange={(e) => updateStep(index, { title: e.target.value })} />
              </label>
              <label className="field"><span>Tip</span>
                <select value={step.type} onChange={(e) => updateStep(index, { type: e.target.value as any })}>
                  <option value="PLAY_GAME">Oyun sahnesi</option>
                  <option value="MOTION_REPS">Tekrar hedefi</option>
                  <option value="HOLD_POSE">Pozisyon tut</option>
                  <option value="REST">Dinlenme</option>
                  <option value="INSTRUCTION">Yonlendirme</option>
                </select>
              </label>
              <label className="field"><span>Hareket</span>
                <select value={step.motion ?? 'SQUAT'} onChange={(e) => updateStep(index, { motion: e.target.value as any })}>
                  <option value="SQUAT">Squat</option>
                  <option value="JUMPING_JACK">Jumping Jack</option>
                  <option value="JUMP_ROPE">Jump Rope</option>
                </select>
              </label>
              <ConfigNumberField label="Tekrar" value={Number(step.targetCount ?? 0)} onChange={(v) => updateStep(index, { targetCount: v || undefined })} />
              <ConfigNumberField label="Tutma suresi (sn)" value={Number(step.holdSec ?? 0)} onChange={(v) => updateStep(index, { holdSec: v || undefined })} />
              <ConfigNumberField label="Sahne suresi (sn)" value={Number(step.durationSec ?? 0)} onChange={(v) => updateStep(index, { durationSec: v || undefined })} />
            </div>
            <label className="field" style={{ marginTop: 10 }}>
              <span>Aciklama / tebrik mesaji</span>
              <input value={step.successMessage ?? step.description ?? ''} onChange={(e) => updateStep(index, { successMessage: e.target.value, description: e.target.value })} />
            </label>
          </div>
        ))
      )}
    </div>
  );
}

function ConfigNumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} />
    </label>
  );
}

function mapGameToDraft(game: GameDefinitionDto): GameDefinitionDraft {
  return {
    gameKey: game.gameKey,
    template: game.template,
    title: game.title,
    description: game.description,
    minAppVersion: game.minAppVersion,
    category: game.category ?? 'FUN',
    tags: game.tags ?? [],
    orientation: game.orientation,
    cameraRequirement: game.cameraRequirement,
    supportedMotions: [...game.supportedMotions],
    levels: game.levels.map((level) => ({
      ...level,
      motionRules: level.motionRules.map((r) => ({ ...r })),
      rewardRules: level.rewardRules.map((r) => ({ ...r })),
      config: { ...level.config },
      sceneConfig: { ...level.sceneConfig },
      interactionRules: level.interactionRules.map((r) => ({ ...r, keypoints: r.keypoints ? [...r.keypoints] : undefined })),
      tasks: level.tasks.map((t) => ({ ...t })),
      programSteps: (level.programSteps ?? []).map((s) => ({ ...s }))
    })),
    assets: { ...game.assets, items: game.assets.items?.map((i) => ({ ...i })) },
    status: game.status,
    actorId: 'admin@local'
  };
}

function categoryLabel(category: string): string {
  const labels: Record<string, string> = {
    SPORT: 'Spor',
    FUN: 'Eglence',
    EDUCATION: 'Egitim'
  };
  return labels[category] ?? category;
}

function defaultAssetKey(template: GameDefinitionDraft['template']): string {
  if (template === 'SCENE_PLAY') return 'cuceCard';
  if (template === 'FRUIT_SLASH') return 'fruit';
  if (template === 'DODGE_RUN') return 'lowObstacle';
  return 'squatIcon';
}

function TemplateSpecificForm({ draft, setDraft }: { draft: GameDefinitionDraft; setDraft: Dispatch<SetStateAction<GameDefinitionDraft>> }) {
  const config = (draft.levels[0]?.config ?? {}) as Record<string, unknown>;
  const onChange = (field: string, value: unknown) => {
    setDraft((current: GameDefinitionDraft) => ({
      ...current,
      levels: current.levels.map((l, i) =>
        i === 0 ? { ...l, config: { ...(l.config ?? {}), [field]: value } } : l
      )
    }));
  };

  switch (draft.template) {
    case 'WHACK_A_MOLE':
    case 'POSE_CONTACT_TARGETS':
      return <WhackAMoleConfigForm config={config} onChange={onChange} />;
    case 'QUIZ':
      return <QuizConfigForm config={config} onChange={onChange} />;
    case 'FLASHCARD':
      return <FlashcardConfigForm config={config} onChange={onChange} />;
    case 'MEMORY_MATCH':
      return <MemoryMatchConfigForm config={config} onChange={onChange} />;
    case 'POSE_HOLD':
      return <PoseHoldConfigForm config={config} onChange={onChange} />;
    default:
      return <p className="muted" style={{ fontSize: '0.8rem' }}>Bu template icin ozel form henuz yok.</p>;
  }
}

function TemplatePreview({ draft }: { draft: GameDefinitionDraft }) {
  const config = (draft.levels[0]?.config ?? {}) as Record<string, unknown>;

  switch (draft.template) {
    case 'WHACK_A_MOLE':
    case 'POSE_CONTACT_TARGETS':
      return <WhackAMolePreview config={config} />;
    case 'QUIZ':
      return <QuizPreview config={config} />;
    case 'FLASHCARD':
      return <FlashcardPreview config={config} />;
    case 'MEMORY_MATCH':
      return <MemoryMatchPreview config={config} />;
    case 'POSE_HOLD':
      return <PoseHoldPreview config={config} />;
    case 'FRUIT_SLASH':
      return <FruitSlashPreview draft={draft} />;
    case 'SCENE_PLAY':
      return <ScenePlayPreview draft={draft} />;
    case 'DODGE_RUN':
      return <DodgeRunPreview draft={draft} />;
    case 'FIT_CHALLENGE':
      return <FitChallengePreview draft={draft} />;
    default:
      return (
        <div className="preview-placeholder">
          <span className="icon">&#9654;</span>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: 0 }}>
            Bu template icin canli preview henuz yok.
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.68rem', margin: '4px 0 0' }}>
            Android runtime destegi: {draft.supportedMotions.length > 0 ? 'Var' : 'Yok'}
          </p>
        </div>
      );
  }
}
