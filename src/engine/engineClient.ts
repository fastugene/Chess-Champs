/**
 * The single interface the game uses to ask the opponent for a move.
 *
 * Hybrid engine (see difficulty.ts): low bands run the in-app minimax bot,
 * the top two bands run Stockfish (WASM Web Worker) capped to its lowest Elo.
 * Either way, two mistake layers keep it beatable and human-looking:
 *  1. a small `blunderRate` chance of an outright random giveaway move, and
 *  2. otherwise, sampling uniformly from the engine's top-`window` ranked moves.
 * A natural "thinking" pause is added so moves don't feel instant/robotic.
 */
import { Chess } from 'chess.js';
import { stockfishRankedMoves } from './stockfishClient';
import { chooseBotMove, type SimpleMove } from './bot';
import { minimaxMove } from './minimaxClient';
import { BANDS, type Band } from './difficulty';

/**
 * Wall-clock budget for the minimax search when it runs in the Web Worker.
 * Larger than bot.ts's 600 ms main-thread default because off-thread it can't
 * freeze the UI — this buys the midgame search a few extra plies. Tunable: this
 * is the bot's reply time, not a freeze; drop it if a kid finds it slow.
 */
const MINIMAX_BUDGET_MS = 1500;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** A fully random legal move — the occasional "giveaway" blunder. */
function randomLegalMove(fen: string): SimpleMove | null {
  const g = new Chess(fen);
  const moves = g.moves({ verbose: true });
  if (moves.length === 0) return null;
  const m = moves[Math.floor(Math.random() * moves.length)];
  return { from: m.from, to: m.to, promotion: m.promotion as SimpleMove['promotion'] };
}

/** Pick uniformly from the top-`window` ranked moves. */
function pickFromWindow(moves: SimpleMove[], window: number): SimpleMove | null {
  if (moves.length === 0) return null;
  const k = Math.min(window, moves.length);
  return moves[Math.floor(Math.random() * k)];
}

export async function getBotMove(fen: string, band: Band): Promise<SimpleMove | null> {
  const cfg = BANDS[band];

  // Always wait at least 400–800 ms so the reply feels considered, not instant.
  const think = delay(400 + Math.random() * 400);

  // 1. Small chance of an outright random giveaway — applies to BOTH engines.
  if (Math.random() < cfg.blunderRate) {
    const blunder = randomLegalMove(fen);
    if (blunder) {
      await think;
      return blunder;
    }
  }

  // 2. Otherwise: a near-best move from the configured engine.
  if (cfg.engine === 'stockfish') {
    const [ranked] = await Promise.all([
      stockfishRankedMoves(fen, { depth: cfg.depth, elo: cfg.elo, multiPV: cfg.window }),
      think,
    ]);
    const pick = pickFromWindow(ranked, cfg.window);
    if (pick) return pick;
    // Stockfish unavailable — fall back to the minimax bot.
    return chooseBotMove(fen, band);
  }

  // Minimax bands run in a Web Worker (off the UI thread, so the board never
  // freezes); the compute overlaps the "thinking" floor. minimaxMove falls back
  // to the synchronous bot if the worker is unavailable.
  const [move] = await Promise.all([minimaxMove(fen, band, MINIMAX_BUDGET_MS), think]);
  return move;
}
