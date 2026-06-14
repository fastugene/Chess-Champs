'use client';

import { ChampCard } from '@/components/champs/ChampCard';
import { MissionTracker } from '@/components/play/MissionTracker';
import type { Chapter } from '@/curriculum/chapters';

export interface RecapData {
  result: 'win' | 'lose' | 'draw';
  xp: number;
  championId?: string;
  championPower?: number;
  /** Active chapter, for the mission tracker + mastery nudge. */
  chapter?: Chapter;
  /** Stars earned so far in the chapter. */
  stars?: number;
  /** Total XP after this game (for the chapter XP bar). */
  chapterXp?: number;
  /** True the first game the chapter's goals are both met. */
  chapterMastered?: boolean;
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
  chapter,
  stars,
  chapterXp,
  chapterMastered,
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

  // Mastery nudge for the chapter's tactic ("1 more to master Safety!").
  let nudge: string | null = null;
  if (chapter && stars != null) {
    const remaining = chapter.starGoal - stars;
    nudge =
      remaining <= 0
        ? `${chapter.tactic} mastered! ⭐`
        : `${remaining} more to master ${chapter.tactic}!`;
  }

  return (
    <div className="overlay">
      <div className="card">
        {chapterMastered && chapter && (
          <div className="chapter-mastered">🎉 Chapter Mastered: {chapter.title}!</div>
        )}

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

        {chapter && stars != null && chapterXp != null && (
          <div className="recap-mission">
            {nudge && <div className="recap-nudge">{nudge}</div>}
            <MissionTracker chapter={chapter} stars={stars} xp={chapterXp} />
          </div>
        )}

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
