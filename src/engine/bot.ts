/**
 * A small, kid-tuned chess opponent.
 *
 * It runs an iterative-deepening negamax search over material, then samples
 * uniformly from its top-`window` moves. A material-counting bot plays like a
 * beginner by nature, which is exactly what a 9-year-old needs to practise
 * "grab the free piece, keep yours safe."
 *
 * Search is bounded by a wall-clock TIME BUDGET, not just the band's depth.
 * Material-only eval gives flat scores in quiet positions, so alpha-beta prunes
 * poorly there — an unbounded deep search (depth 5–8) can freeze the main thread
 * for many seconds on a busy midgame. Iterative deepening keeps the best move
 * from the last FULLY-searched depth and stops as soon as the budget is spent,
 * so the configured `depth` is a ceiling reached only when the position is cheap.
 *
 * The occasional outright-random "giveaway" blunder is handled one level up in
 * engineClient (so it covers Stockfish too) — this function is pure near-best
 * move selection.
 */
import { Chess } from 'chess.js';
import { PIECE_VALUE } from '@/chess/attacks';
import { BANDS, type Band } from './difficulty';

export interface SimpleMove {
  from: string;
  to: string;
  promotion?: 'q' | 'r' | 'b' | 'n';
}

/** Max wall-clock per move for the minimax search (ms). Keeps turns snappy. */
const TIME_BUDGET_MS = 600;
/** Sentinel thrown to unwind the search when the time budget is exceeded. */
const TIMEOUT = Symbol('search-timeout');

/** Material balance from White's perspective, in centipawns-ish units. */
function evaluate(chess: Chess): number {
  if (chess.isCheckmate()) return chess.turn() === 'w' ? -100000 : 100000;
  if (chess.isGameOver()) return 0; // stalemate / draw

  let score = 0;
  for (const row of chess.board()) {
    for (const cell of row) {
      if (!cell) continue;
      score += (cell.color === 'w' ? 1 : -1) * PIECE_VALUE[cell.type] * 100;
    }
  }
  return score;
}

/**
 * Move-ordering score (MVV-LVA): search captures first, most-valuable-victim /
 * least-valuable-attacker first. Good ordering is what lets alpha-beta prune the
 * tree, which (with the time budget) lets the search reach deeper in cheap
 * positions. Quiet moves sort last.
 */
function orderScore(m: { captured?: string; piece: string; promotion?: string }): number {
  let s = 0;
  if (m.captured) s += 10 * PIECE_VALUE[m.captured as keyof typeof PIECE_VALUE] - PIECE_VALUE[m.piece as keyof typeof PIECE_VALUE];
  if (m.promotion) s += PIECE_VALUE[m.promotion as keyof typeof PIECE_VALUE];
  return s;
}

function negamax(chess: Chess, depth: number, alpha: number, beta: number, color: number, deadline: number): number {
  // chess.js move-gen is ~0.5 ms/node, so we check the clock at every node;
  // performance.now() is far cheaper than that and keeps overshoot to ~1 node.
  if (performance.now() > deadline) throw TIMEOUT;
  if (depth === 0 || chess.isGameOver()) return color * evaluate(chess);

  const moves = chess.moves({ verbose: true }).sort((a, b) => orderScore(b) - orderScore(a));
  let best = -Infinity;
  for (const m of moves) {
    chess.move({ from: m.from, to: m.to, promotion: m.promotion });
    let score: number;
    try {
      score = -negamax(chess, depth - 1, -beta, -alpha, -color, deadline);
    } finally {
      chess.undo();
    }
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break; // alpha-beta cutoff
  }
  return best;
}

export function chooseBotMove(fen: string, band: Band): SimpleMove | null {
  const chess = new Chess(fen);
  const rootMoves = chess.moves({ verbose: true });
  if (rootMoves.length === 0) return null;

  const cfg = BANDS[band];
  const color = chess.turn() === 'w' ? 1 : -1;
  const deadline = performance.now() + TIME_BUDGET_MS;

  // Iterative deepening: keep the best ranking from the deepest depth we fully
  // finished before the budget ran out. Start at depth 1 so we always have a
  // complete result even on a slow position.
  let bestScored: { m: (typeof rootMoves)[number]; s: number }[] = rootMoves.map((m) => ({ m, s: 0 }));
  for (let d = 1; d <= cfg.depth; d++) {
    try {
      const scored = rootMoves.map((m) => {
        chess.move({ from: m.from, to: m.to, promotion: m.promotion });
        let s: number;
        try {
          s = -negamax(chess, d - 1, -Infinity, Infinity, -color, deadline);
        } finally {
          chess.undo();
        }
        return { m, s };
      });
      scored.sort((a, b) => b.s - a.s);
      bestScored = scored; // this depth completed in time — adopt it
    } catch (e) {
      if (e === TIMEOUT) break; // keep the previous fully-searched depth
      throw e;
    }
  }

  const k = Math.min(cfg.window, bestScored.length);
  const pick = bestScored[Math.floor(Math.random() * k)].m;
  return { from: pick.from, to: pick.to, promotion: pick.promotion as SimpleMove['promotion'] };
}
