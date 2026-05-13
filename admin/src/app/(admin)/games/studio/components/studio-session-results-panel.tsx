'use client';

import { useState, useCallback } from 'react';
import type { GameSessionResultSummary } from '../../../../../lib/alba-api';
import { listGameSessionsByGame } from '../../../../../lib/alba-api';

type LoadState = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

interface StudioSessionResultsPanelProps {
  gameDefinitionId: string;
  isPublished: boolean;
}

export function StudioSessionResultsPanel({ gameDefinitionId, isPublished }: StudioSessionResultsPanelProps) {
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [results, setResults] = useState<GameSessionResultSummary[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const fetchResults = useCallback(async () => {
    setLoadState('loading');
    setErrorMessage('');
    try {
      const items = await listGameSessionsByGame(gameDefinitionId);
      if (items.length === 0) {
        setLoadState('empty');
        setResults([]);
      } else {
        setLoadState('ready');
        setResults(items);
      }
    } catch (err: any) {
      setLoadState('error');
      setErrorMessage(err?.message ?? 'Backend erisilemedi.');
    }
  }, [gameDefinitionId]);

  return (
    <div className="panel" style={{ padding: 0 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)'
      }}>
        <p className="eyebrow" style={{ margin: 0 }}>Mobil Oyun Oturumlari</p>
        <button
          type="button"
          onClick={fetchResults}
          disabled={loadState === 'loading'}
          style={{
            background: 'none', border: '1px solid var(--stroke)',
            color: 'var(--text-secondary)', borderRadius: 6,
            padding: '3px 10px', cursor: loadState === 'loading' ? 'not-allowed' : 'pointer',
            fontSize: '0.62rem', opacity: loadState === 'loading' ? 0.5 : 1
          }}
        >
          {loadState === 'loading' ? 'Yukleniyor...' : 'Yenile'}
        </button>
      </div>

      <div style={{ maxHeight: 260, overflowY: 'auto', padding: '8px 14px' }}>
        {!isPublished && loadState === 'idle' && (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.68rem', margin: 0 }}>
              Oyun henuz yayinlanmamis. Yayinlandiktan sonra mobil oturumlari gorebilirsiniz.
            </p>
          </div>
        )}

        {isPublished && loadState === 'idle' && (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.68rem', margin: '0 0 8px' }}>
              Mobil oturum verilerini gormek icin &quot;Yenile&quot;ye tiklayin.
            </p>
          </div>
        )}

        {loadState === 'loading' && (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Yukleniyor...</span>
          </div>
        )}

        {loadState === 'empty' && (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <span style={{ fontSize: '1.5rem', opacity: 0.4, display: 'block', marginBottom: 6 }}>📊</span>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.68rem', margin: 0 }}>
              Bu oyun henuz mobilde oynanmamis.
            </p>
          </div>
        )}

        {loadState === 'error' && (
          <div style={{
            textAlign: 'center', padding: '1.5rem 0',
            color: 'var(--accent-danger)'
          }}>
            <p style={{ fontSize: '0.68rem', margin: 0, fontWeight: 600 }}>Hata</p>
            <p style={{ fontSize: '0.62rem', margin: '4px 0 0', color: 'var(--text-muted)' }}>
              {errorMessage || 'Backend erisilemedi.'}
            </p>
            <button
              type="button"
              onClick={fetchResults}
              style={{
                marginTop: 8, background: 'none', border: '1px solid var(--accent-danger)',
                color: 'var(--accent-danger)', borderRadius: 6,
                padding: '2px 8px', cursor: 'pointer', fontSize: '0.6rem'
              }}
            >
              Tekrar dene
            </button>
          </div>
        )}

        {loadState === 'ready' && (
          <div style={{ display: 'grid', gap: 4 }}>
            {results.map((session) => (
              <div key={session.id} style={{
                display: 'grid', gridTemplateColumns: '1fr auto auto',
                gap: 8, alignItems: 'center',
                padding: '6px 8px', borderRadius: 6,
                background: 'rgba(255,255,255,0.02)',
                fontSize: '0.64rem'
              }}>
                <div style={{ display: 'grid', gap: 1 }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Skor: {session.score ?? '-'}
                    {session.combo ? ` · x${session.combo}` : ''}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.58rem' }}>
                    {session.createdAt ? new Date(session.createdAt).toLocaleString('tr-TR') : '-'}
                    {session.durationSec ? ` · ${session.durationSec}s` : ''}
                  </span>
                </div>
                <span style={{
                  fontSize: '0.56rem', padding: '1px 5px', borderRadius: 4,
                  background: session.status === 'completed' ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.04)',
                  color: session.status === 'completed' ? 'var(--accent-emerald)' : 'var(--text-muted)',
                  fontWeight: 600
                }}>
                  {session.status === 'completed' ? 'Tamamlandi' : (session.status ?? '-')}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.56rem' }}>
                  {session.deviceId ? '📱' : '🌐'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
