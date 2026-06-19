'use client';

import { useEffect, useRef } from 'react';
import { ChampArt } from '@/components/champs/ChampArt';
import { CHAMPS } from '@/progression/champs';
import { playIntroReveal } from '@/audio/sfx';
import type { Chapter } from '@/curriculum/chapters';

const T_DONE = 2500;

/**
 * A short (~2.5s) title-card the first time the kid enters a chapter. The mentor
 * champ scales in with a glow, the chapter title slams down, and the tactic name
 * ribbons up — then it flows straight into the existing 5-beat tutorial. Always
 * tappable to skip (it's seen once per chapter across the campaign). Reuses the
 * intro/evolve effect CSS toolkit; no persistence here (the caller gates on
 * primersSeen, same as the tutorial).
 */
export function ChapterIntro({ chapter, onDone }: { chapter: Chapter; onDone: () => void }) {
  const doneRef = useRef(false);
  const sparksRef = useRef<HTMLDivElement>(null);
  const accent = CHAMPS[chapter.mentor]?.color ?? '#ffc21f';

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  };

  useEffect(() => {
    playIntroReveal();
    // Spark burst behind the mentor champ.
    const sparks = sparksRef.current;
    if (sparks) {
      for (let s = 0; s < 16; s++) {
        const sp = document.createElement('div');
        sp.className = 'intro-spark';
        const ang = (Math.PI * 2 * s) / 16;
        const dist = 70 + Math.random() * 90;
        sp.style.background = accent;
        sp.style.boxShadow = `0 0 8px ${accent}`;
        sp.style.setProperty('--sv', `translate(${(Math.cos(ang) * dist).toFixed(0)}px,${(Math.sin(ang) * dist).toFixed(0)}px)`);
        sp.style.animation = `intro-spark-out ${(0.6 + Math.random() * 0.4).toFixed(2)}s ease .5s both`;
        sparks.appendChild(sp);
      }
    }
    const t = window.setTimeout(finish, T_DONE);
    return () => window.clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="overlay chapter-intro" onClick={finish}>
      <div className="chapter-intro-sweep" />
      <div className="chapter-intro-card">
        <div className="chapter-intro-kicker" style={{ color: accent }}>
          Chapter {chapter.id}
        </div>
        <h2 className="chapter-intro-title">{chapter.title}</h2>

        <div className="chapter-intro-champ-wrap">
          <div className="intro-sparks" ref={sparksRef} />
          <div
            className="chapter-intro-halo"
            style={{ boxShadow: `0 0 30px 6px ${accent}88` }}
          />
          <div className="chapter-intro-champ">
            <ChampArt champId={chapter.mentor} size={132} showGlow />
          </div>
        </div>

        <div className="chapter-intro-ribbon" style={{ borderColor: accent, color: accent }}>
          Learn the {chapter.tactic}!
        </div>
        <div className="chapter-intro-tap">Tap to begin</div>
      </div>
    </div>
  );
}
