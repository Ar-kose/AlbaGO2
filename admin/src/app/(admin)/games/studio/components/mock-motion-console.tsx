'use client';

import type { GameRecipe, MockMotionEvent } from '../../../../../lib/game-studio/types';
import type { MotionType } from '../../../../../lib/alba-api';

const MOTION_OPTIONS: Array<{ motion: MotionType; label: string; icon: string }> = [
  { motion: 'SQUAT', label: 'Squat', icon: '🏋️' },
  { motion: 'JUMPING_JACK', label: 'Jumping Jack', icon: '⭐' },
  { motion: 'JUMP_ROPE', label: 'Jump Rope', icon: '🪢' },
  { motion: 'PLANK_HOLD', label: 'Plank Hold', icon: '🧘' },
  { motion: 'LEFT_HAND_HIT', label: 'Left Hand Hit', icon: '👈' },
  { motion: 'RIGHT_HAND_HIT', label: 'Right Hand Hit', icon: '👉' }
];

const EVENT_OPTIONS: Array<{ event: MockMotionEvent['event']; label: string; color: string }> = [
  { event: 'REP_COUNTED', label: 'Doğru Hareket', color: 'var(--accent-emerald)' },
  { event: 'BAD_FORM', label: 'Yanlış Form', color: 'var(--accent-danger)' },
  { event: 'USER_OUT_OF_FRAME', label: 'Kadraj Dışı', color: 'var(--accent-amber)' },
  { event: 'POSE_STARTED', label: 'Poz Başladı', color: 'var(--accent-cyan)' },
  { event: 'POSE_HELD', label: 'Poz Tutuluyor', color: 'var(--accent-emerald)' },
  { event: 'POSE_LOST', label: 'Poz Bozuldu', color: 'var(--accent-danger)' }
];

interface MockMotionConsoleProps {
  onSendEvent: (event: MockMotionEvent) => void;
  recipe?: GameRecipe | null;
  gameMode?: boolean;
}

export function MockMotionConsole({ onSendEvent, recipe, gameMode }: MockMotionConsoleProps) {
  const handleSend = (motion: MotionType, event: MockMotionEvent['event']) => {
    onSendEvent({
      motion,
      event,
      timestampMs: Date.now()
    });
  };

  return (
    <div className="mock-motion-console">
      <p className="eyebrow" style={{ marginBottom: 10 }}>Mock Hareket Konsolu</p>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', margin: '0 0 12px' }}>
        Bir hareket seç ve oyuna gönder. Preview anlık güncellenir.
      </p>

      <div className="mock-motion-grid">
        {MOTION_OPTIONS.filter((m) => {
          // In gameMode or without recipe, show all motions
          if (gameMode || !recipe) return true;
          // Filter to relevant motions for this recipe
          if (recipe.kind === 'COMMAND_REACTION') {
            return recipe.commands.some((c) => c.requiredMotion === m.motion);
          }
          if (recipe.kind === 'TARGET_HIT') {
            return m.motion === 'LEFT_HAND_HIT' || m.motion === 'RIGHT_HAND_HIT';
          }
          if (recipe.kind === 'HOLD_CHALLENGE') {
            return m.motion === 'PLANK_HOLD' || m.motion === 'BALANCE';
          }
          return true;
        }).map((motionOpt) => (
          <div key={motionOpt.motion} className="mock-motion-row">
            <span className="mock-motion-icon">{motionOpt.icon}</span>
            <span className="mock-motion-label">{motionOpt.label}</span>
            <div className="mock-motion-actions">
              {EVENT_OPTIONS.filter((evt) => {
                if (evt.event === 'POSE_STARTED' || evt.event === 'POSE_HELD' || evt.event === 'POSE_LOST') {
                  return gameMode || (recipe?.kind === 'HOLD_CHALLENGE');
                }
                return true;
              }).map((evt) => (
                <button
                  key={evt.event}
                  type="button"
                  className="mock-event-btn"
                  style={{ borderColor: evt.color, color: evt.color }}
                  onClick={() => handleSend(motionOpt.motion, evt.event)}
                  title={evt.label}
                >
                  {evt.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions: all motions at once */}
      <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          className="ghost-button"
          style={{ fontSize: '0.7rem', padding: '5px 10px', minWidth: 'auto' }}
          onClick={() => handleSend('SQUAT', 'REP_COUNTED')}
        >
          SQUAT
        </button>
        <button
          type="button"
          className="ghost-button"
          style={{ fontSize: '0.7rem', padding: '5px 10px', minWidth: 'auto' }}
          onClick={() => handleSend('JUMPING_JACK', 'REP_COUNTED')}
        >
          JUMPING_JACK
        </button>
        <button
          type="button"
          className="ghost-button"
          style={{ fontSize: '0.7rem', padding: '5px 10px', minWidth: 'auto' }}
          onClick={() => handleSend('JUMP_ROPE', 'REP_COUNTED')}
        >
          JUMP_ROPE
        </button>
        <button
          type="button"
          className="ghost-button"
          style={{ fontSize: '0.7rem', padding: '5px 10px', minWidth: 'auto' }}
          onClick={() => handleSend('PLANK_HOLD', 'POSE_HELD')}
        >
          PLANK_HOLD
        </button>
        <button
          type="button"
          className="ghost-button"
          style={{ fontSize: '0.7rem', padding: '5px 10px', minWidth: 'auto', borderColor: 'var(--accent-danger)', color: 'var(--accent-danger)' }}
          onClick={() => handleSend('SQUAT', 'BAD_FORM')}
        >
          BAD_FORM
        </button>
        <button
          type="button"
          className="ghost-button"
          style={{ fontSize: '0.7rem', padding: '5px 10px', minWidth: 'auto', borderColor: 'var(--accent-amber)', color: 'var(--accent-amber)' }}
          onClick={() => handleSend('SQUAT', 'USER_OUT_OF_FRAME')}
        >
          USER_OUT_OF_FRAME
        </button>
      </div>
    </div>
  );
}
