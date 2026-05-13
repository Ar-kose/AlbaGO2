'use client';

import { useState, useCallback, useEffect } from 'react';

interface ChecklistItem {
  key: string;
  label: string;
  detail?: string;
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  { key: 'backend_running', label: 'Backend çalışıyor mu?', detail: 'localhost:3000/v1/game-definitions/active yanıt veriyor olmalı.' },
  { key: 'device_connected', label: 'Android debug cihaz bağlı mı?', detail: 'Terminalde adb devices çalıştırın.' },
  { key: 'adb_reverse', label: 'adb reverse yapıldı mı?', detail: 'adb reverse tcp:3000 tcp:3000' },
  { key: 'catalog_refreshed', label: 'Mobil katalog yenilendi mi?', detail: 'Uygulamada Oyunlar ekranında pull-to-refresh yapın.' },
  { key: 'game_visible', label: 'Oyun katalogda göründü mü?', detail: 'Yayınlanan oyun listede görünmeli.' },
  { key: 'game_opened', label: 'Oyun açıldı mı?', detail: 'Detay sayfası ve hazırlık ekranı gösterilmeli.' },
  { key: 'score_produced', label: 'Skor üretildi mi?', detail: 'Oyun içinde en az bir hareketle puan kazanın.' },
  { key: 'result_submitted', label: 'Sonuç backend\'e gönderildi mi?', detail: 'Oyun bitince result submit tetiklenmeli.' }
];

interface MobileTestPanelProps {
  gameId: string;
  isPublished: boolean;
}

function loadChecklistState(gameId: string): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(`mobile-test-checklist-${gameId}`);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveChecklistState(gameId: string, state: Record<string, boolean>) {
  try {
    localStorage.setItem(`mobile-test-checklist-${gameId}`, JSON.stringify(state));
  } catch { /* noop */ }
}

export function StudioMobileTestPanel({ gameId, isPublished }: MobileTestPanelProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setChecked(loadChecklistState(gameId));
  }, [gameId]);

  const toggle = useCallback((key: string) => {
    setChecked((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      saveChecklistState(gameId, next);
      return next;
    });
  }, [gameId]);

  const checkedCount = Object.values(checked).filter(Boolean).length;
  const totalCount = CHECKLIST_ITEMS.length;
  const allChecked = checkedCount === totalCount;

  return (
    <div className="panel">
      <p className="eyebrow" style={{ marginBottom: 8 }}>Mobilde Test Et</p>

      {!isPublished ? (
        <div style={{
          padding: 16, borderRadius: 8,
          background: 'rgba(245,158,11,0.06)',
          border: '1px solid rgba(245,158,11,0.15)',
          textAlign: 'center'
        }}>
          <p style={{ color: 'var(--accent-amber)', fontSize: '0.74rem', fontWeight: 600, margin: '0 0 4px' }}>
            Once yayina alin
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.68rem', margin: 0 }}>
            Oyun yayinlanmadan mobilde gorunmez.
          </p>
        </div>
      ) : (
        <div className="stack" style={{ gap: 10 }}>
          <div style={{
            padding: 12, borderRadius: 8,
            background: 'rgba(52,211,153,0.06)',
            border: '1px solid rgba(52,211,153,0.15)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <span style={{ color: 'var(--accent-emerald)', fontWeight: 700, fontSize: '0.78rem' }}>
                &#10003; Yayinda
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.68rem', margin: 0 }}>
              Oyun aktif katalog endpoint&apos;inde gorunur durumda.
            </p>
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <p style={{ fontWeight: 700, fontSize: '0.72rem', margin: 0, color: 'var(--text-secondary)' }}>
                Mobil cihazda test adimlari
              </p>
              <span style={{
                fontSize: '0.62rem', fontWeight: 700,
                color: allChecked ? 'var(--accent-emerald)' : 'var(--text-muted)',
                padding: '2px 8px', borderRadius: 10,
                background: allChecked ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.03)'
              }}>
                {checkedCount}/{totalCount}
              </span>
            </div>

            <div className="stack" style={{ gap: 2 }}>
              {CHECKLIST_ITEMS.map((item) => {
                const isChecked = checked[item.key] === true;
                return (
                  <label
                    key={item.key}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 8,
                      padding: '6px 8px', borderRadius: 6,
                      cursor: 'pointer',
                      background: isChecked ? 'rgba(52,211,153,0.04)' : 'transparent',
                      transition: 'background 0.15s'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggle(item.key)}
                      style={{
                        marginTop: 2, accentColor: 'var(--accent-emerald)',
                        cursor: 'pointer', flexShrink: 0
                      }}
                    />
                    <div>
                      <span style={{
                        fontSize: '0.68rem', fontWeight: 600,
                        color: isChecked ? 'var(--accent-emerald)' : 'var(--text-secondary)',
                        textDecoration: isChecked ? 'line-through' : 'none'
                      }}>
                        {item.label}
                      </span>
                      {item.detail && (
                        <span style={{
                          display: 'block', fontSize: '0.6rem',
                          color: 'var(--text-muted)', marginTop: 1
                        }}>
                          {item.detail}
                        </span>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>

            {allChecked && (
              <div style={{
                marginTop: 10, padding: '8px 12px', borderRadius: 6,
                background: 'rgba(52,211,153,0.08)',
                border: '1px solid rgba(52,211,153,0.2)',
                textAlign: 'center'
              }}>
                <span style={{ color: 'var(--accent-emerald)', fontSize: '0.66rem', fontWeight: 600 }}>
                  Tum test adimlari tamamlandi. Mobil dogrulama basarili.
                </span>
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 10 }}>
            <p style={{ fontWeight: 700, fontSize: '0.72rem', marginBottom: 6, color: 'var(--text-secondary)' }}>
              Komut Referansi
            </p>
            <div style={{ display: 'grid', gap: 4 }}>
              <code style={{
                display: 'block', padding: '4px 8px', borderRadius: 4,
                background: 'rgba(255,255,255,0.04)', fontSize: '0.62rem',
                color: 'var(--accent-cyan)', wordBreak: 'break-all'
              }}>
                adb reverse tcp:3000 tcp:3000
              </code>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 10 }}>
            <p style={{ fontWeight: 700, fontSize: '0.72rem', marginBottom: 6, color: 'var(--text-secondary)' }}>
              Deep Link / QR
            </p>
            <div style={{
              padding: 12, borderRadius: 8, textAlign: 'center',
              background: 'rgba(255,255,255,0.02)',
              border: '1px dashed var(--border-subtle)'
            }}>
              <span style={{ fontSize: '2rem', opacity: 0.3, display: 'block', marginBottom: 4 }}>📱</span>
              <code style={{
                fontSize: '0.62rem', color: 'var(--accent-cyan)',
                wordBreak: 'break-all'
              }}>
                albago://game/{gameId}
              </code>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.6rem', margin: '6px 0 0' }}>
                QR kod ve deep link sonraki fazda aktif edilecek.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
