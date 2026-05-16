'use client';

import { useEffect, useState, useRef } from 'react';
import { listAssets, uploadAsset, AssetDto } from '../../../../../lib/asset-server-api';

interface AssetPickerModalProps {
  open: boolean;
  category: string;
  kind?: string;
  onClose: () => void;
  onSelect: (asset: AssetDto) => void;
}

const DIMENSIONS: Record<string, string> = {
  cover: '512x512 px', background: '1920x1080 px', character: '512x512 px',
  target: '256x256 px', icon: '128x128 px',
};

const ACCEPT_MAP: Record<string, string> = {
  IMAGE: 'image/png,image/webp,image/svg+xml',
  AUDIO: 'audio/mpeg,audio/wav,audio/ogg',
};

export function AssetPickerModal({ open, category, kind, onClose, onSelect }: AssetPickerModalProps) {
  const [assets, setAssets] = useState<AssetDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Upload state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragover, setDragover] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setUploadOpen(false);
    setUploadError(null);

    const cat = category === 'all' ? undefined : category;
    const k = kind === 'AUDIO' ? 'AUDIO' : kind === 'IMAGE' ? 'IMAGE' : undefined;
    listAssets({ category: cat, kind: k, perPage: 50 })
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
  }, [open, category, kind]);

  const reload = () => {
    setIsLoading(true);
    setError(null);
    const cat = category === 'all' ? undefined : category;
    const k = kind === 'AUDIO' ? 'AUDIO' : kind === 'IMAGE' ? 'IMAGE' : undefined;
    listAssets({ category: cat, kind: k, perPage: 50 })
      .then((r) => setAssets(r.items ?? []))
      .catch((err) => setError(err.message ?? 'Assetler yüklenemedi'))
      .finally(() => setIsLoading(false));
  };

  // Determine upload category from modal category
  const uploadCategory = category === 'all' ? 'covers' : category;

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      await uploadAsset(file, uploadCategory);
      setUploadOpen(false);
      reload(); // Otomatik yenile
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setUploadError(err.message ?? 'Yukleme basarisiz');
    } finally {
      setUploading(false);
    }
  };

  const acceptTypes = ACCEPT_MAP[kind ?? 'IMAGE'] ?? ACCEPT_MAP['IMAGE'];

  if (!open) return null;

  const categoryLabel = (cat: string) =>
    cat === 'covers' ? 'Kapak' : cat === 'backgrounds' ? 'Arkaplan' : cat === 'characters' ? 'Karakter' :
    cat === 'targets' ? 'Hedef' : cat === 'sfx' ? 'Ses Efekti' : cat === 'music' ? 'Müzik' : cat === 'all' ? 'Tümü' : cat;

  const dimLabel = DIMENSIONS[uploadCategory] ?? null;

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
          display: 'grid', gridTemplateRows: 'auto auto 1fr',
          overflow: 'hidden', padding: 0
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: 'var(--space-lg) var(--space-xl)',
          borderBottom: '1px solid var(--border-subtle)'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.95rem' }}>Asset Seç</h3>
            <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
              {categoryLabel(category)} {kind ? `· ${kind === 'AUDIO' ? 'Ses' : 'Görsel'}` : ''}
            </span>
          </div>
          <button type="button" onClick={onClose}
            style={{ background: 'none', border: '1px solid var(--border-subtle)', borderRadius: 8, color: 'var(--text-muted)', cursor: 'pointer', padding: '4px 10px', fontSize: '0.78rem' }}>
            ✕
          </button>
        </div>

        {/* Upload Bar */}
        <div style={{
          padding: uploadOpen ? 'var(--space-md) var(--space-xl)' : '6px var(--space-xl)',
          borderBottom: '1px solid var(--border-subtle)',
          background: dragover ? 'rgba(0,170,255,0.08)' : 'rgba(255,255,255,0.01)',
          transition: 'background 0.15s'
        }}
          onDragOver={(e) => { e.preventDefault(); setDragover(true); }}
          onDragLeave={() => setDragover(false)}
          onDrop={(e) => { e.preventDefault(); setDragover(false); const f = e.dataTransfer.files[0]; if (f) handleFileUpload(f); }}
        >
          {!uploadOpen ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                {dragover ? 'Dosyayi birak...' : 'Hizli yukleme: surukle-birak veya'}
              </span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {dimLabel && <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>{dimLabel}</span>}
                <button type="button" className="secondary-button"
                  style={{ fontSize: '0.65rem', padding: '4px 12px', minWidth: 'auto' }}
                  onClick={() => setUploadOpen(true)}>
                  + Yükle
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: uploadError ? 8 : 0 }}>
                <input ref={fileInputRef} type="file" accept={acceptTypes}
                  style={{ display: 'none' }}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
                <button type="button" className="primary-button"
                  disabled={uploading}
                  style={{ fontSize: '0.68rem', padding: '5px 14px', minWidth: 'auto' }}
                  onClick={() => fileInputRef.current?.click()}>
                  {uploading ? 'Yukleniyor...' : `Dosya Sec (${categoryLabel(uploadCategory)})`}
                </button>
                <button type="button" className="ghost-button"
                  style={{ fontSize: '0.65rem', padding: '4px 10px', minWidth: 'auto' }}
                  onClick={() => { setUploadOpen(false); setUploadError(null); }}
                  disabled={uploading}>
                  Iptal
                </button>
                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', flex: 1 }}>
                  PNG/WebP/SVG/MP3/WAV/OGG · max 5MB
                </span>
              </div>
              {uploadError && (
                <div style={{ fontSize: '0.7rem', color: 'var(--accent-danger)', marginTop: 4, padding: '4px 8px', borderRadius: 6, background: 'rgba(255,50,50,0.08)' }}>
                  {uploadError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ overflow: 'auto', padding: 'var(--space-lg)', minHeight: 200 }}>
          {isLoading ? (
            <div className="loading-spinner" />
          ) : error ? (
            <div className="empty-state">
              <p style={{ color: 'var(--accent-danger)', fontWeight: 600, margin: '0 0 4px' }}>{error}</p>
              <button className="ghost-button" style={{ fontSize: '0.72rem', minWidth: 'auto', padding: '6px 12px' }}
                onClick={reload}>Tekrar Dene</button>
            </div>
          ) : assets.length === 0 ? (
            <div className="empty-state">
              <span style={{ fontSize: '2rem', opacity: 0.4 }}>{kind === 'AUDIO' ? '🔊' : '🖼'}</span>
              <p className="muted" style={{ margin: '4px 0', fontSize: '0.82rem' }}>Bu kategoride henüz asset yok.</p>
              <p className="muted" style={{ fontSize: '0.65rem' }}>
                Yukaridaki "Yuikle" butonuyla dosya yukleyin veya surukle-birak yapin.
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
                    {asset.kind === 'AUDIO' ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '2rem' }}>
                        🔊
                      </div>
                    ) : (
                      <>
                        <img src={asset.uri ?? (asset as any).url} alt={asset.key}
                          className="asset-thumb" loading="lazy"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }} />
                        <div className="asset-thumb-fallback hidden"><span>🖼</span></div>
                      </>
                    )}
                  </div>
                  <div className="asset-card-body">
                    <div style={{ fontWeight: 700, fontSize: '0.72rem', wordBreak: 'break-all', lineHeight: 1.3 }}>
                      {asset.key ?? (asset as any).filename}
                    </div>
                    <span className="muted" style={{ fontSize: '0.6rem' }}>
                      {asset.kind === 'AUDIO' ? asset.format : (asset.width && asset.height ? `${asset.width}×${asset.height}` : asset.format)}
                    </span>
                    {asset.kind === 'AUDIO' && asset.durationSec && (
                      <span className="muted" style={{ fontSize: '0.55rem', marginLeft: 4 }}>{asset.durationSec}s</span>
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
