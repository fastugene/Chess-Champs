/**
 * Difficulty bands for the opponent — a 6-band hybrid ladder.
 *
 * The home-grown minimax bot (bot.ts) powers the beatable range (rookie..medium):
 * it searches material + a band-scaled positional term (piece-square tables), so
 * the lower bands play like beginners by nature — grab pieces, miss tactics, hang
 * their own — while higher bands also develop, castle, and centralise.
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
  /**
   * Minimax only: positional-eval weight 0..1 (bot.ts). 0 = pure material
   * grabber (authentic beginner); 1 = full piece-square-table intuition
   * (develops, castles, centralises). Ignored by Stockfish bands.
   */
  positional?: number;
  /** Stockfish only: cap strength to this Elo via UCI_LimitStrength. */
  elo?: number;
}

export const BANDS: Record<Band, BotConfig> = {
  rookie: { engine: 'minimax',   depth: 3, window: 4, blunderRate: 0.12, positional: 0 },
  novice: { engine: 'minimax',   depth: 5, window: 3, blunderRate: 0.09, positional: 0.35 },
  easy:   { engine: 'minimax',   depth: 5, window: 2, blunderRate: 0.06, positional: 0.6 },
  medium: { engine: 'minimax',   depth: 8, window: 1, blunderRate: 0.03, positional: 1.0 },
  // Stockfish bands stay capped at its floor Elo 1320; the tighter window +
  // lower blunder make `hard` stronger than `medium` (was paradoxically weaker).
  // `positional` is inert here (Stockfish has its own eval).
  hard:   { engine: 'stockfish', depth: 4, window: 3, blunderRate: 0.05, elo: 1320 },
  insane: { engine: 'stockfish', depth: 4, window: 2, blunderRate: 0.03, elo: 1320 },
};

export const BAND_ORDER: Band[] = ['rookie', 'novice', 'easy', 'medium', 'hard', 'insane'];
