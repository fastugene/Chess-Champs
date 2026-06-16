import { CHAMPS, RARITY_COLOR, getChampDisplayName, pawnXpToLevel, pawnXpProgress, PAWN_THRESHOLDS } from '@/progression/champs';
import { ChampArt } from './ChampArt';

export function PowerBar({ power }: { power: number }) {
  return (
    <div className="power-bar" aria-label={`Power level ${power} of 11`}>
      {Array.from({ length: 11 }, (_, i) => (
        <div key={i} className={`power-pip ${i < power ? 'on' : ''}`} />
      ))}
    </div>
  );
}

/** Progress bar for the Pawn's long-form XP journey (shown instead of PowerBar). */
function PawnXpBar({ xp }: { xp: number }) {
  const level = pawnXpToLevel(xp);
  const fillPct = pawnXpProgress(xp) * 100;
  const toNext = level < 11 ? PAWN_THRESHOLDS[level] - xp : 0;
  return (
    <div className="pawn-xp-bar" aria-label={`Pawn level ${level}, ${Math.round(fillPct)}% to next`}>
      <div className="pawn-xp-header">
        <span className="pawn-xp-level">Lv {level}</span>
        {level < 11 && <span className="pawn-xp-next">{toNext} to next morph</span>}
        {level >= 11 && <span className="pawn-xp-next">MAX ★</span>}
      </div>
      <div className="pawn-xp-track">
        <div className="pawn-xp-fill" style={{ width: `${fillPct}%` }} />
      </div>
    </div>
  );
}

export function ChampCard({
  champId,
  size = 120,
  power,
  pawnXp,
  pawnCustomName,
  locked = false,
}: {
  champId: string;
  size?: number;
  /** For non-pawn champs: power level 1–11. For pawn: pass pawnXp instead. */
  power?: number;
  /** Raw pawnXp for the Pawn champ's long-form progression bar. */
  pawnXp?: number;
  pawnCustomName?: string;
  locked?: boolean;
}) {
  const champ = CHAMPS[champId];
  if (!champ) return null;
  const displayName = getChampDisplayName(champId, pawnCustomName);
  // For the pawn, pass raw pawnXp as the `power` prop so ChampArt can resolve the form.
  const artPower = champId === 'pawn' ? pawnXp : power;
  return (
    <div className={`champ-card${locked ? ' champ-locked' : ''}`}>
      <div style={{ position: 'relative' }}>
        <ChampArt champId={champId} size={size} power={artPower} showGlow={!locked} />
        {locked && <div className="lock-overlay">🔒</div>}
      </div>
      <div style={{ fontWeight: 900, fontSize: 16 }}>{displayName}</div>
      <div className="rarity" style={{ color: RARITY_COLOR[champ.rarity] }}>
        {champ.rarity} · {champ.tactic}
      </div>
      {!locked && <div className="champ-lesson">{champ.lesson}</div>}
      {locked && <div className="champ-lesson muted">Land a {champ.tactic} to unlock!</div>}
      {!locked && champId === 'pawn' && pawnXp != null && <PawnXpBar xp={pawnXp} />}
      {!locked && champId !== 'pawn' && power != null && <PowerBar power={power} />}
    </div>
  );
}
