'use client';

import type { GameRecipe, PreviewState } from '../../../../../lib/game-studio/types';

interface MobilePreviewProps {
  recipe?: GameRecipe | null;
  previewState: PreviewState;
  gameMode?: boolean;
}

export function MobileGamePreview({ recipe, previewState, gameMode }: MobilePreviewProps) {
  return (
    <div className="mobile-preview-shell">
      <div className="mobile-preview-header">
        <span className="mobile-preview-label">Mobil Önizleme</span>
        <span className="mobile-preview-template">
          {recipe ? recipe.kind.replace(/_/g, ' ') : gameMode ? 'Game Studio' : '—'}
        </span>
      </div>

      <div className="mobile-preview-screen">
        {/* HUD: Timer top-left */}
        <div className="preview-hud-timer">
          <span className="preview-timer-value">{previewState.remainingSec}s</span>
        </div>

        {/* HUD: Score top-right */}
        <div className="preview-hud-score">
          <span className="preview-score-label">Skor</span>
          <span className="preview-score-value">{previewState.score}</span>
          {previewState.combo > 1 && (
            <span className="preview-combo">x{previewState.combo}</span>
          )}
        </div>

        {/* HUD: Lives */}
        {previewState.lives < 99 && (
          <div className="preview-hud-lives">
            {Array.from({ length: previewState.lives }).map((_, i) => (
              <span key={i} className="preview-life-heart">♥</span>
            ))}
          </div>
        )}

        {/* Active prompt / command */}
        {previewState.activePrompt && (
          <div className="preview-active-prompt">
            <span className="preview-prompt-label">{previewState.activePrompt.label}</span>
            <span className="preview-prompt-motion">{previewState.activePrompt.requiredMotion}</span>
          </div>
        )}

        {/* Progress bar */}
        {previewState.progress && (
          <div className="preview-progress-bar-container">
            <span className="preview-progress-label">{previewState.progress.label}</span>
            <div className="preview-progress-track">
              <div
                className="preview-progress-fill"
                style={{ width: `${Math.min(100, (previewState.progress.value / previewState.progress.max) * 100)}%` }}
              />
            </div>
            <span className="preview-progress-text">
              {previewState.progress.value}/{previewState.progress.max}
            </span>
          </div>
        )}

        {/* Target circles for TARGET_HIT */}
        {recipe && recipe.kind === 'TARGET_HIT' && (
          <div className="preview-targets">
            {recipe.targets.map((t, i) => {
              const size = t.radius * 140;
              return (
                <div
                  key={i}
                  className="preview-target-dot"
                  style={{
                    left: `${t.x * 100}%`,
                    top: `${t.y * 100}%`,
                    width: size,
                    height: size
                  }}
                >
                  <span style={{ fontSize: '0.5rem', color: 'var(--accent-pink)' }}>{t.label}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Feedback burst */}
        {previewState.feedback && (
          <div className={`preview-feedback preview-feedback-${previewState.feedback.kind.toLowerCase()}`}>
            {previewState.feedback.text}
          </div>
        )}

        {/* Empty state when nothing to show */}
        {!previewState.activePrompt && !previewState.progress && (
          <div className="preview-empty-state">
            <span style={{ fontSize: '1.5rem', opacity: 0.4 }}>📱</span>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: '8px 0 0' }}>
              Mock hareket göndererek test edin
            </p>
          </div>
        )}
      </div>

      {/* Info bar */}
      <div className="mobile-preview-info">
        <span>{recipe?.title || '(başlıksız)'}</span>
        <span>{recipe ? (recipe.orientation === 'PORTRAIT' ? 'Dikey' : 'Yatay') : '—'}</span>
        <span>{recipe ? ((recipe as any).cameraRequirement ?? 'FULL_BODY').replace(/_/g, ' ') : 'FULL BODY'}</span>
      </div>
    </div>
  );
}
