'use client';

import { useEffect, useState } from 'react';
import { AdminTopbar } from '../../components/admin-topbar';
import { listGameDefinitions, listAuditLogs } from '../../../lib/alba-api';

export default function AnalyticsPage() {
  const [stats, setStats] = useState({ totalGames: 0, publishedGames: 0, totalAuditEvents: 0, uniqueTemplates: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listGameDefinitions(), listAuditLogs()])
      .then(([games, auditLogs]) => {
        setStats({
          totalGames: games.length,
          publishedGames: games.filter((g) => g.status === 'PUBLISHED').length,
          totalAuditEvents: auditLogs.length,
          uniqueTemplates: new Set(games.map((g) => g.template)).size
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const metricCards = [
    { label: 'Toplam Oyun', value: String(stats.totalGames), detail: 'Tum durumlar', accent: '#ff7a45' },
    { label: 'Yayinda', value: String(stats.publishedGames), detail: 'Aktif oyunlar', accent: '#22c55e' },
    { label: 'Audit Event', value: String(stats.totalAuditEvents), detail: 'Son 7 gun', accent: '#3b82f6' },
    { label: 'Sablon', value: String(stats.uniqueTemplates), detail: 'Kullanilan sablonlar', accent: '#8b5cf6' }
  ];

  return (
    <>
      <AdminTopbar title="Analitik" subtitle="Oyun ve yayin metriklerini canli izle." />
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
            <article className="panel stack" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
              <p className="eyebrow">Detayli grafikler yakinda</p>
              <p className="muted" style={{ textAlign: 'center' }}>Kullanici etkilesimi ve oturum metrikleri<br />gelecek surumde eklenecek.</p>
            </article>
          </section>
        </>
      )}
    </>
  );
}
