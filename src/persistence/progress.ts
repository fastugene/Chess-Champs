/**
 * Player progress, stored on-device only (IndexedDB via idb-keyval, with a
 * localStorage fallback). No accounts, no network, no data collection.
 */
import { get, set } from 'idb-keyval';
import type { Chapter } from '@/curriculum/chapters';
import { CHAPTERS, chapterForLevel, nextChapter } from '@/curriculum/chapters';
import { levelExists, LAST_LEVEL_ID, FIRST_LEVEL_ID } from '@/curriculum/levels';
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
  /** Optional custom name for the Pawn champ (set by the son). */
  pawnCustomName?: string;
  /**
   * Raw XP counter for the Pawn's promotion journey (separate from main XP).
   * +1 per win-material event. Calibrated so Queen form is only reached near
   * the end of the 30-level campaign (~180 total events across ~90 games).
   */
  pawnXp: number;
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
  pawnXp: 0,
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

/** First level of the next unlocked chapter after `chapterId`, or null if none. */
function firstLevelOfNextChapter(p: Progress, chapterId: number): number | null {
  const nxt = nextChapter(chapterId);
  if (!nxt || !p.unlockedChapters.includes(nxt.id)) return null;
  return nxt.levelIds.find(levelExists) ?? null;
}

/**
 * The level the player should resume into: their current level clamped to a real
 * level whose chapter is unlocked. Prevents `currentLevel` from outrunning the
 * unlocked chapters (so `/play` and `/campaign` always agree) and handles the
 * past-campaign-end overflow (e.g. 31 → 30). If the clamped level is in an
 * already-mastered chapter and the next chapter is unlocked, jumps to the next
 * chapter so the HUD always has a live goal to track.
 */
export function resumeLevel(p: Progress): number {
  const maxUnlocked = Math.max(1, ...p.unlockedChapters);
  let lvl = Math.min(Math.max(p.currentLevel, FIRST_LEVEL_ID), LAST_LEVEL_ID);
  while (lvl > FIRST_LEVEL_ID && chapterForLevel(lvl).id > maxUnlocked) lvl--;
  const ch = chapterForLevel(lvl);
  if (p.chaptersMastered.includes(ch.id)) {
    const next = firstLevelOfNextChapter(p, ch.id);
    if (next != null) return next;
  }
  return lvl;
}

/**
 * Next level to play after winning `levelId`. Advances to the next level when it
 * exists AND its chapter is unlocked; otherwise cycles within the current
 * chapter's levels (for variety) until that chapter is mastered and the next
 * unlocks. Never advances into a locked chapter. If the current chapter is already
 * mastered, skips remaining same-chapter levels and jumps to the next chapter.
 */
export function nextPlayableLevel(p: Progress, levelId: number): number {
  const currentCh = chapterForLevel(levelId);
  if (p.chaptersMastered.includes(currentCh.id)) {
    const next = firstLevelOfNextChapter(p, currentCh.id);
    if (next != null) return next;
  }
  const nextId = levelId + 1;
  if (levelExists(nextId) && p.unlockedChapters.includes(chapterForLevel(nextId).id)) {
    return nextId;
  }
  const ids = currentCh.levelIds.filter(levelExists);
  const idx = ids.indexOf(levelId);
  return ids[(idx + 1) % ids.length] ?? levelId;
}

/** Whether every chapter has been mastered (campaign complete). */
export function isCampaignComplete(p: Progress): boolean {
  return CHAPTERS.every((c) => p.chaptersMastered.includes(c.id));
}

/**
 * Mark a level finished, award XP, power up a Champ. Advances `currentLevel` on a
 * win, OR when the just-played chapter is now mastered (mastery can land on a
 * losing/drawing game — stars are cumulative — and the player has earned the next
 * chapter, so the "Next Chapter!" recap button must actually move them forward).
 * A plain loss/draw in an unmastered chapter still earns XP but never advances.
 * Never past a locked chapter. Returns new progress.
 */
export async function completeLevel(
  levelId: number,
  xpGained: number,
  champId?: string,
  won = true,
): Promise<Progress> {
  const p = await loadProgress();
  if (!p.levelsCompleted.includes(levelId)) p.levelsCompleted.push(levelId);
  p.xp += xpGained;
  const chapterMastered = p.chaptersMastered.includes(chapterForLevel(levelId).id);
  if (won || chapterMastered) p.currentLevel = nextPlayableLevel(p, levelId);
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

/**
 * Award in-play rewards from one move's detected events in a single load/save:
 * add one star if the move landed this chapter's tactic (capped at the goal),
 * and power up each champ whose tactic fired (pawn morph / champ pips).
 * Rank XP is deliberately NOT awarded here — rank comes only from finishing
 * games (see completeLevel), so one capture moves exactly one bar (the champ's).
 * Combining star + champ in one load/save avoids a race on the same event.
 */
export async function awardPlayRewards(opts: {
  chapterId: number;
  starGoal: number;
  addStar: boolean;
  champIds?: string[];
}): Promise<{
  progress: Progress;
  champPowerBefore: Record<string, number>;
  oldPawnXp: number;
  /** True only on the move that crosses the chapter's star goal (drives the celebration). */
  chapterMastered: boolean;
  /** Chapter id newly unlocked by that mastery, if any. */
  unlockedNext?: number;
}> {
  const p = await loadProgress();
  const champPowerBefore: Record<string, number> = {};
  const oldPawnXp = p.pawnXp ?? 0;
  let chapterMastered = false;
  let unlockedNext: number | undefined;
  if (opts.addStar) {
    const current = p.chapterStars[opts.chapterId] ?? 0;
    p.chapterStars[opts.chapterId] = Math.min(opts.starGoal, current + 1);
    // Stars are the single chapter gate: the moment the goal is reached, master
    // the chapter and unlock the next — immediately, not only at game-over.
    if (
      p.chapterStars[opts.chapterId] >= opts.starGoal &&
      !p.chaptersMastered.includes(opts.chapterId)
    ) {
      p.chaptersMastered.push(opts.chapterId);
      chapterMastered = true;
      const nxt = nextChapter(opts.chapterId);
      if (nxt && !p.unlockedChapters.includes(nxt.id)) {
        p.unlockedChapters.push(nxt.id);
        unlockedNext = nxt.id;
      }
    }
  }
  for (const id of opts.champIds ?? []) {
    if (id === 'pawn') {
      // Pawn uses its own long-form XP system rather than the 1-11 champPower counter.
      p.pawnXp = (p.pawnXp ?? 0) + 1;
    } else {
      champPowerBefore[id] = p.champPower[id] ?? 1;
      p.champPower[id] = Math.min(11, (p.champPower[id] ?? 1) + 1);
    }
  }
  await saveProgress(p);
  return { progress: p, champPowerBefore, oldPawnXp, chapterMastered, unlockedNext };
}

/** Power up a single champ. Returns new progress. */
export async function powerUpChamp(champId: string): Promise<Progress> {
  const p = await loadProgress();
  p.champPower[champId] = Math.min(11, (p.champPower[champId] ?? 1) + 1);
  await saveProgress(p);
  return p;
}

/** Set the son's custom name for his Pawn champ (trimmed, max 20 chars). */
export async function setPawnCustomName(name: string): Promise<Progress> {
  const p = await loadProgress();
  p.pawnCustomName = name.trim().slice(0, 20) || undefined;
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

/**
 * Chapter mastery gate: land the chapter's tactic `starGoal` times. Stars are the
 * single source of truth for progression — XP is a global rank score only, never a
 * gate (it used to double-gate here, which let the HUD show nonsense like 1270/300).
 */
export function isChapterComplete(p: Progress, chapter: Chapter): boolean {
  return starsFor(p, chapter.id) >= chapter.starGoal;
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

/** Min games at the current band before calibration may move it. */
const CALIB_MIN_GAMES = 3;
/** Climb when recent win-rate at this band is at/above this (too easy). */
const CALIB_CLIMB_RATE = 0.67;
/** Drop when recent win-rate at this band is at/below this (too hard). */
const CALIB_DROP_RATE = 0.34;

/**
 * Record a game result and auto-calibrate the difficulty band toward the
 * 55–65% win target.
 *
 * Win-rate driven over a BAND-LOCAL window (`recentResults` is cleared on every
 * band change, so the rate always reflects the current band):
 *  - rate ≥ 0.67 over ≥3 games → climb one band (he's stomping it)
 *  - rate ≤ 0.34 over ≥3 games → drop one band (it's frustrating)
 *  - otherwise hold — he's in the target band
 *
 * The 0.34–0.67 hysteresis brackets the 55–65% goal and prevents thrashing. A
 * kid winning ~70% now climbs every ~3 games (the old 4-in-a-row rule stalled
 * whenever a loss broke the streak). Always moves at most one band at a time and
 * respects the parent's floor/ceiling. `consecutiveWins` is kept for telemetry.
 */
export async function recordGameResult(result: GameResult): Promise<Progress> {
  const p = await loadProgress();
  const parent = await loadParentSettings();

  p.recentResults = [...p.recentResults, result].slice(-10);
  p.consecutiveWins = result === 'win' ? p.consecutiveWins + 1 : 0;

  const idx = BAND_ORDER.indexOf(p.botBand);
  const floorIdx = BAND_ORDER.indexOf(parent.bandFloor);
  const ceilIdx = BAND_ORDER.indexOf(parent.bandCeiling);

  const games = p.recentResults.length;
  if (games >= CALIB_MIN_GAMES) {
    const wins = p.recentResults.filter((r) => r === 'win').length;
    const rate = wins / games;
    if (rate >= CALIB_CLIMB_RATE && idx < ceilIdx) {
      p.botBand = BAND_ORDER[idx + 1];
      p.recentResults = []; // fresh read at the new band
    } else if (rate <= CALIB_DROP_RATE && idx > floorIdx) {
      p.botBand = BAND_ORDER[idx - 1];
      p.recentResults = [];
    }
  }

  await saveProgress(p);
  return p;
}
