'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { DashboardCard } from '../components/dashboard-card';
import { listAuditLogs, listGameDefinitions } from '../lib/alba-api';

const fallbackGames = [
  { status: 'PUBLISHED', template: 'FRUIT_SLASH', title: 'Fruit Slash' },
  { status: 'PUBLISHED', template: 'DODGE_RUN', title: 'Dodge Run' },
  { status: 'DRAFT', template: 'FIT_CHALLENGE', title: 'Fit Challenge' }
];

const navItems = ['Genel Bakış', 'Oyunlar', 'Şablonlar', 'Kategoriler', 'Medya', 'Yayınlar', 'Analitik', 'Audit Log'];

const thumbs: Record<string, string> = {
  FRUIT_SLASH: '/game_covers/thumb_fruit_slash.png',
  DODGE_RUN: '/game_covers/thumb_dodge_run.png',
  FIT_CHALLENGE: '/game_covers/thumb_fit_challenge.png',
  TARGET_HIT: '/game_covers/thumb_matematik_macerasi.png',
  ENDLESS_RUNNER: '/game_covers/game_neon_rush.png'
};

export default function HomePage() {
  const [games, setGames] = useState<Array<{ status: string; template: string; title: string }>>(fallbackGames);
  const [auditCount, setAuditCount] = useState(128);
  const [message, setMessage] = useState('İçeriklerinizi analiz et, yayınla ve yayınla.');

  useEffect(() => {
    Promise.all([listGameDefinitions(), listAuditLogs()])
      .then(([gameList, auditLogs]) => {
        setGames(gameList.length > 0 ? gameList : fallbackGames);
        setAuditCount(auditLogs.length || 128);
        setMessage('Canlı oyun ve audit verileri yüklendi.');
      })
      .catch(() => {
        setGames(fallbackGames);
        setMessage('Yerel demo görünümü aktif.');
      });
  }, []);

  const metrics = useMemo(() => {
    const published = games.filter((game) => game.status.toUpperCase() === 'PUBLISHED').length;
    const drafts = games.filter((game) => ['DRAFT', 'REVIEW'].includes(game.status.toUpperCase())).length;
    const templates = new Set(games.map((game) => game.template)).size;
    return [
      { label: 'Published Games', value: String(published), detail: '%100 yayınlanmış' },
      { label: 'Draft / Review', value: String(drafts), detail: 'İnceleme bekleyen' },
      { label: 'Templates', value: String(templates || 18), detail: 'Kullanıma hazır' },
      { label: 'Audit Events', value: String(auditCount), detail: 'Son 7 gün' }
    ];
  }, [auditCount, games]);

  return (
    <main className="shell">
      <div className="admin-shell">
        <aside className="sidebar">
          <div className="brand">
            <img src="/game_covers/logo_albago.png" alt="AlbaGO" />
            <span>Content Console</span>
          </div>
          <nav className="side-nav" aria-label="Admin navigasyonu">
            {navItems.map((item, index) => (
              <Link
                key={item}
                href={index === 1 ? '/games' : '#'}
                className={`nav-item${index === 0 ? ' nav-item-active' : ''}`}
              >
                <span className="nav-icon">{index + 1}</span>
                {item}
              </Link>
            ))}
          </nav>
          <p className="muted">AlbaGO Admin</p>
        </aside>

        <section className="admin-main">
          <div className="topbar">
            <div>
              <h1>AlbaGo Content Console</h1>
              <p className="muted">{message}</p>
            </div>
            <div className="profile-pill">
              <span className="profile-dot" />
              <div>
                <strong>Yönetici</strong>
                <p className="muted">Admin</p>
              </div>
            </div>
          </div>

          <section className="hero hero-compact">
            <span className="badge">3 demo oyununu yönetiyorsun</span>
            <h1>Oyun yayınlarını tek neon komuta topla.</h1>
            <p>Demo oyunları, şablonlar, asset durumu ve audit akışı aynı panelde.</p>
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
                  <p className="eyebrow">Current Demo Games</p>
                  <h2>Yayındaki oyunlar</h2>
                </div>
                <Link href="/games" className="badge">
                  Tümünü Gör
                </Link>
              </div>
              <div className="list">
                {games.slice(0, 5).map((game) => (
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
                    <span className="status-ready">Yayında</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel stack">
              <div>
                <p className="eyebrow">Yayın Dağılımı</p>
                <h2>Kategoriler</h2>
              </div>
              <div className="donut" aria-hidden="true" />
              <div className="legend">
                <span className="legend-row">Spor <strong>%34</strong></span>
                <span className="legend-row">Eğlence <strong>%33</strong></span>
                <span className="legend-row">Eğitim <strong>%33</strong></span>
              </div>
            </article>
          </section>
        </section>
      </div>
    </main>
  );
}

