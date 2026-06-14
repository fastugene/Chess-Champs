'use client';

import { useMemo } from 'react';
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import { FILES } from '@/chess/attacks';
import { Piece } from './Piece';

/**
 * A static, non-interactive board that renders any FEN — used by the Chapter
 * Primer to demo a tactic. Unlike the live `Board`, it never touches the game
 * store; it just paints a position and optionally highlights a few squares so
 * the kid can see exactly what to look at. Always shown from White's view.
 */
export function MiniBoard({
  fen,
  highlight = [],
}: {
  fen: string;
  highlight?: Square[];
}) {
  const pieceMap = useMemo(() => {
    const m: Record<string, { type: PieceSymbol; color: Color }> = {};
    for (const row of new Chess(fen).board()) {
      for (const cell of row) {
        if (cell) m[cell.square] = { type: cell.type, color: cell.color };
      }
    }
    return m;
  }, [fen]);

  const hl = new Set(highlight);
  const cells: React.ReactNode[] = [];
  for (let ri = 0; ri < 8; ri++) {
    for (let ci = 0; ci < 8; ci++) {
      const sq = (FILES[ci] + (8 - ri)) as Square;
      const f = ci;
      const r = 7 - ri;
      const dark = (f + r) % 2 === 0;
      const piece = pieceMap[sq];
      const classes = ['sq', dark ? 'dark' : 'light'];
      if (hl.has(sq)) classes.push('demo-hl');
      cells.push(
        <div key={sq} className={classes.join(' ')} aria-label={sq}>
          {piece && <Piece type={piece.type} color={piece.color} />}
        </div>,
      );
    }
  }

  return (
    <div className="board-wrap mini-board">
      <div className="board">{cells}</div>
    </div>
  );
}
