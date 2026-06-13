/**
 * Pure-geometry board helpers used by tactic detection and hints.
 *
 * These deliberately do NOT depend on chess.js move generation so they stay
 * fast and predictable: we build a simple 8x8 grid from a position and compute
 * which squares a piece attacks by hand. This is the foundation the real-time
 * tactic detector is built on (see ./tactics/detect.ts).
 */
import type { Color, PieceSymbol, Square } from 'chess.js';

export const FILES = 'abcdefgh';

/** Standard kid-friendly piece values (king = 0; safety handled elsewhere). */
export const PIECE_VALUE: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

export interface Cell {
  type: PieceSymbol;
  color: Color;
}

/** grid[rank][file] where rank 0 = rank 1, file 0 = file 'a'. */
export type Grid = (Cell | null)[][];

type Board = ({ square: Square; type: PieceSymbol; color: Color } | null)[][];

export function toCoord(square: Square): { f: number; r: number } {
  return { f: FILES.indexOf(square[0]), r: Number(square[1]) - 1 };
}

export function toSquare(f: number, r: number): Square {
  return (FILES[f] + (r + 1)) as Square;
}

/** Convert a chess.js board() (rank 8 first) into our rank-1-first grid. */
export function buildGrid(board: Board): Grid {
  const grid: Grid = Array.from({ length: 8 }, () => Array<Cell | null>(8).fill(null));
  for (const row of board) {
    for (const cell of row) {
      if (!cell) continue;
      const { f, r } = toCoord(cell.square);
      grid[r][f] = { type: cell.type, color: cell.color };
    }
  }
  return grid;
}

const KNIGHT = [
  [1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2],
];
const KING = [
  [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1],
];
const BISHOP = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const ROOK = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function inBounds(f: number, r: number): boolean {
  return f >= 0 && f < 8 && r >= 0 && r < 8;
}

/** Squares the piece at (f, r) attacks/controls (includes occupied squares). */
export function attackedSquares(grid: Grid, f: number, r: number): { f: number; r: number }[] {
  const piece = grid[r][f];
  if (!piece) return [];
  const out: { f: number; r: number }[] = [];
  const add = (nf: number, nr: number) => {
    if (inBounds(nf, nr)) out.push({ f: nf, r: nr });
  };

  switch (piece.type) {
    case 'n':
      for (const [df, dr] of KNIGHT) add(f + df, r + dr);
      break;
    case 'k':
      for (const [df, dr] of KING) add(f + df, r + dr);
      break;
    case 'p': {
      const dir = piece.color === 'w' ? 1 : -1;
      add(f - 1, r + dir);
      add(f + 1, r + dir);
      break;
    }
    case 'b':
    case 'r':
    case 'q': {
      const dirs =
        piece.type === 'b' ? BISHOP : piece.type === 'r' ? ROOK : [...BISHOP, ...ROOK];
      for (const [df, dr] of dirs) {
        let nf = f + df;
        let nr = r + dr;
        while (inBounds(nf, nr)) {
          out.push({ f: nf, r: nr });
          if (grid[nr][nf]) break; // ray stops at the first piece
          nf += df;
          nr += dr;
        }
      }
      break;
    }
  }
  return out;
}

/** Is square (tf, tr) attacked by any piece of `byColor`? */
export function isAttackedBy(grid: Grid, tf: number, tr: number, byColor: Color): boolean {
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const p = grid[r][f];
      if (!p || p.color !== byColor) continue;
      for (const s of attackedSquares(grid, f, r)) {
        if (s.f === tf && s.r === tr) return true;
      }
    }
  }
  return false;
}
