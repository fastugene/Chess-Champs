'use client';

import { useGame } from '@/state/gameStore';

export function Hud({
  chapter,
  title,
  onHint,
  hintsLeft,
}: {
  chapter: string;
  title: string;
  onHint: () => void;
  hintsLeft: number;
}) {
  const thinking = useGame((s) => s.thinking);
  const turn = useGame((s) => s.turn);
  const playerColor = useGame((s) => s.playerColor);
  const captured = useGame((s) => s.playerCaptured);
  const status = useGame((s) => s.status);
  const yourTurn = turn === playerColor && status === 'playing';

  return (
    <div>
      <div className="hud">
        <div>
          <div className="hud-title">{chapter}</div>
          <div className="hud-sub">{title}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="chip" title="Material captured">
            ⭐ {captured}
          </div>
          <button className="chip" onClick={onHint} disabled={hintsLeft <= 0} aria-label="Hint">
            💡 {hintsLeft}
          </button>
        </div>
      </div>
      <div className="chip" style={{ justifyContent: 'center', marginBottom: 10 }}>
        {thinking ? (
          <>
            <span className="thinking-dot" /> Opponent thinking…
          </>
        ) : yourTurn ? (
          '👉 Your move!'
        ) : (
          'Get ready…'
        )}
      </div>
    </div>
  );
}
