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
 * The visible mission tracker for the active chapter: the tactic star bar plus
 * the XP bar. `compact` renders the HUD chip version; the default renders the
 * fuller panel used in the primer and recap.
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
  const xpPct = Math.min(100, Math.round((xp / chapter.xpGoal) * 100));

  if (compact) {
    return (
      <div className="chip mission-chip" title={`${chapter.tactic} mastery`}>
        <StarRow stars={stars} goal={chapter.starGoal} />
        <span className="mission-xp">{xp}/{chapter.xpGoal} XP</span>
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
        <div className="xp-bar">
          <div className="xp-fill" style={{ width: `${xpPct}%` }} />
        </div>
        <span className="xp-label">
          XP {xp} / {chapter.xpGoal}
        </span>
      </div>
    </div>
  );
}
