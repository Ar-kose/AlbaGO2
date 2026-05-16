'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { listAssets, uploadAsset, archiveAsset, AssetDto } from '../../../lib/asset-server-api';

const CATEGORIES: { value: string; label: string }[] = [
  { value: '', label: 'Tümü' },
  { value: 'covers', label: 'Kapak' },
  { value: 'backgrounds', label: 'Arka Plan' },
  { value: 'targets', label: 'Hedef' },
  { value: 'characters', label: 'Karakter' },
  { value: 'icons', label: 'İkon' },
  { value: 'music', label: 'Müzik' },
  { value: 'sfx', label: 'Ses Efekti' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'runtime-ui', label: 'Runtime UI' }
];

const KIND_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'Tümü' },
  { value: 'IMAGE', label: 'Görsel' },
  { value: 'AUDIO', label: 'Ses' },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<AssetDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [kindFilter, setKindFilter] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('covers');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [archiving, setArchiving] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAssets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await listAssets({
        category: categoryFilter || undefined,
        kind: kindFilter || undefined,
        page,
        perPage: 24
      });
      setAssets(result.items ?? []);
      setTotal(result.total ?? 0);
    } catch (err: any) {
      setError(err.message ?? 'Asset listesi yüklenemedi');
    } finally {
      setIsLoading(false);
    }
  }, [categoryFilter, kindFilter, page]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  useEffect(() => {
    setPage(1);
  }, [categoryFilter, kindFilter]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);
    try {
      const a = await uploadAsset(file, uploadCategory);
      setUploadSuccess(`${a.key} yüklendi`);
      setUploadOpen(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchAssets();
    } catch (err: any) {
      setUploadError(err.message ?? 'Yükleme başarısız');
    } finally {
      setUploading(false);
    }
  };

  const handleArchive = async (id: string) => {
    setArchiving(id);
    try {
      await archiveAsset(id);
      setAssets((prev) => prev.filter((a) => a.id !== id));
      setTotal((prev) => prev - 1);
    } catch (err: any) {
      // ignore — card stays
    } finally {
      setArchiving(null);
    }
  };

  const copyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    }).catch(() => {});
  };

  const totalPages = Math.max(1, Math.ceil(total / 24));
  const archivedCount = assets.filter((a) => a.archived).length;

  return (
    <div>
      {/* Top bar */}
      <div className="topbar">
        <div>
          <h1>Varliklar</h1>
          <p className="muted">Asset kütüphanesi — kapak, arka plan, ikon ve oyun görsellerini yönet</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <button
            className={uploadOpen ? 'secondary-button' : 'primary-button'}
            onClick={() => { setUploadOpen(!uploadOpen); setUploadError(null); setUploadSuccess(null); }}
          >
            {uploadOpen ? 'İptal' : '+ Yükle'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="badge-row" style={{ marginBottom: 20 }}>
        <span className="badge badge-info">{total} Varlık</span>
        {archivedCount > 0 && <span className="badge-draft">{archivedCount} Arşivli</span>}
      </div>

      {/* Upload panel */}
      {uploadOpen && (
        <div className="panel" style={{ marginBottom: 20 }}>
          <h3 style={{ marginTop: 0 }}>Yeni Asset Yükle</h3>
          <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="field" style={{ minWidth: 180 }}>
              <span>Kategori</span>
              <select value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)}>
                {CATEGORIES.filter((c) => c.value !== '').map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/webp,image/svg+xml,audio/mpeg,audio/wav,audio/ogg"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file);
                }}
              />
              <button
                className="primary-button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? 'Yükleniyor...' : 'Dosya Seç ve Yükle'}
              </button>
            </div>
          </div>
          <p className="muted" style={{ fontSize: '0.72rem', margin: 0 }}>
            PNG, WebP, SVG, MP3, WAV, OGG — maks 5 MB. Kategori seçimi zorunludur.
          </p>
          {uploadError && (
            <div className="validation-fail" style={{ marginTop: 12, padding: '8px 14px', borderRadius: 10, fontSize: '0.82rem' }}>
              {uploadError}
            </div>
          )}
          {uploadSuccess && (
            <div className="validation-pass" style={{ marginTop: 12, padding: '8px 14px', borderRadius: 10, fontSize: '0.82rem' }}>
              {uploadSuccess}
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="category-tabs">
            {KIND_FILTERS.map((k) => (
              <button
                key={k.value}
                className={`category-tab ${kindFilter === k.value ? 'category-tab-active' : ''}`}
                onClick={() => setKindFilter(k.value)}
              >
                {k.label}
              </button>
            ))}
          </div>
          <div className="category-tabs">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                className={`category-tab ${categoryFilter === cat.value ? 'category-tab-active' : ''}`}
                onClick={() => setCategoryFilter(cat.value)}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button
              className="ghost-button"
              style={{ minWidth: 'auto', padding: '8px 12px', fontSize: '0.72rem' }}
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ← Önceki
            </button>
            <span className="muted" style={{ fontSize: '0.72rem', minWidth: 60, textAlign: 'center' }}>
              {page} / {totalPages}
            </span>
            <button
              className="ghost-button"
              style={{ minWidth: 'auto', padding: '8px 12px', fontSize: '0.72rem' }}
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Sonraki →
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="loading-spinner" />
      ) : error ? (
        <div className="empty-state">
          <span style={{ fontSize: '2rem', opacity: 0.4 }}>⚠</span>
          <p style={{ color: 'var(--accent-danger)', fontWeight: 600 }}>Yükleme hatası</p>
          <p className="muted" style={{ fontSize: '0.82rem' }}>{error}</p>
          <button className="primary-button" onClick={fetchAssets}>Tekrar Dene</button>
        </div>
      ) : assets.length === 0 ? (
        <div className="empty-state">
          <span style={{ fontSize: '2rem', opacity: 0.4 }}>🖼</span>
          <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Henüz asset yok</p>
          <p className="muted" style={{ fontSize: '0.82rem' }}>
            İlk asset&apos;i yükleyerek kütüphaneyi başlatın.
          </p>
          <button className="primary-button" onClick={() => setUploadOpen(true)}>
            + İlk Asset&apos;i Yükle
          </button>
        </div>
      ) : (
        <div className="asset-grid">
          {assets.map((asset) => (
            <div key={asset.id} className={`asset-card${asset.archived ? ' asset-archived' : ''}`}>
              {/* Thumbnail */}
              <div className="asset-thumb-wrapper">
                {asset.kind === 'AUDIO' ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '2rem', background: 'rgba(255,255,255,0.03)' }}>
                    🔊
                  </div>
                ) : (
                  <>
                    <img
                      src={asset.uri || asset.url}
                      alt={asset.key}
                      className="asset-thumb"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <div className="asset-thumb-fallback hidden">
                      <span>🖼</span>
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{asset.mimeType}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Info */}
              <div className="asset-card-body">
                <div style={{ fontWeight: 700, fontSize: '0.78rem', wordBreak: 'break-all', lineHeight: 1.3 }}>
                  {asset.key}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                  <span className="badge badge-info" style={{ fontSize: '0.6rem', padding: '2px 8px' }}>
                    {asset.kind === 'AUDIO' ? 'SES' : asset.format}
                  </span>
                  <span className="badge" style={{ fontSize: '0.6rem', padding: '2px 8px' }}>
                    {CATEGORIES.find((c) => c.value === asset.category)?.label ?? asset.category ?? '—'}
                  </span>
                  {(asset.width && asset.height) ? (
                    <span className="muted" style={{ fontSize: '0.62rem' }}>{asset.width}×{asset.height}</span>
                  ) : asset.durationSec ? (
                    <span className="muted" style={{ fontSize: '0.62rem' }}>{asset.durationSec}s</span>
                  ) : null}
                  <span className="muted" style={{ fontSize: '0.62rem' }}>{formatBytes(asset.bytes)}</span>
                  {asset.archived && (
                    <span className="badge-draft" style={{ fontSize: '0.6rem', padding: '2px 8px' }}>Arşivli</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="asset-card-actions">
                <button
                  className="ghost-button"
                  style={{ minWidth: 'auto', padding: '5px 10px', fontSize: '0.65rem' }}
                  onClick={() => copyUrl(asset.uri || asset.url, asset.id)}
                >
                  {copiedId === asset.id ? 'Kopyalandi ✓' : 'URL Kopyala'}
                </button>
                {!asset.archived && (
                  <button
                    className="danger-button"
                    style={{ minWidth: 'auto', padding: '5px 10px', fontSize: '0.65rem' }}
                    disabled={archiving === asset.id}
                    onClick={() => {
                      if (confirm(`"${asset.key}" silinsin mi?\n\nBu işlem geri alınamaz. Asset kalıcı olarak arşivlenir.`)) handleArchive(asset.id);
                    }}
                  >
                    {archiving === asset.id ? '...' : '🗑 Sil'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
