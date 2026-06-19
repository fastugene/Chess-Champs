import {
  pawnForms,
  nextPawnForm,
  pawnFormMeta,
  pawnStage,
  pawnFormIndex,
} from '@/progression/champs';
import { ChampArt } from './ChampArt';

/**
 * The Pawn's morph journey as a 5-node roadmap (pawn → knight → bishop → rook →
 * queen) with the current form lit, future forms dimmed, and a fill bar toward the
 * next morph. One shared widget for Home, the recap, and the squad ChampCard so the
 * kid always sees what he's working toward and what his Pawn XP unlocks next.
 */
export function PawnRoadmap({ xp, compact = false }: { xp: number; compact?: boolean }) {
  const level = pawnFormIndex(xp);
  const currentForm = pawnStage(xp).form;
  const stops = pawnForms();
  const currentIdx = stops.findIndex((s) => s.form === currentForm);
  const next = nextPawnForm(xp);
  // Bar tracks progress toward the next FORM (the roadmap's unit), not the next
  // power level — so "Next: Rook · N XP" and the fill agree with the lit node.
  const formStartXp = stops[currentIdx].atXp;
  const toNext = next ? next.atXp - xp : 0;
  const span = next ? next.atXp - formStartXp : 1;
  const fillPct = next ? Math.min(100, ((xp - formStartXp) / span) * 100) : 100;
  const nodeSize = compact ? 34 : 42;

  return (
    <div className="pawn-roadmap" aria-label={`Pawn level ${level}, form ${currentForm}`}>
      <div className="pawn-roadmap-track">
        {stops.map((stop, i) => {
          const reached = i <= currentIdx;
          const isCurrent = i === currentIdx;
          const meta = pawnFormMeta(stop.form);
          return (
            <div
              key={stop.form}
              className={`pawn-roadmap-node${isCurrent ? ' current' : ''}${reached ? '' : ' locked'}`}
            >
              <div className="pawn-roadmap-art" style={{ width: nodeSize, height: nodeSize }}>
                <ChampArt champId="pawn" size={nodeSize} power={stop.atXp} showGlow={isCurrent} />
                {!reached && <div className="pawn-roadmap-lock">🔒</div>}
              </div>
              <span className="pawn-roadmap-label">{meta.label}</span>
            </div>
          );
        })}
      </div>

      <div className="pawn-roadmap-bar">
        <div className="pawn-roadmap-header">
          <span className="pawn-roadmap-lv">Lv {level}</span>
          {next ? (
            <span className="pawn-roadmap-next">
              Next: {pawnFormMeta(next.form).emoji} {pawnFormMeta(next.form).label} · {toNext} XP
            </span>
          ) : (
            <span className="pawn-roadmap-next">MAX ★ Queen</span>
          )}
        </div>
        <div className="pawn-roadmap-fill-track">
          <div className="pawn-roadmap-fill" style={{ width: `${fillPct}%` }} />
        </div>
      </div>
    </div>
  );
}
