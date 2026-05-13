'use client';

// Template-specific form components for WHACK_A_MOLE, QUIZ, FLASHCARD, MEMORY_MATCH, POSE_HOLD

type JsonObject = Record<string, unknown>;

interface TargetFieldProps {
  index: number;
  target: Record<string, unknown>;
  onChange: (index: number, field: string, value: unknown) => void;
  onRemove: (index: number) => void;
}

export function WhackAMoleTargetField({ index, target, onChange, onRemove }: TargetFieldProps) {
  return (
    <div style={{
      background: 'rgba(255,21,147,0.06)', borderRadius: '12px', padding: '0.75rem',
      border: '1px solid rgba(255,21,147,0.15)', marginBottom: '0.5rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <span style={{ color: 'var(--hot)', fontWeight: 600, fontSize: '0.8rem' }}>Hedef {index + 1}</span>
        <button onClick={() => onRemove(index)} type="button" style={{
          background: 'none', border: '1px solid var(--stroke)', color: 'var(--muted)',
          borderRadius: '6px', padding: '0.15rem 0.5rem', cursor: 'pointer', fontSize: '0.75rem'
        }}>X</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', fontSize: '0.8rem' }}>
        <label className="field"><span>targetId</span>
          <input value={(target.targetId as string) ?? ''} onChange={e => onChange(index, 'targetId', e.target.value)} />
        </label>
        <label className="field"><span>assetKey</span>
          <input value={(target.assetKey as string) ?? ''} onChange={e => onChange(index, 'assetKey', e.target.value)} placeholder="mole_green" />
        </label>
        <label className="field"><span>X (0-1)</span>
          <input type="number" min="0" max="1" step="0.01" value={(target.x as number) ?? 0.5} onChange={e => onChange(index, 'x', parseFloat(e.target.value) || 0)} />
        </label>
        <label className="field"><span>Y (0-1)</span>
          <input type="number" min="0" max="1" step="0.01" value={(target.y as number) ?? 0.5} onChange={e => onChange(index, 'y', parseFloat(e.target.value) || 0)} />
        </label>
        <label className="field"><span>Radius (0.02-0.35)</span>
          <input type="number" min="0.02" max="0.35" step="0.01" value={(target.radius as number) ?? 0.1} onChange={e => onChange(index, 'radius', parseFloat(e.target.value) || 0.1)} />
        </label>
        <label className="field"><span>Points</span>
          <input type="number" min="0" value={(target.points as number) ?? 10} onChange={e => onChange(index, 'points', parseInt(e.target.value) || 0)} />
        </label>
        <label className="field" style={{ gridColumn: '1 / -1' }}><span>hitBy (comma-separated keypoints)</span>
          <input value={Array.isArray(target.hitBy) ? (target.hitBy as string[]).join(', ') : 'LEFT_WRIST, RIGHT_WRIST'}
            onChange={e => onChange(index, 'hitBy', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} />
        </label>
      </div>
    </div>
  );
}

export function WhackAMoleConfigForm({ config, onChange }: { config: JsonObject; onChange: (field: string, value: unknown) => void }) {
  const targets = (config.targets as JsonObject[]) ?? [];
  const spawn = (config.spawn as JsonObject) ?? {};

  const updateTarget = (index: number, field: string, value: unknown) => {
    const next = [...targets];
    next[index] = { ...next[index], [field]: value };
    onChange('targets', next);
  };
  const addTarget = () => {
    onChange('targets', [...targets, { targetId: `hole_${targets.length}`, x: 0.5, y: 0.78, radius: 0.1, assetKey: 'mole_green', hitBy: ['LEFT_WRIST', 'RIGHT_WRIST'], points: 10 }]);
  };
  const removeTarget = (index: number) => {
    onChange('targets', targets.filter((_, i) => i !== index));
  };

  return (
    <div style={{ fontSize: '0.85rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
        <label className="field"><span>Duration (sec)</span>
          <input type="number" min={5} max={900} value={(config.durationSec as number) ?? 60} onChange={e => onChange('durationSec', parseInt(e.target.value) || 60)} />
        </label>
        <label className="field"><span>Spawn Interval (ms)</span>
          <input type="number" min={100} max={10000} value={(spawn.intervalMs as number) ?? 900} onChange={e => onChange('spawn', { ...spawn, intervalMs: parseInt(e.target.value) || 900 })} />
        </label>
        <label className="field"><span>Visible (ms)</span>
          <input type="number" min={100} max={30000} value={(spawn.visibleMs as number) ?? 1400} onChange={e => onChange('spawn', { ...spawn, visibleMs: parseInt(e.target.value) || 1400 })} />
        </label>
        <label className="field"><span>Lives</span>
          <input type="number" min={1} max={10} value={(config.lives as JsonObject)?.count as number ?? 3} onChange={e => onChange('lives', { enabled: true, count: parseInt(e.target.value) || 3 })} />
        </label>
        <label className="field"><span>Max Active Targets</span>
          <input type="number" min={1} max={10} value={(spawn.maxActiveTargets as number) ?? 2} onChange={e => onChange('spawn', { ...spawn, maxActiveTargets: parseInt(e.target.value) || 2 })} />
        </label>
        <label className="field"><span>Camera Requirement</span>
          <select value={(config.cameraRequirement as string) ?? 'UPPER_BODY'} onChange={e => onChange('cameraRequirement', e.target.value)}>
            <option value="UPPER_BODY">UPPER_BODY</option>
            <option value="FULL_BODY">FULL_BODY</option>
          </select>
        </label>
      </div>

      <div style={{ marginBottom: '0.5rem' }}>
        <span style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--ink)' }}>Targets ({targets.length})</span>
        <button onClick={addTarget} type="button" style={{
          marginLeft: '0.75rem', background: 'var(--hot)', color: '#fff', border: 'none',
          borderRadius: '6px', padding: '0.2rem 0.6rem', cursor: 'pointer', fontSize: '0.75rem'
        }}>+ Add Target</button>
      </div>
      {targets.map((t, i) => (
        <WhackAMoleTargetField key={i} index={i} target={t} onChange={updateTarget} onRemove={removeTarget} />
      ))}
    </div>
  );
}

export function QuizConfigForm({ config, onChange }: { config: JsonObject; onChange: (field: string, value: unknown) => void }) {
  const questions = (config.questions as JsonObject[]) ?? [];
  const updateQ = (index: number, field: string, value: unknown) => {
    const next = [...questions];
    next[index] = { ...next[index], [field]: value };
    onChange('questions', next);
  };
  const addQ = () => onChange('questions', [...questions, { questionId: `q${questions.length}`, prompt: '', choices: ['', '', '', ''], correctIndex: 0 }]);
  const removeQ = (i: number) => onChange('questions', questions.filter((_, idx) => idx !== i));

  return (
    <div style={{ fontSize: '0.85rem' }}>
      {questions.map((q, qi) => (
        <div key={qi} style={{ background: 'rgba(99,102,241,0.06)', borderRadius: '12px', padding: '0.75rem', border: '1px solid rgba(99,102,241,0.15)', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--purple)', fontWeight: 600, fontSize: '0.8rem' }}>Soru {qi + 1}</span>
            <button onClick={() => removeQ(qi)} type="button" style={{ background: 'none', border: '1px solid var(--stroke)', color: 'var(--muted)', borderRadius: '6px', padding: '0.15rem 0.5rem', cursor: 'pointer', fontSize: '0.75rem' }}>X</button>
          </div>
          <label className="field"><span>Prompt</span>
            <input value={(q.prompt as string) ?? ''} onChange={e => updateQ(qi, 'prompt', e.target.value)} />
          </label>
          <label className="field"><span>Choices (4 adet)</span>
            {[0, 1, 2, 3].map(ci => {
              const choices = (q.choices as string[]) ?? [];
              return <input key={ci} style={{ marginBottom: '0.25rem' }} value={choices[ci] ?? ''} placeholder={`Secenek ${ci + 1}${ci === (q.correctIndex as number ?? 0) ? ' (dogru)' : ''}`}
                onChange={e => {
                  const next = [...choices];
                  next[ci] = e.target.value;
                  updateQ(qi, 'choices', next);
                }} />;
            })}
          </label>
          <label className="field"><span>Dogru Cevap Index (0-3)</span>
            <input type="number" min={0} max={3} value={(q.correctIndex as number) ?? 0} onChange={e => updateQ(qi, 'correctIndex', parseInt(e.target.value) || 0)} />
          </label>
        </div>
      ))}
      <button onClick={addQ} type="button" style={{
        background: 'var(--purple)', color: '#fff', border: 'none', borderRadius: '6px',
        padding: '0.3rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem'
      }}>+ Soru Ekle</button>
    </div>
  );
}

export function FlashcardConfigForm({ config, onChange }: { config: JsonObject; onChange: (field: string, value: unknown) => void }) {
  const cards = (config.cards as JsonObject[]) ?? [];
  const updateCard = (i: number, f: string, v: unknown) => {
    const next = [...cards];
    next[i] = { ...next[i], [f]: v };
    onChange('cards', next);
  };
  const addCard = () => onChange('cards', [...cards, { cardId: `c${cards.length}`, frontText: '', backText: '' }]);
  const removeCard = (i: number) => onChange('cards', cards.filter((_, idx) => idx !== i));

  return (
    <div style={{ fontSize: '0.85rem' }}>
      {cards.map((c, ci) => (
        <div key={ci} style={{ background: 'rgba(16,185,129,0.06)', borderRadius: '12px', padding: '0.75rem', border: '1px solid rgba(16,185,129,0.15)', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--cyan)', fontWeight: 600, fontSize: '0.8rem' }}>Kart {ci + 1}</span>
            <button onClick={() => removeCard(ci)} type="button" style={{ background: 'none', border: '1px solid var(--stroke)', color: 'var(--muted)', borderRadius: '6px', padding: '0.15rem 0.5rem', cursor: 'pointer', fontSize: '0.75rem' }}>X</button>
          </div>
          <label className="field"><span>On Yuz</span>
            <input value={(c.frontText as string) ?? ''} onChange={e => updateCard(ci, 'frontText', e.target.value)} />
          </label>
          <label className="field"><span>Arka Yuz</span>
            <input value={(c.backText as string) ?? ''} onChange={e => updateCard(ci, 'backText', e.target.value)} />
          </label>
        </div>
      ))}
      <button onClick={addCard} type="button" style={{ background: 'var(--cyan)', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.3rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem' }}>+ Kart Ekle</button>
    </div>
  );
}

export function MemoryMatchConfigForm({ config, onChange }: { config: JsonObject; onChange: (field: string, value: unknown) => void }) {
  const pairs = (config.pairs as JsonObject[]) ?? [];
  const updatePair = (i: number, side: 'left' | 'right', f: string, v: unknown) => {
    const next = [...pairs];
    next[i] = { ...next[i], [side]: { ...(next[i][side] as JsonObject ?? {}), [f]: v } };
    onChange('pairs', next);
  };
  const addPair = () => onChange('pairs', [...pairs, { pairId: `p${pairs.length}`, left: { text: '' }, right: { text: '' } }]);
  const removePair = (i: number) => onChange('pairs', pairs.filter((_, idx) => idx !== i));

  return (
    <div style={{ fontSize: '0.85rem' }}>
      {pairs.map((p, pi) => (
        <div key={pi} style={{ background: 'rgba(139,92,246,0.06)', borderRadius: '12px', padding: '0.75rem', border: '1px solid rgba(139,92,246,0.15)', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--purple)', fontWeight: 600, fontSize: '0.8rem' }}>Eslesme {pi + 1}</span>
            <button onClick={() => removePair(pi)} type="button" style={{ background: 'none', border: '1px solid var(--stroke)', color: 'var(--muted)', borderRadius: '6px', padding: '0.15rem 0.5rem', cursor: 'pointer', fontSize: '0.75rem' }}>X</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
            <label className="field"><span>Sol Text</span>
              <input value={((p.left as JsonObject)?.text as string) ?? ''} onChange={e => updatePair(pi, 'left', 'text', e.target.value)} />
            </label>
            <label className="field"><span>Sag Text</span>
              <input value={((p.right as JsonObject)?.text as string) ?? ''} onChange={e => updatePair(pi, 'right', 'text', e.target.value)} />
            </label>
          </div>
        </div>
      ))}
      <button onClick={addPair} type="button" style={{ background: 'var(--purple)', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.3rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem' }}>+ Eslesme Ekle</button>
    </div>
  );
}

export function PoseHoldConfigForm({ config, onChange }: { config: JsonObject; onChange: (field: string, value: unknown) => void }) {
  const hold = (config.hold as JsonObject) ?? {};
  const updateHold = (f: string, v: unknown) => onChange('hold', { ...hold, [f]: v });

  return (
    <div style={{ fontSize: '0.85rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
      <label className="field"><span>Pose Type</span>
        <select value={(hold.pose as string) ?? 'PLANK'} onChange={e => updateHold('pose', e.target.value)}>
          <option value="PLANK">PLANK</option>
          <option value="BALANCE">BALANCE</option>
          <option value="CUSTOM">CUSTOM</option>
        </select>
      </label>
      <label className="field"><span>Target Hold (sec, 3-300)</span>
        <input type="number" min={3} max={300} value={(hold.targetHoldSec as number) ?? 30} onChange={e => updateHold('targetHoldSec', parseInt(e.target.value) || 30)} />
      </label>
      <label className="field"><span>Grace (ms, 0-5000)</span>
        <input type="number" min={0} max={5000} value={(hold.graceMs as number) ?? 500} onChange={e => updateHold('graceMs', parseInt(e.target.value) || 500)} />
      </label>
      <label className="field"><span>Min Confidence (0-1)</span>
        <input type="number" min={0} max={1} step={0.05} value={(hold.minConfidence as number) ?? 0.6} onChange={e => updateHold('minConfidence', parseFloat(e.target.value) || 0.6)} />
      </label>
    </div>
  );
}

// Preview renderers
export function WhackAMolePreview({ config }: { config: JsonObject }) {
  const targets = (config.targets as JsonObject[]) ?? [];
  return (
    <div style={{ position: 'relative', width: '100%', height: '200px', background: 'rgba(5,6,14,0.9)', borderRadius: '16px', border: '1px solid var(--stroke)', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 8, left: 12, color: 'var(--hot)', fontSize: '0.7rem', fontWeight: 600 }}>PREVIEW — WHACK_A_MOLE</div>
      <div style={{ position: 'absolute', top: 8, right: 12, display: 'flex', gap: '0.5rem' }}>
        <span style={{ color: '#22c55e', fontSize: '0.7rem' }}>Score: 0</span>
        <span style={{ color: 'var(--hot)', fontSize: '0.7rem' }}>Lives: {((config.lives as JsonObject)?.count as number) ?? 3}</span>
      </div>
      {targets.map((t, i) => {
        const x = ((t.x as number) ?? 0.5) * 100;
        const y = ((t.y as number) ?? 0.5) * 100;
        const r = ((t.radius as number) ?? 0.1) * 120;
        return (
          <div key={i} style={{
            position: 'absolute', left: `${x}%`, top: `${y}%`,
            width: `${r}px`, height: `${r}px`, borderRadius: '50%',
            background: 'rgba(255,21,147,0.25)', border: '2px dashed rgba(255,21,147,0.5)',
            transform: 'translate(-50%, -50%)', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <span style={{ fontSize: '0.55rem', color: 'var(--hot)' }}>{t.targetId as string}</span>
          </div>
        );
      })}
    </div>
  );
}

export function QuizPreview({ config }: { config: JsonObject }) {
  const questions = (config.questions as JsonObject[]) ?? [];
  return (
    <div style={{ background: 'rgba(5,6,14,0.9)', borderRadius: '16px', border: '1px solid var(--stroke)', padding: '1rem' }}>
      <div style={{ color: 'var(--purple)', fontSize: '0.7rem', fontWeight: 600, marginBottom: '0.5rem' }}>PREVIEW — QUIZ ({questions.length} soru)</div>
      {questions.slice(0, 3).map((q, qi) => (
        <div key={qi} style={{ marginBottom: '0.75rem', padding: '0.5rem', background: 'rgba(99,102,241,0.05)', borderRadius: '8px' }}>
          <p style={{ color: 'var(--ink)', fontSize: '0.8rem', fontWeight: 600, margin: '0 0 0.25rem 0' }}>{q.prompt as string}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem' }}>
            {((q.choices as string[]) ?? []).map((c, ci) => (
              <span key={ci} style={{
                fontSize: '0.7rem', padding: '0.2rem 0.4rem', borderRadius: '4px',
                background: ci === (q.correctIndex as number) ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)',
                color: ci === (q.correctIndex as number) ? '#22c55e' : 'var(--muted)'
              }}>{ci + 1}. {c}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function FlashcardPreview({ config }: { config: JsonObject }) {
  const cards = (config.cards as JsonObject[]) ?? [];
  return (
    <div style={{ background: 'rgba(5,6,14,0.9)', borderRadius: '16px', border: '1px solid var(--stroke)', padding: '1rem', textAlign: 'center' }}>
      <div style={{ color: 'var(--cyan)', fontSize: '0.7rem', fontWeight: 600, marginBottom: '0.5rem' }}>PREVIEW — FLASHCARD ({cards.length} kart)</div>
      {cards.slice(0, 1).map((c, ci) => (
        <div key={ci} style={{
          minHeight: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(16,185,129,0.05)', borderRadius: '12px', padding: '1rem'
        }}>
          <p style={{ color: 'var(--ink)', fontSize: '1rem', fontWeight: 600 }}>{c.frontText as string || '(on yuz)'}</p>
          <p style={{ color: 'var(--muted)', fontSize: '0.7rem', marginTop: '0.5rem' }}>← dokununca cevrilir →</p>
        </div>
      ))}
    </div>
  );
}

export function MemoryMatchPreview({ config }: { config: JsonObject }) {
  const pairs = (config.pairs as JsonObject[]) ?? [];
  const gridCols = Math.min(pairs.length, 4);
  return (
    <div style={{ background: 'rgba(5,6,14,0.9)', borderRadius: '16px', border: '1px solid var(--stroke)', padding: '1rem' }}>
      <div style={{ color: 'var(--purple)', fontSize: '0.7rem', fontWeight: 600, marginBottom: '0.5rem' }}>PREVIEW — MEMORY MATCH ({pairs.length} eslesme)</div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${gridCols}, 1fr)`, gap: '0.35rem' }}>
        {pairs.flatMap((p, pi) => [
          <div key={`${pi}l`} style={{ aspectRatio: '1', background: 'rgba(139,92,246,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: 'var(--muted)' }}>
            {(p.left as JsonObject)?.text as string || 'L'}
          </div>,
          <div key={`${pi}r`} style={{ aspectRatio: '1', background: 'rgba(139,92,246,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: 'var(--muted)' }}>
            {(p.right as JsonObject)?.text as string || 'R'}
          </div>
        ])}
      </div>
    </div>
  );
}

export function PoseHoldPreview({ config }: { config: JsonObject }) {
  const hold = (config.hold as JsonObject) ?? {};
  return (
    <div style={{ background: 'rgba(5,6,14,0.9)', borderRadius: '16px', border: '1px solid var(--stroke)', padding: '1rem', textAlign: 'center' }}>
      <div style={{ color: '#10b981', fontSize: '0.7rem', fontWeight: 600, marginBottom: '0.5rem' }}>PREVIEW — POSE HOLD</div>
      <div style={{ fontSize: '2rem', padding: '0.5rem' }}>🧘</div>
      <p style={{ color: 'var(--ink)', fontWeight: 600, fontSize: '0.9rem' }}>Pose: {hold.pose as string || 'PLANK'}</p>
      <p style={{ color: 'var(--muted)', fontSize: '0.7rem' }}>
        {hold.targetHoldSec as number || 30}s hold · grace {hold.graceMs as number || 500}ms · min confidence {(hold.minConfidence as number || 0.6) * 100}%
      </p>
    </div>
  );
}

// ─── Gameplay Previews ───────────────────────────────────────────

export function FruitSlashPreview({ draft }: { draft: any }) {
  const level = draft.levels?.[0] ?? {};
  const spawnRate = level.config?.spawnRateMs ?? 900;
  const objectLife = level.sceneConfig?.defaultObjectLifeMs ?? 2600;
  const penalty = level.config?.penaltyPoints ?? 10;
  const targetScore = level.targetScore ?? 420;

  const fruits = [
    { key: 'fruit', label: '🍎', color: '#ef4444', x: 20, y: 22, delay: 0 },
    { key: 'bonus', label: '🍋', color: '#eab308', x: 55, y: 14, delay: 0.6 },
    { key: 'fruit', label: '🍊', color: '#f97316', x: 78, y: 26, delay: 1.1 },
    { key: 'bomb', label: '💣', color: '#6b7280', x: 42, y: 10, delay: 1.7 },
    { key: 'fruit', label: '🍇', color: '#a855f7', x: 65, y: 20, delay: 2.2 },
  ];

  return (
    <div style={{
      position: 'relative', width: '100%', minHeight: 200,
      background: 'linear-gradient(180deg, #0a0e1a 0%, #0f1426 50%, #1a1030 100%)',
      borderRadius: 16, border: '1px solid var(--border-subtle)', overflow: 'hidden'
    }}>
      {/* Game area decorative elements */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.08, background: 'radial-gradient(circle at 30% 40%, #ec0fa7, transparent 50%), radial-gradient(circle at 70% 30%, #22d3ee, transparent 40%)' }} />

      {/* Header */}
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ color: 'var(--accent-pink)', fontSize: '0.7rem', fontWeight: 700 }}>PREVIEW — FRUIT SLASH</span>
        <div style={{ display: 'flex', gap: 14 }}>
          <span style={{ color: 'var(--accent-emerald)', fontSize: '0.7rem', fontWeight: 600 }}>Score: 0/{targetScore}</span>
          <span style={{ color: 'var(--accent-cyan)', fontSize: '0.7rem' }}>Penalty: -{penalty}</span>
        </div>
      </div>

      {/* Fruit objects */}
      <div style={{ position: 'relative', height: 140, overflow: 'hidden' }}>
        {fruits.map((f, i) => (
          <div key={i} style={{
            position: 'absolute', left: `${f.x}%`, top: `${f.y}%`,
            fontSize: '1.6rem', transform: 'translate(-50%, -50%)',
            filter: f.key === 'bomb' ? 'grayscale(0.6)' : 'none',
            opacity: 0.85,
            animation: `fruitFloat ${(objectLife / 1000).toFixed(1)}s ease-in ${f.delay}s infinite`
          }}>
            {f.label}
          </div>
        ))}

        {/* Hand target indicators */}
        <div style={{
          position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', gap: 18, opacity: 0.5
        }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px dashed rgba(236,15,167,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.55rem', color: 'var(--accent-pink)' }}>L</span>
          </div>
          <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px dashed rgba(236,15,167,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.55rem', color: 'var(--accent-pink)' }}>R</span>
          </div>
        </div>
      </div>

      {/* Info bar */}
      <div style={{ display: 'flex', gap: 12, padding: '8px 14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.62rem' }}>Spawn: {spawnRate}ms</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.62rem' }}>Life: {objectLife}ms</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.62rem' }}>Motions: {draft.supportedMotions?.join(', ') || 'SQUAT, JUMPING_JACK'}</span>
      </div>
    </div>
  );
}

export function ScenePlayPreview({ draft }: { draft: any }) {
  const level = draft.levels?.[0] ?? {};
  const objects = (Array.isArray(level.sceneConfig?.objects) ? level.sceneConfig.objects : []) as any[];
  const spawnRate = level.config?.spawnRateMs ?? 1800;
  const lives = level.config?.lives ?? 3;

  const motionLabels: Record<string, string> = {
    SQUAT: 'Cuce', JUMPING_JACK: 'Deve', JUMP_ROPE: 'Ip Atlama'
  };

  return (
    <div style={{
      background: 'linear-gradient(180deg, #080b18 0%, #0c1020 100%)',
      borderRadius: 16, border: '1px solid var(--border-subtle)', overflow: 'hidden'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ color: 'var(--accent-cyan)', fontSize: '0.7rem', fontWeight: 700 }}>PREVIEW — SCENE PLAY</span>
        <div style={{ display: 'flex', gap: 10 }}>
          <span style={{ color: 'var(--accent-danger)', fontSize: '0.68rem' }}>Lives: {lives}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>Spawn: {spawnRate}ms</span>
        </div>
      </div>

      {/* Scene stage */}
      <div style={{ position: 'relative', minHeight: 140, padding: 12 }}>
        {objects.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120 }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              Scene objesi ekleyin. Komutlar sirayla gelir, dogru hareketle temizlenir.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {objects.slice(0, 6).map((obj: any, i: number) => {
              const motion = obj.requiredMotion ?? 'SQUAT';
              const isEven = i % 2 === 0;
              return (
                <div key={i} style={{
                  flex: '0 0 auto',
                  minWidth: 100,
                  padding: '10px 14px',
                  background: isEven ? 'rgba(236,15,167,0.08)' : 'rgba(34,211,238,0.06)',
                  borderRadius: 12,
                  border: `1px solid ${isEven ? 'rgba(236,15,167,0.2)' : 'rgba(34,211,238,0.15)'}`,
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                    {obj.label ?? obj.objectType ?? `Obj ${i + 1}`}
                  </div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--accent-pink)' }}>
                    {motionLabels[motion] ?? motion}
                  </div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--accent-emerald)', marginTop: 2 }}>
                    +{obj.points ?? 10} pts
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Flow indicator */}
      {objects.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>Akis:</span>
          {objects.slice(0, 4).map((obj: any, i: number) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: '0.6rem', color: 'var(--accent-cyan)' }}>
              {obj.label ?? obj.objectType}
              {i < Math.min(objects.length, 4) - 1 && <span style={{ color: 'var(--text-muted)' }}>→</span>}
            </span>
          ))}
          {objects.length > 4 && <span style={{ color: 'var(--text-muted)', fontSize: '0.58rem' }}>+{objects.length - 4} more</span>}
        </div>
      )}
    </div>
  );
}

export function DodgeRunPreview({ draft }: { draft: any }) {
  const level = draft.levels?.[0] ?? {};
  const lives = level.config?.lives ?? 3;
  const obstacleSpawn = level.config?.obstacleSpawnMs ?? 1400;
  const travelSpeed = level.sceneConfig?.travelMs ?? 2100;
  const damage = level.config?.damageOnMiss ?? 1;

  const laneObstacles = [
    { lane: 'left', y: 15, color: '#ef4444', label: '▣' },
    { lane: 'center', y: 40, color: '#f97316', label: '▣' },
    { lane: 'right', y: 18, color: '#eab308', label: '▣' },
    { lane: 'center', y: 62, color: '#ef4444', label: '▣' },
    { lane: 'left', y: 55, color: '#f97316', label: '▤' },
  ];

  return (
    <div style={{
      background: 'linear-gradient(180deg, #0a0f1e 0%, #0f1528 100%)',
      borderRadius: 16, border: '1px solid var(--border-subtle)', overflow: 'hidden', position: 'relative'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ color: 'var(--accent-amber)', fontSize: '0.7rem', fontWeight: 700 }}>PREVIEW — DODGE RUN</span>
        <div style={{ display: 'flex', gap: 10 }}>
          <span style={{ color: 'var(--accent-danger)', fontSize: '0.68rem' }}>Lives: {lives}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>Travel: {travelSpeed}ms</span>
        </div>
      </div>

      {/* Lane track */}
      <div style={{ position: 'relative', height: 140, display: 'flex' }}>
        {/* Lane dividers */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
          <div style={{ flex: 1, borderRight: '1px dashed rgba(255,255,255,0.04)' }} />
          <div style={{ flex: 1, borderRight: '1px dashed rgba(255,255,255,0.04)' }} />
          <div style={{ flex: 1 }} />
        </div>

        {/* Obstacles */}
        {laneObstacles.map((obs, i) => {
          const laneX = obs.lane === 'left' ? '16%' : obs.lane === 'center' ? '50%' : '83%';
          return (
            <div key={i} style={{
              position: 'absolute', left: laneX, top: `${obs.y}%`,
              transform: 'translate(-50%, -50%)',
              color: obs.color, fontSize: '1.3rem', opacity: 0.7
            }}>
              {obs.label}
            </div>
          );
        })}

        {/* Player indicator */}
        <div style={{
          position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
          width: 22, height: 22, borderRadius: '50%',
          background: 'var(--accent-cyan)', boxShadow: '0 0 16px rgba(34,211,238,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <span style={{ fontSize: '0.55rem', color: '#000', fontWeight: 700 }}>P</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, padding: '8px 14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.62rem' }}>Spawn: {obstacleSpawn}ms</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.62rem' }}>Damage: -{damage}</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.62rem' }}>Lanes: 3</span>
      </div>
    </div>
  );
}

export function FitChallengePreview({ draft }: { draft: any }) {
  const level = draft.levels?.[0] ?? {};
  const tasks = (level.tasks ?? []) as any[];
  const targetScore = level.targetScore ?? 420;
  const duration = level.durationSec ?? 60;

  const taskIcons: Record<string, string> = {
    SQUAT: '🏋️', JUMPING_JACK: '⭐', JUMP_ROPE: '🪢'
  };

  return (
    <div style={{
      background: 'linear-gradient(180deg, #0c0f1a 0%, #101528 100%)',
      borderRadius: 16, border: '1px solid var(--border-subtle)', overflow: 'hidden'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ color: 'var(--accent-emerald)', fontSize: '0.7rem', fontWeight: 700 }}>PREVIEW — FIT CHALLENGE</span>
        <div style={{ display: 'flex', gap: 10 }}>
          <span style={{ color: 'var(--accent-emerald)', fontSize: '0.68rem' }}>Target: {targetScore}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>{duration}s</span>
        </div>
      </div>

      {/* Workout display */}
      <div style={{ padding: 14 }}>
        {tasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: 0 }}>
              Squat, Jumping Jack, Jump Rope hareketleriyle spor akisi.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tasks.slice(0, 4).map((task: any, i: number) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
                <span style={{ fontSize: '1.2rem' }}>{taskIcons[task.motion] ?? '🎯'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: 'var(--text-primary)', fontSize: '0.75rem', fontWeight: 600 }}>
                    {task.motion?.replace(/_/g, ' ') ?? 'Exercise'}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>
                    {task.targetCount ?? '—'} reps
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: 'var(--accent-emerald)', fontSize: '0.75rem', fontWeight: 700 }}>
                    +{task.pointsPerRep ?? '?'}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>per rep</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div style={{ margin: '0 14px 12px', height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          width: '35%', height: '100%',
          background: 'linear-gradient(90deg, var(--accent-emerald), var(--accent-cyan))',
          borderRadius: 2
        }} />
      </div>

      <div style={{ display: 'flex', gap: 12, padding: '8px 14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.62rem' }}>{tasks.length} exercises</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.62rem' }}>Category: {draft.category ?? 'SPORT'}</span>
      </div>
    </div>
  );
}
