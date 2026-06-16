/**
 * Difficulty bands for the opponent — a 6-band hybrid ladder.
 *
 * The home-grown material-only minimax bot (bot.ts) powers the beatable range
 * (rookie..medium): it counts material and looks shallow, so it plays like a
 * beginner by nature — grabs pieces, misses tactics, hangs its own pieces.
 * Stockfish (stockfishClient.ts) is reserved for the top two bands (hard,
 * insane) as a ceiling, capped to its lowest Elo so it never crushes a kid.
 *
 * Two mistake layers keep it fair AND human-looking:
 *  - `window`: pick uniformly from the engine's top-`window` ranked moves, so
 *    "mistakes" are plausible (a kid missing the best move), not glitches.
 *  - `blunderRate`: a small chance of an outright random giveaway move, applied
 *    to BOTH engines, so the bot occasionally hands over free material.
 *
 * Auto-calibration in progress.ts drops one band on every loss and climbs one
 * band only after 4 wins in a row.
 */
export type Band = 'rookie' | 'novice' | 'easy' | 'medium' | 'hard' | 'insane';

export type EngineKind = 'minimax' | 'stockfish';

export interface BotConfig {
  /** Which engine drives this band. */
  engine: EngineKind;
  /** Search depth — minimax plies, or Stockfish `go depth`. */
  depth: number;
  /** Sample uniformly from the top-`window` ranked moves (1 = always best). */
  window: number;
  /** Small chance of an outright random "giveaway" move (both engines). */
  blunderRate: number;
  /** Stockfish only: cap strength to this Elo via UCI_LimitStrength. */
  elo?: number;
}

export const BANDS: Record<Band, BotConfig> = {
  rookie: { engine: 'minimax',   depth: 2, window: 6, blunderRate: 0.16 },
  novice: { engine: 'minimax',   depth: 3, window: 5, blunderRate: 0.12 },
  easy:   { engine: 'minimax',   depth: 3, window: 4, blunderRate: 0.096 },
  medium: { engine: 'minimax',   depth: 4, window: 3, blunderRate: 0.064 },
  hard:   { engine: 'stockfish', depth: 4, window: 5, blunderRate: 0.10, elo: 1320 },
  insane: { engine: 'stockfish', depth: 4, window: 2, blunderRate: 0.05, elo: 1320 },
};

export const BAND_ORDER: Band[] = ['rookie', 'novice', 'easy', 'medium', 'hard', 'insane'];
