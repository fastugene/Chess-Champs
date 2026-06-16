/**
 * Blunder training-wheels: detect when a move clearly drops material for free,
 * so we can gently ask the kid "is that square safe?" before it commits.
 *
 * Conservative by design — a false alarm is worse than a miss. We apply the
 * move, then judge the landing square with a light static-exchange check using
 * the same pure-geometry helpers as hints/detection (attacks.ts). We only warn
 * when the immediate exchange loses ~2+ points of material with no compensation.
 */
import { Chess, type Color, type Square } from 'chess.js';
import {
  PIECE_VALUE,
  attackedSquares,
  buildGrid,
  isAttackedBy,
  toCoord,
  type Grid,
} from './attacks';

/** Value of the cheapest enemy piece (ignoring the king) attacking a square. */
function minEnemyAttackerValue(grid: Grid, tf: number, tr: number, enemy: Color): number {
  let min = Infinity;
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const p = grid[r][f];
      if (!p || p.color !== enemy || p.type === 'k') continue;
      for (const s of attackedSquares(grid, f, r)) {
        if (s.f === tf && s.r === tr) {
          min = Math.min(min, PIECE_VALUE[p.type]);
          break;
        }
      }
    }
  }
  return min;
}

/**
 * Would playing `from`→`to` clearly hang material? Returns true only on a
 * confident loss so the safety prompt never nags on fair trades.
 */
export function hangsMaterial(fen: string, from: Square, to: Square): boolean {
  const chess = new Chess(fen);
  const mover = chess.get(from);
  if (!mover) return false;

  let captured = 0;
  try {
    const move = chess.move({ from, to, promotion: 'q' });
    if (move.captured) captured = PIECE_VALUE[move.captured];
  } catch {
    return false; // illegal — let the normal path reject it
  }

  const enemy: Color = mover.color === 'w' ? 'b' : 'w';
  const grid = buildGrid(chess.board());
  const { f, r } = toCoord(to);

  // Landing square not attacked → safe.
  if (!isAttackedBy(grid, f, r, enemy)) return false;

  const movedValue = PIECE_VALUE[mover.type];
  const defended = isAttackedBy(grid, f, r, mover.color);

  if (!defended) {
    // Taken for free — only safe if the capture already paid for the piece.
    return captured - movedValue <= -2;
  }

  // Defended: warn only if the cheapest enemy capture + our recapture still
  // loses us material. (If only the enemy king "attacks" a defended square,
  // that capture is illegal — treat as safe.)
  const cheapest = minEnemyAttackerValue(grid, f, r, enemy);
  if (cheapest === Infinity) return false;
  return captured - movedValue + cheapest <= -2;
}
