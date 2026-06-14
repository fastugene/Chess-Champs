import { CHAMPS, RARITY_COLOR } from '@/progression/champs';
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
}: {
  champId: string;
  size?: number;
  power?: number;
}) {
  const champ = CHAMPS[champId];
  if (!champ) return null;
  return (
    <div className="champ-card">
      <ChampArt champId={champId} size={size} />
      <div style={{ fontWeight: 900, fontSize: 16 }}>{champ.name}</div>
      <div className="rarity" style={{ color: RARITY_COLOR[champ.rarity] }}>
        {champ.rarity} · {champ.tactic}
      </div>
      <div className="champ-lesson">{champ.lesson}</div>
      {power != null && <PowerBar power={power} />}
    </div>
  );
}
