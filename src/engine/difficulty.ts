/**
 * Difficulty bands for the opponent.
 *
 * Phase 1: in-app minimax (bot.ts). Each band trades search depth against a
 * "blunder rate" — the chance the bot just plays a random legal move.
 * Phase 2: Stockfish WASM Web Worker. skillLevel (0-20) controls strength;
 * depth caps the search so it stays snappy on mobile.
 * Auto-calibration in progress.ts adjusts the active band to keep the son
 * winning 55–65% of games without feeling a floor.
 */
export type Band = 'rookie' | 'easy' | 'medium' | 'hard';

export interface BotConfig {
  /** Stockfish Skill Level (0 = weakest, 20 = full strength). */
  skillLevel: number;
  /** Max search depth in plies — keeps mobile latency acceptable. */
  depth: number;
  /** Minimax fallback: probability of a random legal move instead of searched. */
  blunderRate: number;
  /** Minimax fallback: pick randomly from the top-K searched moves. */
  topK: number;
}

export const BANDS: Record<Band, BotConfig> = {
  rookie: { skillLevel: 1,  depth: 5,  blunderRate: 0.40, topK: 5 },
  easy:   { skillLevel: 4,  depth: 7,  blunderRate: 0.25, topK: 4 },
  medium: { skillLevel: 8,  depth: 9,  blunderRate: 0.12, topK: 2 },
  hard:   { skillLevel: 13, depth: 11, blunderRate: 0.04, topK: 1 },
};

export const BAND_ORDER: Band[] = ['rookie', 'easy', 'medium', 'hard'];
