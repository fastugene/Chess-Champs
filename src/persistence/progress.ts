/**
 * Player progress, stored on-device only (IndexedDB via idb-keyval, with a
 * localStorage fallback). No accounts, no network, no data collection.
 */
import { get, set } from 'idb-keyval';

const KEY = 'chess-champs:progress:v1';

export interface Progress {
  currentLevel: number;
  xp: number;
  levelsCompleted: number[];
  /** Champ id -> power level (1..11). */
  champPower: Record<string, number>;
}

export const DEFAULT_PROGRESS: Progress = {
  currentLevel: 1,
  xp: 0,
  levelsCompleted: [],
  champPower: {},
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
