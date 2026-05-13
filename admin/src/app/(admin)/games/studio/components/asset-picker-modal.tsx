'use client';

import { useEffect, useState } from 'react';
import { listAssets, AssetDto } from '../../../../../lib/asset-server-api';

interface AssetPickerModalProps {
  open: boolean;
  category: string;
  onClose: () => void;
  onSelect: (asset: AssetDto) => void;
}

export function AssetPickerModal({ open, category, onClose, onSelect }: AssetPickerModalProps) {
  const [assets, setAssets] = useState<AssetDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    listAssets({ category, perPage: 50 })
      .then((result) => {
        if (cancelled) return;
        setAssets(result.items ?? []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message ?? 'Assetler yüklenemedi');
        setAssets([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [open, category]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(6px)'
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="panel"
        style={{
          width: '90vw', maxWidth: 780, maxHeight: '80vh',
          display: 'grid', gridTemplateRows: 'auto 1fr',
          overflow: 'hidden', padding: 0
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: 'var(--space-lg) var(--space-xl)',
          borderBottom: '1px solid var(--border-subtle)'
        }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem' }}>Asset Seç</h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none', border: '1px solid var(--border-subtle)',
              borderRadius: 8, color: 'var(--text-muted)', cursor: 'pointer',
              padding: '4px 10px', fontSize: '0.78rem'
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ overflow: 'auto', padding: 'var(--space-lg)', minHeight: 200 }}>
          {isLoading ? (
            <div className="loading-spinner" />
          ) : error ? (
            <div className="empty-state">
              <p style={{ color: 'var(--accent-danger)', fontWeight: 600, margin: '0 0 4px' }}>
                {error}
              </p>
              <button className="ghost-button" style={{ fontSize: '0.72rem', minWidth: 'auto', padding: '6px 12px' }}
                onClick={() => {
                  setIsLoading(true);
                  setError(null);
                  listAssets({ category, perPage: 50 })
                    .then((r) => setAssets(r.items ?? []))
                    .catch((err) => setError(err.message ?? 'Assetler yüklenemedi'))
                    .finally(() => setIsLoading(false));
                }}
              >
                Tekrar Dene
              </button>
            </div>
          ) : assets.length === 0 ? (
            <div className="empty-state">
              <span style={{ fontSize: '2rem', opacity: 0.4 }}>🖼</span>
              <p className="muted" style={{ margin: '4px 0', fontSize: '0.82rem' }}>
                Bu kategoride henüz asset yok.
              </p>
            </div>
          ) : (
            <div className="asset-grid">
              {assets.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  className="asset-card"
                  style={{ cursor: 'pointer', textAlign: 'left', width: '100%' }}
                  onClick={() => onSelect(asset)}
                >
                  <div className="asset-thumb-wrapper">
                    <img
                      src={asset.url}
                      alt={asset.filename}
                      className="asset-thumb"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <div className="asset-thumb-fallback hidden">
                      <span>🖼</span>
                    </div>
                  </div>
                  <div className="asset-card-body">
                    <div style={{ fontWeight: 700, fontSize: '0.72rem', wordBreak: 'break-all', lineHeight: 1.3 }}>
                      {asset.filename}
                    </div>
                    {asset.width > 0 && asset.height > 0 && (
                      <span className="muted" style={{ fontSize: '0.6rem' }}>
                        {asset.width}×{asset.height}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
