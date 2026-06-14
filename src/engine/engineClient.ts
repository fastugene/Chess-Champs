/**
 * The single interface the game uses to ask the opponent for a move.
 *
 * Phase 2: tries Stockfish (WASM Web Worker) first; if it returns null
 * (loading, unsupported, or timed-out) falls back to the in-app minimax bot.
 * A natural "thinking" pause is added so moves don't feel instant/robotic.
 */
import { stockfishMove } from './stockfishClient';
import { chooseBotMove, type SimpleMove } from './bot';
import { BANDS, type Band } from './difficulty';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getBotMove(fen: string, band: Band): Promise<SimpleMove | null> {
  const cfg = BANDS[band];

  // Run Stockfish and the minimum think-delay concurrently so we never wait
  // longer than necessary, but always at least 400–800 ms (feels natural).
  const [sfMove] = await Promise.all([
    stockfishMove(fen, cfg.skillLevel, cfg.depth),
    delay(400 + Math.random() * 400),
  ]);

  if (sfMove) return sfMove;

  // Stockfish unavailable — fall back to the minimax bot.
  return chooseBotMove(fen, band);
}
