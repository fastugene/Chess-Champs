'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGame } from '@/state/gameStore';
import { Board } from '@/components/board/Board';
import { Hud } from '@/components/play/Hud';
import { LessonCard } from '@/components/play/LessonCard';
import { ChapterPrimer } from '@/components/play/ChapterPrimer';
import { RecapCard, type RecapData } from '@/components/play/RecapCard';
import { Celebration } from '@/components/celebrate/Celebration';
import { getLevel } from '@/curriculum/levels';
import { chapterForLevel, nextChapter } from '@/curriculum/chapters';
import {
  addStar,
  completeLevel,
  isChapterComplete,
  loadProgress,
  markChapterMastered,
  markPrimerSeen,
  starsFor,
  unlockChapter,
  DEFAULT_PROGRESS,
  type Progress,
} from '@/persistence/progress';
import { getHint } from '@/chess/hints';
import { speak } from '@/lib/speech';

type Phase = 'primer' | 'lesson' | 'playing';

export default function PlayPage() {
  const router = useRouter();

  const [levelId, setLevelId] = useState(1);
  const level = getLevel(levelId);
  const chapter = chapterForLevel(level.id);

  const [phase, setPhase] = useState<Phase>('lesson');
  const [progress, setProgress] = useState<Progress>(DEFAULT_PROGRESS);
  const [infoOpen, setInfoOpen] = useState(false);
  const [hintsLeft, setHintsLeft] = useState(3);
  const [hint, setHint] = useState<string | null>(null);
  const [recap, setRecap] = useState<RecapData | null>(null);
  const handledGameOver = useRef(false);
  const lastSeq = useRef(0);

  const startGame = useGame((s) => s.startGame);
  const status = useGame((s) => s.status);
  const winner = useGame((s) => s.winner);
  const playerColor = useGame((s) => s.playerColor);
  const fen = useGame((s) => s.fen);
  const events = useGame((s) => s.events);
  const eventSeq = useGame((s) => s.eventSeq);

  const stars = starsFor(progress, chapter.id);

  // Resume at the player's level + decide whether the chapter primer must gate
  // entry (shown once per chapter, until its primer has been seen).
  useEffect(() => {
    void loadProgress().then((p) => {
      setProgress(p);
      const lvl = p.currentLevel >= 1 ? p.currentLevel : 1;
      setLevelId(lvl);
      const ch = chapterForLevel(lvl);
      setPhase(p.primersSeen.includes(ch.id) ? 'lesson' : 'primer');
    });
  }, []);

  const begin = useCallback(() => {
    handledGameOver.current = false;
    lastSeq.current = 0;
    startGame({ playerColor: level.playerColor, band: level.botBand });
    setPhase('playing');
    setHintsLeft(3);
    setHint(null);
    setRecap(null);
  }, [level, startGame]);

  // Award a star whenever the player lands this chapter's tactic.
  useEffect(() => {
    if (phase !== 'playing') return;
    if (eventSeq === lastSeq.current) return;
    lastSeq.current = eventSeq;
    if (events.length === 0) return;
    const landed = events.some((e) => chapter.starEventTypes.includes(e.type));
    if (!landed) return;
    void addStar(chapter.id, chapter.starGoal).then(setProgress);
  }, [eventSeq, events, phase, chapter]);

  // Detect end of game, persist XP/champ power, and build the recap.
  useEffect(() => {
    if (phase !== 'playing' || handledGameOver.current) return;
    if (status !== 'checkmate' && status !== 'stalemate' && status !== 'draw') return;

    handledGameOver.current = true;
    const result: RecapData['result'] =
      status === 'checkmate' ? (winner === playerColor ? 'win' : 'lose') : 'draw';
    const xp = result === 'win' ? 100 : result === 'draw' ? 40 : 25;
    const championId = result === 'win' ? 'queen' : undefined;

    void completeLevel(level.id, xp, championId).then((p) => {
      setProgress(p);
      const ch = chapterForLevel(level.id);
      let chapterMastered = false;
      if (isChapterComplete(p, ch) && !p.chaptersMastered.includes(ch.id)) {
        chapterMastered = true;
        void markChapterMastered(ch.id).then(setProgress);
        const nxt = nextChapter(ch.id);
        if (nxt) void unlockChapter(nxt.id).then(setProgress);
      }
      setRecap({
        result,
        xp,
        championId,
        championPower: championId ? (p.champPower[championId] ?? 1) : undefined,
        chapter: ch,
        stars: starsFor(p, ch.id),
        chapterXp: p.xp,
        chapterMastered,
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

  // Primer "Start!" from the gate: mark seen, then drop into the lesson.
  const onPrimerGateDone = () => {
    void markPrimerSeen(chapter.id).then(setProgress);
    setPhase('lesson');
  };

  return (
    <>
      <Hud
        chapter={level.chapter}
        title={`Level ${level.id}: ${level.title}`}
        onHint={onHint}
        hintsLeft={hintsLeft}
        missionChapter={chapter}
        stars={stars}
        chapterXp={progress.xp}
        onInfo={() => setInfoOpen(true)}
      />

      <div className="center-col">
        <Board />
        {hint && <div className="hint-toast">💡 {hint}</div>}
        <div className="muted">Tap a piece, then tap where to move.</div>
      </div>

      <Celebration />

      {phase === 'primer' && (
        <ChapterPrimer
          chapter={chapter}
          stars={stars}
          xp={progress.xp}
          onClose={onPrimerGateDone}
        />
      )}

      {phase === 'lesson' && <LessonCard level={level} onStart={begin} />}

      {infoOpen && (
        <ChapterPrimer
          chapter={chapter}
          stars={stars}
          xp={progress.xp}
          ctaLabel="Got it! ▶"
          onClose={() => setInfoOpen(false)}
        />
      )}

      {recap && (
        <RecapCard {...recap} onPlayAgain={begin} onHome={() => router.push('/')} />
      )}
    </>
  );
}
