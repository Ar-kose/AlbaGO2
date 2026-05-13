'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { validateGamePackage, importGamePackage, PackageValidationResult } from '../../../../lib/game-package-api';

const SAMPLE_PACKAGE = {
  schemaVersion: '1.0',
  packageType: 'ALBAGO_GAME_PACKAGE',
  game: {
    title: 'Meyve Kesme Refleks',
    template: 'FRUIT_SLASH',
    category: 'FUN',
    orientation: 'LANDSCAPE',
    cameraRequirement: 'HAND_TARGET',
    durationSec: 60,
    description: 'Jumping jack ve squat ile meyveleri kes!'
  },
  assets: {
    cover: 'https://albago.tr/assets/covers/test.png',
    background: 'https://albago.tr/assets/backgrounds/fruit-bg.png'
  },
  rules: [
    { motion: 'JUMPING_JACK', event: 'REP_COUNTED', points: 15, cooldownMs: 400 },
    { motion: 'SQUAT', event: 'REP_COUNTED', points: 10, cooldownMs: 500 },
    { motion: 'SQUAT', event: 'BAD_FORM', points: -5, cooldownMs: 250 }
  ],
  scoring: {
    targetScore: 420,
    rewardType: 'STAR',
    rewardAmount: 3
  }
};

export default function ImportPackagePage() {
  const router = useRouter();
  const [jsonText, setJsonText] = useState('');
  const [state, setState] = useState<string>('idle');
  const [validation, setValidation] = useState<PackageValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);

  const handleValidate = async () => {
    setState('parsing');
    setError(null);
    setValidation(null);

    let pkg: unknown;
    try {
      pkg = JSON.parse(jsonText);
    } catch {
      setState('invalid_json');
      setError('JSON okunamadı. Lütfen AI ajanının verdiği final JSON bölümünü eksiksiz yükle.');
      return;
    }

    try {
      const result = await validateGamePackage(pkg);
      setValidation(result);
      setState(result.valid ? 'ready_to_create_draft' : 'schema_invalid');
    } catch (err: any) {
      setState('error');
      setError(err.message ?? 'Doğrulama başarısız.');
    }
  };

  const handleImport = async () => {
    setState('creating_draft');
    setError(null);

    let pkg: unknown;
    try {
      pkg = JSON.parse(jsonText);
    } catch {
      setState('invalid_json');
      return;
    }

    try {
      const result = await importGamePackage(pkg);
      if (result.imported && result.gameDefinitionId) {
        setDraftId(result.gameDefinitionId);
        setState('draft_created');
      } else {
        setValidation(result.validation ?? null);
        setState('schema_invalid');
      }
    } catch (err: any) {
      setState('error');
      setError(err.message ?? 'İçe aktarma başarısız.');
    }
  };

  const loadSample = () => {
    setJsonText(JSON.stringify(SAMPLE_PACKAGE, null, 2));
    setState('idle');
    setValidation(null);
    setError(null);
  };

  const categoryLabel = (cat: string) =>
    cat === 'FUN' ? 'Eğlence' : cat === 'SPORT' ? 'Spor' : cat === 'EDUCATION' ? 'Eğitim' : cat;

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Oyun Paketi İçe Aktar</h1>
          <p className="muted">AI Game Builder Agent tarafından üretilen ALBAGO_GAME_PACKAGE JSON paketini içe aktar</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="ghost-button" style={{ fontSize: '0.72rem', minWidth: 'auto' }} onClick={loadSample}>
            Örnek Paket Yükle
          </button>
        </div>
      </div>

      <div className="row" style={{ gap: 'var(--space-xl)' }}>
        {/* Left: JSON Input */}
        <div>
          <div className="panel" style={{ marginBottom: 16 }}>
            <div className="eyebrow">JSON Paket</div>
            <textarea
              value={jsonText}
              onChange={(e) => { setJsonText(e.target.value); setState('idle'); setValidation(null); setError(null); }}
              placeholder='{ "schemaVersion": "1.0", "packageType": "ALBAGO_GAME_PACKAGE", ... }'
              rows={20}
              style={{
                width: '100%', background: 'rgba(5,6,14,0.8)', color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)',
                padding: '12px 14px', fontFamily: 'monospace', fontSize: '0.78rem',
                resize: 'vertical'
              }}
            />
            <div className="button-row" style={{ marginTop: 12 }}>
              <button
                className="secondary-button"
                style={{ fontSize: '0.78rem' }}
                disabled={!jsonText.trim() || state === 'creating_draft'}
                onClick={handleValidate}
              >
                Doğrula
              </button>
              <button
                className="primary-button"
                style={{ fontSize: '0.78rem' }}
                disabled={state !== 'ready_to_create_draft'}
                onClick={handleImport}
              >
                {state === 'creating_draft' ? 'Oluşturuluyor...' : 'Draft Oluştur'}
              </button>
            </div>

            {error && (
              <div className="validation-fail" style={{ marginTop: 12, padding: '8px 14px', borderRadius: 10, fontSize: '0.82rem' }}>
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Right: Validation Result */}
        <div>
          {state === 'idle' && !validation && (
            <div className="panel">
              <div className="empty-state">
                <span style={{ fontSize: '2rem', opacity: 0.4 }}>📦</span>
                <p className="muted" style={{ fontSize: '0.82rem' }}>
                  JSON paketini yapıştırın ve Doğrula'ya basın.
                </p>
              </div>
            </div>
          )}

          {validation && (
            <div className="stack">
              {/* Summary */}
              {validation.summary && (
                <div className="panel">
                  <div className="eyebrow">Paket Özeti</div>
                  <div style={{ display: 'grid', gap: 6, fontSize: '0.78rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className="muted">Başlık</span>
                      <span style={{ fontWeight: 600 }}>{validation.summary.title}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className="muted">Template</span>
                      <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>{validation.summary.template}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className="muted">Kategori</span>
                      <span>{categoryLabel(validation.summary.category)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className="muted">Orientation</span>
                      <span>{validation.summary.orientation}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className="muted">Süre</span>
                      <span>{validation.summary.durationSec}s</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Runtime Compatibility */}
              {validation.runtimeCompatibility && (
                <div className={`validation-summary ${validation.runtimeCompatibility.templateSupported ? 'validation-pass' : 'validation-fail'}`}>
                  <p style={{ fontWeight: 700, fontSize: '0.78rem', margin: '0 0 6px' }}>Runtime Uyumluluğu</p>
                  <div style={{ fontSize: '0.68rem' }}>
                    <div>Template: {validation.runtimeCompatibility.templateSupported ? '✓ Destekli' : '✕ Desteklenmiyor'}</div>
                    <div>Hareketler: {validation.runtimeCompatibility.motionsSupported ? '✓ Destekli' : '✕ Uyumsuz'}</div>
                    <div>Kurallar: {validation.runtimeCompatibility.rulesSupported ? '✓ Destekli' : '✕ Uyumsuz'}</div>
                  </div>
                </div>
              )}

              {/* Errors */}
              {validation.errors.length > 0 && (
                <div className="validation-summary validation-fail">
                  <p style={{ fontWeight: 700, fontSize: '0.78rem', margin: '0 0 8px', color: 'var(--accent-danger)' }}>
                    {validation.errors.length} Hata
                  </p>
                  {validation.errors.map((e, i) => (
                    <div key={i} style={{ marginBottom: 6, fontSize: '0.72rem' }}>
                      <span style={{ color: 'var(--accent-danger)', fontWeight: 600 }}>{e.code}</span>
                      <span className="muted" style={{ marginLeft: 6 }}>{e.field}</span>
                      <p style={{ margin: '2px 0 0', color: 'var(--text-secondary)' }}>{e.message}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Warnings */}
              {validation.warnings.length > 0 && (
                <div className="validation-summary validation-warn">
                  <p style={{ fontWeight: 700, fontSize: '0.78rem', margin: '0 0 6px' }}>
                    {validation.warnings.length} Uyarı
                  </p>
                  {validation.warnings.map((w, i) => (
                    <div key={i} style={{ fontSize: '0.7rem', color: 'var(--accent-amber)', marginBottom: 3 }}>
                      {w.message}
                    </div>
                  ))}
                </div>
              )}

              {validation.valid && (
                <div className="validation-summary validation-pass">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: 'var(--accent-emerald)', fontSize: '1.1rem' }}>&#10003;</span>
                    <span style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>Doğrulama başarılı — yayına hazır</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Draft Created */}
          {state === 'draft_created' && draftId && (
            <div className="panel panel-glow" style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ color: 'var(--accent-emerald)', fontSize: '1.3rem' }}>&#10003;</span>
                <span style={{ fontWeight: 700, color: 'var(--accent-emerald)' }}>Draft oluşturuldu!</span>
              </div>
              <p className="muted" style={{ fontSize: '0.82rem', margin: '0 0 12px' }}>
                Oyun DRAFT olarak kaydedildi. Game Studio'da preview/test/publish yapabilirsin.
              </p>
              <button
                className="primary-button"
                style={{ width: '100%' }}
                onClick={() => router.push(`/games/${draftId}/studio`)}
              >
                Studio'da Aç
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
