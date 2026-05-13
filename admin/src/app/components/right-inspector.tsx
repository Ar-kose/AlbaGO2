'use client';

interface AuditEvent {
  id: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
}

interface ValidationResult {
  errors: Array<{ scope?: string; code?: string; message?: string; path?: string }>;
  warnings: Array<{ scope?: string; code?: string; message?: string; path?: string }>;
}

interface RightInspectorProps {
  selectedGame: {
    title?: string;
    status?: string;
    template?: string;
    version?: number;
    supportedMotions?: string[];
  } | null;
  validationResult: ValidationResult | null;
  serverErrors: string[];
  auditLogs: AuditEvent[];
}

export function RightInspector({
  selectedGame,
  validationResult,
  serverErrors,
  auditLogs
}: RightInspectorProps) {
  return (
    <aside className="right-inspector">
      {/* Status Card */}
      <div className="status-card">
        <p className="eyebrow" style={{ marginBottom: 12 }}>Status</p>

        <div className="status-row">
          <span className="label">Durum</span>
          {selectedGame ? (
            selectedGame.status === 'PUBLISHED'
              ? <span className="badge-success">Published</span>
              : <span className="badge-draft">{selectedGame.status || 'DRAFT'}</span>
          ) : (
            <span className="badge-draft">Yeni Taslak</span>
          )}
        </div>

        <div className="status-row">
          <span className="label">Template</span>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>
            {selectedGame?.template || '—'}
          </span>
        </div>

        <div className="status-row">
          <span className="label">Versiyon</span>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>
            {selectedGame?.version != null ? `v${selectedGame.version}` : '—'}
          </span>
        </div>

        <div className="status-row">
          <span className="label">Mobile</span>
          {selectedGame?.supportedMotions?.length ? (
            <span className="badge-info">Supported</span>
          ) : (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}>—</span>
          )}
        </div>
      </div>

      {/* Preview Card */}
      <div className="status-card">
        <p className="eyebrow" style={{ marginBottom: 12 }}>Preview</p>
        <div className="preview-placeholder">
          <span className="icon">&#9654;</span>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: 0 }}>
            {selectedGame
              ? 'Android runtime uzerinde canli preview'
              : 'Oyun secildiginde preview aktif olur'}
          </p>
        </div>
      </div>

      {/* Validation Card */}
      <div className={`validation-summary ${!validationResult && serverErrors.length === 0
          ? 'validation-pass'
          : (validationResult?.errors?.length ?? 0) > 0
            ? 'validation-fail'
            : 'validation-warn'
        }`}>
        <p className="eyebrow" style={{ marginBottom: 8 }}>Validation</p>

        {!validationResult && serverErrors.length === 0 ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--accent-emerald)', fontSize: '1.1rem' }}>&#10003;</span>
              <span style={{ color: 'var(--accent-emerald)', fontWeight: 700, fontSize: '0.82rem' }}>
                Publish-ready
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', margin: '4px 0 0' }}>
              0 errors · 0 warnings
            </p>
          </>
        ) : validationResult ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              {validationResult.errors.length === 0 ? (
                <>
                  <span style={{ color: 'var(--accent-emerald)', fontSize: '1.1rem' }}>&#10003;</span>
                  <span style={{ color: 'var(--accent-emerald)', fontWeight: 700, fontSize: '0.82rem' }}>
                    Publish-ready
                  </span>
                </>
              ) : (
                <>
                  <span style={{ color: 'var(--accent-danger)', fontSize: '1.1rem' }}>&#10007;</span>
                  <span style={{ color: 'var(--accent-danger)', fontWeight: 700, fontSize: '0.82rem' }}>
                    Publish blocked
                  </span>
                </>
              )}
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', margin: '0 0 8px' }}>
              {validationResult.errors.length} errors · {validationResult.warnings.length} warnings
            </p>

            {validationResult.errors.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <p style={{ color: 'var(--accent-danger)', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                  Errors
                </p>
                {validationResult.errors.slice(0, 4).map((e, i) => (
                  <div key={i} style={{
                    background: 'rgba(251,113,133,0.06)', borderRadius: 8,
                    padding: '0.4rem 0.6rem', marginBottom: 4, fontSize: '0.7rem',
                    border: '1px solid rgba(251,113,133,0.12)'
                  }}>
                    <span style={{ color: 'var(--accent-danger)', fontWeight: 600 }}>{e.scope}</span>
                    {' '}<span style={{ color: 'var(--text-muted)' }}>{e.code}</span>
                    <p style={{ margin: '2px 0 0', color: 'var(--text-secondary)' }}>{e.message}</p>
                  </div>
                ))}
                {validationResult.errors.length > 4 && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.68rem', marginTop: 4 }}>
                    +{validationResult.errors.length - 4} daha
                  </p>
                )}
              </div>
            )}

            {validationResult.warnings.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <p style={{ color: 'var(--accent-amber)', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                  Warnings
                </p>
                {validationResult.warnings.slice(0, 3).map((w, i) => (
                  <div key={i} style={{
                    background: 'rgba(245,158,11,0.06)', borderRadius: 8,
                    padding: '0.35rem 0.6rem', marginBottom: 4, fontSize: '0.7rem',
                    border: '1px solid rgba(245,158,11,0.12)'
                  }}>
                    <span style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>{w.scope}</span>
                    {' '}<span style={{ color: 'var(--text-muted)' }}>{w.code}</span>
                    <p style={{ margin: '2px 0 0', color: 'var(--text-secondary)' }}>{w.message}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : serverErrors.length > 0 ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ color: 'var(--accent-danger)', fontSize: '1.1rem' }}>&#10007;</span>
              <span style={{ color: 'var(--accent-danger)', fontWeight: 700, fontSize: '0.82rem' }}>
                Server errors
              </span>
            </div>
            <ul className="error-list">
              {serverErrors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </>
        ) : null}
      </div>

      {/* Audit Log Card */}
      <div className="status-card">
        <p className="eyebrow" style={{ marginBottom: 12 }}>Audit Log</p>
        {auditLogs.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.76rem', margin: 0, textAlign: 'center', padding: '1rem 0' }}>
            Henuz hareket kaydi yok
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {auditLogs.slice(0, 5).map((event) => (
              <div key={event.id} style={{
                padding: '0.5rem 0.6rem',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.7rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, marginBottom: 2 }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                    {event.action}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.64rem' }}>
                    {new Date(event.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.66rem' }}>
                  {event.entityType} · {event.entityId?.slice(0, 12)}...
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
