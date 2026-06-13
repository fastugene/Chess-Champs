'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGame } from '@/state/gameStore';
import { Board } from '@/components/board/Board';
import { Hud } from '@/components/play/Hud';
import { LessonCard } from '@/components/play/LessonCard';
import { RecapCard, type RecapData } from '@/components/play/RecapCard';
import { Celebration } from '@/components/celebrate/Celebration';
import { getLevel } from '@/curriculum/levels';
import { completeLevel, loadProgress } from '@/persistence/progress';
import { getHint } from '@/chess/hints';
import { speak } from '@/lib/speech';

export default function PlayPage() {
  const router = useRouter();

  const [levelId, setLevelId] = useState(1);
  const level = getLevel(levelId);

  const [phase, setPhase] = useState<'lesson' | 'playing'>('lesson');
  const [hintsLeft, setHintsLeft] = useState(3);
  const [hint, setHint] = useState<string | null>(null);
  const [recap, setRecap] = useState<RecapData | null>(null);
  const handledGameOver = useRef(false);

  const startGame = useGame((s) => s.startGame);
  const status = useGame((s) => s.status);
  const winner = useGame((s) => s.winner);
  const playerColor = useGame((s) => s.playerColor);
  const fen = useGame((s) => s.fen);

  // Resume at the player's current level (Phase 1 has Level 1 only; later
  // levels fall back to Level 1 until the full campaign ships).
  useEffect(() => {
    void loadProgress().then((p) => setLevelId(p.currentLevel >= 1 ? p.currentLevel : 1));
  }, []);

  const begin = useCallback(() => {
    handledGameOver.current = false;
    startGame({ playerColor: level.playerColor, band: level.botBand });
    setPhase('playing');
    setHintsLeft(3);
    setHint(null);
    setRecap(null);
  }, [level, startGame]);

  // Detect end of game and build the recap.
  useEffect(() => {
    if (phase !== 'playing' || handledGameOver.current) return;
    if (status !== 'checkmate' && status !== 'stalemate' && status !== 'draw') return;

    handledGameOver.current = true;
    const result: RecapData['result'] =
      status === 'checkmate' ? (winner === playerColor ? 'win' : 'lose') : 'draw';
    const xp = result === 'win' ? 100 : result === 'draw' ? 40 : 25;
    const championId = result === 'win' ? 'finisher' : undefined;

    void completeLevel(level.id, xp, championId).then((p) => {
      setRecap({
        result,
        xp,
        championId,
        championPower: championId ? (p.champPower[championId] ?? 1) : undefined,
      });
    });
  }, [status, phase, winner, playerColor, level.id]);

  const onHint = () => {
    if (hintsLeft <= 0) return;
    const h = getHint(fen, playerColor);
    setHint(h);
    setHintsLeft((n) => n - 1);
    speak(h);
    window.setTimeout(() => setHint(null), 5000);
  };

  return (
    <>
      <Hud
        chapter={level.chapter}
        title={`Level ${level.id}: ${level.title}`}
        onHint={onHint}
        hintsLeft={hintsLeft}
      />

      <div className="center-col">
        <Board />
        {hint && <div className="hint-toast">💡 {hint}</div>}
        <div className="muted">Tap a piece, then tap where to move.</div>
      </div>

      <Celebration />

      {phase === 'lesson' && <LessonCard level={level} onStart={begin} />}
      {recap && (
        <RecapCard {...recap} onPlayAgain={begin} onHome={() => router.push('/')} />
      )}
    </>
  );
}
