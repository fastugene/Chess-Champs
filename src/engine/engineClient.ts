/**
 * The single interface the game uses to ask the opponent for a move.
 *
 * Keeping this async and tiny means Phase 2 can drop in a Stockfish Web Worker
 * (src/engine/stockfish.worker.ts) without touching the game store. We also add
 * a short, natural "thinking" pause so moves don't feel instant/robotic.
 */
import { chooseBotMove, type SimpleMove } from './bot';
import type { Band } from './difficulty';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getBotMove(fen: string, band: Band): Promise<SimpleMove | null> {
  await delay(420 + Math.random() * 380);
  return chooseBotMove(fen, band);
}
