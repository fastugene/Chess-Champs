/**
 * A small, kid-tuned chess opponent.
 *
 * It runs an iterative-deepening negamax search, then samples uniformly from its
 * top-`window` moves. The leaf evaluation is MATERIAL + a band-scaled POSITIONAL
 * term (piece-square tables, with a king table tapered between midgame and
 * endgame). Material stays dominant — a free pawn (≥100) always outweighs any
 * positional swing (±50) — so the kid's core lesson ("grab the free piece, keep
 * yours safe") is never overridden. Positional eval gives the shallow search
 * "intuition" (develop, castle, centralise) it couldn't get from depth alone.
 *
 * Per-band `positional` weight (difficulty.ts) scales this: rookie = 0 (a pure
 * material grabber, an authentic beginner) up to medium = 1.0 (full positional).
 *
 * Search is bounded by a wall-clock TIME BUDGET, not just the band's depth. The
 * per-node `performance.now()` check + iterative deepening keep the best move
 * from the last FULLY-searched depth, so the configured `depth` is a ceiling
 * reached only when the position is cheap (or when run off-thread with a larger
 * budget — see minimax.worker.ts). This is what guarantees the search can never
 * hang: total compute is capped regardless of how expensive the eval is.
 *
 * The occasional outright-random "giveaway" blunder is handled one level up in
 * engineClient (so it covers Stockfish too) — this function is pure near-best
 * move selection.
 */
import { Chess, type Color, type PieceSymbol } from 'chess.js';
import { PIECE_VALUE } from '@/chess/attacks';
import { BANDS, type Band } from './difficulty';

export interface SimpleMove {
  from: string;
  to: string;
  promotion?: 'q' | 'r' | 'b' | 'n';
}

/** Default max wall-clock per move on the main thread (ms). Keeps turns snappy. */
const TIME_BUDGET_MS = 600;
/** Sentinel thrown to unwind the search when the time budget is exceeded. */
const TIMEOUT = Symbol('search-timeout');

// ---------------------------------------------------------------------------
// Piece-square tables (Tomasz Michniewski, "Simplified Evaluation Function").
// Public-domain, well-tuned, kid-appropriate strength. Centipawn units.
//
// ORIENTATION: stored as table[rank][file] matching chess.board() indexing,
// where row 0 = rank 8, row 7 = rank 1, file 0 = 'a'. A WHITE piece on board
// square [r][f] reads table[r][f]; a BLACK piece reads the vertically mirrored
// table[7 - r][f] and contributes with negated sign (see pstValue + evaluate).
// ---------------------------------------------------------------------------

const PST_P: number[][] = [
  [  0,  0,  0,  0,  0,  0,  0,  0],
  [ 50, 50, 50, 50, 50, 50, 50, 50],
  [ 10, 10, 20, 30, 30, 20, 10, 10],
  [  5,  5, 10, 25, 25, 10,  5,  5],
  [  0,  0,  0, 20, 20,  0,  0,  0],
  [  5, -5,-10,  0,  0,-10, -5,  5],
  [  5, 10, 10,-20,-20, 10, 10,  5],
  [  0,  0,  0,  0,  0,  0,  0,  0],
];

const PST_N: number[][] = [
  [-50,-40,-30,-30,-30,-30,-40,-50],
  [-40,-20,  0,  0,  0,  0,-20,-40],
  [-30,  0, 10, 15, 15, 10,  0,-30],
  [-30,  5, 15, 20, 20, 15,  5,-30],
  [-30,  0, 15, 20, 20, 15,  0,-30],
  [-30,  5, 10, 15, 15, 10,  5,-30],
  [-40,-20,  0,  5,  5,  0,-20,-40],
  [-50,-40,-30,-30,-30,-30,-40,-50],
];

const PST_B: number[][] = [
  [-20,-10,-10,-10,-10,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5, 10, 10,  5,  0,-10],
  [-10,  5,  5, 10, 10,  5,  5,-10],
  [-10,  0, 10, 10, 10, 10,  0,-10],
  [-10, 10, 10, 10, 10, 10, 10,-10],
  [-10,  5,  0,  0,  0,  0,  5,-10],
  [-20,-10,-10,-10,-10,-10,-10,-20],
];

const PST_R: number[][] = [
  [  0,  0,  0,  0,  0,  0,  0,  0],
  [  5, 10, 10, 10, 10, 10, 10,  5],
  [ -5,  0,  0,  0,  0,  0,  0, -5],
  [ -5,  0,  0,  0,  0,  0,  0, -5],
  [ -5,  0,  0,  0,  0,  0,  0, -5],
  [ -5,  0,  0,  0,  0,  0,  0, -5],
  [ -5,  0,  0,  0,  0,  0,  0, -5],
  [  0,  0,  0,  5,  5,  0,  0,  0],
];

const PST_Q: number[][] = [
  [-20,-10,-10, -5, -5,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5,  5,  5,  5,  0,-10],
  [ -5,  0,  5,  5,  5,  5,  0, -5],
  [  0,  0,  5,  5,  5,  5,  0, -5],
  [-10,  5,  5,  5,  5,  5,  0,-10],
  [-10,  0,  5,  0,  0,  0,  0,-10],
  [-20,-10,-10, -5, -5,-10,-10,-20],
];

/** King in the midgame: stay tucked in a castled corner, off the centre. */
const PST_K_MID: number[][] = [
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-20,-30,-30,-40,-40,-30,-30,-20],
  [-10,-20,-20,-20,-20,-20,-20,-10],
  [ 20, 20,  0,  0,  0,  0, 20, 20],
  [ 20, 30, 10,  0,  0, 10, 30, 20],
];

/** King in the endgame: march to the centre and help. */
const PST_K_END: number[][] = [
  [-50,-40,-30,-20,-20,-30,-40,-50],
  [-30,-20,-10,  0,  0,-10,-20,-30],
  [-30,-10, 20, 30, 30, 20,-10,-30],
  [-30,-10, 30, 40, 40, 30,-10,-30],
  [-30,-10, 30, 40, 40, 30,-10,-30],
  [-30,-10, 20, 30, 30, 20,-10,-30],
  [-30,-30,  0,  0,  0,  0,-30,-30],
  [-50,-30,-30,-30,-30,-30,-30,-50],
];

const PST: Partial<Record<PieceSymbol, number[][]>> = {
  p: PST_P, n: PST_N, b: PST_B, r: PST_R, q: PST_Q,
};

/** Full non-pawn material per board (both sides) — the midgame phase ceiling. */
const START_NONPAWN = 2 * (2 * PIECE_VALUE.n + 2 * PIECE_VALUE.b + 2 * PIECE_VALUE.r + PIECE_VALUE.q);

/**
 * Positional value of one piece (centipawns), White-positive. King uses the
 * tapered midgame/endgame blend; everything else a static table. Caller applies
 * the side sign and the band's positional weight.
 */
function pstValue(type: PieceSymbol, color: Color, r: number, f: number, phase: number): number {
  const row = color === 'w' ? r : 7 - r;
  if (type === 'k') return PST_K_MID[row][f] * phase + PST_K_END[row][f] * (1 - phase);
  const table = PST[type];
  return table ? table[row][f] : 0;
}

/**
 * Leaf evaluation from White's perspective, in centipawns. `posWeight` (0..1)
 * scales the positional term; at 0 this is byte-identical to the old
 * material-only eval (rookie path), with zero added work.
 */
function evaluate(chess: Chess, posWeight: number): number {
  if (chess.isCheckmate()) return chess.turn() === 'w' ? -100000 : 100000;
  if (chess.isGameOver()) return 0; // stalemate / draw

  const board = chess.board();

  // Fast path: pure material (rookie / posWeight 0).
  if (posWeight === 0) {
    let score = 0;
    for (const rrow of board) {
      for (const cell of rrow) {
        if (cell) score += (cell.color === 'w' ? 1 : -1) * PIECE_VALUE[cell.type] * 100;
      }
    }
    return score;
  }

  // Game phase from remaining non-pawn material: 1 = opening, 0 = bare endgame.
  let nonPawn = 0;
  for (const rrow of board) {
    for (const cell of rrow) {
      if (cell && cell.type !== 'p' && cell.type !== 'k') nonPawn += PIECE_VALUE[cell.type];
    }
  }
  const phase = Math.max(0, Math.min(1, nonPawn / START_NONPAWN));

  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const cell = board[r][f];
      if (!cell) continue;
      const sign = cell.color === 'w' ? 1 : -1;
      const material = PIECE_VALUE[cell.type] * 100;
      const positional = posWeight * pstValue(cell.type, cell.color, r, f, phase);
      score += sign * (material + positional);
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

function negamax(chess: Chess, depth: number, alpha: number, beta: number, color: number, deadline: number, posWeight: number): number {
  // chess.js move-gen is ~0.5 ms/node, so we check the clock at every node;
  // performance.now() is far cheaper than that and keeps overshoot to ~1 node.
  if (performance.now() > deadline) throw TIMEOUT;
  if (depth === 0 || chess.isGameOver()) return color * evaluate(chess, posWeight);

  const moves = chess.moves({ verbose: true }).sort((a, b) => orderScore(b) - orderScore(a));
  let best = -Infinity;
  for (const m of moves) {
    chess.move({ from: m.from, to: m.to, promotion: m.promotion });
    let score: number;
    try {
      score = -negamax(chess, depth - 1, -beta, -alpha, -color, deadline, posWeight);
    } finally {
      chess.undo();
    }
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break; // alpha-beta cutoff
  }
  return best;
}

/**
 * Pick a near-best move for `band`. `budgetMs` caps the wall-clock search time
 * (default 600 ms for the main thread; minimax.worker.ts passes a larger budget
 * since it runs off the UI thread and can't freeze anything).
 */
export function chooseBotMove(fen: string, band: Band, budgetMs: number = TIME_BUDGET_MS): SimpleMove | null {
  const chess = new Chess(fen);
  const rootMoves = chess.moves({ verbose: true });
  if (rootMoves.length === 0) return null;

  const cfg = BANDS[band];
  const posWeight = cfg.positional ?? 0;
  const color = chess.turn() === 'w' ? 1 : -1;
  const deadline = performance.now() + budgetMs;

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
          s = -negamax(chess, d - 1, -Infinity, Infinity, -color, deadline, posWeight);
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
