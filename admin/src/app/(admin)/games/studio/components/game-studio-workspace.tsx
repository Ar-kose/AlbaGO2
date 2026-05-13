'use client';

import { useState } from 'react';
import type { GameDefinitionDto, GameDefinitionDraft } from '../../../../../lib/alba-api';
import type { PreviewState, MockMotionEvent, StudioValidationIssue } from '../../../../../lib/game-studio/types';
import { StudioLeftEditor } from './studio-left-editor';
import { MobileGamePreview } from './mobile-game-preview';
import { MockMotionConsole } from './mock-motion-console';
import { StudioPublishCenter } from './studio-publish-center';
import { StudioMobileTestPanel } from './studio-mobile-test-panel';
import { StudioSessionResultsPanel } from './studio-session-results-panel';
import { StudioEventLog } from './studio-event-log';

export interface StudioEventLogItem {
  id: string;
  at: string;
  type: 'MOTION' | 'VALIDATION' | 'SAVE' | 'PUBLISH' | 'PREVIEW';
  label: string;
  detail?: string;
  severity?: 'info' | 'success' | 'warning' | 'error';
}

type SaveState = 'idle' | 'saving' | 'saved' | 'failed';
type PublishState = 'idle' | 'validating' | 'publishing' | 'published' | 'failed';

interface WorkspaceProps {
  game: GameDefinitionDto;
  draft: GameDefinitionDraft;
  previewState: PreviewState;
  eventLog: StudioEventLogItem[];
  validationIssues: StudioValidationIssue[];
  compatibilityIssues: StudioValidationIssue[];
  backendValidation: { errors: any[]; warnings: any[] } | null;
  saveState: SaveState;
  publishState: PublishState;
  publishMessage: string;
  onMotionEvent: (event: MockMotionEvent) => void;
  onSave: () => void;
  onValidate: () => void;
  onPublish: () => void;
  onRollback: () => void;
  onDraftChange: (draft: GameDefinitionDraft) => void;
  onClearLog: () => void;
}

type EditorTab = 'basic' | 'rules' | 'assets' | 'program' | 'advanced';

export function GameStudioWorkspace({
  game,
  draft,
  previewState,
  eventLog,
  validationIssues,
  compatibilityIssues,
  backendValidation,
  saveState,
  publishState,
  publishMessage,
  onMotionEvent,
  onSave,
  onValidate,
  onPublish,
  onRollback,
  onDraftChange,
  onClearLog
}: WorkspaceProps) {
  const [editorTab, setEditorTab] = useState<EditorTab>('basic');

  const statusLabel = game.status === 'PUBLISHED' ? 'Yayında' :
    game.status === 'DRAFT' ? 'Taslak' : game.status;

  const statusClass = game.status === 'PUBLISHED' ? 'badge-success' :
    game.status === 'DRAFT' ? 'badge-draft' : 'badge-info';

  return (
    <div>
      {/* Top Bar */}
      <div className="topbar">
        <div>
          <h1>{game.title || game.gameKey}</h1>
          <p className="muted" style={{ marginTop: 4 }}>
            {game.description}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className={statusClass}>{statusLabel}</span>
          <span className="badge badge-info">v{game.version}</span>
          <span className="badge">{game.template}</span>
        </div>
      </div>

      {/* Three-column workspace */}
      <div className="studio-workspace-layout">
        {/* Left: Editor */}
        <div className="studio-left-panel">
          <StudioLeftEditor
            draft={draft}
            game={game}
            activeTab={editorTab}
            onTabChange={setEditorTab}
            onDraftChange={onDraftChange}
          />
        </div>

        {/* Center: Preview + Motion Console */}
        <div className="studio-center-panel">
          <MobileGamePreview recipe={null as any} previewState={previewState} gameMode />
          <div style={{ marginTop: 12 }}>
            <MockMotionConsole onSendEvent={onMotionEvent} recipe={null as any} gameMode />
          </div>

          {/* Event Log */}
          <div style={{ marginTop: 12 }}>
            <StudioEventLog events={eventLog} onClear={onClearLog} />
          </div>
        </div>

        {/* Right: Publish Center + Mobile Test */}
        <div className="studio-right-panel">
          <StudioPublishCenter
            validationIssues={validationIssues}
            compatibilityIssues={compatibilityIssues}
            backendValidation={backendValidation}
            saveState={saveState}
            publishState={publishState}
            publishMessage={publishMessage}
            gameStatus={game.status}
            onSave={onSave}
            onValidate={onValidate}
            onPublish={onPublish}
            onRollback={onRollback}
          />

          <div style={{ marginTop: 12 }}>
            <StudioMobileTestPanel
              gameId={game.id}
              isPublished={game.status === 'PUBLISHED'}
            />
          </div>

          <div style={{ marginTop: 12 }}>
            <StudioSessionResultsPanel
              gameDefinitionId={game.id}
              isPublished={game.status === 'PUBLISHED'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
