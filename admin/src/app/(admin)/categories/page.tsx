'use client';

import { useEffect, useState } from 'react';
import { AdminTopbar } from '../../components/admin-topbar';
import { listGameDefinitions } from '../../../lib/alba-api';

type GameInfo = { title: string; template: string; status: string };
type CategoryGroup = { name: string; count: number; games: GameInfo[] };

const categoryMeta: Record<string, { label: string; accent: string; icon: string }> = {
  SPORT: { label: 'Spor', accent: '#10b981', icon: '⚽' },
  FUN: { label: 'Eglence', accent: '#ff7a45', icon: '🎮' },
  EDUCATION: { label: 'Egitim', accent: '#6366f1', icon: '📚' }
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listGameDefinitions()
      .then((games) => {
        const grouped: Record<string, GameInfo[]> = {};
        games.forEach((game) => {
          const cat = game.category ?? 'FUN';
          if (!grouped[cat]) grouped[cat] = [];
          grouped[cat].push({ title: game.title, template: game.template, status: game.status });
        });
        setCategories(
          Object.entries(grouped).map(([name, gameList]) => ({
            name,
            count: gameList.length,
            games: gameList
          }))
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <AdminTopbar title="Kategoriler" subtitle="Oyunlari kategorilere gore gruplandir ve yonet." />
      {loading ? (
        <div className="loading-spinner" />
      ) : (
        <section className="dashboard-grid">
          {categories.map((cat) => {
            const meta = categoryMeta[cat.name] ?? { label: cat.name, accent: 'var(--purple)', icon: '📦' };
            return (
              <article key={cat.name} className="panel panel-glow stack" style={{ borderColor: meta.accent }}>
                <div className="section-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '2rem' }}>{meta.icon}</span>
                    <div>
                      <h2 style={{ margin: 0 }}>{meta.label}</h2>
                      <p className="muted">{cat.count} oyun</p>
                    </div>
                  </div>
                  <span className="badge" style={{ background: meta.accent }}>{cat.name}</span>
                </div>
                <div className="list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {cat.games.map((game) => (
                    <div key={game.title} className="list-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>{game.title}</strong>
                        <p className="muted">{game.template}</p>
                      </div>
                      <span className={`status-${game.status === 'PUBLISHED' ? 'ready' : 'draft'}`}>
                        {game.status === 'PUBLISHED' ? 'Yayinda' : game.status}
                      </span>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </>
  );
}
