'use client';

import { useMemo } from 'react';
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import { FILES } from '@/chess/attacks';
import { Piece } from '@/components/board/Piece';

export interface BoardHighlight {
  from: string;
  to: string;
  /** CSS color for this candidate's from/to squares (keyed to its card). */
  color: string;
}

/**
 * Read-only board for Grandmaster Training Mode. Renders a FEN and tints the
 * from/to squares of the candidate moves (so the player can see where each
 * option lands). No selection/tap-to-move — the player chooses via the cards.
 * Mirrors Board.tsx's grid without the gameStore coupling.
 */
export function TrainBoard({
  fen,
  orientation = 'w',
  highlights = [],
}: {
  fen: string;
  orientation?: Color;
  highlights?: BoardHighlight[];
}) {
  const board = useMemo(() => new Chess(fen).board(), [fen]);

  const pieceMap = useMemo(() => {
    const m: Record<string, { type: PieceSymbol; color: Color }> = {};
    for (const row of board) {
      for (const cell of row) {
        if (cell) m[cell.square] = { type: cell.type, color: cell.color };
      }
    }
    return m;
  }, [board]);

  const tint = useMemo(() => {
    const m: Record<string, string> = {};
    for (const h of highlights) {
      m[h.from] = h.color;
      m[h.to] = h.color;
    }
    return m;
  }, [highlights]);

  const squareAt = (ri: number, ci: number): Square => {
    if (orientation === 'w') return (FILES[ci] + (8 - ri)) as Square;
    return (FILES[7 - ci] + (1 + ri)) as Square;
  };

  const cells: React.ReactNode[] = [];
  for (let ri = 0; ri < 8; ri++) {
    for (let ci = 0; ci < 8; ci++) {
      const sq = squareAt(ri, ci);
      const f = FILES.indexOf(sq[0]);
      const r = Number(sq[1]) - 1;
      const dark = (f + r) % 2 === 0;
      const piece = pieceMap[sq];
      const classes = ['sq', dark ? 'dark' : 'light'];
      const hl = tint[sq];
      cells.push(
        <div
          key={sq}
          className={classes.join(' ')}
          aria-label={sq}
          style={hl ? { boxShadow: `inset 0 0 0 4px ${hl}` } : undefined}
        >
          {piece && <Piece type={piece.type} color={piece.color} />}
        </div>,
      );
    }
  }

  return (
    <div className="board-wrap">
      <div className="board">{cells}</div>
    </div>
  );
}
