'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { label: 'Genel Bakis', href: '/', icon: '1' },
  { label: 'Oyunlar', href: '/games', icon: '2' },
  { label: 'Sablonlar', href: '/templates', icon: '3' },
  { label: 'Kategoriler', href: '/categories', icon: '4' },
  { label: 'Medya', href: '/media', icon: '5' },
  { label: 'Yayinlar', href: '/publications', icon: '6' },
  { label: 'Analitik', href: '/analytics', icon: '7' },
  { label: 'Audit Log', href: '/audit', icon: '8' }
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="brand">
        <img src="/game_covers/logo_albago.png" alt="AlbaGO" />
        <span>Content Console</span>
      </div>
      <nav className="side-nav" aria-label="Admin navigasyonu">
        {navItems.map((item) => {
          const isActive = item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`nav-item${isActive ? ' nav-item-active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <p className="muted">AlbaGO Admin v2</p>
    </aside>
  );
}
