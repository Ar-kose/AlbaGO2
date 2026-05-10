'use client';

import { useEffect, useState } from 'react';
import { AdminTopbar } from '../../components/admin-topbar';
import { listGameDefinitions } from '../../../lib/alba-api';

const statusMeta: Record<string, { label: string; accent: string }> = {
  PUBLISHED: { label: 'Yayinda', accent: '#22c55e' },
  DRAFT: { label: 'Taslak', accent: '#f59e0b' },
  REVIEW: { label: 'Incelemede', accent: '#3b82f6' },
  ARCHIVED: { label: 'Arsiv', accent: '#64748b' },
  SCHEDULED: { label: 'Planlandi', accent: '#8b5cf6' }
};

export default function PublicationsPage() {
  const [grouped, setGrouped] = useState<Record<string, Array<{ title: string; template: string; gameKey: string; version: number }>>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listGameDefinitions()
      .then((games) => {
        const groups: Record<string, typeof grouped[string]> = {};
        games.forEach((game) => {
          const status = game.status ?? 'DRAFT';
          if (!groups[status]) groups[status] = [];
          groups[status].push({ title: game.title, template: game.template, gameKey: game.gameKey, version: game.version });
        });
        setGrouped(groups);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <AdminTopbar title="Yayinlar" subtitle="Oyunlarin yayin durumuna gore Kanban gorunumu." />
      {loading ? (
        <div className="loading-spinner" />
      ) : (
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem', alignItems: 'start' }}>
          {Object.entries(statusMeta).map(([status, meta]) => {
            const items = grouped[status] ?? [];
            return (
              <article key={status} className="panel stack" style={{ borderTop: `3px solid ${meta.accent}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0, color: meta.accent }}>{meta.label}</h3>
                  <span className="badge" style={{ background: meta.accent }}>{items.length}</span>
                </div>
                {items.length === 0 ? (
                  <p className="muted" style={{ textAlign: 'center', padding: '1.5rem 0', fontSize: '0.85rem' }}>Bos</p>
                ) : (
                  items.map((game) => (
                    <div key={game.gameKey} className="list-card" style={{ padding: '0.6rem 0.75rem' }}>
                      <strong style={{ fontSize: '0.9rem' }}>{game.title}</strong>
                      <p className="muted" style={{ fontSize: '0.75rem' }}>{game.template} · v{game.version}</p>
                    </div>
                  ))
                )}
              </article>
            );
          })}
        </section>
      )}
    </>
  );
}
