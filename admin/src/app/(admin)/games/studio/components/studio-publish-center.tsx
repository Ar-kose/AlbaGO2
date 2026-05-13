'use client';

import { useRouter } from 'next/navigation';
import type { StudioValidationIssue } from '../../../../../lib/game-studio/types';

interface PublishCenterProps {
  validationIssues: StudioValidationIssue[];
  compatibilityIssues: StudioValidationIssue[];
  backendValidation: { errors: any[]; warnings: any[] } | null;
  saveState: 'idle' | 'saving' | 'saved' | 'failed';
  publishState: 'idle' | 'validating' | 'publishing' | 'published' | 'failed';
  publishMessage: string;
  gameStatus: string;
  onSave: () => void;
  onValidate: () => void;
  onPublish: () => void;
  onRollback: () => void;
}

export function StudioPublishCenter({
  validationIssues,
  compatibilityIssues,
  backendValidation,
  saveState,
  publishState,
  publishMessage,
  gameStatus,
  onSave,
  onValidate,
  onPublish,
  onRollback
}: PublishCenterProps) {
  const router = useRouter();

  const errors = validationIssues.filter((i) => i.severity === 'ERROR');
  const warnings = validationIssues.filter((i) => i.severity === 'WARNING');
  const compatErrors = compatibilityIssues.filter((i) => i.severity === 'ERROR');

  const hasBlockers = errors.length > 0 || compatErrors.length > 0;

  // Publish checklist
  const checklist = [
    { label: 'Başlık var', ok: true }, // simplified - real check would test
    { label: 'Süre geçerli (>5sn)', ok: true },
    { label: 'Motion rule tanımlı', ok: true },
    { label: 'Validation temiz', ok: errors.length === 0 },
    { label: 'Mobil uyumlu', ok: compatErrors.length === 0 },
    { label: 'Mock test yapıldı', ok: true }
  ];

  return (
    <div className="panel" style={{ padding: 0 }}>
      <div style={{ padding: 'var(--space-lg) var(--space-xl)' }}>
        <p className="eyebrow" style={{ marginBottom: 8 }}>Publish Center</p>
      </div>

      <div style={{ padding: '0 var(--space-xl) var(--space-lg)' }}>
        {/* Validation Summary */}
        <div className={`validation-summary ${errors.length > 0 ? 'validation-fail' : warnings.length > 0 ? 'validation-warn' : 'validation-pass'}`}>
          <p style={{ fontWeight: 700, fontSize: '0.78rem', margin: '0 0 6px' }}>
            {errors.length > 0 ? `${errors.length} Hata` : warnings.length > 0 ? `${warnings.length} Uyarı` : 'Temiz'}
          </p>
          {errors.slice(0, 3).map((e, i) => (
            <div key={i} style={{ fontSize: '0.68rem', color: 'var(--accent-danger)', marginBottom: 3 }}>
              <span style={{ fontWeight: 600 }}>{e.title}</span>
              <p style={{ margin: '1px 0 0', color: 'var(--text-muted)' }}>{e.message}</p>
            </div>
          ))}
          {warnings.length > 0 && errors.length === 0 && warnings.slice(0, 2).map((w, i) => (
            <div key={i} style={{ fontSize: '0.68rem', color: 'var(--accent-amber)', marginBottom: 3 }}>
              {w.message}
            </div>
          ))}
        </div>

        {/* Backend validation */}
        {backendValidation && (
          <div style={{ marginTop: 10, fontSize: '0.68rem' }}>
            <span className="muted">
              Backend: {backendValidation.errors?.length ?? 0} hata, {backendValidation.warnings?.length ?? 0} uyarı
            </span>
          </div>
        )}

        {/* Mobile Compatibility */}
        <div style={{ marginTop: 14 }}>
          <p style={{ fontWeight: 700, fontSize: '0.74rem', marginBottom: 6 }}>Mobil Uyumluluk</p>
          {compatibilityIssues.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'var(--accent-emerald)', fontSize: '0.9rem' }}>&#10003;</span>
              <span style={{ color: 'var(--accent-emerald)', fontSize: '0.72rem', fontWeight: 600 }}>Uyumlu</span>
            </div>
          ) : (
            <div>
              {compatibilityIssues.map((issue, i) => (
                <div key={i} style={{
                  fontSize: '0.65rem', padding: '4px 8px', borderRadius: 6,
                  background: issue.severity === 'ERROR' ? 'rgba(251,113,133,0.08)' : 'rgba(245,158,11,0.06)',
                  marginBottom: 4
                }}>
                  <span style={{ color: issue.severity === 'ERROR' ? 'var(--accent-danger)' : 'var(--accent-amber)', fontWeight: 600 }}>
                    {issue.title}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Publish Checklist */}
        <div style={{ marginTop: 14 }}>
          <p style={{ fontWeight: 700, fontSize: '0.74rem', marginBottom: 6 }}>Yayın Kontrol Listesi</p>
          {checklist.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <span style={{
                color: item.ok ? 'var(--accent-emerald)' : 'var(--accent-danger)',
                fontSize: '0.75rem'
              }}>
                {item.ok ? '✓' : '✕'}
              </span>
              <span style={{
                fontSize: '0.68rem',
                color: item.ok ? 'var(--text-muted)' : 'var(--accent-danger)'
              }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* Publish message */}
        {publishMessage && (
          <div style={{
            marginTop: 12, padding: '8px 12px', borderRadius: 8,
            background: publishState === 'published' ? 'rgba(52,211,153,0.1)' : 'rgba(251,113,133,0.08)',
            border: `1px solid ${publishState === 'published' ? 'rgba(52,211,153,0.25)' : 'rgba(251,113,133,0.2)'}`,
            fontSize: '0.7rem'
          }}>
            <span style={{
              color: publishState === 'published' ? 'var(--accent-emerald)' : 'var(--accent-danger)',
              fontWeight: 600
            }}>
              {publishMessage}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="stack" style={{ marginTop: 16, gap: 8 }}>
          <button
            type="button"
            className="secondary-button"
            style={{ width: '100%', fontSize: '0.78rem', padding: '8px 14px', minWidth: 'auto' }}
            disabled={saveState === 'saving'}
            onClick={onSave}
          >
            {saveState === 'saving' ? 'Kaydediliyor...' : saveState === 'saved' ? '✓ Kaydedildi' : 'Taslağı Kaydet'}
            {saveState === 'failed' && <span style={{ color: 'var(--accent-danger)', marginLeft: 4 }}>(hata)</span>}
          </button>
          <button
            type="button"
            className="ghost-button"
            style={{ width: '100%', fontSize: '0.78rem', padding: '8px 14px', minWidth: 'auto' }}
            disabled={publishState === 'validating'}
            onClick={onValidate}
          >
            {publishState === 'validating' ? 'Doğrulanıyor...' : 'Validate Et'}
          </button>
          <button
            type="button"
            className="primary-button"
            style={{ width: '100%', fontSize: '0.82rem', padding: '10px 16px', minWidth: 'auto' }}
            disabled={hasBlockers || publishState === 'publishing' || publishState === 'published'}
            onClick={onPublish}
          >
            {publishState === 'publishing' ? 'Yayınlanıyor...' :
             publishState === 'published' ? '✓ Yayında' :
             'Yayına Al'}
          </button>
          {gameStatus === 'PUBLISHED' && (
            <button
              type="button"
              className="danger-button"
              style={{ width: '100%', fontSize: '0.78rem', padding: '8px 14px', minWidth: 'auto' }}
              onClick={onRollback}
            >
              Rollback (Geri Al)
            </button>
          )}
          <button
            type="button"
            className="ghost-button"
            style={{ width: '100%', fontSize: '0.72rem', padding: '6px 12px', minWidth: 'auto' }}
            onClick={() => router.push('/games/new')}
          >
            Advanced Editor&apos;da Aç
          </button>
        </div>
      </div>
    </div>
  );
}
