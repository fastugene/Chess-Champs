/**
 * Tiny haptics wrapper around the Vibration API (Android/Chrome). iOS Safari
 * ignores navigator.vibrate, so these are a progressive enhancement — the game
 * never depends on them.
 */
export function vibrate(pattern: number | number[]): void {
  if (typeof navigator === 'undefined') return;
  if (!('vibrate' in navigator)) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* some browsers throw if called without a user gesture — ignore */
  }
}

export const HAPTIC = {
  move: 8,
  capture: [0, 18, 30, 18] as number[],
  reward: [0, 14, 24, 24] as number[],
  powerup: [0, 12, 20, 12, 20, 30] as number[],
  win: [0, 26, 40, 26, 40, 60] as number[],
};

/**
 * Escalating buzz for a kill streak — more, longer pulses the higher the streak
 * (level 2 = double kill, up). Caps so it never feels obnoxious.
 */
export function killStreakHaptic(level: number): number[] {
  const tier = Math.min(Math.max(level, 2), 6);
  const pattern: number[] = [];
  for (let i = 0; i < tier; i++) {
    pattern.push(0, 18 + i * 6, 26);
  }
  return pattern;
}
