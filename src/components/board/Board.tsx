'use client';

import { useMemo } from 'react';
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import { useGame } from '@/state/gameStore';
import { FILES } from '@/chess/attacks';
import { Piece } from './Piece';

/**
 * Mobile-first interactive board. Renders from the store's FEN, supports
 * tap-to-select / tap-to-move, shows legal-move dots, last-move and check
 * highlights, and flips for the player's colour.
 */
export function Board() {
  const fen = useGame((s) => s.fen);
  const selected = useGame((s) => s.selected);
  const legalTargets = useGame((s) => s.legalTargets);
  const lastMove = useGame((s) => s.lastMove);
  const inCheck = useGame((s) => s.inCheck);
  const turn = useGame((s) => s.turn);
  const playerColor = useGame((s) => s.playerColor);
  const select = useGame((s) => s.selectSquare);

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

  const checkSquare = useMemo<string | null>(() => {
    if (!inCheck) return null;
    for (const sq of Object.keys(pieceMap)) {
      const p = pieceMap[sq];
      if (p.type === 'k' && p.color === turn) return sq;
    }
    return null;
  }, [pieceMap, inCheck, turn]);

  const squareAt = (ri: number, ci: number): Square => {
    if (playerColor === 'w') return (FILES[ci] + (8 - ri)) as Square;
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
      const isTarget = legalTargets.includes(sq);
      const isCapture = isTarget && !!piece;

      const classes = ['sq', dark ? 'dark' : 'light'];
      if (selected === sq) classes.push('sel');
      else if (lastMove && (lastMove.from === sq || lastMove.to === sq)) classes.push('last');
      if (checkSquare === sq) classes.push('check');

      cells.push(
        <div key={sq} className={classes.join(' ')} onClick={() => select(sq)} role="button" aria-label={sq}>
          {isTarget && <div className={`dot ${isCapture ? 'capture' : ''}`} />}
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
