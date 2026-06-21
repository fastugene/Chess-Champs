'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Chess, type Color } from 'chess.js';
import { stockfishEvaluatedMoves, type EvaluatedMove } from '@/engine/stockfishClient';
import { analyzeCandidate, buildAutoNote, buildVerdict, rateCandidates, type Candidate, type StarRating } from '@/chess/explain';
import { TrainBoard, type BoardHighlight } from '@/components/train/TrainBoard';
import { MoveChoiceCard } from '@/components/train/MoveChoiceCard';
import { playSound, resumeAudio } from '@/audio/sfx';

/** Copilot search depth — full strength, true grandmaster top-2. Tunable. */
const TRAIN_COPILOT_DEPTH = 14;
/**
 * Opponent handicap. UCI_Elo has a hard floor of 1320 in this build, so a low
 * elo alone does nothing — the real weakening levers are a SHALLOW search depth
 * and a low Skill Level (Stockfish's native handicap). Tunable.
 */
const TRAIN_OPPONENT_DEPTH = 3;
const TRAIN_OPPONENT_SKILL = 2;
const TRAIN_OPPONENT_ELO = 1320;
/** The player chooses between the top-2 only once every Nth move; the rest the
 *  grandmaster auto-plays (with a 1-liner) so human blunders stay rare. */
const DECISION_EVERY = 5;
/** The two candidates' board-highlight colors (keyed to the cards). */
const ACCENTS = ['#2f86ff', '#ffc21f'];

type Phase = 'setup' | 'thinking' | 'choosing' | 'verdict' | 'auto' | 'opponent' | 'gameover' | 'error';

export default function TrainPage() {
  const router = useRouter();
  const chessRef = useRef(new Chess());
  const aliveRef = useRef(true);
  // Counts the player's own turns; a choice is offered every DECISION_EVERY-th.
  const playerMoveCountRef = useRef(0);

  const [phase, setPhase] = useState<Phase>('setup');
  const [playerColor, setPlayerColor] = useState<Color>('w');
  const [fen, setFen] = useState(chessRef.current.fen());
  // Engine-ranked candidates (best first) + the shuffled display order.
  const [ranked, setRanked] = useState<Candidate[]>([]);
  const [order, setOrder] = useState<number[]>([0, 1]);
  const [stars, setStars] = useState<StarRating | null>(null);
  const [chosenRank, setChosenRank] = useState<number | null>(null);
  const [verdict, setVerdict] = useState('');
  const [autoNote, setAutoNote] = useState<string | null>(null);
  const [score, setScore] = useState({ matched: 0, total: 0 });
  const [gameOverText, setGameOverText] = useState('');

  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);

  const applyAndSync = (mv: EvaluatedMove) => {
    const m = chessRef.current.move({ from: mv.from, to: mv.to, promotion: mv.promotion ?? 'q' });
    playSound(m?.captured ? 'capture' : 'move');
    setFen(chessRef.current.fen());
    return m;
  };

  // These three are mutually recursive (turn → turn), so they're hoisted
  // function declarations rather than useCallback consts. They're only invoked
  // from event handlers / each other, never as effect dependencies.
  function finish(color: Color) {
    const c = chessRef.current;
    let text: string;
    if (c.isCheckmate()) {
      const winner: Color = c.turn() === 'w' ? 'b' : 'w';
      text = winner === color ? '🏆 You won the game!' : 'The opponent checkmated you — great practice!';
      playSound(winner === color ? 'reward' : 'move');
    } else {
      text = '🤝 The game is a draw.';
    }
    setGameOverText(text);
    setPhase('gameover');
  }

  // The opponent (capped-weaker Stockfish) plays its best move automatically.
  async function opponentTurn(color: Color) {
    setPhase('opponent');
    const moves = await stockfishEvaluatedMoves(chessRef.current.fen(), {
      depth: TRAIN_OPPONENT_DEPTH, multiPV: 1, elo: TRAIN_OPPONENT_ELO, skill: TRAIN_OPPONENT_SKILL,
    });
    if (!aliveRef.current) return;
    if (moves.length === 0) { setPhase('error'); return; }
    await new Promise((r) => setTimeout(r, 500)); // brief "thinking" beat
    if (!aliveRef.current) return;
    applyAndSync(moves[0]);
    if (chessRef.current.isGameOver()) finish(color);
    else void playerTurn(color);
  }

  // The player's side: copilot Stockfish surfaces its top-2. The player CHOOSES
  // only every DECISION_EVERY-th move; on the others the grandmaster auto-plays
  // its best move (with a 1-liner) so human blunders stay rare.
  async function playerTurn(color: Color) {
    setPhase('thinking');
    setAutoNote(null);
    const moves = await stockfishEvaluatedMoves(chessRef.current.fen(), {
      depth: TRAIN_COPILOT_DEPTH, multiPV: 2,
    });
    if (!aliveRef.current) return;
    if (moves.length === 0) { setPhase('error'); return; }

    const fenBefore = chessRef.current.fen();
    // Only one good/legal move — auto-play it, no choice (doesn't burn a decision).
    if (moves.length < 2) {
      const only = analyzeCandidate(fenBefore, moves[0]);
      setAutoNote(`Only one move here — ${only.rationale.toLowerCase()}.`);
      applyAndSync(moves[0]);
      if (chessRef.current.isGameOver()) { finish(color); return; }
      void opponentTurn(color);
      return;
    }

    const cands = [analyzeCandidate(fenBefore, moves[0]), analyzeCandidate(fenBefore, moves[1])];
    setRanked(cands);
    setStars(null);
    setVerdict('');

    const moveIdx = playerMoveCountRef.current;
    playerMoveCountRef.current += 1;
    const isDecision = moveIdx % DECISION_EVERY === 0;

    if (isDecision) {
      setOrder(Math.random() < 0.5 ? [0, 1] : [1, 0]); // shuffle so the player thinks
      setChosenRank(null);
      setPhase('choosing');
    } else {
      // Grandmaster auto-move: show both candidates (best first) revealed, explain, await Next.
      setOrder([0, 1]);
      setChosenRank(0);
      setStars(rateCandidates(cands[0].move, cands[1].move));
      setAutoNote(buildAutoNote(cands[0], cands[1]));
      setPhase('auto');
    }
  }

  const start = (color: Color) => {
    resumeAudio();
    chessRef.current = new Chess();
    playerMoveCountRef.current = 0;
    setFen(chessRef.current.fen());
    setPlayerColor(color);
    setScore({ matched: 0, total: 0 });
    setGameOverText('');
    if (chessRef.current.turn() === color) void playerTurn(color);
    else void opponentTurn(color);
  };

  const pick = (rankIdx: number) => {
    if (phase !== 'choosing' || ranked.length < 2) return;
    const rating = rateCandidates(ranked[0].move, ranked[1].move);
    const isBest = rankIdx === 0;
    // When the two moves are basically equal (#2 still rates ⭐⭐⭐), the verdict
    // says "you can't go wrong" — so count it as a match either way.
    const counts = isBest || rating.secondStars === 3;
    setStars(rating);
    setChosenRank(rankIdx);
    setVerdict(buildVerdict(ranked[0], ranked[1], isBest));
    setScore((s) => ({ matched: s.matched + (counts ? 1 : 0), total: s.total + 1 }));
    if (counts) playSound('reward');
    setPhase('verdict');
  };

  const playChosen = () => {
    if (chosenRank == null) return;
    applyAndSync(ranked[chosenRank].move);
    if (chessRef.current.isGameOver()) finish(playerColor);
    else void opponentTurn(playerColor);
  };

  // Auto-played grandmaster move: apply the engine #1 and continue.
  const playAuto = () => {
    if (ranked.length < 1) return;
    applyAndSync(ranked[0].move);
    setAutoNote(null);
    if (chessRef.current.isGameOver()) finish(playerColor);
    else void opponentTurn(playerColor);
  };

  // Board highlights for the two candidates (choosing/verdict/auto).
  const highlights: BoardHighlight[] =
    (phase === 'choosing' || phase === 'verdict' || phase === 'auto') && ranked.length >= 2
      ? order.map((rankIdx, displayPos) => ({
          from: ranked[rankIdx].move.from,
          to: ranked[rankIdx].move.to,
          color: ACCENTS[displayPos],
        }))
      : [];

  return (
    <div className="train-page">
      <header className="train-header">
        <button className="btn btn-ghost train-back" onClick={() => router.push('/')}>← Home</button>
        <h1 className="train-title">🎓 Grandmaster Mode</h1>
        {phase !== 'setup' && (
          <div className="train-score">Matched: {score.matched}/{score.total}</div>
        )}
      </header>

      {phase === 'setup' && (
        <div className="train-setup card">
          <h2>Train with a Grandmaster</h2>
          <p className="muted">
            A grandmaster shows you its <b>two best moves</b> each turn. You pick one — then
            find out which was stronger and why. Beat a weaker opponent and learn like a pro!
          </p>
          <div className="train-setup-btns">
            <button className="btn btn-primary" onClick={() => start('w')}>♔ Play as White</button>
            <button className="btn btn-primary" onClick={() => start('b')}>♚ Play as Black</button>
          </div>
        </div>
      )}

      {phase === 'error' && (
        <div className="train-setup card">
          <h2>Grandmaster engine couldn’t load</h2>
          <p className="muted">This mode needs the chess engine. Please try again.</p>
          <div className="train-setup-btns">
            <button className="btn btn-primary" onClick={() => setPhase('setup')}>↻ Try again</button>
            <button className="btn btn-ghost" onClick={() => router.push('/')}>Home</button>
          </div>
        </div>
      )}

      {phase !== 'setup' && phase !== 'error' && phase !== 'gameover' && (
        <>
          <TrainBoard fen={fen} orientation={playerColor} highlights={highlights} />

          {phase === 'thinking' && <div className="train-status muted">🤔 The grandmaster is thinking…</div>}
          {phase === 'opponent' && <div className="train-status muted">⏳ Opponent is moving…</div>}
          {phase !== 'auto' && autoNote && <div className="train-status muted">{autoNote}</div>}

          {(phase === 'choosing' || phase === 'verdict' || phase === 'auto') && ranked.length >= 2 && (
            <div className="train-choices">
              {order.map((rankIdx, displayPos) => (
                <MoveChoiceCard
                  key={displayPos}
                  candidate={ranked[rankIdx]}
                  accent={ACCENTS[displayPos]}
                  label={displayPos === 0 ? 'A' : 'B'}
                  revealed={phase === 'verdict' || phase === 'auto'}
                  stars={rankIdx === 0 ? stars?.bestStars : stars?.secondStars}
                  isBest={rankIdx === 0}
                  chosen={phase === 'auto' ? false : chosenRank === rankIdx}
                  onPick={() => pick(rankIdx)}
                  disabled={phase === 'verdict' || phase === 'auto'}
                />
              ))}
            </div>
          )}

          {phase === 'verdict' && (
            <div className="train-verdict card">
              <p>{verdict}</p>
              <button className="btn btn-primary" onClick={playChosen}>Play it ▶</button>
            </div>
          )}

          {phase === 'auto' && (
            <div className="train-verdict card">
              <p>{autoNote}</p>
              <button className="btn btn-primary" onClick={playAuto}>Next ▶</button>
            </div>
          )}
        </>
      )}

      {phase === 'gameover' && (
        <div className="train-setup card">
          <h2>{gameOverText}</h2>
          <p className="muted">You matched the grandmaster <b>{score.matched}/{score.total}</b> times!</p>
          <div className="train-setup-btns">
            <button className="btn btn-primary" onClick={() => setPhase('setup')}>↻ Play again</button>
            <button className="btn btn-ghost" onClick={() => router.push('/')}>Home</button>
          </div>
        </div>
      )}
    </div>
  );
}
