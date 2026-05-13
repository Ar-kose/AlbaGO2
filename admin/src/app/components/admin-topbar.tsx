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
        {subtitle && <p>{subtitle}</p>}
        {message && <p style={{ color: 'var(--accent-cyan)' }}>{message}</p>}
      </div>
      <div className="badge-row">
        <span className="badge-info">Backend connected</span>
        <div className="profile-pill">
          <span className="profile-dot" />
          <div>
            <strong style={{ fontSize: '0.8rem' }}>Yonetici</strong>
            <p style={{ margin: 0, fontSize: '0.68rem' }}>Admin</p>
          </div>
        </div>
      </div>
    </div>
  );
}
