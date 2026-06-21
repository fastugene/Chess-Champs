'use client';

import type { Candidate } from '@/chess/explain';

/**
 * One candidate move the player can pick in Grandmaster Training Mode. Shows the
 * move (SAN) + its two-part rationale. While `choosing`, it's a tappable button;
 * once `revealed` (verdict phase) it shows the ⭐ rating and badges the engine's
 * top pick. No centipawns ever — stars only.
 */
export function MoveChoiceCard({
  candidate,
  accent,
  label,
  revealed,
  stars,
  isBest,
  chosen,
  onPick,
  disabled,
}: {
  candidate: Candidate;
  /** Color keyed to this card's board highlight. */
  accent: string;
  /** "A" / "B" tag shown on the swatch. */
  label: string;
  revealed: boolean;
  stars?: number;
  isBest?: boolean;
  chosen?: boolean;
  onPick?: () => void;
  disabled?: boolean;
}) {
  const classes = ['move-choice-card'];
  if (revealed && isBest) classes.push('is-best');
  if (revealed && chosen) classes.push('is-chosen');

  return (
    <button
      className={classes.join(' ')}
      onClick={onPick}
      disabled={disabled || revealed}
      style={{ borderColor: accent }}
    >
      <div className="move-choice-head">
        <span className="move-choice-swatch" style={{ background: accent }}>{label}</span>
        <span className="move-choice-san">{candidate.san}</span>
        {revealed && (
          <span className="move-choice-stars" aria-label={`${stars} stars`}>
            {'⭐'.repeat(stars ?? 0)}
          </span>
        )}
      </div>
      <div className="move-choice-rationale">{candidate.rationale}</div>
      {revealed && isBest && <div className="move-choice-badge">👑 Grandmaster’s pick</div>}
      {revealed && chosen && !isBest && <div className="move-choice-badge subtle">Your pick</div>}
    </button>
  );
}
