/**
 * All sound is synthesised live with the Web Audio API — no audio files to ship,
 * fully offline, and tiny. Each effect is a couple of quick oscillator "blips"
 * with a short envelope so nothing is harsh on a kid's ears.
 *
 * resumeAudio() must be called from a user gesture (tap) before the first sound,
 * because mobile browsers start the AudioContext suspended.
 */
let ctx: AudioContext | null = null;
let muted = false;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC: typeof AudioContext | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

export function resumeAudio(): void {
  const c = getCtx();
  if (c && c.state === 'suspended') void c.resume();
}

export function setMuted(value: boolean): void {
  muted = value;
}

interface Blip {
  freq: number;
  /** seconds from now */
  at: number;
  /** seconds */
  dur: number;
  type?: OscillatorType;
  vol?: number;
}

function play(blips: Blip[]): void {
  if (muted) return;
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;
  for (const b of blips) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = b.type ?? 'sine';
    osc.frequency.setValueAtTime(b.freq, now + b.at);
    const vol = b.vol ?? 0.18;
    gain.gain.setValueAtTime(0.0001, now + b.at);
    gain.gain.exponentialRampToValueAtTime(vol, now + b.at + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + b.at + b.dur);
    osc.connect(gain).connect(c.destination);
    osc.start(now + b.at);
    osc.stop(now + b.at + b.dur + 0.02);
  }
}

export type SoundName =
  | 'select'
  | 'move'
  | 'capture'
  | 'check'
  | 'reward'
  | 'powerup'
  | 'win'
  | 'lose';

export function playSound(name: SoundName): void {
  switch (name) {
    case 'select':
      play([{ freq: 520, at: 0, dur: 0.06, type: 'triangle', vol: 0.08 }]);
      break;
    case 'move':
      play([{ freq: 320, at: 0, dur: 0.08, type: 'triangle', vol: 0.12 }]);
      break;
    case 'capture':
      play([
        { freq: 180, at: 0, dur: 0.1, type: 'square', vol: 0.14 },
        { freq: 90, at: 0.04, dur: 0.12, type: 'square', vol: 0.12 },
      ]);
      break;
    case 'check':
      play([{ freq: 660, at: 0, dur: 0.12, type: 'sawtooth', vol: 0.12 }]);
      break;
    case 'reward':
      // bright rising arpeggio
      play([
        { freq: 523, at: 0, dur: 0.1, type: 'triangle' },
        { freq: 659, at: 0.08, dur: 0.1, type: 'triangle' },
        { freq: 784, at: 0.16, dur: 0.14, type: 'triangle' },
      ]);
      break;
    case 'powerup':
      play([
        { freq: 392, at: 0, dur: 0.1, type: 'square', vol: 0.12 },
        { freq: 523, at: 0.09, dur: 0.1, type: 'square', vol: 0.12 },
        { freq: 659, at: 0.18, dur: 0.1, type: 'square', vol: 0.12 },
        { freq: 1047, at: 0.27, dur: 0.2, type: 'triangle', vol: 0.14 },
      ]);
      break;
    case 'win':
      play([
        { freq: 523, at: 0, dur: 0.14, type: 'triangle' },
        { freq: 659, at: 0.13, dur: 0.14, type: 'triangle' },
        { freq: 784, at: 0.26, dur: 0.14, type: 'triangle' },
        { freq: 1047, at: 0.39, dur: 0.28, type: 'triangle', vol: 0.2 },
      ]);
      break;
    case 'lose':
      // gentle, never harsh — losing is framed as growth
      play([
        { freq: 392, at: 0, dur: 0.18, type: 'sine', vol: 0.12 },
        { freq: 330, at: 0.16, dur: 0.26, type: 'sine', vol: 0.12 },
      ]);
      break;
  }
}

/**
 * Escalating kill-streak sting (Brawl Stars "rising pitch" + Dota 2 "deep hit").
 * Each successive kill (level 2, 3, 4, …) plays higher, brighter, and with more
 * notes; from level 4 we add a low sub-bass thump for announcer-style weight.
 * `level` is the streak count (2 = double kill, 3 = triple, …).
 */
export function playKillStreak(level: number): void {
  const tier = Math.min(Math.max(level, 2), 6); // 2..6
  // Root climbs a few semitones per tier (≈ 1.122x = 2 semitones).
  const root = 523 * Math.pow(1.122, (tier - 2) * 2);
  const notes = Math.min(tier, 5); // more notes the higher the streak
  const step = 0.07;
  const bright: OscillatorType = tier >= 4 ? 'square' : 'triangle';

  const blips: Blip[] = [];
  for (let i = 0; i < notes; i++) {
    blips.push({
      freq: root * Math.pow(1.26, i), // rising major-ish arpeggio
      at: i * step,
      dur: 0.12,
      type: bright,
      vol: 0.16,
    });
  }
  // Final accent note, an octave up, a touch longer.
  blips.push({ freq: root * 2.2, at: notes * step, dur: 0.2, type: 'triangle', vol: 0.18 });

  // Deep "boom" weight at higher tiers (the Dota announcer thump).
  if (tier >= 4) {
    blips.push({ freq: 84 - (tier - 4) * 6, at: 0, dur: 0.26, type: 'sine', vol: 0.22 });
  }
  play(blips);
}
