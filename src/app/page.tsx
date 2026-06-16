'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChampArt } from '@/components/champs/ChampArt';
import { resumeAudio } from '@/audio/sfx';
import { unlockSpeech } from '@/audio/speech';
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
    unlockSpeech();
    router.push('/play');
  };

  // Triple-tap the logo within 1.5 s → hidden parent dashboard.
  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onLogoTap = () => {
    tapCount.current += 1;
    if (tapCount.current >= 3) {
      tapCount.current = 0;
      if (tapTimer.current) clearTimeout(tapTimer.current);
      router.push('/parent');
      return;
    }
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => { tapCount.current = 0; }, 1500);
  };

  return (
    <div className="home">
      <div
        className="logo"
        onClick={onLogoTap}
        role="button"
        aria-label="Chess Champs"
        style={{ cursor: 'default' }}
      >
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

      <div style={{ display: 'flex', gap: 10, maxWidth: 320, width: '100%' }}>
        <button
          className="btn btn-ghost"
          style={{ flex: 1, fontSize: 16 }}
          onClick={() => router.push('/campaign')}
        >
          📜 Campaign
        </button>
        <button
          className="btn btn-ghost"
          style={{ fontSize: 16, padding: '14px 18px' }}
          onClick={() => router.push('/settings')}
          aria-label="Settings"
        >
          ⚙️
        </button>
      </div>
    </div>
  );
}
