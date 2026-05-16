'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  getGameDefinitionById,
  GameDefinitionDto,
  GameDefinitionDraft,
  getGameValidation,
  publishGameDefinition,
  rollbackGameDefinition,
  updateGameDefinition
} from '../../../../../lib/alba-api';
import { GameStudioWorkspace } from '../../studio/components/game-studio-workspace';
import type { StudioValidationIssue, PreviewState, MockMotionEvent } from '../../../../../lib/game-studio/types';
import type { StudioEventLogItem } from '../../studio/components/game-studio-workspace';
import { validateRecipeLocally, mapBackendValidationToStudioIssues } from '../../../../../lib/game-studio/validation-copy';
import { checkMobileCompatibility } from '../../../../../lib/game-studio/mobile-compatibility';
import { createInitialPreviewState, simulateRecipeEvent } from '../../../../../lib/game-studio/preview-engine';
import { recipeToGameDefinition } from '../../../../../lib/game-studio/recipe-to-definition';

type LoadState = 'loading' | 'ready' | 'error' | 'not_found';
type SaveState = 'idle' | 'saving' | 'saved' | 'failed';
type PublishState = 'idle' | 'validating' | 'publishing' | 'published' | 'failed';

export default function StudioPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.id as string;

  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [publishState, setPublishState] = useState<PublishState>('idle');
  const [game, setGame] = useState<GameDefinitionDto | null>(null);
  const [draft, setDraft] = useState<GameDefinitionDraft | null>(null);
  const [validationIssues, setValidationIssues] = useState<StudioValidationIssue[]>([]);
  const [compatibilityIssues, setCompatibilityIssues] = useState<StudioValidationIssue[]>([]);
  const [previewState, setPreviewState] = useState<PreviewState>({
    elapsedSec: 0, remainingSec: 60, score: 0, combo: 0, lives: 3
  });
  const [eventLog, setEventLog] = useState<StudioEventLogItem[]>([]);
  const [backendValidation, setBackendValidation] = useState<{ errors: any[]; warnings: any[] } | null>(null);
  const [publishMessage, setPublishMessage] = useState<string>('');

  // Load game
  useEffect(() => {
    let cancelled = false;
    setLoadState('loading');

    getGameDefinitionById(gameId)
      .then((result) => {
        if (cancelled) return;
        if (!result) { setLoadState('not_found'); return; }

        setGame(result);

        // Build a draft from the loaded game
        const loadedDraft: GameDefinitionDraft = {
          gameKey: result.gameKey,
          template: result.template,
          title: result.title,
          description: result.description,
          minAppVersion: result.minAppVersion,
          category: result.category,
          tags: result.tags,
          orientation: result.orientation,
          cameraRequirement: result.cameraRequirement,
          supportedMotions: result.supportedMotions,
          levels: result.levels,
          assets: result.assets,
          status: result.status,
          actorId: 'admin@local'
        };
        setDraft(loadedDraft);

        // Init preview state from game
        setPreviewState({
          elapsedSec: 0,
          remainingSec: result.levels?.[0]?.durationSec ?? 60,
          score: 0,
          combo: 0,
          lives: (result.levels?.[0]?.config?.lives as number) ?? 3
        });

        // Run local validation
        const localIssue: StudioValidationIssue = {
          severity: 'INFO',
          code: 'LOADED',
          title: 'Oyun yüklendi',
          message: `"${result.title}" Game Studio'da açıldı.`
        };
        setValidationIssues([localIssue]);

        // Compatibility check
        const compat = checkMobileCompatibility({ kind: 'COMMAND_REACTION', title: result.title, description: result.description, category: result.category, durationSec: 60, lives: 3, commands: [], wrongMovePenalty: 5, cameraRequirement: result.cameraRequirement, orientation: result.orientation });
        setCompatibilityIssues(compat.issues);

        setLoadState('ready');
        addLog('PREVIEW', 'Oyun yüklendi', `"${result.title}" Game Studio workspace açıldı.`, 'success');
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadState('error');
        addLog('PREVIEW', 'Yükleme hatası', err.message, 'error');
      });

    return () => { cancelled = true; };
  }, [gameId]);

  const addLog = (
    type: StudioEventLogItem['type'],
    label: string,
    detail?: string,
    severity: StudioEventLogItem['severity'] = 'info'
  ) => {
    setEventLog((prev) => [{
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      at: new Date().toISOString(),
      type,
      label,
      detail,
      severity
    }, ...prev]);
  };

  // Mock motion handler
  const handleMotionEvent = useCallback((event: MockMotionEvent) => {
    setPreviewState((prev) => {
      // Simple simulation: map event to score/lives changes
      const next = { ...prev };

      if (event.event === 'REP_COUNTED') {
        next.score += 10;
        next.combo += 1;
        next.feedback = { text: `+10 ${event.motion}`, kind: 'POSITIVE' };
      } else if (event.event === 'BAD_FORM') {
        next.combo = 0;
        next.lives = Math.max(0, next.lives - 1);
        next.feedback = { text: 'Yanlış form!', kind: 'NEGATIVE' };
      } else if (event.event === 'USER_OUT_OF_FRAME') {
        next.feedback = { text: 'Kadraj dışı!', kind: 'INFO' };
      } else if (event.event === 'POSE_HELD' || event.event === 'POSE_STARTED') {
        next.score += 5;
        next.feedback = { text: '+5 Poz tutuluyor', kind: 'POSITIVE' };
      } else if (event.event === 'POSE_LOST') {
        next.feedback = { text: 'Poz bozuldu!', kind: 'NEGATIVE' };
      }

      return next;
    });

    addLog('MOTION', event.motion, event.event, event.event === 'BAD_FORM' || event.event === 'POSE_LOST' ? 'warning' : 'success');
  }, []);

  // Save draft
  const handleSave = useCallback(async () => {
    if (!draft) return;
    setSaveState('saving');
    try {
      await updateGameDefinition(gameId, draft);
      setSaveState('saved');
      addLog('SAVE', 'Taslak kaydedildi', `v${(game?.version ?? 0) + 1}`, 'success');
      setTimeout(() => setSaveState('idle'), 2000);
    } catch (err: any) {
      setSaveState('failed');
      addLog('SAVE', 'Kaydetme başarısız', err.message, 'error');
    }
  }, [draft, gameId, game]);

  // Validate
  const handleValidate = useCallback(async () => {
    setPublishState('validating');
    try {
      const result = await getGameValidation(gameId);
      setBackendValidation(result as any);
      const mapped = mapBackendValidationToStudioIssues(result as any);
      setValidationIssues((prev) => [...mapped, ...prev.filter((i) => i.code === 'LOADED')]);

      if ((result as any).errors?.length === 0) {
        addLog('VALIDATION', 'Validation temiz', 'Backend onayladı.', 'success');
        setPublishState('idle');
      } else {
        addLog('VALIDATION', `${(result as any).errors?.length} hata bulundu`, '', 'warning');
        setPublishState('idle');
      }
    } catch (err: any) {
      addLog('VALIDATION', 'Validation başarısız', err.message, 'error');
      setPublishState('idle');
    }
  }, [gameId]);

  // Publish — once draft kaydeder, sonra publish eder
  const handlePublish = useCallback(async () => {
    setPublishState('publishing');
    setPublishMessage('');
    try {
      // 1. Save current draft first
      if (draft) {
        setSaveState('saving');
        await updateGameDefinition(gameId, draft);
        setSaveState('saved');
        addLog('SAVE', 'Taslak kaydedildi', 'Publish oncesi otomatik kayit', 'success');
      }

      // 2. Publish
      const result = await publishGameDefinition(gameId, 'admin@local');
      if (result.published) {
        setPublishState('published');
        setPublishMessage(`"${result.game?.title ?? game?.title}" yayınlandı! Mobil katalogda görünecek.`);
        setGame((prev) => prev ? { ...prev, status: 'PUBLISHED' } : prev);
        addLog('PUBLISH', 'Oyun yayınlandı', result.game?.title ?? game?.title ?? '', 'success');
      } else {
        setPublishState('failed');
        setBackendValidation(result.validation as any);
        const mapped = mapBackendValidationToStudioIssues(result.validation as any);
        setValidationIssues((prev) => [...mapped, ...prev.filter((i) => i.code === 'LOADED')]);
        setPublishMessage('Yayın başarısız. Hataları düzeltin.');
        addLog('PUBLISH', 'Yayın başarısız', result.error ?? 'Validation hatası', 'error');
      }
    } catch (err: any) {
      setPublishState('failed');
      setPublishMessage(`Hata: ${err.message}`);
      addLog('PUBLISH', 'Yayın hatası', err.message, 'error');
    }
  }, [gameId, game, draft]);

  // Rollback
  const handleRollback = useCallback(async () => {
    try {
      const result = await rollbackGameDefinition(gameId, 'admin@local');
      setGame(result);
      setPublishState('idle');
      addLog('PUBLISH', 'Rollback yapıldı', `v${result.version}`, 'warning');
    } catch (err: any) {
      addLog('PUBLISH', 'Rollback başarısız', err.message, 'error');
    }
  }, [gameId]);

  if (loadState === 'loading') {
    return (
      <div className="loading-spinner" />
    );
  }

  if (loadState === 'not_found') {
    return (
      <div className="panel" style={{ textAlign: 'center', padding: '3rem' }}>
        <span style={{ fontSize: '2rem', opacity: 0.4, display: 'block', marginBottom: 12 }}>🔍</span>
        <h2 style={{ margin: '0 0 8px' }}>Oyun bulunamadı</h2>
        <p className="muted" style={{ margin: '0 0 16px' }}>Bu ID ile kayıtlı oyun mevcut değil.</p>
        <button className="primary-button" onClick={() => router.push('/games')}>
          Kütüphaneye Dön
        </button>
      </div>
    );
  }

  if (loadState === 'error') {
    return (
      <div className="panel" style={{ textAlign: 'center', padding: '3rem' }}>
        <span style={{ fontSize: '2rem', opacity: 0.4, display: 'block', marginBottom: 12 }}>⚠️</span>
        <h2 style={{ margin: '0 0 8px' }}>Yükleme hatası</h2>
        <p className="muted" style={{ margin: '0 0 16px' }}>Oyun yüklenirken bir hata oluştu.</p>
        <button className="primary-button" onClick={() => router.push('/games')}>
          Kütüphaneye Dön
        </button>
      </div>
    );
  }

  return (
    <GameStudioWorkspace
      game={game!}
      draft={draft!}
      previewState={previewState}
      eventLog={eventLog}
      validationIssues={validationIssues}
      compatibilityIssues={compatibilityIssues}
      backendValidation={backendValidation}
      saveState={saveState}
      publishState={publishState}
      publishMessage={publishMessage}
      onMotionEvent={handleMotionEvent}
      onSave={handleSave}
      onValidate={handleValidate}
      onPublish={handlePublish}
      onRollback={handleRollback}
      onDraftChange={(updated) => setDraft(updated)}
      onClearLog={() => setEventLog([])}
    />
  );
}
