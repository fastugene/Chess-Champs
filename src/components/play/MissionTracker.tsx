'use client';

import type { Chapter } from '@/curriculum/chapters';

/** A row of filled/empty stars, e.g. ⭐⭐☆. */
export function StarRow({ stars, goal }: { stars: number; goal: number }) {
  return (
    <span className="star-row" aria-label={`${stars} of ${goal} stars`}>
      {Array.from({ length: goal }, (_, i) => (
        <span key={i} className={`star ${i < stars ? 'on' : ''}`}>
          {i < stars ? '⭐' : '☆'}
        </span>
      ))}
    </span>
  );
}

/**
 * The visible mission tracker for the active chapter. The tactic star bar is the
 * single goal (landing the tactic `starGoal` times masters the chapter); XP is a
 * global score shown alongside, never a gate. `compact` renders the HUD chip; the
 * default renders the fuller panel used in the primer and recap.
 */
export function MissionTracker({
  chapter,
  stars,
  xp,
  compact = false,
}: {
  chapter: Chapter;
  stars: number;
  xp: number;
  compact?: boolean;
}) {
  const starPct = Math.min(100, Math.round((stars / chapter.starGoal) * 100));

  if (compact) {
    return (
      <div className="chip mission-chip" title={`${chapter.tactic} mastery`}>
        <StarRow stars={stars} goal={chapter.starGoal} />
      </div>
    );
  }

  return (
    <div className="mission-panel">
      <div className="mission-goal">
        <StarRow stars={stars} goal={chapter.starGoal} />
        <span>
          Land a <b>{chapter.tactic}</b> {chapter.starGoal} times ({stars}/{chapter.starGoal})
        </span>
      </div>
      <div className="mission-xp-row">
        <div className="xp-bar" title="Tactic mastery progress">
          <div className="xp-fill" style={{ width: `${starPct}%` }} />
        </div>
        <span className="xp-label">🏆 {xp} Rank XP</span>
      </div>
    </div>
  );
}
