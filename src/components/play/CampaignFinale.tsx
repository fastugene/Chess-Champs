'use client';

import { useEffect, useRef } from 'react';
import { ChampArt } from '@/components/champs/ChampArt';
import { CHAMPS } from '@/progression/champs';
import { playIntroImpact, playIntroReveal, playSound } from '@/audio/sfx';

// Parade order — the whole squad, common → epic.
const SQUAD = ['pawn', 'knight', 'bishop', 'rook', 'unseen', 'queen'];

/**
 * The big payoff when every chapter is mastered. Trophy slams in with a
 * shockwave, the title lands, the whole squad parades in staggered with glowing
 * halos, and confetti + fireworks loop. Reuses the intro/evolve effect CSS.
 * Replaces the old static "Campaign Complete!" card.
 */
export function CampaignFinale({
  pawnName,
  onHome,
  onSquad,
}: {
  pawnName?: string;
  onHome: () => void;
  onSquad: () => void;
}) {
  const confettiRef = useRef<HTMLDivElement>(null);
  const fireworksRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    playIntroImpact();
    const timers: number[] = [];
    timers.push(window.setTimeout(() => { playSound('win'); playIntroReveal(); }, 700));

    // Confetti rain.
    const cf = confettiRef.current;
    if (cf) {
      const cols = ['#ffc21f', '#2f86ff', '#18c85f', '#ff5d73', '#b06bff', '#ffffff'];
      for (let c = 0; c < 36; c++) {
        const p = document.createElement('div');
        p.className = 'intro-conf';
        p.style.left = `${(Math.random() * 100).toFixed(1)}%`;
        p.style.background = cols[c % cols.length];
        p.style.animation = `intro-conf-fall ${(1.8 + Math.random() * 1.4).toFixed(2)}s linear ${(Math.random() * 1.2).toFixed(2)}s infinite`;
        cf.appendChild(p);
      }
    }

    // Repeating firework spark bursts.
    const fw = fireworksRef.current;
    const launchFirework = () => {
      if (!fw) return;
      const cx = 12 + Math.random() * 76;
      const cy = 10 + Math.random() * 45;
      const col = ['#ffc21f', '#ff5d73', '#5ad1e6', '#b06bff'][Math.floor(Math.random() * 4)];
      for (let s = 0; s < 12; s++) {
        const sp = document.createElement('div');
        sp.className = 'finale-firework';
        const ang = (Math.PI * 2 * s) / 12;
        const dist = 40 + Math.random() * 40;
        sp.style.left = `${cx}%`;
        sp.style.top = `${cy}%`;
        sp.style.background = col;
        sp.style.boxShadow = `0 0 8px ${col}`;
        sp.style.setProperty('--fx', `${(Math.cos(ang) * dist).toFixed(0)}px`);
        sp.style.setProperty('--fy', `${(Math.sin(ang) * dist).toFixed(0)}px`);
        sp.style.animation = 'finale-firework-out .9s ease both';
        fw.appendChild(sp);
        window.setTimeout(() => sp.remove(), 950);
      }
    };
    const fwTimer = window.setInterval(launchFirework, 650);
    timers.push(window.setTimeout(launchFirework, 900));

    return () => {
      timers.forEach(clearTimeout);
      window.clearInterval(fwTimer);
    };
  }, []);

  const heroName = pawnName ? `${pawnName} and the squad are` : 'Your whole squad is';

  return (
    <div className="overlay finale-overlay">
      <div className="finale-confetti" ref={confettiRef} />
      <div className="finale-fireworks" ref={fireworksRef} />
      <div className="finale-flash" />

      <div className="finale-card">
        <div className="finale-trophy">🏆</div>
        <div className="finale-burst" />
        <h2 className="finale-title">Champion!</h2>
        <p className="finale-subtitle">Campaign Complete</p>

        <div className="finale-squad">
          {SQUAD.map((id, i) => (
            <div
              key={id}
              className="finale-champ"
              style={{ animationDelay: `${1 + i * 0.18}s` }}
            >
              <div
                className="finale-champ-halo"
                style={{ boxShadow: `0 0 18px 3px ${CHAMPS[id]?.color ?? '#fff'}88` }}
              />
              <ChampArt champId={id} size={56} showGlow />
            </div>
          ))}
        </div>

        <p className="finale-msg">
          You mastered every chapter and became a Chess Legend. {heroName} powered up!
        </p>

        <div className="card-actions" style={{ marginTop: 14 }}>
          <button className="btn btn-ghost" onClick={onSquad}>See Squad</button>
          <button className="btn btn-primary" onClick={onHome}>Home</button>
        </div>
      </div>
    </div>
  );
}
