'use client';

import { useEffect, useRef } from 'react';
import { resumeAudio, playIntroWhoosh, playIntroImpact, playIntroReveal } from '@/audio/sfx';
import { unlockSpeech } from '@/audio/speech';

const INTRO_KEY = 'chess-champs:intro-seen';
const SESSION_KEY = 'chess-champs:intro-session';

export function hasSeenIntro(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(INTRO_KEY) === '1';
}

export function hasSeenIntroThisSession(): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  return sessionStorage.getItem(SESSION_KEY) === '1';
}

function markIntroSeen(): void {
  if (typeof localStorage !== 'undefined') localStorage.setItem(INTRO_KEY, '1');
  if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(SESSION_KEY, '1');
}

// Timeline (ms) — kept ~3s total so a 9-year-old never wants to skip.
const T_IMPACT = 600;   // pieces collide center
const T_MORPH = 620;    // hero glyphs morph into champ cards (staggered)
const T_NAME = 1350;    // "Welcome back" callout
const T_FINISH = 3000;  // auto-dismiss

// Which unicode glyph "morphs" into each champ card (index → card slot).
const HERO_GLYPHS = ['♟', '♞', '♛']; // pawn, knight, queen
const FILLER_GLYPHS = ['♜', '♝', '♚', '♞', '♝']; // rook bishop king knight bishop

/**
 * "The Summoning" first-launch cinematic. Chess pieces streak in from every
 * edge, collide in a burst of light + lightning, and the three hero pieces
 * morph into the champ cards. Synced Web-Audio whoosh / boom / sparkle.
 *
 * skippable=false (first ever launch): no controls, auto-advances.
 * skippable=true (later sessions): "Skip" chip + tap-to-dismiss.
 */
export function IntroAnimation({
  onDone,
  skippable = false,
  pawnName,
}: {
  onDone: () => void;
  skippable?: boolean;
  pawnName?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const starsRef = useRef<HTMLDivElement>(null);
  const piecesRef = useRef<HTMLDivElement>(null);
  const sparksRef = useRef<HTMLDivElement>(null);
  const confettiRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const doneRef = useRef(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    markIntroSeen();
    resumeAudio();
    unlockSpeech();
    onDone();
  };

  useEffect(() => {
    // Audio: try to wake the context now, and again on any pointer (autoplay policy).
    resumeAudio();
    const wake = () => resumeAudio();
    document.addEventListener('pointerdown', wake, { once: true });

    const timers: number[] = [];
    const addT = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms));

    // Twinkling backdrop stars.
    const stars = starsRef.current;
    if (stars) {
      for (let j = 0; j < 20; j++) {
        const s = document.createElement('div');
        s.className = 'intro-star';
        const sz = (Math.random() * 3 + 1.5).toFixed(1);
        s.style.cssText = [
          `width:${sz}px`, `height:${sz}px`,
          `left:${(Math.random() * 96).toFixed(1)}%`,
          `top:${(Math.random() * 96).toFixed(1)}%`,
          `animation:intro-twinkle ${(Math.random() * 3 + 2).toFixed(1)}s ease ${(Math.random() * 3).toFixed(1)}s infinite`,
        ].join(';');
        stars.appendChild(s);
      }
    }

    // Fly the pieces in. Hero glyphs aim at their card slots and morph; fillers
    // converge on the burst point. Geometry measured live so it fits any screen.
    const root = rootRef.current;
    const pieces = piecesRef.current;
    let rafId = 0;
    rafId = window.requestAnimationFrame(() => {
      if (!root || !pieces) return;
      const W = root.clientWidth;
      const H = root.clientHeight;
      const burstX = W / 2;
      const burstY = H * 0.42;

      const launch = (glyph: string, tx: number, ty: number, isHero: boolean, idx: number) => {
        const el = document.createElement('div');
        el.className = 'intro-fly' + (isHero ? ' intro-fly-hero' : '');
        el.textContent = glyph;
        // Start just off a random edge.
        const edge = Math.floor(Math.random() * 4);
        let sx = 0, sy = 0;
        if (edge === 0) { sx = -90; sy = Math.random() * H; }
        else if (edge === 1) { sx = W + 90; sy = Math.random() * H; }
        else if (edge === 2) { sx = Math.random() * W; sy = -90; }
        else { sx = Math.random() * W; sy = H + 90; }
        el.style.left = `${sx}px`;
        el.style.top = `${sy}px`;
        pieces.appendChild(el);
        const dx = tx - sx, dy = ty - sy;
        el.animate(
          [
            { transform: 'translate(0,0) rotate(0) scale(1)', opacity: 0, offset: 0 },
            { opacity: 1, offset: 0.15 },
            { transform: `translate(${dx * 0.6}px,${dy * 0.6}px) rotate(240deg) scale(1.1)`, opacity: 1, offset: 0.6 },
            { transform: `translate(${dx}px,${dy}px) rotate(430deg) scale(${isHero ? 0.7 : 0.3})`, opacity: isHero ? 1 : 0.9, offset: 0.92 },
            { transform: `translate(${dx}px,${dy}px) rotate(450deg) scale(${isHero ? 0.5 : 0.1})`, opacity: 0, offset: 1 },
          ],
          { duration: T_IMPACT - 20, delay: idx * 35, easing: 'cubic-bezier(.55,.05,.7,.25)', fill: 'forwards' },
        );
      };

      // Heroes → measured card centers.
      HERO_GLYPHS.forEach((g, i) => {
        const card = cardRefs.current[i];
        let tx = burstX, ty = burstY + 90;
        if (card) {
          const r = card.getBoundingClientRect();
          const rr = root.getBoundingClientRect();
          tx = r.left - rr.left + r.width / 2;
          ty = r.top - rr.top + r.height / 2;
        }
        launch(g, tx, ty, true, i);
      });
      // Fillers → burst point.
      FILLER_GLYPHS.forEach((g, i) => launch(g, burstX, burstY, false, i + 1));
    });

    // Whoosh as they fly.
    playIntroWhoosh();

    // Impact: boom, flash, rings, sparks, lightning.
    addT(() => {
      playIntroImpact();
      root?.classList.add('intro-impact');
      const sparks = sparksRef.current;
      if (sparks) {
        for (let s = 0; s < 26; s++) {
          const sp = document.createElement('div');
          sp.className = 'intro-spark';
          const ang = (Math.PI * 2 * s) / 26;
          const dist = 90 + Math.random() * 140;
          sp.style.setProperty('--sv', `translate(${(Math.cos(ang) * dist).toFixed(0)}px,${(Math.sin(ang) * dist).toFixed(0)}px)`);
          sp.style.animation = `intro-spark-out ${(0.6 + Math.random() * 0.4).toFixed(2)}s ease both`;
          sparks.appendChild(sp);
        }
      }
      // Confetti rain.
      const cf = confettiRef.current;
      if (cf) {
        const cols = ['#ffc21f', '#2f86ff', '#18c85f', '#ff5d73', '#b06bff', '#ffffff'];
        for (let c = 0; c < 28; c++) {
          const p = document.createElement('div');
          p.className = 'intro-conf';
          p.style.left = `${(Math.random() * 100).toFixed(1)}%`;
          p.style.background = cols[c % cols.length];
          p.style.animation = `intro-conf-fall ${(1.6 + Math.random() * 1.2).toFixed(2)}s linear ${(Math.random() * 0.6).toFixed(2)}s both`;
          cf.appendChild(p);
        }
      }
    }, T_IMPACT);

    // Morph: reveal each champ card from the burst, staggered.
    addT(() => playIntroReveal(), T_MORPH);
    HERO_GLYPHS.forEach((_, i) => {
      addT(() => cardRefs.current[i]?.classList.add('intro-cc-show'), T_MORPH + i * 120);
    });

    addT(finish, T_FINISH);

    return () => {
      timers.forEach(clearTimeout);
      window.cancelAnimationFrame(rafId);
      document.removeEventListener('pointerdown', wake);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={rootRef} className="intro-overlay" onClick={skippable ? finish : undefined}>
      <div className="intro-spotlight" />
      <div ref={starsRef} className="intro-stars" />
      <div ref={confettiRef} className="intro-confetti" />

      {/* lightning bolts — strobe at impact */}
      <svg className="intro-lightning" viewBox="0 0 380 540" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <path d="M190 226 L120 120 L150 130 L70 30" />
        <path d="M190 226 L270 120 L240 132 L320 36" />
        <path d="M190 226 L110 330 L140 320 L60 430" />
        <path d="M190 226 L280 330 L250 322 L330 440" />
      </svg>

      <div ref={piecesRef} className="intro-pieces" />
      <div ref={sparksRef} className="intro-sparks" />
      <div className="intro-flash" />

      {skippable && (
        <button className="intro-skip-btn" onClick={(e) => { e.stopPropagation(); finish(); }}>
          Skip →
        </button>
      )}

      <div className="intro-content">
        <div className="intro-logo">
          <span className="intro-lw intro-lw1">Chess</span>
          <span className="intro-lw intro-lw2">Champs</span>
        </div>
        <div className="intro-sep" />
        {pawnName ? (
          <p className="intro-tagline intro-namecall">Welcome back, {pawnName}!</p>
        ) : (
          <p className="intro-tagline">Summon your champions</p>
        )}

        <div className="intro-champs-row">
          <div className="intro-cc intro-cc-pawn" ref={(el) => { cardRefs.current[0] = el; }}>
            <div className="intro-halo" />
            <div className="intro-art">
              <svg width="50" height="54" viewBox="0 0 52 56" fill="none">
                <circle cx="26" cy="13" r="10" fill="#2f86ff" />
                <rect x="21" y="22" width="10" height="11" rx="2" fill="#2f86ff" />
                <rect x="19" y="32" width="14" height="7" rx="2" fill="#2f86ff" />
                <rect x="15" y="38" width="22" height="9" rx="4" fill="#2f86ff" />
                <circle cx="22" cy="11" r="2.2" fill="#fff" />
                <circle cx="30" cy="11" r="2.2" fill="#fff" />
                <circle cx="22.7" cy="11.7" r="1.1" fill="#080e1a" />
                <circle cx="30.7" cy="11.7" r="1.1" fill="#080e1a" />
                <path d="M22 16 Q26 19.5 30 16" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" fill="none" />
              </svg>
            </div>
            <span className="intro-cn" style={{ color: '#5aa0ff' }}>Scrapper</span>
            <span className="intro-cr" style={{ color: '#5aa0ff' }}>Win material</span>
          </div>

          <div className="intro-cc intro-cc-knight" ref={(el) => { cardRefs.current[1] = el; }}>
            <div className="intro-halo" />
            <div className="intro-art">
              <svg width="50" height="54" viewBox="0 0 52 56" fill="none">
                <path d="M26 5 C20 5 14 10 13 17 C12 23 14 28 18 32 L14 50 L38 50 L34 32 C38 28 40 23 39 17 C38 10 32 5 26 5Z" fill="#18c85f" />
                <path d="M28 5 C32 3 37 6 36 12" stroke="#18c85f" strokeWidth="5" strokeLinecap="round" fill="none" />
                <ellipse cx="20" cy="18" rx="3.5" ry="3" fill="#fff" />
                <ellipse cx="21" cy="18.5" rx="1.5" ry="1.5" fill="#080e1a" />
                <path d="M18 41 L18 49 M26 39 L26 49 M34 41 L34 49 M18 41 Q26 36 34 41" stroke="rgba(255,255,255,.38)" strokeWidth="2" strokeLinecap="round" fill="none" />
              </svg>
            </div>
            <span className="intro-cn" style={{ color: '#3ddc84' }}>Forkmane</span>
            <span className="intro-cr" style={{ color: '#3ddc84' }}>Fork</span>
          </div>

          <div className="intro-cc intro-cc-queen" ref={(el) => { cardRefs.current[2] = el; }}>
            <div className="intro-halo" />
            <div className="intro-art">
              <svg width="50" height="54" viewBox="0 0 52 56" fill="none">
                <path d="M10 46 L14 24 L26 36 L38 24 L42 46Z" fill="#ffc21f" />
                <circle cx="14" cy="21" r="5.5" fill="#ffc21f" />
                <circle cx="26" cy="15" r="6.5" fill="#ffc21f" />
                <circle cx="38" cy="21" r="5.5" fill="#ffc21f" />
                <circle cx="26" cy="15" r="3.4" fill="rgba(255,255,255,.85)" />
                <rect x="10" y="44" width="32" height="6" rx="3" fill="#c98c00" />
              </svg>
            </div>
            <span className="intro-cn" style={{ color: '#ffce4d' }}>Finisher</span>
            <span className="intro-cr" style={{ color: '#ffce4d' }}>Checkmate</span>
          </div>
        </div>

        {skippable && (
          <button className="intro-cta" onClick={(e) => { e.stopPropagation(); finish(); }}>
            ⚔ Play now
          </button>
        )}
      </div>
    </div>
  );
}
