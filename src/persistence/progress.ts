/**
 * Player progress, stored on-device only (IndexedDB via idb-keyval, with a
 * localStorage fallback). No accounts, no network, no data collection.
 */
import { get, set } from 'idb-keyval';
import type { Chapter } from '@/curriculum/chapters';

const KEY = 'chess-champs:progress:v1';

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
