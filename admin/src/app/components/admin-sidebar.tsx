'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { label: 'Genel Bakis', href: '/', icon: '◇' },
  { label: 'Game Studio', href: '/games', icon: '◆' },
  { label: 'Yeni Oyun', href: '/games/new', icon: '✦' },
  { label: 'Paket İçe Aktar', href: '/games/import', icon: '◆' },
  { label: 'Sablonlar', href: '/templates', icon: '◈' },
  { label: 'Kategoriler', href: '/categories', icon: '◇' },
  { label: 'Varliklar', href: '/assets', icon: '◇' },
  { label: 'Medya', href: '/media', icon: '◇' },
  { label: 'Yayinlar', href: '/publications', icon: '◇' },
  { label: 'Analitik', href: '/analytics', icon: '◇' },
  { label: 'Audit Log', href: '/audit', icon: '◇' }
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
      <div className="sidebar-footer">AlbaGo Admin v2</div>
    </aside>
  );
}
