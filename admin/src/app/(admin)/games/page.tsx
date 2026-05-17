'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  listGameDefinitions,
  deleteGameDefinition,
  GameDefinitionDto,
  GameCategory,
  templateLabel,
  isPublicDemoTemplate
} from '../../../lib/alba-api';

export default function GamesPage() {
  const router = useRouter();
  const [games, setGames] = useState<GameDefinitionDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | GameCategory>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'PUBLISHED'>('ALL');

  useEffect(() => {
    let cancelled = false;
    listGameDefinitions()
      .then((data) => { if (!cancelled) setGames(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const handleDelete = async (game: GameDefinitionDto) => {
    if (!window.confirm(`"${game.title}" oyununu silmek istediğine emin misin? Bu işlem geri alınamaz.`)) return;
    setDeletingIds((prev) => new Set(prev).add(game.id));
    try {
      await deleteGameDefinition(game.id);
      setGames((prev) => prev.filter((g) => g.id !== game.id));
    } catch {
      alert('Silme başarısız oldu.');
    } finally {
      setDeletingIds((prev) => { const next = new Set(prev); next.delete(game.id); return next; });
    }
  };

  const filtered = useMemo(() => {
    return games.filter((game) => {
      if (!isPublicDemoTemplate(game.template)) return false;
      if (categoryFilter !== 'ALL' && game.category !== categoryFilter) return false;
      if (statusFilter !== 'ALL' && game.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          game.title.toLowerCase().includes(q) ||
          game.gameKey.toLowerCase().includes(q) ||
          game.template.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [games, categoryFilter, statusFilter, search]);

  const categories = useMemo(() => {
    const cats = new Set(games.map((g) => g.category).filter(Boolean));
    return Array.from(cats);
  }, [games]);

  const draftCount = games.filter((g) => g.status === 'DRAFT').length;
  const publishedCount = games.filter((g) => g.status === 'PUBLISHED').length;

  return (
    <div>
      {/* Top bar */}
      <div className="topbar">
        <div>
          <h1>Game Studio</h1>
          <p className="muted">Oyun kütüphanesi — mobil oyunları yönet, test et ve yayınla</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <button
            className="primary-button"
            onClick={() => router.push('/games/new')}
          >
            + Yeni Oyun
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="badge-row" style={{ marginBottom: 20 }}>
        <span className="badge badge-info">{games.length} Oyun</span>
        <span className="badge-success">{publishedCount} Yayında</span>
        <span className="badge-draft">{draftCount} Taslak</span>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          className="search-input"
          style={{ maxWidth: 320 }}
          placeholder="Oyun ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="category-tabs">
          <button
            className={`category-tab ${categoryFilter === 'ALL' ? 'category-tab-active' : ''}`}
            onClick={() => setCategoryFilter('ALL')}
          >
            Tümü
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              className={`category-tab ${categoryFilter === cat ? 'category-tab-active' : ''}`}
              onClick={() => setCategoryFilter(cat)}
            >
              {cat === 'SPORT' ? 'Spor' : cat === 'FUN' ? 'Eğlence' : 'Eğitim'}
            </button>
          ))}
        </div>

        <div className="category-tabs">
          <button
            className={`category-tab ${statusFilter === 'ALL' ? 'category-tab-active' : ''}`}
            onClick={() => setStatusFilter('ALL')}
          >
            Tüm Durumlar
          </button>
          <button
            className={`category-tab ${statusFilter === 'DRAFT' ? 'category-tab-active' : ''}`}
            onClick={() => setStatusFilter('DRAFT')}
          >
            Taslak
          </button>
          <button
            className={`category-tab ${statusFilter === 'PUBLISHED' ? 'category-tab-active' : ''}`}
            onClick={() => setStatusFilter('PUBLISHED')}
          >
            Yayında
          </button>
        </div>
      </div>

      {/* Game Cards */}
      {isLoading ? (
        <div className="loading-spinner" />
      ) : (
        <div className="game-library-grid">
          {filtered.length === 0 ? (
            <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
              <span style={{ fontSize: '2rem', opacity: 0.4 }}>🎮</span>
              <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Henüz oyun yok</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                Yeni bir oyun oluşturarak Game Studio&apos;yu kullanmaya başlayın.
              </p>
              <button className="primary-button" onClick={() => router.push('/games/new')}>
                + Yeni Oyun Oluştur
              </button>
            </div>
          ) : (
            filtered.map((game) => (
              <div
                key={game.id}
                role="button"
                tabIndex={0}
                className="game-library-card"
                onClick={() => router.push(`/games/${game.id}/studio`)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/games/${game.id}/studio`); } }}
              >
                <div className="game-library-card-header">
                  <span className="game-library-card-icon">
                    {game.category === 'SPORT' ? '🏋️' : game.category === 'EDUCATION' ? '📚' : '🎮'}
                  </span>
                  <div>
                    <h3 className="game-library-card-title">{game.title || game.gameKey}</h3>
                    <p className="game-library-card-desc">
                      {game.description?.slice(0, 80)}{(game.description?.length ?? 0) > 80 ? '...' : ''}
                    </p>
                  </div>
                </div>

                <div className="game-library-card-meta">
                  <span className="badge badge-info" style={{ fontSize: '0.6rem' }}>
                    {templateLabel(game.template)}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>
                    {game.levels?.[0]?.durationSec ?? '?'}sn
                  </span>
                  {game.status === 'PUBLISHED' ? (
                    <span className="badge-success">Yayında</span>
                  ) : game.status === 'DRAFT' ? (
                    <span className="badge-draft">Taslak</span>
                  ) : (
                    <span className="badge badge-info">{game.status}</span>
                  )}
                </div>

                <div className="game-library-card-motions">
                  <span className="muted" style={{ fontSize: '0.65rem' }}>
                    {game.supportedMotions?.slice(0, 4).join(', ') || '—'}
                  </span>
                </div>

                <div className="game-library-card-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="primary-button"
                    style={{ fontSize: '0.65rem', padding: '5px 12px', minWidth: 'auto' }}
                    onClick={() => router.push(`/games/${game.id}/studio`)}
                  >
                    Studio&apos;da Aç
                  </button>
                  <button
                    type="button"
                    className="danger-button"
                    style={{ fontSize: '0.65rem', padding: '5px 12px', minWidth: 'auto' }}
                    disabled={deletingIds.has(game.id)}
                    onClick={() => handleDelete(game)}
                  >
                    {deletingIds.has(game.id) ? 'Siliniyor...' : '🗑 Sil'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
