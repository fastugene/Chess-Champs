'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import { FILES } from '@/chess/attacks';
import { playSound } from '@/audio/sfx';
import { HAPTIC, vibrate } from '@/haptics/haptics';
import { Piece } from './Piece';

type Cell = { type: PieceSymbol; color: Color };
type PieceMap = Record<string, Cell>;

const SLIDE_MS = 650;
const DEMO_START_DELAY = 700;

/** Build a square→piece map from a FEN (display is always White's view). */
function readFen(fen: string): PieceMap {
  const m: PieceMap = {};
  for (const row of new Chess(fen).board()) {
    for (const cell of row) {
      if (cell) m[cell.square] = { type: cell.type, color: cell.color };
    }
  }
  return m;
}

/** Top-left % of a square within the 8×8 board, White's view. */
function cellPct(sq: Square): { left: number; top: number } {
  const col = FILES.indexOf(sq[0]);
  const rank = Number(sq[1]);
  return { left: col * 12.5, top: (8 - rank) * 12.5 };
}

/**
 * An interactive, animated cousin of `MiniBoard` used by the guided tutorial.
 * It owns its own position (never touches the game store) and supports two modes:
 *
 *  - `demo`   — auto-plays `from`→`to` (the coach showing the move), then calls
 *               `onDemoDone`. Replay by bumping `playToken`.
 *  - `guided` — the child performs the move: the `from` square pulses; tapping it
 *               glows the `to` square; the correct second tap animates the capture
 *               and calls `onCorrect`. Any wrong tap calls `onWrong` (never blocks).
 */
export function TutorialBoard({
  fen,
  from,
  to,
  mode,
  badSquare,
  playToken = 0,
  onCorrect,
  onWrong,
  onDemoDone,
}: {
  fen: string;
  from: Square;
  to: Square;
  mode: 'demo' | 'guided';
  /** An enemy piece that IS defended — shown in red as a danger contrast. */
  badSquare?: Square;
  playToken?: number;
  onCorrect?: () => void;
  onWrong?: () => void;
  onDemoDone?: () => void;
}) {
  const [pos, setPos] = useState<PieceMap>(() => readFen(fen));
  const [picked, setPicked] = useState<Square | null>(null);
  const [sliding, setSliding] = useState(false);
  const [slideGoing, setSlideGoing] = useState(false);
  const [sparkle, setSparkle] = useState(false);
  const [done, setDone] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  // Animate `from`→`to`: slide an overlay piece, then commit the capture.
  const runMove = useCallback(
    (after?: () => void) => {
      setSliding(true);
      setSlideGoing(false);
      // Two frames so the browser paints the start position before transitioning.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setSlideGoing(true)),
      );
      timers.current.push(
        setTimeout(() => {
          // Apply the move through chess.js so special moves resolve correctly:
          // castling moves the rook too, en passant clears the captured pawn,
          // promotion makes a queen. Hand-moving from→to only would strand the
          // rook on a castle. The tutorial plays one move, so the original `fen`
          // is still the position to apply it to.
          const chess = new Chess(fen);
          let captured = false;
          try {
            const m = chess.move({ from, to, promotion: 'q' });
            captured = !!m?.captured;
          } catch {
            // Fall back to a raw slide if the move is somehow illegal.
          }
          setPos(readFen(chess.fen()));
          setSliding(false);
          setSparkle(true);
          setDone(true);
          playSound(captured ? 'capture' : 'move');
          vibrate(captured ? HAPTIC.capture : HAPTIC.move);
          timers.current.push(setTimeout(() => setSparkle(false), 900));
          after?.();
        }, SLIDE_MS),
      );
    },
    [fen, from, to],
  );

  // Reset whenever the position, mode, or replay token changes.
  useEffect(() => {
    clearTimers();
    setPos(readFen(fen));
    setPicked(null);
    setSliding(false);
    setSlideGoing(false);
    setSparkle(false);
    setDone(false);

    if (mode === 'demo') {
      timers.current.push(setTimeout(() => runMove(() => onDemoDone?.()), DEMO_START_DELAY));
    }
    return clearTimers;
    // onDemoDone excluded — restart only on inputs below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen, mode, playToken, runMove]);

  const onTap = (sq: Square) => {
    if (mode !== 'guided' || sliding || done) return;
    if (!picked) {
      if (sq === from) {
        setPicked(from);
        playSound('select');
      } else {
        onWrong?.();
      }
      return;
    }
    // A piece is picked (the from-square).
    if (sq === to) {
      setPicked(null);
      runMove(() => onCorrect?.());
    } else if (sq !== from) {
      onWrong?.();
    }
  };

  const pulseFrom =
    (mode === 'guided' && !picked && !sliding && !done) ||
    (mode === 'demo' && !sliding && !done);
  const glowTo = mode === 'guided' && picked === from && !sliding && !done;

  const cells: React.ReactNode[] = [];
  for (let ri = 0; ri < 8; ri++) {
    for (let ci = 0; ci < 8; ci++) {
      const sq = (FILES[ci] + (8 - ri)) as Square;
      const dark = (ci + (7 - ri)) % 2 === 0;
      const piece = pos[sq];
      // Hide the moving piece on its origin while the overlay slides.
      const hidden = sliding && sq === from;
      const classes = ['sq', dark ? 'dark' : 'light'];
      if (badSquare && sq === badSquare && !done) classes.push('tb-bad');
      if (pulseFrom && sq === from) classes.push('tb-from');
      if (glowTo && sq === to) classes.push('tb-to');
      if (sparkle && sq === to) classes.push('tb-spark');
      cells.push(
        <div
          key={sq}
          className={classes.join(' ')}
          aria-label={sq}
          role={mode === 'guided' ? 'button' : undefined}
          onClick={() => onTap(sq)}
        >
          {piece && !hidden && <Piece type={piece.type} color={piece.color} />}
        </div>,
      );
    }
  }

  const moving = pos[from] ?? readFen(fen)[from];
  const start = cellPct(from);
  const end = cellPct(to);
  const overlayPos = slideGoing ? end : start;

  return (
    <div className="board-wrap mini-board tutorial-board">
      <div className="board">
        {cells}
        {sliding && moving && (
          <div
            className="tb-overlay"
            style={{
              left: `${overlayPos.left}%`,
              top: `${overlayPos.top}%`,
              transition: `left ${SLIDE_MS}ms ease, top ${SLIDE_MS}ms ease`,
            }}
            aria-hidden="true"
          >
            <Piece type={moving.type} color={moving.color} />
          </div>
        )}
      </div>
    </div>
  );
}
