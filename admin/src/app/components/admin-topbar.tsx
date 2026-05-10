'use client';

interface AdminTopbarProps {
  title: string;
  subtitle?: string;
  message?: string;
}

export function AdminTopbar({ title, subtitle, message }: AdminTopbarProps) {
  return (
    <div className="topbar">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
        {message && <p className="muted" style={{ color: 'var(--cyan)' }}>{message}</p>}
      </div>
      <div className="profile-pill">
        <span className="profile-dot" />
        <div>
          <strong>Yonetici</strong>
          <p className="muted">Admin</p>
        </div>
      </div>
    </div>
  );
}
