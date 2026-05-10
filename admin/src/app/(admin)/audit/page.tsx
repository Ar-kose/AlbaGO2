'use client';

import { useEffect, useState } from 'react';
import { AdminTopbar } from '../../components/admin-topbar';
import { listAuditLogs } from '../../../lib/alba-api';

export default function AuditPage() {
  const [auditLogs, setAuditLogs] = useState<Array<{
    id: string; actorId: string; action: string; entityType: string; entityId: string; createdAt: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    listAuditLogs()
      .then(setAuditLogs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter
    ? auditLogs.filter((log) =>
        log.action.toLowerCase().includes(filter.toLowerCase()) ||
        log.entityType.toLowerCase().includes(filter.toLowerCase()) ||
        log.actorId.toLowerCase().includes(filter.toLowerCase())
      )
    : auditLogs;

  const actionColors: Record<string, string> = {
    CREATE: 'var(--cyan)',
    UPDATE: 'var(--purple)',
    PUBLISH: '#22c55e',
    ROLLBACK: '#f59e0b',
    DELETE: '#ef4444'
  };

  return (
    <>
      <AdminTopbar title="Audit Log" subtitle={`${auditLogs.length} kayit — tum admin islemlerinin zamansal kaydi.`} />
      <div style={{ marginBottom: '1rem' }}>
        <input
          className="field"
          style={{ width: '100%', maxWidth: '400px', padding: '0.6rem 1rem', borderRadius: '10px', border: '1px solid var(--stroke)', background: 'var(--panel)', color: 'var(--ink)' }}
          placeholder="Aksiyon, entity veya actor ile filtrele..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      {loading ? (
        <div className="loading-spinner" />
      ) : filtered.length === 0 ? (
        <article className="panel stack" style={{ textAlign: 'center', padding: '3rem' }}>
          <p className="muted">{filter ? 'Filtreye uyan kayit yok.' : 'Henuz audit kaydi yok.'}</p>
        </article>
      ) : (
        <article className="panel stack" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--stroke)' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--muted)' }}>Zaman</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--muted)' }}>Aksiyon</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--muted)' }}>Entity</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--muted)' }}>Aktor</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--stroke)' }}>
                    <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                      {new Date(log.createdAt).toLocaleString('tr-TR')}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span className="badge" style={{ background: actionColors[log.action] ?? 'var(--purple)', fontSize: '0.7rem' }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ fontSize: '0.8rem' }}>{log.entityType}</span>
                      <span className="muted" style={{ fontSize: '0.7rem', display: 'block' }}>{log.entityId?.slice(0, 8)}...</span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span className="muted" style={{ fontSize: '0.8rem' }}>{log.actorId}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}
    </>
  );
}
