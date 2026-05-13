'use client';

import { useRouter } from 'next/navigation';
import { GAME_PRESETS } from '../../../../../lib/game-studio/presets';
import type { GamePreset } from '../../../../../lib/game-studio/types';

export function GameTemplateGallery() {
  const router = useRouter();

  const handleSelect = (preset: GamePreset) => {
    router.push(`/games/new?preset=${preset.id}`);
  };

  return (
    <div>
      <div className="eyebrow">Nasıl bir oyun oluşturmak istiyorsun?</div>
      <h2 style={{ marginTop: 0, marginBottom: 8 }}>Şablon Galerisi</h2>
      <p className="muted" style={{ marginTop: 0, marginBottom: 24 }}>
        Hazır oyun reçetelerinden birini seç, özelleştir ve yayınla.
      </p>

      <div className="template-gallery-grid">
        {GAME_PRESETS.map((preset) => (
          <button
            key={preset.id}
            className="template-card"
            onClick={() => handleSelect(preset)}
            type="button"
          >
            <div className="template-card-icon">{preset.icon}</div>
            <div className="template-card-body">
              <h3 className="template-card-title">{preset.displayName}</h3>
              <p className="template-card-desc">{preset.description}</p>
              <div className="template-card-meta">
                <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>
                  {preset.template}
                </span>
                <span className="template-card-motions">
                  {preset.supportedMotions.slice(0, 3).join(', ')}
                  {preset.supportedMotions.length > 3 ? '...' : ''}
                </span>
              </div>
              <p className="template-card-build" style={{ marginTop: 8 }}>
                {preset.whatYouCanBuild}
              </p>
              {preset.requiresAppUpdate && (
                <span className="badge badge-danger" style={{ marginTop: 6, fontSize: '0.6rem' }}>
                  App güncellemesi gerekir
                </span>
              )}
            </div>
            <div className="template-card-action">
              <span className="primary-button" style={{ fontSize: '0.78rem', padding: '8px 14px' }}>
                Başla
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
