import { CHAMPS, RARITY_COLOR, getChampDisplayName } from '@/progression/champs';
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

export function ChampCard({
  champId,
  size = 120,
  power,
  pawnCustomName,
  locked = false,
}: {
  champId: string;
  size?: number;
  power?: number;
  pawnCustomName?: string;
  locked?: boolean;
}) {
  const champ = CHAMPS[champId];
  if (!champ) return null;
  const displayName = getChampDisplayName(champId, pawnCustomName);
  return (
    <div className={`champ-card${locked ? ' champ-locked' : ''}`}>
      <div style={{ position: 'relative' }}>
        <ChampArt champId={champId} size={size} power={power} showGlow={!locked} />
        {locked && <div className="lock-overlay">🔒</div>}
      </div>
      <div style={{ fontWeight: 900, fontSize: 16 }}>{displayName}</div>
      <div className="rarity" style={{ color: RARITY_COLOR[champ.rarity] }}>
        {champ.rarity} · {champ.tactic}
      </div>
      {!locked && <div className="champ-lesson">{champ.lesson}</div>}
      {locked && <div className="champ-lesson muted">Land a {champ.tactic} to unlock!</div>}
      {power != null && !locked && <PowerBar power={power} />}
    </div>
  );
}
