'use client';

import Link from 'next/link';
import { AdminTopbar } from '../../components/admin-topbar';
import { publicDemoTemplates, templateLabel } from '../../../lib/alba-api';

const templateInfo: Record<string, { description: string; accent: string; icon: string }> = {
  FRUIT_SLASH: { description: 'Jumping jack ile meyveleri kes, squat ile bonus hedefi patlat. En populer demo.', accent: '#ff7a45', icon: '🍉' },
  DODGE_RUN: { description: 'Squat ile alttan gec, jumping jack ile zipla, jump rope ile enerji topla.', accent: '#3b82f6', icon: '🏃' },
  FIT_CHALLENGE: { description: 'Squat, jumping jack, jump rope ve plank — 4 asamali spor programi.', accent: '#10b981', icon: '💪' },
  SCENE_PLAY: { description: 'Panelden gelen komutlari hareketle cevapla. Deve Cuce gibi oyunlar icin.', accent: '#f59e0b', icon: '🎭' }
};

export default function TemplatesPage() {
  return (
    <>
      <AdminTopbar title="Sablonlar" subtitle="Hazir oyun sablonlarini incele ve yeni oyun olustur." />
      <section className="panel-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {publicDemoTemplates.map((template) => {
          const info = templateInfo[template] ?? { description: '', accent: 'var(--purple)', icon: '🎮' };
          return (
            <article key={template} className="panel panel-glow stack" style={{ borderColor: info.accent }}>
              <div style={{ fontSize: '2.5rem', textAlign: 'center', padding: '1rem 0' }}>{info.icon}</div>
              <h2 style={{ margin: 0 }}>{templateLabel(template)}</h2>
              <p className="muted" style={{ minHeight: '3rem' }}>{info.description}</p>
              <span className="badge" style={{ background: info.accent, alignSelf: 'flex-start' }}>{template}</span>
              <Link href={`/games?template=${template}`} className="primary-button" style={{ marginTop: '0.5rem', textAlign: 'center', display: 'block' }}>
                Bu sablondan olustur
              </Link>
            </article>
          );
        })}
      </section>
    </>
  );
}
