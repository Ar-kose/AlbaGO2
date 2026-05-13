'use client';

import type { GameAssetDto } from '../../../../../lib/alba-api';

interface AssetChecklistProps {
  assets: GameAssetDto[];
  requiredKeys: string[];
}

export function StudioAssetChecklist({ assets, requiredKeys }: AssetChecklistProps) {
  const assetMap = new Map(assets.map((a) => [a.key, a]));

  return (
    <div className="panel">
      <p className="eyebrow" style={{ marginBottom: 8 }}>Asset Checklist</p>

      {requiredKeys.length === 0 ? (
        <p className="muted" style={{ fontSize: '0.72rem' }}>Bu oyunda zorunlu asset anahtarı tanımlanmamış.</p>
      ) : (
        <div className="stack" style={{ gap: 6 }}>
          {requiredKeys.map((key) => {
            const found = assetMap.get(key);
            return (
              <div key={key} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 10px', borderRadius: 8,
                background: found ? 'rgba(52,211,153,0.04)' : 'rgba(251,113,133,0.04)',
                border: `1px solid ${found ? 'rgba(52,211,153,0.15)' : 'rgba(251,113,133,0.15)'}`
              }}>
                <span style={{
                  color: found ? 'var(--accent-emerald)' : 'var(--accent-danger)',
                  fontSize: '0.8rem', fontWeight: 700
                }}>
                  {found ? '✓' : '✕'}
                </span>
                <span style={{ flex: 1, fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {key}
                </span>
                {found ? (
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                    {found.kind} · {found.format}
                  </span>
                ) : (
                  <span style={{ fontSize: '0.6rem', color: 'var(--accent-danger)', fontWeight: 600 }}>
                    Eksik
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 12, borderTop: '1px solid var(--border-subtle)', paddingTop: 10 }}>
        <p className="muted" style={{ fontSize: '0.62rem', margin: 0 }}>
          Asset yüklemek için medya sayfasını kullanın veya doğrudan URI girin.
        </p>
      </div>
    </div>
  );
}
