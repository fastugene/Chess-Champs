'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChampArt } from '@/components/champs/ChampArt';
import { PawnRoadmap } from '@/components/champs/PawnRoadmap';
import { GrowthExplainer } from '@/components/champs/GrowthExplainer';
import { resumeAudio } from '@/audio/sfx';
import { unlockSpeech } from '@/audio/speech';
import { loadProgress } from '@/persistence/progress';
import { getRank } from '@/progression/ranks';
import { getChampDisplayName, pawnFormMeta, pawnStage } from '@/progression/champs';
import { IntroAnimation, hasSeenIntro, hasSeenIntroThisSession } from '@/components/onboarding/IntroAnimation';

export default function Home() {
  const router = useRouter();
  const [rankDisplay, setRankDisplay] = useState('Wood III');
  const [rankBadge, setRankBadge] = useState('🪵');
  const [rankColor, setRankColor] = useState('#a07850');
  const [pawnXp, setPawnXp] = useState(0);
  const [pawnCustomName, setPawnCustomName] = useState<string | undefined>(undefined);
  const [showGrowth, setShowGrowth] = useState(false);
  // 'init' = deciding (renders a dark placeholder so home never flashes first),
  // 'intro' = playing the cinematic, 'home' = the start screen.
  const [phase, setPhase] = useState<'init' | 'intro' | 'home'>('init');
  const [introSkippable, setIntroSkippable] = useState(false);

  useEffect(() => {
    if (hasSeenIntroThisSession()) {
      setPhase('home');
    } else {
      setIntroSkippable(hasSeenIntro());
      setPhase('intro');
    }
    void loadProgress().then((p) => {
      const rank = getRank(p.xp, p.chaptersMastered);
      setRankDisplay(rank.displayName);
      setRankBadge(rank.tier.badge);
      setRankColor(rank.tier.color);
      setPawnXp(p.pawnXp ?? 0);
      setPawnCustomName(p.pawnCustomName);
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

  // Deciding which screen to show — a dark placeholder (matches the intro/home
  // backdrop) so the start screen never flashes before the cinematic.
  if (phase === 'init') {
    return <div className="intro-placeholder" aria-hidden />;
  }

  // The cinematic plays in place of home, then flows straight into it on done.
  if (phase === 'intro') {
    return (
      <IntroAnimation
        skippable={introSkippable}
        pawnName={pawnCustomName}
        onDone={() => setPhase('home')}
      />
    );
  }

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
        <ChampArt champId="pawn" size={86} power={pawnXp} />
        <ChampArt champId="knight" size={108} />
        <ChampArt champId="queen" size={86} />
      </div>
      {pawnCustomName && (
        <div className="pawn-name-tag">{pawnCustomName} · {pawnFormMeta(pawnStage(pawnXp).form).label}</div>
      )}

      <PawnRoadmap xp={pawnXp} />

      <button className="growth-help-btn" onClick={() => setShowGrowth(true)}>
        ❓ How you grow
      </button>

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
          style={{ flex: 1, fontSize: 16 }}
          onClick={() => router.push('/squad')}
        >
          🛡️ Squad
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

      {showGrowth && <GrowthExplainer pawnXp={pawnXp} onClose={() => setShowGrowth(false)} />}
    </div>
  );
}
