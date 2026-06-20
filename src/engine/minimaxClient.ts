/**
 * Singleton wrapper for the minimax Web Worker (browser-only).
 *
 * Mirrors stockfishClient's shape: lazy-init a single worker, run one search at
 * a time, and ALWAYS degrade gracefully — on SSR, no Worker support, init
 * failure, or a worker that never replies, we fall back to the SYNCHRONOUS
 * `chooseBotMove` (the old on-thread 600 ms path). So the game can never block
 * or wedge, regardless of the worker's state.
 *
 * Each request carries an incrementing `id`; replies whose id ≠ the latest are
 * ignored (the kid may have moved again, or the game reset). gameStore's
 * `scheduleBot` also discards stale replies via its own fen guard.
 */
import { chooseBotMove, type SimpleMove } from './bot';
import type { Band } from './difficulty';

let worker: Worker | null = null;
let triedInit = false;
let seq = 0;
let pending: { id: number; resolve: (m: SimpleMove | null) => void } | null = null;

/** Create the worker once. Returns null if unavailable (caller uses sync bot). */
function getWorker(): Worker | null {
  if (worker) return worker;
  if (triedInit) return null; // already failed once — don't keep retrying
  triedInit = true;
  if (typeof window === 'undefined' || typeof Worker === 'undefined') return null;
  try {
    worker = new Worker(new URL('./minimax.worker.ts', import.meta.url));
    worker.onmessage = (e: MessageEvent<{ id: number; move: SimpleMove | null }>) => {
      const data = e.data;
      if (pending && data.id === pending.id) {
        const { resolve } = pending;
        pending = null;
        resolve(data.move);
      }
    };
    worker.onerror = () => {
      // Recycle on error; the next call re-inits or falls back to sync.
      worker?.terminate();
      worker = null;
      triedInit = false;
    };
    return worker;
  } catch {
    worker = null;
    return null;
  }
}

/**
 * Ask the worker for a move; resolve with the synchronous bot if the worker is
 * unavailable or doesn't answer in time. Never rejects, never blocks the game.
 */
export function minimaxMove(fen: string, band: Band, budgetMs: number): Promise<SimpleMove | null> {
  const w = getWorker();
  if (!w) return Promise.resolve(chooseBotMove(fen, band));

  const id = ++seq;
  return new Promise<SimpleMove | null>((resolve) => {
    // If a previous search is still pending (race), abandon it — only the latest
    // request matters.
    if (pending) pending.resolve(chooseBotMove(fen, band));

    let settled = false;
    const finish = (m: SimpleMove | null) => {
      if (settled) return;
      settled = true;
      resolve(m);
    };

    pending = {
      id,
      resolve: (m) => finish(m),
    };

    // Safety net: if the worker never replies (wedged/crashed), fall back to the
    // synchronous bot so the kid always gets a move. Generous margin over budget.
    setTimeout(() => {
      if (!settled && pending?.id === id) {
        pending = null;
        finish(chooseBotMove(fen, band));
        // Worker looks unhealthy — recycle it for next time.
        worker?.terminate();
        worker = null;
        triedInit = false;
      }
    }, budgetMs + 1500);

    w.postMessage({ id, fen, band, budgetMs });
  });
}
