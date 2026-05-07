'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { DashboardCard } from '../components/dashboard-card';
import { listAuditLogs, listGameDefinitions } from '../lib/alba-api';

export default function HomePage() {
  const [games, setGames] = useState<Array<{ status: string; template: string; title: string }>>([]);
  const [auditCount, setAuditCount] = useState(0);
  const [message, setMessage] = useState('AlbaGo panel verileri yukleniyor.');

  useEffect(() => {
    Promise.all([listGameDefinitions(), listAuditLogs()])
      .then(([gameList, auditLogs]) => {
        setGames(gameList);
        setAuditCount(auditLogs.length);
        setMessage('Canli oyun ve audit verileri yuklendi.');
      })
      .catch((error) => {
        const details = error instanceof Error ? error.message : 'unknown_error';
        setMessage(`Canli veri okunamadi: ${details}`);
      });
  }, []);

  const metrics = useMemo(() => {
    const published = games.filter((game) => game.status === 'PUBLISHED').length;
    const drafts = games.filter((game) => game.status === 'DRAFT' || game.status === 'REVIEW').length;
    const templates = new Set(games.map((game) => game.template)).size;
    return [
      { label: 'Published Games', value: String(published), detail: 'Mobil kataloga cikabilecek oyunlar' },
      { label: 'Draft or Review', value: String(drafts), detail: 'Publish oncesi bekleyen oyunlar' },
      { label: 'Templates', value: String(templates), detail: 'Aktif template cesitliligi' },
      { label: 'Audit Events', value: String(auditCount), detail: 'Kayit altindaki son degisiklikler' }
    ];
  }, [auditCount, games]);

  return (
    <main className="shell">
      <section className="hero">
        <span className="badge">AlbaGo Content Console</span>
        <h1>Sprint 4 hedefi: AlbaGo icin 3 demo oyunu gercek cihazda sunulabilir hale getirmek.</h1>
        <p>
          Meyve Kesme, Engelden Kacis ve Spor Mucadelesi icin sure, skor ve publish
          ayarlari bu panelden yonetilir.
        </p>
        <p className="muted">{message}</p>
        <p>
          <Link href="/games" className="badge">
            Open AlbaGo Demo Game Console
          </Link>
        </p>
      </section>

      <section className="panel-grid">
        {metrics.map((metric) => (
          <DashboardCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="panel">
        <p className="eyebrow">Current Demo Games</p>
        <div className="list">
          {games.map((game) => (
            <div className="list-card" key={`${game.template}-${game.title}`}>
              <strong>{game.title}</strong>
              <span className="muted">
                {game.template} | {game.status}
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
