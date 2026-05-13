'use client';

import { useEffect, useState } from 'react';
import { AdminTopbar } from '../../components/admin-topbar';
import { listGameDefinitions, listGameSessionsByGame } from '../../../lib/alba-api';

interface SessionSummary {
  totalSessions: number;
  totalScore: number;
  totalDurationSec: number;
  avgScore: number;
  avgDurationSec: number;
  completionRate: number;
  perGame: Array<{ title: string; sessions: number; totalScore: number }>;
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState({
    totalGames: 0, publishedGames: 0, uniqueTemplates: 0
  });
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionLoading, setSessionLoading] = useState(false);

  useEffect(() => {
    listGameDefinitions()
      .then((games) => {
        setStats({
          totalGames: games.length,
          publishedGames: games.filter((g) => g.status === 'PUBLISHED').length,
          uniqueTemplates: new Set(games.map((g) => g.template)).size
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Fetch session data per published game
  useEffect(() => {
    setSessionLoading(true);
    fetch('http://localhost:3000/v1/game-sessions/summary')
      .then((r) => r.json())
      .then((data) => setSessionSummary(data as SessionSummary))
      .catch(() => {})
      .finally(() => setSessionLoading(false));
  }, [stats.publishedGames]);

  const sessionCount = sessionSummary?.totalSessions ?? 0;
  const avgScore = sessionSummary?.avgScore ?? 0;
  const completionRate = sessionSummary?.completionRate ?? 0;
  const topGame = sessionSummary?.perGame?.[0];

  const metricCards = [
    { label: 'Toplam Oyun', value: String(stats.totalGames), detail: 'Tum durumlar', accent: '#ff7a45' },
    { label: 'Yayinda', value: String(stats.publishedGames), detail: 'Aktif katalog', accent: '#22c55e' },
    { label: 'Mobil Oturum', value: sessionLoading ? '...' : String(sessionCount), detail: 'Toplam oynanma', accent: '#3b82f6' },
    { label: 'Sablon', value: String(stats.uniqueTemplates), detail: 'Kullanilan sablonlar', accent: '#8b5cf6' }
  ];

  return (
    <>
      <AdminTopbar title="Analitik" subtitle="Oyun, oturum ve pilot metriklerini canli izle." />
      {loading ? (
        <div className="loading-spinner" />
      ) : (
        <>
          <section className="panel-grid">
            {metricCards.map((m) => (
              <article key={m.label} className="panel panel-glow" style={{ padding: '1.25rem', borderColor: m.accent }}>
                <p className="eyebrow">{m.label}</p>
                <h2 style={{ fontSize: '2rem', margin: '0.5rem 0' }}>{m.value}</h2>
                <p className="muted">{m.detail}</p>
              </article>
            ))}
          </section>

          <section className="dashboard-grid" style={{ marginTop: '1.5rem' }}>
            <article className="panel stack">
              <div>
                <p className="eyebrow">Yayin Durumu</p>
                <h2>Oyun Dagilimi</h2>
              </div>
              <div className="donut" aria-hidden="true" />
              <div className="legend">
                <span className="legend-row">Yayinda <strong>{stats.publishedGames}</strong></span>
                <span className="legend-row">Diger <strong>{stats.totalGames - stats.publishedGames}</strong></span>
              </div>
            </article>

            <article className="panel stack" style={{ gap: 10 }}>
              <div>
                <p className="eyebrow">Pilot Metrikleri</p>
                <h2>Mobil Oyun Performansi</h2>
              </div>
              {sessionLoading ? (
                <p className="muted">Yukleniyor...</p>
              ) : sessionCount === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <p className="muted">Henuz mobil oturum verisi yok.</p>
                  <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    Ilk oyun oturumu tamamlandiginda metrikler burada gorunecek.
                  </p>
                </div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.12)' }}>
                      <p style={{ fontSize: '0.62rem', color: 'var(--text-muted)', margin: 0 }}>Ortalama Skor</p>
                      <p style={{ fontSize: '1.2rem', fontWeight: 700, margin: '4px 0 0', color: '#3b82f6' }}>{avgScore}</p>
                    </div>
                    <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.12)' }}>
                      <p style={{ fontSize: '0.62rem', color: 'var(--text-muted)', margin: 0 }}>Tamamlama Orani</p>
                      <p style={{ fontSize: '1.2rem', fontWeight: 700, margin: '4px 0 0', color: '#22c55e' }}>%{completionRate}</p>
                    </div>
                    <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.12)' }}>
                      <p style={{ fontSize: '0.62rem', color: 'var(--text-muted)', margin: 0 }}>Toplam Skor</p>
                      <p style={{ fontSize: '1.2rem', fontWeight: 700, margin: '4px 0 0', color: '#8b5cf6' }}>{sessionSummary?.totalScore ?? 0}</p>
                    </div>
                    <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)' }}>
                      <p style={{ fontSize: '0.62rem', color: 'var(--text-muted)', margin: 0 }}>Ortalama Sure</p>
                      <p style={{ fontSize: '1.2rem', fontWeight: 700, margin: '4px 0 0', color: '#f59e0b' }}>{sessionSummary?.avgDurationSec ?? 0}s</p>
                    </div>
                  </div>
                  {topGame && (
                    <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 10 }}>
                      <p style={{ fontSize: '0.62rem', color: 'var(--text-muted)', margin: '0 0 6px' }}>En Cok Oynanan</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {topGame.title}
                        </span>
                        <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                          {topGame.sessions} oturum · {topGame.totalScore} puan
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </article>
          </section>

          {/* Per-game breakdown */}
          {sessionSummary && sessionSummary.perGame.length > 0 && (
            <section style={{ marginTop: '1.5rem' }}>
              <div className="panel" style={{ padding: 0 }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <p className="eyebrow" style={{ margin: 0 }}>Oyun Bazinda Oturum Dagilimi</p>
                </div>
                <div style={{ padding: '12px 16px', display: 'grid', gap: 6 }}>
                  {sessionSummary.perGame.map((game) => (
                    <div key={game.title} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 12px', borderRadius: 6,
                      background: 'rgba(255,255,255,0.02)',
                      fontSize: '0.68rem'
                    }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{game.title}</span>
                      <div style={{ display: 'flex', gap: 16 }}>
                        <span style={{ color: 'var(--text-muted)' }}>{game.sessions} oturum</span>
                        <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{game.totalScore} puan</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}
