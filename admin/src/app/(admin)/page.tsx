'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { DashboardCard } from '../../components/dashboard-card';
import { AdminTopbar } from '../components/admin-topbar';
import { listAuditLogs, listGameDefinitions } from '../../lib/alba-api';

const thumbs: Record<string, string> = {
  FRUIT_SLASH: '/game_covers/thumb_fruit_slash.png',
  DODGE_RUN: '/game_covers/thumb_dodge_run.png',
  FIT_CHALLENGE: '/game_covers/thumb_fit_challenge.png',
  TARGET_HIT: '/game_covers/thumb_matematik_macerasi.png',
  ENDLESS_RUNNER: '/game_covers/game_neon_rush.png'
};

type GameSummary = { status: string; template: string; title: string };

export default function HomePage() {
  const [games, setGames] = useState<GameSummary[]>([]);
  const [auditCount, setAuditCount] = useState(0);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    Promise.all([listGameDefinitions(), listAuditLogs()])
      .then(([gameList, auditLogs]) => {
        setGames(gameList);
        setAuditCount(auditLogs.length);
        setLoadState(gameList.length ? 'ready' : 'empty');
        setMessage(gameList.length ? 'Canli oyun ve audit verileri yuklendi.' : 'Yayinda oyun yok.');
      })
      .catch((error) => {
        setGames([]);
        setLoadState('error');
        setMessage(`Backend okunamadi: ${error instanceof Error ? error.message : 'unknown_error'}`);
      });
  }, []);

  const metrics = useMemo(() => {
    const published = games.filter((game) => game.status.toUpperCase() === 'PUBLISHED').length;
    const drafts = games.filter((game) => ['DRAFT', 'REVIEW'].includes(game.status.toUpperCase())).length;
    const templates = new Set(games.map((game) => game.template)).size;
    return [
      { label: 'Published Games', value: String(published), detail: published > 0 ? 'Aktif oyunlar' : 'Henuz yayin yok' },
      { label: 'Draft / Review', value: String(drafts), detail: 'Inceleme bekleyen' },
      { label: 'Templates', value: String(templates || 0), detail: 'Kullanima hazir' },
      { label: 'Audit Events', value: String(auditCount), detail: 'Son 7 gun' }
    ];
  }, [auditCount, games]);

  if (loadState === 'loading') {
    return (
      <>
        <AdminTopbar title="AlbaGo Content Console" subtitle="Yukleniyor..." />
        <div className="loading-spinner" />
      </>
    );
  }

  if (loadState === 'error') {
    return (
      <>
        <AdminTopbar title="AlbaGo Content Console" message={message} />
        <section className="hero hero-compact" style={{ borderColor: 'var(--hot)' }}>
          <span className="badge" style={{ background: 'var(--hot)' }}>Baglanti Hatasi</span>
          <h1>Backend baglantisi kurulamadi.</h1>
          <p>{message}</p>
        </section>
      </>
    );
  }

  return (
    <>
      <AdminTopbar title="AlbaGo Content Console" message={message} />

      <section className="hero hero-compact">
        <span className="badge">{games.length > 0 ? `${games.length} oyun yonetiliyor` : 'Henuz oyun yok'}</span>
        <h1>Oyun yayinlarini tek neon komuta topla.</h1>
        <p>Oyunlar, sablonlar, asset durumu ve audit akisi ayni panelde.</p>
        <Link href="/games" className="primary-button">
          Yeni Oyun Ekle
        </Link>
      </section>

      <section className="panel-grid">
        {metrics.map((metric) => (
          <DashboardCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="dashboard-grid">
        <article className="panel panel-glow stack">
          <div className="section-header">
            <div>
              <p className="eyebrow">Live Games</p>
              <h2>Yayindaki oyunlar</h2>
            </div>
            <Link href="/games" className="badge">
              Tumunu Gor
            </Link>
          </div>
          <div className="list">
            {games.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem', textAlign: 'center' }}>
                <p className="muted">Henuz hic oyun yok. Ilk oyunu eklemek icin "Yeni Oyun Ekle" butonuna tikla.</p>
              </div>
            ) : (
              games.slice(0, 5).map((game) => (
                <div className="list-card game-row" key={`${game.template}-${game.title}`}>
                  <img
                    className="game-thumb"
                    src={thumbs[game.template] ?? '/game_covers/game_neon_rush.png'}
                    alt=""
                  />
                  <div>
                    <strong>{game.title}</strong>
                    <p className="muted">
                      {game.template} / {game.status}
                    </p>
                  </div>
                  <span className="status-ready">Yayinda</span>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="panel stack">
          <div>
            <p className="eyebrow">Yayin Dagilimi</p>
            <h2>Kategoriler</h2>
          </div>
          <div className="donut" aria-hidden="true" />
          <div className="legend">
            <span className="legend-row">Spor <strong>%34</strong></span>
            <span className="legend-row">Eglence <strong>%33</strong></span>
            <span className="legend-row">Egitim <strong>%33</strong></span>
          </div>
        </article>
      </section>
    </>
  );
}
