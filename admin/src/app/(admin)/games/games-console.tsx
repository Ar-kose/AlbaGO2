'use client';

import { Dispatch, SetStateAction, startTransition, useEffect, useMemo, useState } from 'react';
import {
  WhackAMoleConfigForm, WhackAMolePreview,
  QuizConfigForm, QuizPreview,
  FlashcardConfigForm, FlashcardPreview,
  MemoryMatchConfigForm, MemoryMatchPreview,
  PoseHoldConfigForm, PoseHoldPreview
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
  const [validationResult, setValidationResult] = useState<{ errors: Array<any>; warnings: Array<any> } | null>(null);

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
        .filter((game) => categoryFilter === 'ALL' || game.category === categoryFilter),
    [categoryFilter, state.games]
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
            ? `${selectedGame.title} secildi. Template: ${templateLabel(selectedGame.template)}.`
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
        setMessage(`Publish engellendi: ${errorCount} hata bulundu. Hatalari duzeltip tekrar deneyin.`);
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

  return (
    <section className="console-layout">
      <article className="panel stack">
        <div className="section-header">
          <div>
            <p className="eyebrow">Demo Game Definitions</p>
            <h2>AlbaGo no-code oyun ve program konsolu</h2>
            <p className="muted">
              Scene Play ile Deve Cuce, komut oyunu, nesne toplama ve basit spor akislari
              app guncellemeden ayni runtime icinde uretilir.
            </p>
          </div>
        </div>

        <div className="button-row">
          {publicDemoTemplates.map((template) => (
            <button
              key={template}
              className="secondary-button"
              onClick={() => resetForTemplate(template)}
              type="button"
            >
              New {templateLabel(template)}
            </button>
          ))}
        </div>

        <div className="category-tabs" role="tablist" aria-label="Oyun kategorileri">
          <button
            className={`category-tab${categoryFilter === 'ALL' ? ' category-tab-active' : ''}`}
            onClick={() => setCategoryFilter('ALL')}
            type="button"
          >
            Tum kategoriler
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

        <div className="list">
          {publicGames.map((game) => (
            <button
              key={game.id}
              className={`list-card${game.id === selectedId ? ' list-card-active' : ''}`}
              onClick={() => void refresh(game.id)}
              type="button"
            >
              <strong>{game.title}</strong>
              <span className="muted">
                {categoryLabel(game.category)} | {templateLabel(game.template)} | {game.status} | v{game.version}
              </span>
              <span className="muted">{game.supportedMotions.join(', ')}</span>
            </button>
          ))}
        </div>
      </article>

      <article className="panel stack">
        <div className="section-header">
          <div>
            <p className="eyebrow">Template Editor</p>
            <h2>{selectedGame?.title ?? templateLabel(draft.template)}</h2>
          </div>
          <span className="badge">{selectedGame?.status ?? 'DRAFT'}</span>
        </div>

        <p className="muted">{message}</p>

        <label className="field">
          <span>Template</span>
          <select
            value={draft.template}
            onChange={(event) => resetForTemplate(event.target.value as PublicDemoTemplate)}
          >
            {publicDemoTemplates.map((template) => (
              <option key={template} value={template}>
                {templateLabel(template)}
              </option>
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

        <label className="field">
          <span>Title</span>
          <input
            value={draft.title}
            onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
          />
        </label>

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
                  tags: event.target.value
                    .split(',')
                    .map((item) => item.trim())
                    .filter(Boolean)
                }))
              }
              placeholder="playlist, cocuk, refleks"
            />
          </label>
        </div>

        <div className="field-grid">
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
        </div>

        <div className="field-grid">
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
              <option value="FULL_BODY">Tam vücut</option>
              <option value="UPPER_BODY">Üst vücut</option>
              <option value="HAND_TARGET">El / hedef teması</option>
            </select>
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

        <TemplateConfigEditor draft={draft} updateLevel={updateLevel} />
        <ProgramFlowEditor level={draft.levels[0]} updateLevel={updateLevel} />

        {/* Template-Specific Config Form */}
        <div className="panel inset-panel">
          <p className="eyebrow">Template Config</p>
          <TemplateSpecificForm draft={draft} setDraft={setDraft} />
        </div>

        {/* Preview */}
        <div className="panel inset-panel">
          <p className="eyebrow">Preview</p>
          <TemplatePreview draft={draft} />
        </div>

        <div className="field-grid">
          {draft.levels[0].motionRules.map((rule, index) => (
            <div className="rule-card" key={`${rule.motion}-${index}-${rule.event}`}>
              <p className="eyebrow">
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
                      motionRules: level.motionRules.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, points: Number(event.target.value) || 0 }
                          : item
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
                      motionRules: level.motionRules.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, cooldownMs: Number(event.target.value) || 0 }
                          : item
                      )
                    }))
                  }
                />
              </label>
            </div>
          ))}
        </div>

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

        <AssetUploadPanel draft={draft} setDraft={setDraft} setMessage={setMessage} />

        <div className="button-row">
          <button className="primary-button" disabled={isBusy} onClick={() => void saveDraft()} type="button">
            Save draft
          </button>
          <button className="ghost-button" disabled={isBusy} onClick={() => {
            validateGameDraft(draft).then(setValidationResult).catch(() => {});
          }} type="button">
            Validate
          </button>
          <button className="secondary-button" disabled={isBusy || !selectedId || (validationResult?.errors?.length ?? 0) > 0} onClick={() => void publishSelected()} type="button">
            Publish
          </button>
          <button className="secondary-button" disabled={isBusy || !selectedId} onClick={() => void rollbackSelected()} type="button">
            Rollback
          </button>
          <button className="ghost-button" disabled={isBusy} onClick={() => void refresh(selectedId)} type="button">
            Refresh
          </button>
        </div>

        <div className="panel inset-panel">
          <p className="eyebrow">Publish Validation</p>
          {!validationResult && state.validationErrors.length === 0 ? (
            <p className="status-ready">Hazir. Publish validation temiz.</p>
          ) : (
            <div>
              {validationResult ? (
                <div>
                  {validationResult.errors.length > 0 && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <p style={{ color: 'var(--hot)', fontWeight: 600, fontSize: '0.8rem' }}>
                        {validationResult.errors.length} HATA — Publish engellendi
                      </p>
                      {validationResult.errors.map((e: any, i: number) => (
                        <div key={i} style={{
                          background: 'rgba(255,21,147,0.08)', borderRadius: '8px',
                          padding: '0.5rem 0.75rem', marginTop: '0.35rem', fontSize: '0.78rem'
                        }}>
                          <span style={{ color: 'var(--hot)', fontWeight: 600 }}>{e.scope}</span>
                          {' '}<span style={{ color: 'var(--muted)' }}>{e.code}</span>
                          <p style={{ margin: '0.2rem 0 0 0', color: 'var(--ink)' }}>{e.message}</p>
                          <span style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>{e.path}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {validationResult.warnings.length > 0 && (
                    <div>
                      <p style={{ color: 'var(--amber, #f59e0b)', fontWeight: 600, fontSize: '0.8rem' }}>
                        {validationResult.warnings.length} UYARI
                      </p>
                      {validationResult.warnings.map((w: any, i: number) => (
                        <div key={i} style={{
                          background: 'rgba(245,158,11,0.08)', borderRadius: '8px',
                          padding: '0.4rem 0.75rem', marginTop: '0.25rem', fontSize: '0.75rem'
                        }}>
                          <span style={{ color: 'var(--amber, #f59e0b)', fontWeight: 600 }}>{w.scope}</span>
                          {' '}<span style={{ color: 'var(--muted)' }}>{w.code}</span>
                          <p style={{ margin: '0.1rem 0 0 0', color: 'var(--ink)' }}>{w.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {validationResult.errors.length === 0 && validationResult.warnings.length === 0 && (
                    <p className="status-ready">Validation gecti.</p>
                  )}
                </div>
              ) : (
                <ul className="error-list">
                  {state.validationErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="panel inset-panel">
          <p className="eyebrow">GameDefinition v3 Preview Payload</p>
          <pre className="payload-preview">{JSON.stringify(toGameDefinitionV3(draft), null, 2)}</pre>
        </div>
      </article>

      <article className="panel stack">
        <div className="section-header">
          <div>
            <p className="eyebrow">Audit Log</p>
            <h2>Son icerik hareketleri</h2>
          </div>
        </div>
        <div className="stack">
          {state.auditLogs.length === 0 ? (
            <p className="muted">Audit log henuz uretilmedi.</p>
          ) : (
            state.auditLogs.slice(0, 8).map((event) => (
              <div className="event-card" key={event.id}>
                <strong>
                  {event.action} / {event.entityType}
                </strong>
                <p className="muted">{event.entityId}</p>
                <p className="muted">
                  {event.actorId} | {new Date(event.createdAt).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      </article>
    </section>
  );
}

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
      const item = {
        ...uploaded,
        key: assetKey.trim() || uploaded.key
      };
      setDraft((current) => ({
        ...current,
        assets: {
          ...current.assets,
          items: [...(current.assets.items ?? []).filter((candidate) => candidate.key !== item.key), item]
        }
      }));
      setMessage(`${item.key} asset yuklendi ve manifest'e eklendi.`);
    } catch (error) {
      setMessage(`Asset yukleme basarisiz: ${error instanceof Error ? error.message : 'unknown_error'}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="panel inset-panel stack">
      <div className="section-header">
        <div>
          <p className="eyebrow">Asset Manifest</p>
          <h3>PNG, WebP veya SVG yukle</h3>
        </div>
      </div>
      <div className="field-grid">
        <label className="field">
          <span>Asset key</span>
          <input value={assetKey} onChange={(event) => setAssetKey(event.target.value)} />
        </label>
        <label className="field">
          <span>Upload</span>
          <input
            accept="image/png,image/webp,image/svg+xml"
            disabled={uploading}
            type="file"
            onChange={(event) => void upload(event.target.files?.[0])}
          />
        </label>
      </div>
      <div className="asset-grid">
        {items.length === 0 ? (
          <p className="muted">Bu oyunda henuz typed asset yok.</p>
        ) : (
          items.map((asset) => (
            <div className="asset-card" key={`${asset.key}-${asset.uri}`}>
              <strong>{asset.key}</strong>
              <span className="muted">
                {asset.format} | {asset.bytes ? `${Math.round(asset.bytes / 1024)} KB` : 'local'}
              </span>
              <span className="muted">{asset.uri}</span>
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
  updateLevel: (
    updater: (level: GameDefinitionDraft['levels'][number]) => GameDefinitionDraft['levels'][number]
  ) => void;
}) {
  const level = draft.levels[0];

  if (draft.template === 'SCENE_PLAY') {
    return (
      <div className="stack">
        <div className="panel inset-panel stack">
          <div className="section-header">
            <div>
              <p className="eyebrow">Scene Play Builder</p>
              <h3>No-code komut ve nesne akisi</h3>
            </div>
          </div>
          <p className="muted">
            Buradaki objeler oyun sirasinda sirayla/sureli gelir. Her obje bir hareket ister;
            dogru MotionEvent gelirse skor artar, obje temizlenir. Deve Cuce gibi yeni senaryolar
            bu tabloyla olusturulur.
          </p>
          <div className="field-grid">
            <ConfigNumberField
              label="Spawn rate (ms)"
              value={Number(level.config.spawnRateMs ?? 1800)}
              onChange={(value) =>
                updateLevel((current) => ({
                  ...current,
                  config: { ...current.config, spawnRateMs: value }
                }))
              }
            />
            <ConfigNumberField
              label="Lives"
              value={Number(level.config.lives ?? 3)}
              onChange={(value) =>
                updateLevel((current) => ({
                  ...current,
                  config: { ...current.config, lives: value }
                }))
              }
            />
            <ConfigNumberField
              label="Object life (ms)"
              value={Number(level.sceneConfig.defaultObjectLifeMs ?? 2400)}
              onChange={(value) =>
                updateLevel((current) => ({
                  ...current,
                  sceneConfig: { ...current.sceneConfig, defaultObjectLifeMs: value }
                }))
              }
            />
          </div>
          <SceneObjectEditor level={level} updateLevel={updateLevel} />
        </div>
      </div>
    );
  }

  if (draft.template === 'FRUIT_SLASH') {
    return (
      <div className="field-grid">
        <ConfigNumberField
          label="Spawn rate (ms)"
          value={Number(level.config.spawnRateMs ?? 900)}
          onChange={(value) =>
            updateLevel((current) => ({
              ...current,
              config: { ...current.config, spawnRateMs: value }
            }))
          }
        />
        <ConfigNumberField
          label="Object life (ms)"
          value={Number(level.sceneConfig.defaultObjectLifeMs ?? 2600)}
          onChange={(value) =>
            updateLevel((current) => ({
              ...current,
              sceneConfig: { ...current.sceneConfig, defaultObjectLifeMs: value }
            }))
          }
        />
        <ConfigNumberField
          label="Penalty points"
          value={Number(level.config.penaltyPoints ?? 10)}
          onChange={(value) =>
            updateLevel((current) => ({
              ...current,
              config: { ...current.config, penaltyPoints: value }
            }))
          }
        />
      </div>
    );
  }

  if (draft.template === 'DODGE_RUN') {
    return (
      <div className="field-grid">
        <ConfigNumberField
          label="Lives"
          value={Number(level.config.lives ?? 3)}
          onChange={(value) =>
            updateLevel((current) => ({
              ...current,
              config: { ...current.config, lives: value }
            }))
          }
        />
        <ConfigNumberField
          label="Obstacle spawn (ms)"
          value={Number(level.config.obstacleSpawnMs ?? 1400)}
          onChange={(value) =>
            updateLevel((current) => ({
              ...current,
              config: { ...current.config, obstacleSpawnMs: value }
            }))
          }
        />
        <ConfigNumberField
          label="Travel speed (ms)"
          value={Number(level.sceneConfig.travelMs ?? 2100)}
          onChange={(value) =>
            updateLevel((current) => ({
              ...current,
              sceneConfig: { ...current.sceneConfig, travelMs: value }
            }))
          }
        />
        <ConfigNumberField
          label="Miss damage"
          value={Number(level.config.damageOnMiss ?? 1)}
          onChange={(value) =>
            updateLevel((current) => ({
              ...current,
              config: { ...current.config, damageOnMiss: value }
            }))
          }
        />
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="field-grid">
        <ConfigNumberField
          label="Squat target"
          value={level.tasks.find((task) => task.motion === 'SQUAT')?.targetCount ?? 10}
          onChange={(value) =>
            updateLevel((current) => ({
              ...current,
              tasks: current.tasks.map((task) =>
                task.motion === 'SQUAT' ? { ...task, targetCount: value } : task
              )
            }))
          }
        />
        <ConfigNumberField
          label="Jumping Jack target"
          value={level.tasks.find((task) => task.motion === 'JUMPING_JACK')?.targetCount ?? 10}
          onChange={(value) =>
            updateLevel((current) => ({
              ...current,
              tasks: current.tasks.map((task) =>
                task.motion === 'JUMPING_JACK' ? { ...task, targetCount: value } : task
              )
            }))
          }
        />
        <ConfigNumberField
          label="Jump Rope target"
          value={level.tasks.find((task) => task.motion === 'JUMP_ROPE')?.targetCount ?? 20}
          onChange={(value) =>
            updateLevel((current) => ({
              ...current,
              tasks: current.tasks.map((task) =>
                task.motion === 'JUMP_ROPE' ? { ...task, targetCount: value } : task
              )
            }))
          }
        />
      </div>
      <div className="field-grid">
        <ConfigNumberField
          label="Squat points"
          value={level.tasks.find((task) => task.motion === 'SQUAT')?.pointsPerRep ?? 10}
          onChange={(value) =>
            updateLevel((current) => ({
              ...current,
              tasks: current.tasks.map((task) =>
                task.motion === 'SQUAT' ? { ...task, pointsPerRep: value } : task
              )
            }))
          }
        />
        <ConfigNumberField
          label="Jumping Jack points"
          value={level.tasks.find((task) => task.motion === 'JUMPING_JACK')?.pointsPerRep ?? 12}
          onChange={(value) =>
            updateLevel((current) => ({
              ...current,
              tasks: current.tasks.map((task) =>
                task.motion === 'JUMPING_JACK' ? { ...task, pointsPerRep: value } : task
              )
            }))
          }
        />
        <ConfigNumberField
          label="Jump Rope points"
          value={level.tasks.find((task) => task.motion === 'JUMP_ROPE')?.pointsPerRep ?? 3}
          onChange={(value) =>
            updateLevel((current) => ({
              ...current,
              tasks: current.tasks.map((task) =>
                task.motion === 'JUMP_ROPE' ? { ...task, pointsPerRep: value } : task
              )
            }))
          }
        />
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
  updateLevel: (
    updater: (level: GameDefinitionDraft['levels'][number]) => GameDefinitionDraft['levels'][number]
  ) => void;
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
      const nextObjects = currentObjects.filter((_, itemIndex) => itemIndex !== index);
      return {
        ...current,
        sceneConfig: { ...current.sceneConfig, objects: nextObjects },
        interactionRules: sceneObjectsToRules(nextObjects)
      };
    });
  }

  return (
    <div className="stack">
      <div className="button-row">
        <button className="secondary-button" type="button" onClick={addObject}>
          Komut / obje ekle
        </button>
      </div>
      {objects.length === 0 ? (
        <p className="muted">Henuz scene objesi yok. Publish icin en az bir komut ekleyin.</p>
      ) : (
        objects.map((object, index) => (
          <div className="rule-card" key={`${object.objectType}-${index}`}>
            <div className="section-header">
              <p className="eyebrow">Scene object #{index + 1}</p>
              <button className="ghost-button" type="button" onClick={() => removeObject(index)}>
                Kaldir
              </button>
            </div>
            <div className="field-grid">
              <label className="field">
                <span>Object type</span>
                <input
                  value={object.objectType ?? ''}
                  onChange={(event) => updateObject(index, { objectType: event.target.value })}
                />
              </label>
              <label className="field">
                <span>Label</span>
                <input
                  value={object.label ?? ''}
                  onChange={(event) => updateObject(index, { label: event.target.value })}
                />
              </label>
              <label className="field">
                <span>Asset key</span>
                <input
                  value={object.assetKey ?? ''}
                  onChange={(event) => updateObject(index, { assetKey: event.target.value })}
                />
              </label>
              <label className="field">
                <span>Required motion</span>
                <select
                  value={object.requiredMotion ?? 'SQUAT'}
                  onChange={(event) => updateObject(index, { requiredMotion: event.target.value })}
                >
                  <option value="SQUAT">Squat / Cuce</option>
                  <option value="JUMPING_JACK">Jumping Jack / Deve</option>
                  <option value="JUMP_ROPE">Jump Rope</option>
                </select>
              </label>
              <ConfigNumberField
                label="Points"
                value={Number(object.points ?? 10)}
                onChange={(value) => updateObject(index, { points: value })}
              />
              <ConfigNumberField
                label="Life (ms)"
                value={Number(object.lifeMs ?? level.sceneConfig.defaultObjectLifeMs ?? 2400)}
                onChange={(value) => updateObject(index, { lifeMs: value })}
              />
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
      .filter((object) => object.objectType && object.requiredMotion)
      .map((object) => ({
        input: 'MOTION_EVENT' as const,
        event: 'REP_COUNTED' as const,
        motion: object.requiredMotion as GameDefinitionDraft['supportedMotions'][number],
        targetObjectType: object.objectType,
        action: 'REMOVE_OBJECT' as const,
        points: Number(object.points ?? 0),
        cooldownMs: 400
      })),
    {
      input: 'MOTION_EVENT' as const,
      event: 'BAD_FORM' as const,
      action: 'RESET_COMBO' as const,
      points: -5,
      cooldownMs: 250
    },
    {
      input: 'MOTION_EVENT' as const,
      event: 'USER_OUT_OF_FRAME' as const,
      action: 'PAUSE_GAME' as const,
      cooldownMs: 0
    }
  ];
}

function ProgramFlowEditor({
  level,
  updateLevel
}: {
  level: GameDefinitionDraft['levels'][number];
  updateLevel: (
    updater: (level: GameDefinitionDraft['levels'][number]) => GameDefinitionDraft['levels'][number]
  ) => void;
}) {
  const steps = level.programSteps ?? [];

  function updateStep(index: number, patch: Partial<GameDefinitionDraft['levels'][number]['programSteps'][number]>) {
    updateLevel((current) => ({
      ...current,
      programSteps: current.programSteps.map((step, stepIndex) =>
        stepIndex === index ? { ...step, ...patch } : step
      )
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
      programSteps: current.programSteps.filter((_, stepIndex) => stepIndex !== index)
    }));
  }

  return (
    <div className="panel inset-panel stack program-builder">
      <div className="section-header">
        <div>
          <p className="eyebrow">Program / Playlist Flow</p>
          <h3>Spor, egitim veya eglence akisini sirala</h3>
          <p className="muted">
            Bir oyun tek sahneden ibaret olmak zorunda degil. Squat seti, plank tutusu,
            dinlenme ve sonraki aktivite gibi adimlari burada baglayabilirsin.
          </p>
        </div>
      </div>
      <div className="button-row">
        <button className="secondary-button" type="button" onClick={() => addStep('MOTION_REPS')}>
          Tekrar hedefi ekle
        </button>
        <button className="secondary-button" type="button" onClick={() => addStep('HOLD_POSE')}>
          Plank / pozisyon ekle
        </button>
        <button className="secondary-button" type="button" onClick={() => addStep('REST')}>
          Dinlenme ekle
        </button>
        <button className="secondary-button" type="button" onClick={() => addStep('INSTRUCTION')}>
          Yonlendirme ekle
        </button>
      </div>
      {steps.length === 0 ? (
        <p className="muted">Program akisi yok. Tek sahneli oyun gibi calisir.</p>
      ) : (
        steps.map((step, index) => (
          <div className="program-step-card" key={`${step.stepId}-${index}`}>
            <div className="section-header">
              <p className="eyebrow">
                #{index + 1} {step.type}
              </p>
              <button className="ghost-button" type="button" onClick={() => removeStep(index)}>
                Kaldir
              </button>
            </div>
            <div className="field-grid">
              <label className="field">
                <span>Baslik</span>
                <input value={step.title} onChange={(event) => updateStep(index, { title: event.target.value })} />
              </label>
              <label className="field">
                <span>Tip</span>
                <select
                  value={step.type}
                  onChange={(event) =>
                    updateStep(index, {
                      type: event.target.value as GameDefinitionDraft['levels'][number]['programSteps'][number]['type']
                    })
                  }
                >
                  <option value="PLAY_GAME">Oyun sahnesi</option>
                  <option value="MOTION_REPS">Tekrar hedefi</option>
                  <option value="HOLD_POSE">Pozisyon tut</option>
                  <option value="REST">Dinlenme</option>
                  <option value="INSTRUCTION">Yonlendirme</option>
                </select>
              </label>
              <label className="field">
                <span>Hareket</span>
                <select
                  value={step.motion ?? 'SQUAT'}
                  onChange={(event) =>
                    updateStep(index, {
                      motion: event.target.value as GameDefinitionDraft['supportedMotions'][number]
                    })
                  }
                >
                  <option value="SQUAT">Squat</option>
                  <option value="JUMPING_JACK">Jumping Jack</option>
                  <option value="JUMP_ROPE">Jump Rope</option>
                </select>
              </label>
              <ConfigNumberField
                label="Tekrar"
                value={Number(step.targetCount ?? 0)}
                onChange={(value) => updateStep(index, { targetCount: value || undefined })}
              />
              <ConfigNumberField
                label="Tutma suresi (sn)"
                value={Number(step.holdSec ?? 0)}
                onChange={(value) => updateStep(index, { holdSec: value || undefined })}
              />
              <ConfigNumberField
                label="Sahne suresi (sn)"
                value={Number(step.durationSec ?? 0)}
                onChange={(value) => updateStep(index, { durationSec: value || undefined })}
              />
            </div>
            <label className="field">
              <span>Aciklama / tebrik mesaji</span>
              <input
                value={step.successMessage ?? step.description ?? ''}
                onChange={(event) =>
                  updateStep(index, {
                    successMessage: event.target.value,
                    description: event.target.value
                  })
                }
              />
            </label>
          </div>
        ))
      )}
    </div>
  );
}

function ConfigNumberField({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
      />
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
      motionRules: level.motionRules.map((rule) => ({ ...rule })),
      rewardRules: level.rewardRules.map((rule) => ({ ...rule })),
      config: { ...level.config },
      sceneConfig: { ...level.sceneConfig },
      interactionRules: level.interactionRules.map((rule) => ({
        ...rule,
        keypoints: rule.keypoints ? [...rule.keypoints] : undefined
      })),
      tasks: level.tasks.map((task) => ({ ...task })),
      programSteps: (level.programSteps ?? []).map((step) => ({ ...step }))
    })),
    assets: {
      ...game.assets,
      items: game.assets.items?.map((item) => ({ ...item }))
    },
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
      return <p className="muted" style={{ fontSize: '0.8rem' }}>Bu template icin ozel form henuz yok. Config'i manuel girebilir veya JSON editor kullanabilirsiniz.</p>;
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
    default:
      return <p className="muted" style={{ fontSize: '0.8rem', textAlign: 'center', padding: '1rem' }}>Preview henuz bu template icin desteklenmiyor.</p>;
  }
}
