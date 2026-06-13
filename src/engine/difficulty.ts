/**
 * Difficulty bands for the opponent.
 *
 * Phase 1 uses a small in-app search (see ./bot.ts). Each band trades search
 * depth against a "blunder rate" — the chance the bot just plays a random legal
 * move, which mimics how a kid hangs a piece. Higher blunder rate = easier and,
 * importantly, leaves free pieces for the player to practise grabbing.
 *
 * Phase 2 swaps the search for Stockfish (WASM, Web Worker) behind the same
 * getBotMove() interface, and adds auto-calibration to a 55-65% win band.
 */
export type Band = 'rookie' | 'easy' | 'medium' | 'hard';

export interface BotConfig {
  /** Search depth in plies. */
  depth: number;
  /** Probability of playing a random legal move instead of a searched one. */
  blunderRate: number;
  /** Pick randomly among the top-K searched moves (variety). */
  topK: number;
}

export const BANDS: Record<Band, BotConfig> = {
  rookie: { depth: 2, blunderRate: 0.4, topK: 5 },
  easy: { depth: 2, blunderRate: 0.25, topK: 4 },
  medium: { depth: 3, blunderRate: 0.12, topK: 2 },
  hard: { depth: 3, blunderRate: 0.04, topK: 1 },
};
