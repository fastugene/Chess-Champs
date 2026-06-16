/**
 * A small, kid-tuned chess opponent.
 *
 * It runs a shallow negamax search over material, then samples uniformly from
 * its top-`window` moves. A material-counting, shallow-looking bot plays like a
 * beginner by nature, which is exactly what a 9-year-old needs to practise
 * "grab the free piece, keep yours safe."
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

function negamax(chess: Chess, depth: number, alpha: number, beta: number, color: number): number {
  if (depth === 0 || chess.isGameOver()) return color * evaluate(chess);

  let best = -Infinity;
  for (const m of chess.moves({ verbose: true })) {
    chess.move({ from: m.from, to: m.to, promotion: m.promotion });
    const score = -negamax(chess, depth - 1, -beta, -alpha, -color);
    chess.undo();
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break; // alpha-beta cutoff
  }
  return best;
}

export function chooseBotMove(fen: string, band: Band): SimpleMove | null {
  const chess = new Chess(fen);
  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) return null;

  const cfg = BANDS[band];

  const color = chess.turn() === 'w' ? 1 : -1;
  const scored = moves.map((m) => {
    chess.move({ from: m.from, to: m.to, promotion: m.promotion });
    const s = -negamax(chess, cfg.depth - 1, -Infinity, Infinity, -color);
    chess.undo();
    return { m, s };
  });

  scored.sort((a, b) => b.s - a.s);
  const k = Math.min(cfg.window, scored.length);
  const pick = scored[Math.floor(Math.random() * k)].m;
  return { from: pick.from, to: pick.to, promotion: pick.promotion as SimpleMove['promotion'] };
}
