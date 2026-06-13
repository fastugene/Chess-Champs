'use client';

import { ChampCard } from '@/components/champs/ChampCard';

export interface RecapData {
  result: 'win' | 'lose' | 'draw';
  xp: number;
  championId?: string;
  championPower?: number;
}

/**
 * Post-game recap — always growth-framed, never an eval bar. (Phase 3 expands
 * this into the full 3-beat comic.)
 */
export function RecapCard({
  result,
  xp,
  championId,
  championPower,
  onPlayAgain,
  onHome,
}: RecapData & { onPlayAgain: () => void; onHome: () => void }) {
  const title =
    result === 'win' ? 'Victory! 🏆' : result === 'draw' ? 'Tough Draw 🤝' : 'Good Fight! 💪';
  const msg =
    result === 'win'
      ? "You grabbed pieces safely and kept yours protected — that's how champions win!"
      : result === 'draw'
        ? 'So close! Every game makes you sharper.'
        : "Losing teaches you the most — you're getting stronger every battle!";

  return (
    <div className="overlay">
      <div className="card">
        <h2>{title}</h2>
        <p>{msg}</p>

        {championId && (
          <div className="powerup-stage" style={{ margin: '12px 0' }}>
            <div className="level-up">⚡ CHAMP POWERED UP! ⚡</div>
            <ChampCard champId={championId} size={104} power={championPower ?? 1} />
          </div>
        )}

        <div
          className="chip"
          style={{ justifyContent: 'center', display: 'inline-flex', marginTop: 4 }}
        >
          + {xp} XP
        </div>

        <div className="card-actions">
          <button className="btn btn-ghost" onClick={onHome}>
            Home
          </button>
          <button className="btn btn-primary" onClick={onPlayAgain}>
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
}
