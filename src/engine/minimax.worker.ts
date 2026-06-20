/// <reference lib="webworker" />
/**
 * Web Worker that runs the minimax search OFF the UI thread.
 *
 * The negamax search is pure CPU; running it here means the board, animations,
 * and taps stay fully responsive no matter how long (or deep) the search runs.
 * Because nothing it does can freeze the screen, engineClient grants it a much
 * larger time budget than the main-thread path (see MINIMAX_BUDGET_MS) so the
 * midgame search reaches meaningfully deeper.
 *
 * Protocol: receive { id, fen, band, budgetMs } → post { id, move }. The `id`
 * lets the client ignore stale replies (race-safe). chess.js and bot.ts are
 * pure/no-DOM, so they import and run here unchanged.
 */
import { chooseBotMove, type SimpleMove } from './bot';
import type { Band } from './difficulty';

interface Req {
  id: number;
  fen: string;
  band: Band;
  budgetMs: number;
}
interface Res {
  id: number;
  move: SimpleMove | null;
}

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = (e: MessageEvent<Req>) => {
  const { id, fen, band, budgetMs } = e.data;
  let move: SimpleMove | null = null;
  try {
    move = chooseBotMove(fen, band, budgetMs);
  } catch {
    move = null; // client falls back to the synchronous bot
  }
  const res: Res = { id, move };
  ctx.postMessage(res);
};
