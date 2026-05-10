'use client';

import { AdminTopbar } from '../../components/admin-topbar';

const assetThumbs: Array<{ name: string; format: string; template: string; path: string }> = [
  { name: 'thumb_fruit_slash', format: 'PNG', template: 'FRUIT_SLASH', path: '/game_covers/thumb_fruit_slash.png' },
  { name: 'thumb_dodge_run', format: 'PNG', template: 'DODGE_RUN', path: '/game_covers/thumb_dodge_run.png' },
  { name: 'thumb_fit_challenge', format: 'PNG', template: 'FIT_CHALLENGE', path: '/game_covers/thumb_fit_challenge.png' },
  { name: 'thumb_matematik_macerasi', format: 'PNG', template: 'TARGET_HIT', path: '/game_covers/thumb_matematik_macerasi.png' },
  { name: 'game_neon_rush', format: 'PNG', template: 'ENDLESS_RUNNER', path: '/game_covers/game_neon_rush.png' },
  { name: 'logo_albago', format: 'PNG', template: 'BRAND', path: '/game_covers/logo_albago.png' }
];

export default function MediaPage() {
  return (
    <>
      <AdminTopbar title="Medya" subtitle="Asset galerisi — oyun kapaklari, ikonlar ve dosyalar." />
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
        {assetThumbs.map((asset) => (
          <article key={asset.name} className="panel stack" style={{ padding: '0.75rem', textAlign: 'center' }}>
            <div style={{ background: 'var(--panel)', borderRadius: '12px', padding: '1rem', marginBottom: '0.75rem' }}>
              <img
                src={asset.path}
                alt={asset.name}
                style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px' }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
            <strong style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.25rem' }}>{asset.name}</strong>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
              <span className="badge" style={{ background: 'var(--cyan)', fontSize: '0.7rem' }}>{asset.format}</span>
              <span className="badge" style={{ background: 'var(--purple)', fontSize: '0.7rem' }}>{asset.template}</span>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
