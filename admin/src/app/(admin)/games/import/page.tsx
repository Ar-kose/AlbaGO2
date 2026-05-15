'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { validateGamePackage, importGamePackage, PackageValidationResult } from '../../../../lib/game-package-api';

// ---- Template Reference ----
interface TemplateInfo {
  key: string;
  label: string;
  category: string;
  cameraRequirements: string[];
  requiredFields: string[];
  optionalFields: string[];
  description: string;
  samplePackage: unknown;
}

const TEMPLATE_REFERENCE: TemplateInfo[] = [
  {
    key: 'FRUIT_SLASH',
    label: 'Meyve Kesme',
    category: 'FUN',
    cameraRequirements: ['HAND_TARGET', 'UPPER_BODY', 'FULL_BODY'],
    requiredFields: ['title', 'template', 'category', 'orientation', 'cameraRequirement', 'durationSec', 'assets.cover', 'rules (en az bir hareket)'],
    optionalFields: ['description', 'assets.background', 'assets.items', 'scoring'],
    description: 'El veya vücut hareketleriyle ekrandaki meyveleri kes. En esnek template — tüm kamera modlarını destekler.',
    samplePackage: {
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
      scoring: { targetScore: 420, rewardType: 'STAR', rewardAmount: 3 }
    }
  },
  {
    key: 'DODGE_RUN',
    label: 'Engelden Kaçış',
    category: 'FUN',
    cameraRequirements: ['FULL_BODY'],
    requiredFields: ['title', 'template', 'category', 'orientation', 'cameraRequirement', 'durationSec', 'assets.cover', 'rules'],
    optionalFields: ['description', 'assets.background'],
    description: 'Squat/zıplama hareketleriyle engellerden kaç. Sadece FULL_BODY kamera modunu destekler.',
    samplePackage: {
      schemaVersion: '1.0',
      packageType: 'ALBAGO_GAME_PACKAGE',
      game: {
        title: 'Engelden Kaçış',
        template: 'DODGE_RUN',
        category: 'FUN',
        orientation: 'LANDSCAPE',
        cameraRequirement: 'FULL_BODY',
        durationSec: 45,
        description: 'Squat yaparak engellerden kaç!'
      },
      assets: {
        cover: 'https://albago.tr/assets/covers/dodge-cover.png',
        background: 'https://albago.tr/assets/backgrounds/runner-bg.png'
      },
      rules: [
        { motion: 'SQUAT', event: 'REP_COUNTED', points: 10, cooldownMs: 300 },
        { motion: 'JUMPING_JACK', event: 'REP_COUNTED', points: 15, cooldownMs: 500 }
      ],
      scoring: { targetScore: 300, rewardType: 'STAR', rewardAmount: 2 }
    }
  },
  {
    key: 'FIT_CHALLENGE',
    label: 'Spor Mücadelesi',
    category: 'SPORT',
    cameraRequirements: ['FULL_BODY'],
    requiredFields: ['title', 'template', 'category', 'orientation', 'cameraRequirement', 'durationSec', 'assets.cover', 'rules'],
    optionalFields: ['description', 'scoring'],
    description: 'Çoklu egzersiz programı. Squat, jumping jack ve ip atlama hareketlerini içerir.',
    samplePackage: {
      schemaVersion: '1.0',
      packageType: 'ALBAGO_GAME_PACKAGE',
      game: {
        title: 'Fit Challenge',
        template: 'FIT_CHALLENGE',
        category: 'SPORT',
        orientation: 'PORTRAIT',
        cameraRequirement: 'FULL_BODY',
        durationSec: 120,
        description: '3 egzersizli spor programı'
      },
      assets: {
        cover: 'https://albago.tr/assets/covers/fit-cover.png'
      },
      rules: [
        { motion: 'SQUAT', event: 'REP_COUNTED', points: 5, cooldownMs: 200 },
        { motion: 'JUMPING_JACK', event: 'REP_COUNTED', points: 10, cooldownMs: 400 },
        { motion: 'JUMP_ROPE', event: 'REP_COUNTED', points: 8, cooldownMs: 300 }
      ],
      scoring: { targetScore: 500, rewardType: 'STAR', rewardAmount: 5 }
    }
  },
  {
    key: 'POSE_CONTACT_TARGETS',
    label: 'Poz Hedef Teması',
    category: 'FUN',
    cameraRequirements: ['FULL_BODY', 'UPPER_BODY'],
    requiredFields: ['title', 'template', 'category', 'orientation', 'cameraRequirement', 'durationSec', 'assets.cover', 'assets.targets (en az bir hedef)'],
    optionalFields: ['description', 'assets.background', 'scoring'],
    description: 'El/vücut noktalarıyla ekrandaki hedeflere dokun. HAND_TARGET desteklenmez — sadece FULL_BODY veya UPPER_BODY.',
    samplePackage: {
      schemaVersion: '1.0',
      packageType: 'ALBAGO_GAME_PACKAGE',
      game: {
        title: 'Hedef Vurma',
        template: 'POSE_CONTACT_TARGETS',
        category: 'FUN',
        orientation: 'LANDSCAPE',
        cameraRequirement: 'UPPER_BODY',
        durationSec: 45,
        description: 'Ellerinle ekrandaki hedeflere dokun!'
      },
      assets: {
        cover: 'https://albago.tr/assets/covers/target-cover.png',
        background: 'https://albago.tr/assets/backgrounds/target-bg.png',
        targets: [
          { key: 'target_green', url: 'https://albago.tr/assets/targets/green.png', label: 'Yeşil Hedef', role: 'correct' },
          { key: 'target_red', url: 'https://albago.tr/assets/targets/red.png', label: 'Kırmızı Hedef', role: 'wrong' }
        ]
      },
      rules: [
        { motion: 'LEFT_HAND_HIT', event: 'REP_COUNTED', points: 10, cooldownMs: 300, targetKey: 'target_green' },
        { motion: 'RIGHT_HAND_HIT', event: 'REP_COUNTED', points: 10, cooldownMs: 300, targetKey: 'target_green' }
      ],
      scoring: { targetScore: 200, baseCorrect: 10, wrongPenalty: 5, rewardType: 'STAR', rewardAmount: 2 }
    }
  },
  {
    key: 'WHACK_A_MOLE',
    label: 'Whack-a-Mole',
    category: 'FUN',
    cameraRequirements: ['UPPER_BODY', 'FULL_BODY'],
    requiredFields: ['title', 'template', 'category', 'orientation', 'cameraRequirement', 'durationSec', 'assets.cover', 'assets.targets'],
    optionalFields: ['description', 'scoring'],
    description: 'Köstebek vurma oyunu. Ellerle ekranda beliren hedefleri vur. HAND_TARGET desteklenmez.',
    samplePackage: {
      schemaVersion: '1.0',
      packageType: 'ALBAGO_GAME_PACKAGE',
      game: {
        title: 'Köstebek Vurma',
        template: 'WHACK_A_MOLE',
        category: 'FUN',
        orientation: 'LANDSCAPE',
        cameraRequirement: 'UPPER_BODY',
        durationSec: 30,
        description: 'Ekranda beliren köstebekleri vur!'
      },
      assets: {
        cover: 'https://albago.tr/assets/covers/mole-cover.png',
        targets: [
          { key: 'mole_green', url: 'https://albago.tr/assets/targets/mole-green.png', label: 'Köstebek', role: 'correct' }
        ]
      },
      rules: [
        { motion: 'LEFT_HAND_HIT', event: 'REP_COUNTED', points: 10, cooldownMs: 200, targetKey: 'mole_green' },
        { motion: 'RIGHT_HAND_HIT', event: 'REP_COUNTED', points: 10, cooldownMs: 200, targetKey: 'mole_green' }
      ],
      scoring: { targetScore: 300, baseCorrect: 10, rewardType: 'STAR', rewardAmount: 3 }
    }
  },
  {
    key: 'SCENE_PLAY',
    label: 'Scene Play',
    category: 'EDUCATION',
    cameraRequirements: ['FULL_BODY', 'UPPER_BODY'],
    requiredFields: ['title', 'template', 'category', 'orientation', 'cameraRequirement', 'durationSec', 'assets.cover', 'rules'],
    optionalFields: ['description', 'assets.background', 'assets.items'],
    description: 'Etkileşimli sahne. Eğitim ve eğlence kategorileri için uygun. Deve-Cüce gibi oyunlar.',
    samplePackage: {
      schemaVersion: '1.0',
      packageType: 'ALBAGO_GAME_PACKAGE',
      game: {
        title: 'Deve Cüce',
        template: 'SCENE_PLAY',
        category: 'EDUCATION',
        orientation: 'PORTRAIT',
        cameraRequirement: 'FULL_BODY',
        durationSec: 60,
        description: 'Deve-Cüce oyunu: doğru pozu ver!'
      },
      assets: {
        cover: 'https://albago.tr/assets/covers/scene-cover.png',
        background: 'https://albago.tr/assets/backgrounds/scene-bg.png'
      },
      rules: [
        { motion: 'SQUAT', event: 'REP_COUNTED', points: 10, cooldownMs: 400 },
        { motion: 'JUMPING_JACK', event: 'REP_COUNTED', points: 10, cooldownMs: 400 }
      ],
      scoring: { targetScore: 200, rewardType: 'STAR', rewardAmount: 2 }
    }
  }
];

export default function ImportPackagePage() {
  const router = useRouter();
  const [jsonText, setJsonText] = useState('');
  const [state, setState] = useState<string>('idle');
  const [validation, setValidation] = useState<PackageValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('FRUIT_SLASH');
  const [showReference, setShowReference] = useState(false);

  const activeTemplate = useMemo(
    () => TEMPLATE_REFERENCE.find(t => t.key === selectedTemplate) || TEMPLATE_REFERENCE[0],
    [selectedTemplate]
  );

  const handleValidate = async () => {
    setState('parsing');
    setError(null);
    setValidation(null);

    let pkg: unknown;
    try {
      pkg = JSON.parse(jsonText);
    } catch {
      setState('invalid_json');
      setError('JSON okunamadi. Lutfen gecerli bir JSON yapistirdiginizdan emin olun.');
      return;
    }

    try {
      const result = await validateGamePackage(pkg);
      setValidation(result);
      setState(result.valid ? 'ready_to_create_draft' : 'schema_invalid');
    } catch (err: any) {
      setState('error');
      setError(err.message ?? 'Dogrulama basarisiz.');
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
      setError(err.message ?? 'Ic aktarma basarisiz.');
    }
  };

  const loadSample = (templateKey?: string) => {
    const tpl = TEMPLATE_REFERENCE.find(t => t.key === (templateKey || selectedTemplate)) || TEMPLATE_REFERENCE[0];
    setJsonText(JSON.stringify(tpl.samplePackage, null, 2));
    setSelectedTemplate(tpl.key);
    setState('idle');
    setValidation(null);
    setError(null);
  };

  const categoryLabel = (cat: string) =>
    cat === 'FUN' ? 'Eglence' : cat === 'SPORT' ? 'Spor' : cat === 'EDUCATION' ? 'Egitim' : cat;

  const cameraLabel = (cr: string) =>
    cr === 'FULL_BODY' ? 'Tum Vucut' : cr === 'UPPER_BODY' ? 'Ust Vucut' : cr === 'HAND_TARGET' ? 'El Hedefi' : cr;

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Oyun Paketi Ic Aktar</h1>
          <p className="muted">AI Game Builder Agent tarafindan uretilen ALBAGO_GAME_PACKAGE JSON paketini ic aktar</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            className="ghost-button"
            style={{ fontSize: '0.72rem', minWidth: 'auto' }}
            onClick={() => setShowReference(!showReference)}
          >
            {showReference ? 'Referansi Gizle' : 'Template Referansi'}
          </button>
          <button className="ghost-button" style={{ fontSize: '0.72rem', minWidth: 'auto' }} onClick={() => loadSample()}>
            Ornek Paket Yukle
          </button>
        </div>
      </div>

      {/* Template Reference Panel */}
      {showReference && (
        <div className="panel" style={{ marginBottom: 20 }}>
          <div className="eyebrow">Desteklenen Template'ler ve Alanlar</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginTop: 12 }}>
            {TEMPLATE_REFERENCE.map(tpl => (
              <button
                key={tpl.key}
                type="button"
                onClick={() => { setSelectedTemplate(tpl.key); }}
                style={{
                  textAlign: 'left', padding: 12, borderRadius: 'var(--radius-sm)',
                  border: selectedTemplate === tpl.key ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                  background: selectedTemplate === tpl.key ? 'rgba(0,170,255,0.08)' : 'rgba(5,6,14,0.5)',
                  cursor: 'pointer'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: 4 }}>
                  <span className="badge badge-info" style={{ fontSize: '0.6rem', marginRight: 6 }}>{tpl.key}</span>
                  {tpl.label}
                  <span className={`badge ${tpl.category === 'SPORT' ? 'badge-success' : tpl.category === 'EDUCATION' ? 'badge-info' : 'badge-draft'}`} style={{ fontSize: '0.55rem', marginLeft: 6 }}>
                    {categoryLabel(tpl.category)}
                  </span>
                </div>
                <p style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', margin: '4px 0 6px' }}>
                  {tpl.description}
                </p>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                  <div>Kamera: {tpl.cameraRequirements.map(cameraLabel).join(', ')}</div>
                  <div style={{ marginTop: 2 }}>Zorunlu: {tpl.requiredFields.join(', ')}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Quick sample buttons per template */}
          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className="muted" style={{ fontSize: '0.68rem', alignSelf: 'center' }}>Hizli yukle:</span>
            {TEMPLATE_REFERENCE.map(tpl => (
              <button
                key={tpl.key}
                type="button"
                className="ghost-button"
                style={{ fontSize: '0.6rem', minWidth: 'auto', padding: '3px 10px' }}
                onClick={() => loadSample(tpl.key)}
              >
                {tpl.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected template info bar */}
      <div className="panel" style={{ marginBottom: 20, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <span className="muted" style={{ fontSize: '0.68rem' }}>Template:</span>
        <select
          value={selectedTemplate}
          onChange={(e) => setSelectedTemplate(e.target.value)}
          style={{
            background: 'rgba(5,6,14,0.8)', color: 'var(--text-primary)',
            border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)',
            padding: '4px 10px', fontSize: '0.72rem'
          }}
        >
          {TEMPLATE_REFERENCE.map(tpl => (
            <option key={tpl.key} value={tpl.key}>{tpl.label} ({tpl.key})</option>
          ))}
        </select>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
          Kamera: {activeTemplate.cameraRequirements.map(cameraLabel).join(' | ')}
        </span>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
          Kategori: {categoryLabel(activeTemplate.category)}
        </span>
        <span style={{ fontSize: '0.62rem', color: 'var(--accent-amber)' }}>
          Zorunlu alanlar: {activeTemplate.requiredFields.join(', ')}
        </span>
      </div>

      <div className="row" style={{ gap: 'var(--space-xl)' }}>
        {/* Left: JSON Input */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="panel" style={{ marginBottom: 16 }}>
            <div className="eyebrow">JSON Paket</div>
            <textarea
              value={jsonText}
              onChange={(e) => { setJsonText(e.target.value); setState('idle'); setValidation(null); setError(null); }}
              placeholder={`// ${activeTemplate.label} (${activeTemplate.key}) template'i icin JSON paketini buraya yapistirin\n{\n  "schemaVersion": "1.0",\n  "packageType": "ALBAGO_GAME_PACKAGE",\n  "game": {\n    "title": "Oyun Basligi",\n    "template": "${activeTemplate.key}",\n    "category": "${activeTemplate.category}",\n    ...\n  }\n}`}
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
                {state === 'parsing' ? 'Dogrulaniyor...' : 'Dogrula'}
              </button>
              <button
                className="primary-button"
                style={{ fontSize: '0.78rem' }}
                disabled={state !== 'ready_to_create_draft'}
                onClick={handleImport}
              >
                {state === 'creating_draft' ? 'Olusturuluyor...' : 'Draft Olustur'}
              </button>
              <button
                className="ghost-button"
                style={{ fontSize: '0.72rem', minWidth: 'auto' }}
                onClick={() => loadSample()}
              >
                {activeTemplate.label} Ornegi Yukle
              </button>
            </div>

            {error && (
              <div className="validation-fail" style={{ marginTop: 12, padding: '8px 14px', borderRadius: 10, fontSize: '0.82rem' }}>
                {error}
              </div>
            )}

            {state === 'invalid_json' && !error && (
              <div className="validation-fail" style={{ marginTop: 12, padding: '8px 14px', borderRadius: 10, fontSize: '0.82rem' }}>
                JSON parse edilemedi. Sushi yapisini (ozellikle tirnak ve virgulleri) kontrol edin.
              </div>
            )}
          </div>

          {/* Field reference for selected template */}
          <div className="panel" style={{ fontSize: '0.68rem' }}>
            <div className="eyebrow">{activeTemplate.label} — Alan Referansi</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
              <div>
                <span style={{ color: 'var(--accent-danger)', fontWeight: 600 }}>Zorunlu Alanlar:</span>
                <ul style={{ margin: '4px 0', paddingLeft: 16, color: 'var(--text-secondary)' }}>
                  {activeTemplate.requiredFields.map(f => <li key={f}>{f}</li>)}
                </ul>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Opsiyonel Alanlar:</span>
                <ul style={{ margin: '4px 0', paddingLeft: 16, color: 'var(--text-secondary)' }}>
                  {activeTemplate.optionalFields.map(f => <li key={f}>{f}</li>)}
                </ul>
              </div>
            </div>
            <div style={{ marginTop: 8, color: 'var(--text-muted)', fontSize: '0.62rem' }}>
              Genel yapi: schemaVersion ("1.0"), packageType ("ALBAGO_GAME_PACKAGE"), game (title, template, category, orientation, cameraRequirement, durationSec), assets (cover, background?, items?, targets?), rules (motion, event, points, cooldownMs), scoring? (targetScore, rewardType, rewardAmount)
            </div>
          </div>
        </div>

        {/* Right: Validation Result */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {state === 'idle' && !validation && (
            <div className="panel">
              <div className="empty-state">
                <span style={{ fontSize: '2rem', opacity: 0.4 }}>&#128230;</span>
                <p className="muted" style={{ fontSize: '0.82rem' }}>
                  JSON paketini yapistirin ve Dogrula'ya basin.
                </p>
                <p className="muted" style={{ fontSize: '0.68rem', marginTop: 4 }}>
                  "Ornek Paket Yukle" ile {activeTemplate.label} ornegini gorebilirsiniz.
                </p>
              </div>
            </div>
          )}

          {validation && (
            <div className="stack">
              {/* Summary */}
              {validation.summary && (
                <div className="panel">
                  <div className="eyebrow">Paket Ozeti</div>
                  <div style={{ display: 'grid', gap: 6, fontSize: '0.78rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className="muted">Baslik</span>
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
                      <span className="muted">Sure</span>
                      <span>{validation.summary.durationSec}s</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Runtime Compatibility */}
              {validation.runtimeCompatibility && (
                <div className={`validation-summary ${validation.runtimeCompatibility.templateSupported ? 'validation-pass' : 'validation-fail'}`}>
                  <p style={{ fontWeight: 700, fontSize: '0.78rem', margin: '0 0 6px' }}>Runtime Uyumlulugu</p>
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
                    <div key={i} style={{ marginBottom: 8, fontSize: '0.72rem', padding: '6px 10px', background: 'rgba(255,50,50,0.06)', borderRadius: 8 }}>
                      <div style={{ fontWeight: 600, color: 'var(--accent-danger)', marginBottom: 2 }}>{e.message}</div>
                      <span className="muted" style={{ fontSize: '0.6rem' }}>{e.field}</span>
                      <span className="muted" style={{ fontSize: '0.6rem', marginLeft: 8 }}>[{e.code}]</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Warnings */}
              {validation.warnings.length > 0 && (
                <div className="validation-summary validation-warn">
                  <p style={{ fontWeight: 700, fontSize: '0.78rem', margin: '0 0 6px' }}>
                    {validation.warnings.length} Uyari
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
                    <span style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>Dogrulama basarili — yayina hazir</span>
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
                <span style={{ fontWeight: 700, color: 'var(--accent-emerald)' }}>Draft olusturuldu!</span>
              </div>
              <p className="muted" style={{ fontSize: '0.82rem', margin: '0 0 12px' }}>
                Oyun DRAFT olarak kaydedildi. Game Studio'da preview/test/publish yapabilirsin.
              </p>
              <button
                className="primary-button"
                style={{ width: '100%' }}
                onClick={() => router.push(`/games/${draftId}/studio`)}
              >
                Studio'da Ac
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
