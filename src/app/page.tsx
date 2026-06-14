'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChampArt } from '@/components/champs/ChampArt';
import { resumeAudio } from '@/audio/sfx';
import { loadProgress } from '@/persistence/progress';
import { getRank } from '@/progression/ranks';

export default function Home() {
  const router = useRouter();
  const [rankDisplay, setRankDisplay] = useState('Wood III');
  const [rankBadge, setRankBadge] = useState('🪵');
  const [rankColor, setRankColor] = useState('#a07850');

  useEffect(() => {
    void loadProgress().then((p) => {
      const rank = getRank(p.xp, p.chaptersMastered);
      setRankDisplay(rank.displayName);
      setRankBadge(rank.tier.badge);
      setRankColor(rank.tier.color);
    });
  }, []);

  const play = () => {
    resumeAudio();
    router.push('/play');
  };

  return (
    <div className="home">
      <div className="logo">
        CHESS
        <br />
        <span className="pop">CHAMPS</span>
      </div>

      <div
        className="rank-badge-home"
        style={{ color: rankColor, borderColor: rankColor }}
      >
        {rankBadge} {rankDisplay}
      </div>

      <div className="home-champs">
        <ChampArt champId="pawn" size={86} />
        <ChampArt champId="knight" size={108} />
        <ChampArt champId="queen" size={86} />
      </div>

      <div className="tagline">Collect Champs. Climb the ranks. Become a chess legend!</div>

      <button className="btn btn-primary btn-big" style={{ maxWidth: 320 }} onClick={play}>
        ▶ PLAY
      </button>
    </div>
  );
}
