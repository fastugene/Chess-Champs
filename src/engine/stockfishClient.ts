/**
 * Singleton Stockfish Web Worker wrapper (browser-only).
 *
 * Loads stockfish-18-lite-single.js from /public/ the first time a move is
 * requested. Returns null on any failure so engineClient falls back to the
 * minimax bot — the game is never blocked by Stockfish loading.
 *
 * Communication is pure UCI over postMessage / onmessage. Only one search
 * runs at a time; a new call cancels any pending resolve (the bot is never
 * used concurrently anyway).
 */

export interface StockfishMove {
  from: string;
  to: string;
  promotion?: string;
}

type Resolve = (move: StockfishMove | null) => void;

let worker: Worker | null = null;
let initPromise: Promise<boolean> | null = null;
let pendingResolve: Resolve | null = null;

function post(cmd: string): void {
  worker?.postMessage(cmd);
}

function handleLine(line: string): void {
  if (!line) return;
  if (line.startsWith('bestmove') && pendingResolve) {
    const mv = line.split(' ')[1];
    const resolve = pendingResolve;
    pendingResolve = null;
    if (!mv || mv === '(none)') {
      resolve(null);
    } else {
      resolve({
        from: mv.slice(0, 2),
        to: mv.slice(2, 4),
        promotion: mv[4] || undefined,
      });
    }
  }
}

function init(): Promise<boolean> {
  if (initPromise) return initPromise;
  initPromise = new Promise<boolean>((resolve) => {
    try {
      worker = new Worker('/stockfish-18-lite-single.js');
      worker.onmessage = (e: MessageEvent<string>) => handleLine(e.data);
      worker.onerror = () => {
        worker = null;
        initPromise = null;
        resolve(false);
      };

      let readyResolve: ((ok: boolean) => void) | null = (ok) => resolve(ok);
      const readyHandler = (e: MessageEvent<string>) => {
        if (e.data === 'readyok' && readyResolve) {
          const r = readyResolve;
          readyResolve = null;
          worker!.removeEventListener('message', readyHandler);
          // Re-attach the normal handler
          worker!.onmessage = (ev: MessageEvent<string>) => handleLine(ev.data);
          r(true);
        }
      };
      worker.addEventListener('message', readyHandler);
      post('uci');
      post('isready');

      // Timeout: if readyok doesn't come in 5 s, fall back to minimax.
      setTimeout(() => {
        if (readyResolve) {
          readyResolve = null;
          initPromise = null;
          resolve(false);
        }
      }, 5000);
    } catch {
      initPromise = null;
      resolve(false);
    }
  });
  return initPromise;
}

/**
 * Ask Stockfish for the best move in the given position.
 * Returns null if Stockfish is unavailable (caller falls back to minimax).
 */
export async function stockfishMove(
  fen: string,
  skillLevel: number,
  depth: number,
): Promise<StockfishMove | null> {
  if (typeof window === 'undefined') return null;

  const ok = await init();
  if (!ok || !worker) return null;

  // Cancel any leftover pending resolve from a race.
  if (pendingResolve) {
    pendingResolve(null);
    pendingResolve = null;
  }

  return new Promise<StockfishMove | null>((resolve) => {
    pendingResolve = resolve;
    post('stop');
    post('ucinewgame');
    post(`setoption name Skill Level value ${skillLevel}`);
    post(`position fen ${fen}`);
    post(`go depth ${depth}`);
  });
}
