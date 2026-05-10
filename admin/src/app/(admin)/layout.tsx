'use client';

import { AdminSidebar } from '../components/admin-sidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="shell">
      <div className="admin-shell">
        <AdminSidebar />
        <section className="admin-main">
          {children}
        </section>
      </div>
    </main>
  );
}
