'use client';

import type { StudioEventLogItem } from './game-studio-workspace';

interface EventLogProps {
  events: StudioEventLogItem[];
  onClear: () => void;
}

const SEVERITY_COLORS: Record<string, string> = {
  info: 'var(--text-muted)',
  success: 'var(--accent-emerald)',
  warning: 'var(--accent-amber)',
  error: 'var(--accent-danger)'
};

const TYPE_LABELS: Record<string, string> = {
  MOTION: 'Hareket',
  VALIDATION: 'Validasyon',
  SAVE: 'Kaydet',
  PUBLISH: 'Yayın',
  PREVIEW: 'Preview'
};

export function StudioEventLog({ events, onClear }: EventLogProps) {
  return (
    <div className="panel" style={{ padding: 0 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)'
      }}>
        <p className="eyebrow" style={{ margin: 0 }}>Event Log ({events.length})</p>
        {events.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            style={{
              background: 'none', border: '1px solid var(--stroke)',
              color: 'var(--muted)', borderRadius: 6,
              padding: '2px 8px', cursor: 'pointer', fontSize: '0.62rem'
            }}
          >
            Temizle
          </button>
        )}
      </div>

      <div style={{ maxHeight: 220, overflowY: 'auto', padding: '8px 14px' }}>
        {events.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.68rem', textAlign: 'center', padding: '1.5rem 0', margin: 0 }}>
            Henüz event kaydı yok. Mock hareket gönderin.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 4 }}>
            {events.slice(0, 50).map((event) => (
              <div key={event.id} style={{
                display: 'flex', gap: 8, alignItems: 'flex-start',
                padding: '5px 8px', borderRadius: 6,
                background: 'rgba(255,255,255,0.02)',
                fontSize: '0.66rem'
              }}>
                <span style={{
                  display: 'inline-block', padding: '1px 5px', borderRadius: 4,
                  background: 'rgba(255,255,255,0.04)',
                  color: 'var(--text-muted)', fontSize: '0.56rem',
                  fontWeight: 600, flexShrink: 0, marginTop: 1
                }}>
                  {TYPE_LABELS[event.type] ?? event.type}
                </span>
                <span style={{
                  color: SEVERITY_COLORS[event.severity ?? 'info'],
                  fontWeight: 600, flex: 1
                }}>
                  {event.label}
                </span>
                {event.detail && (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.6rem', textAlign: 'right' }}>
                    {event.detail}
                  </span>
                )}
                <span style={{ color: 'var(--text-muted)', fontSize: '0.55rem', flexShrink: 0 }}>
                  {new Date(event.at).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
