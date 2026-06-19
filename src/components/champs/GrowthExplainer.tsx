'use client';

import { PawnRoadmap } from './PawnRoadmap';

/**
 * Kid-facing "two ways to grow" card. Spells out the two separate level-up
 * systems and exactly what action powers each, so the 9-year-old understands
 * why his bars move:
 *   • Rank up  ← win & finish games (overall journey, Wood → Diamond)
 *   • Champ up ← land tactics (his heroes evolve; Pawn morphs, others power up)
 * Reached on demand from a "?" button on Home + Squad.
 */
export function GrowthExplainer({ pawnXp = 0, onClose }: { pawnXp?: number; onClose: () => void }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="card growth-explainer" onClick={(e) => e.stopPropagation()}>
        <h2 className="growth-title">Two Ways to Grow! 🚀</h2>

        <div className="growth-panel growth-rank">
          <div className="growth-panel-head">🏆 Rank Up</div>
          <p className="growth-panel-msg">Win and finish games to climb the ranks.</p>
          <div className="growth-ladder">Wood → Stone → Iron → Gold → Diamond</div>
        </div>

        <div className="growth-panel growth-champ">
          <div className="growth-panel-head">⚡ Champ Up</div>
          <p className="growth-panel-msg">
            Pull off tactics and your Champs get stronger! Safe grabs morph your Pawn.
            Forks power up Knight. Pins power up Bishop.
          </p>
          <PawnRoadmap xp={pawnXp} compact />
        </div>

        <button className="btn btn-primary" style={{ marginTop: 14, width: '100%' }} onClick={onClose}>
          Got it! ▶
        </button>
      </div>
    </div>
  );
}
