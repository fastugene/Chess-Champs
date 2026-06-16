/**
 * Player progress, stored on-device only (IndexedDB via idb-keyval, with a
 * localStorage fallback). No accounts, no network, no data collection.
 */
import { get, set } from 'idb-keyval';
import type { Chapter } from '@/curriculum/chapters';
import { BAND_ORDER, type Band } from '@/engine/difficulty';

const KEY = 'chess-champs:progress:v1';

export type GameResult = 'win' | 'loss' | 'draw';

export interface Progress {
  currentLevel: number;
  xp: number;
  levelsCompleted: number[];
  /** Champ id -> power level (1..11). */
  champPower: Record<string, number>;
  /** Chapter id -> stars earned so far (tactic landings, capped at starGoal). */
  chapterStars: Record<number, number>;
  /** Chapter ids the player has unlocked. */
  unlockedChapters: number[];
  /** Chapter ids whose primer has auto-shown once (so we don't nag). */
  primersSeen: number[];
  /** Chapter ids the player has already mastered (so we celebrate once). */
  chaptersMastered: number[];
  /**
   * Auto-calibrated difficulty band — adjusts so the son wins 55–65% of
   * recent games. Starts at 'rookie' and drifts upward as he improves.
   */
  botBand: Band;
  /**
   * Last 10 game results (oldest first). Telemetry only now — calibration is
   * driven by `consecutiveWins` (see recordGameResult).
   */
  recentResults: GameResult[];
  /**
   * Wins in a row at the current band. The bot climbs one band only after 4 in
   * a row; any loss or draw resets it to 0.
   */
  consecutiveWins: number;
  /** Current rank tier id (e.g. 'wood', 'stone', 'iron'). */
  rankTier: string;
  /** Division within the tier (3 = lowest, 1 = highest). */
  rankDivision: number;
}

export const DEFAULT_PROGRESS: Progress = {
  currentLevel: 1,
  xp: 0,
  levelsCompleted: [],
  champPower: {},
  chapterStars: {},
  unlockedChapters: [1],
  primersSeen: [],
  chaptersMastered: [],
  botBand: 'rookie',
  recentResults: [],
  consecutiveWins: 0,
  rankTier: 'wood',
  rankDivision: 3,
};

export async function loadProgress(): Promise<Progress> {
  try {
    const fromIdb = await get<Progress>(KEY);
    if (fromIdb) return { ...DEFAULT_PROGRESS, ...fromIdb };
  } catch {
    /* IndexedDB unavailable (e.g. private mode) — fall back below */
  }
  if (typeof localStorage !== 'undefined') {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      try {
        return { ...DEFAULT_PROGRESS, ...(JSON.parse(raw) as Progress) };
      } catch {
        /* corrupt — ignore */
      }
    }
  }
  return { ...DEFAULT_PROGRESS };
}

export async function saveProgress(p: Progress): Promise<void> {
  try {
    await set(KEY, p);
  } catch {
    /* ignore */
  }
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(KEY, JSON.stringify(p));
    } catch {
      /* ignore */
    }
  }
}

/** Mark a level complete, award XP, and power up a Champ. Returns new progress. */
export async function completeLevel(
  levelId: number,
  xpGained: number,
  champId?: string,
): Promise<Progress> {
  const p = await loadProgress();
  if (!p.levelsCompleted.includes(levelId)) p.levelsCompleted.push(levelId);
  p.xp += xpGained;
  p.currentLevel = Math.max(p.currentLevel, levelId + 1);
  if (champId) {
    p.champPower[champId] = Math.min(11, (p.champPower[champId] ?? 1) + 1);
  }
  await saveProgress(p);
  return p;
}

/** Add XP from any source (playing always earns some — never zero). */
export async function addXp(amount: number): Promise<Progress> {
  const p = await loadProgress();
  p.xp += amount;
  await saveProgress(p);
  return p;
}

/**
 * Record one landing of a chapter's tactic (one star), capped at the chapter's
 * star goal. Returns the new progress so the UI can show the updated count.
 */
export async function addStar(chapterId: number, starGoal: number): Promise<Progress> {
  const p = await loadProgress();
  const current = p.chapterStars[chapterId] ?? 0;
  p.chapterStars[chapterId] = Math.min(starGoal, current + 1);
  await saveProgress(p);
  return p;
}

/** Mark a chapter's primer as seen so it doesn't auto-show again. */
export async function markPrimerSeen(chapterId: number): Promise<Progress> {
  const p = await loadProgress();
  if (!p.primersSeen.includes(chapterId)) p.primersSeen.push(chapterId);
  await saveProgress(p);
  return p;
}

/** Unlock a chapter (idempotent). */
export async function unlockChapter(chapterId: number): Promise<Progress> {
  const p = await loadProgress();
  if (!p.unlockedChapters.includes(chapterId)) p.unlockedChapters.push(chapterId);
  await saveProgress(p);
  return p;
}

/** Record that a chapter has been mastered (idempotent). */
export async function markChapterMastered(chapterId: number): Promise<Progress> {
  const p = await loadProgress();
  if (!p.chaptersMastered.includes(chapterId)) p.chaptersMastered.push(chapterId);
  await saveProgress(p);
  return p;
}

/** Stars earned so far for a chapter. */
export function starsFor(p: Progress, chapterId: number): number {
  return p.chapterStars[chapterId] ?? 0;
}

/** Both goals met: tactic landed `starGoal` times AND XP threshold reached. */
export function isChapterComplete(p: Progress, chapter: Chapter): boolean {
  return starsFor(p, chapter.id) >= chapter.starGoal && p.xp >= chapter.xpGoal;
}

// ── Parent settings (stored under a separate key, never shown to the kid) ──

const PARENT_KEY = 'chess-champs:parent:v1';

export interface ParentSettings {
  speechMuted: boolean;
  /** Minimum difficulty band — bot never goes easier than this. */
  bandFloor: Band;
  /** Maximum difficulty band — bot never goes harder than this. */
  bandCeiling: Band;
  /**
   * Blunder training-wheels: warn before a move that clearly hangs material.
   * On by default; auto-retires once the bot climbs past `medium`.
   */
  trainingWheels: boolean;
}

export const DEFAULT_PARENT: ParentSettings = {
  speechMuted: false,
  bandFloor: 'rookie',
  bandCeiling: 'hard',
  trainingWheels: true,
};

export async function loadParentSettings(): Promise<ParentSettings> {
  try {
    const v = await get<ParentSettings>(PARENT_KEY);
    if (v) return { ...DEFAULT_PARENT, ...v };
  } catch { /* ignore */ }
  if (typeof localStorage !== 'undefined') {
    const raw = localStorage.getItem(PARENT_KEY);
    if (raw) {
      try { return { ...DEFAULT_PARENT, ...(JSON.parse(raw) as ParentSettings) }; } catch { /* ignore */ }
    }
  }
  return { ...DEFAULT_PARENT };
}

export async function saveParentSettings(s: ParentSettings): Promise<void> {
  try { await set(PARENT_KEY, s); } catch { /* ignore */ }
  if (typeof localStorage !== 'undefined') {
    try { localStorage.setItem(PARENT_KEY, JSON.stringify(s)); } catch { /* ignore */ }
  }
}

/** Wipe all game progress (keeps parent settings). */
export async function resetProgress(): Promise<void> {
  try { await set(KEY, DEFAULT_PROGRESS); } catch { /* ignore */ }
  if (typeof localStorage !== 'undefined') {
    try { localStorage.setItem(KEY, JSON.stringify(DEFAULT_PROGRESS)); } catch { /* ignore */ }
  }
}

/**
 * Record a game result and auto-calibrate the difficulty band.
 *
 * Streak-driven and tuned to a child's emotional experience:
 *  - loss  → drop one band immediately (responsive — never let frustration build)
 *  - win   → count it; only after 4 wins in a row, climb one band (earned)
 *  - draw  → no band change, but it breaks the win streak
 *
 * Always moves at most one band at a time, and respects the parent's
 * floor/ceiling. `recentResults` is kept for telemetry only.
 */
export async function recordGameResult(result: GameResult): Promise<Progress> {
  const p = await loadProgress();
  const parent = await loadParentSettings();

  p.recentResults = [...p.recentResults, result].slice(-10);

  const idx = BAND_ORDER.indexOf(p.botBand);
  const floorIdx = BAND_ORDER.indexOf(parent.bandFloor);
  const ceilIdx = BAND_ORDER.indexOf(parent.bandCeiling);

  if (result === 'loss') {
    if (idx > floorIdx) p.botBand = BAND_ORDER[idx - 1];
    p.consecutiveWins = 0;
  } else if (result === 'win') {
    p.consecutiveWins += 1;
    if (p.consecutiveWins >= 4) {
      if (idx < ceilIdx) p.botBand = BAND_ORDER[idx + 1];
      p.consecutiveWins = 0;
    }
  } else {
    p.consecutiveWins = 0;
  }

  await saveProgress(p);
  return p;
}
