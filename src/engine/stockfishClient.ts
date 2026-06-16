/**
 * Singleton Stockfish Web Worker wrapper (browser-only).
 *
 * Loads stockfish-18-lite-single.js from /public/ the first time a move is
 * requested. Returns [] on any failure so engineClient falls back to the
 * minimax bot — the game is never blocked by Stockfish loading.
 *
 * Communication is pure UCI over postMessage / onmessage. Only one search runs
 * at a time. We request MultiPV so the caller gets the engine's top-N moves
 * (ranked best-first) and can sample a worse one for a beatable, human-looking
 * opponent; and we cap strength with UCI_LimitStrength + UCI_Elo.
 *
 * A one-time capability precheck (during the `uci` handshake) records whether
 * this build advertises UCI_Elo / MultiPV; if it doesn't, we degrade gracefully
 * (single best move, full strength) rather than sending unsupported options.
 */

export interface StockfishMove {
  from: string;
  to: string;
  promotion?: 'q' | 'r' | 'b' | 'n';
}

type Resolve = (moves: StockfishMove[]) => void;

let worker: Worker | null = null;
let initPromise: Promise<boolean> | null = null;
let pendingResolve: Resolve | null = null;

/** Top moves of the current search, keyed by MultiPV index (1 = best). */
let multipv: Record<number, StockfishMove> = {};

/** Capabilities discovered during the `uci` handshake. */
const caps = { elo: false, multipv: false };

function post(cmd: string): void {
  worker?.postMessage(cmd);
}

function parseMove(uci: string | undefined): StockfishMove | null {
  if (!uci || uci === '(none)') return null;
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: (uci[4] || undefined) as StockfishMove['promotion'],
  };
}

function handleLine(line: string): void {
  if (!line || !pendingResolve) return;

  if (line.startsWith('info ')) {
    // e.g. "info depth 4 ... multipv 2 ... pv e2e4 e7e5 ..."
    const mpv = line.match(/ multipv (\d+)/);
    const pv = line.match(/ pv (\S+)/);
    if (mpv && pv) {
      const mv = parseMove(pv[1]);
      if (mv) multipv[parseInt(mpv[1], 10)] = mv;
    }
    return;
  }

  if (line.startsWith('bestmove')) {
    const best = parseMove(line.split(' ')[1]);
    // Assemble the ranked list from the last completed iteration's MultiPV
    // lines (ordered by index); fall back to the single bestmove.
    const ordered = Object.keys(multipv)
      .map(Number)
      .sort((a, b) => a - b)
      .map((i) => multipv[i]);
    const result = ordered.length ? ordered : best ? [best] : [];

    const resolve = pendingResolve;
    pendingResolve = null;
    multipv = {};
    resolve(result);
  }
}

function init(): Promise<boolean> {
  if (initPromise) return initPromise;
  initPromise = new Promise<boolean>((resolve) => {
    try {
      worker = new Worker('/stockfish-18-lite-single.js');
      worker.onerror = () => {
        worker = null;
        initPromise = null;
        resolve(false);
      };

      let settled = false;
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        worker!.removeEventListener('message', handshake);
        worker!.onmessage = (ev: MessageEvent<string>) => handleLine(ev.data);
        resolve(ok);
      };

      // During `uci`, Stockfish lists its options then prints `uciok`. We scan
      // the option lines to learn what this build supports.
      const handshake = (e: MessageEvent<string>) => {
        const line = e.data;
        if (!line) return;
        if (line.startsWith('option name')) {
          if (line.includes('UCI_Elo')) caps.elo = true;
          if (line.includes('MultiPV')) caps.multipv = true;
        } else if (line === 'uciok') {
          post('isready');
        } else if (line === 'readyok') {
          finish(true);
        }
      };
      worker.addEventListener('message', handshake);
      post('uci');

      // If the handshake doesn't complete in 5 s, fall back to minimax.
      setTimeout(() => {
        if (!settled) {
          initPromise = null;
          finish(false);
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
 * Ask Stockfish for its top moves in the given position, ranked best-first.
 * Returns [] if Stockfish is unavailable (caller falls back to minimax).
 */
export async function stockfishRankedMoves(
  fen: string,
  opts: { depth: number; elo?: number; multiPV: number },
): Promise<StockfishMove[]> {
  if (typeof window === 'undefined') return [];

  const ok = await init();
  if (!ok || !worker) return [];

  // Cancel any leftover pending resolve from a race.
  if (pendingResolve) {
    pendingResolve([]);
    pendingResolve = null;
  }
  multipv = {};

  const mpv = caps.multipv ? Math.max(1, opts.multiPV) : 1;

  return new Promise<StockfishMove[]>((resolve) => {
    pendingResolve = resolve;
    post('stop');
    post('ucinewgame');
    if (opts.elo != null && caps.elo) {
      post('setoption name UCI_LimitStrength value true');
      post(`setoption name UCI_Elo value ${opts.elo}`);
    } else if (caps.elo) {
      post('setoption name UCI_LimitStrength value false');
    }
    post(`setoption name MultiPV value ${mpv}`);
    post(`position fen ${fen}`);
    post(`go depth ${opts.depth}`);
  });
}
