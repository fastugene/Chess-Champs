'use client';

import { useEffect, useState } from 'react';
import { useGame } from '@/state/gameStore';
import { ChampArt } from '@/components/champs/ChampArt';
import type { RewardTier, TacticEvent } from '@/chess/tactics/detect';

const TIER_RANK: Record<RewardTier, number> = { micro: 0, minor: 1, major: 2, epic: 3 };
const CONFETTI_COLORS = ['#ffc93c', '#4fd675', '#7c9cff', '#ff5d73', '#b06bff', '#5ad1e6'];

/**
 * Non-blocking, in-the-moment celebration for detected tactics. Micro events
 * (plain captures/checks) get sound + haptics only — we save the big visual
 * burst for genuinely valuable moments so it stays special.
 */
export function Celebration() {
  const events = useGame((s) => s.events);
  const seq = useGame((s) => s.eventSeq);
  const [current, setCurrent] = useState<TacticEvent | null>(null);

  useEffect(() => {
    if (!events.length) return;
    const top = [...events].sort((a, b) => TIER_RANK[b.tier] - TIER_RANK[a.tier])[0];
    if (TIER_RANK[top.tier] < TIER_RANK.minor) return; // skip micro
    setCurrent(top);
    const t = setTimeout(() => setCurrent(null), top.tier === 'epic' ? 1900 : 1350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seq]);

  if (!current) return null;
  const big = current.tier === 'major' || current.tier === 'epic';

  return (
    <div className="celebrate">
      {big && <Confetti />}
      <div className="burst">
        <div className="headline">{current.label}</div>
        {current.sub && <div className="sub">{current.sub}</div>}
        {big && current.champId && (
          <div className="float-anim" style={{ marginTop: 10 }}>
            <ChampArt champId={current.champId} size={96} />
          </div>
        )}
      </div>
    </div>
  );
}

function Confetti() {
  const bits = Array.from({ length: 26 }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.3,
    dur: 1 + Math.random() * 0.9,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    rot: Math.random() * 360,
  }));
  return (
    <>
      {bits.map((b, i) => (
        <span
          key={i}
          className="confetti"
          style={{
            left: `${b.left}%`,
            background: b.color,
            animationDelay: `${b.delay}s`,
            animationDuration: `${b.dur}s`,
            transform: `rotate(${b.rot}deg)`,
          }}
        />
      ))}
    </>
  );
}
