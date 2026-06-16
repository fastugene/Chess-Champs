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
  awardPlayRewards,
  completeLevel,
  isChapterComplete,
  loadParentSettings,
  loadProgress,
  markChapterMastered,
  markPrimerSeen,
  recordGameResult,
  setPawnCustomName,
  starsFor,
  unlockChapter,
  DEFAULT_PROGRESS,
  type Progress,
} from '@/persistence/progress';
import { BAND_ORDER } from '@/engine/difficulty';
import { getRank } from '@/progression/ranks';
import { getHint } from '@/chess/hints';
import { xpForEvents } from '@/chess/tactics/detect';
import { crossedPawnMorph, type PawnForm, type GadgetId } from '@/progression/champs';
import { speak } from '@/lib/speech';
import { EvolveCutscene } from '@/components/champs/EvolveCutscene';
import { NamePawnModal } from '@/components/onboarding/NamePawnModal';

type Phase = 'primer' | 'lesson' | 'playing';

export default function PlayPage() {
  const router = useRouter();

  const [levelId, setLevelId] = useState(1);
  const level = getLevel(levelId);
  const chapter = chapterForLevel(level.id);

  const [phase, setPhase] = useState<Phase>('lesson');
  const [progress, setProgress] = useState<Progress>(DEFAULT_PROGRESS);
  const [trainingWheels, setTrainingWheels] = useState(true);
  const [infoOpen, setInfoOpen] = useState(false);
  const [hintsLeft, setHintsLeft] = useState(3);
  const [hint, setHint] = useState<string | null>(null);
  const [recap, setRecap] = useState<RecapData | null>(null);
  const [evolve, setEvolve] = useState<{ form: PawnForm; gadgets: GadgetId[]; newGadget?: GadgetId; power: number } | null>(null);
  const [showNameModal, setShowNameModal] = useState(false);
  const handledGameOver = useRef(false);
  const lastSeq = useRef(0);
  const bestEventRef = useRef<import('@/chess/tactics/detect').TacticEvent | null>(null);

  const startGame = useGame((s) => s.startGame);
  const pendingMove = useGame((s) => s.pendingMove);
  const confirmPendingMove = useGame((s) => s.confirmPendingMove);
  const cancelPendingMove = useGame((s) => s.cancelPendingMove);
  const status = useGame((s) => s.status);
  const winner = useGame((s) => s.winner);
  const playerColor = useGame((s) => s.playerColor);
  const fen = useGame((s) => s.fen);
  const events = useGame((s) => s.events);
  const eventSeq = useGame((s) => s.eventSeq);

  const stars = starsFor(progress, chapter.id);

  // Resume at the player's level + decide whether the chapter primer must gate entry.
  useEffect(() => {
    void loadProgress().then((p) => {
      setProgress(p);
      const lvl = p.currentLevel >= 1 ? p.currentLevel : 1;
      setLevelId(lvl);
      const ch = chapterForLevel(lvl);
      setPhase(p.primersSeen.includes(ch.id) ? 'lesson' : 'primer');
    });
    void loadParentSettings().then((s) => setTrainingWheels(s.trainingWheels));
  }, []);

  // Training-wheels auto-retire: only warn until the bot climbs past `medium`.
  const RETIRE_IDX = BAND_ORDER.indexOf('medium');
  const safetyOn = trainingWheels && BAND_ORDER.indexOf(progress.botBand) < RETIRE_IDX;

  const begin = useCallback(() => {
    handledGameOver.current = false;
    lastSeq.current = 0;
    bestEventRef.current = null;
    // Use the auto-calibrated band so difficulty adapts to the son's skill.
    startGame({ playerColor: level.playerColor, band: progress.botBand, safety: safetyOn });
    setPhase('playing');
    setHintsLeft(3);
    setHint(null);
    setRecap(null);
  }, [level, startGame, progress.botBand, safetyOn]);

  // Award a star whenever the player lands this chapter's tactic.
  useEffect(() => {
    if (phase !== 'playing') return;
    if (eventSeq === lastSeq.current) return;
    lastSeq.current = eventSeq;
    if (events.length === 0) return;

    // Track the best tactic event for the recap's shining-moment panel.
    const tierScore: Record<string, number> = { checkmate: 4, fork: 3, 'discovered-attack': 3, pin: 3, skewer: 3, 'win-material': 2, capture: 1 };
    for (const e of events) {
      const cur = bestEventRef.current;
      if (!cur || (tierScore[e.type] ?? 0) > (tierScore[cur.type] ?? 0)) bestEventRef.current = e;
    }

    // Reward ladder: every detected event drips scaled XP (small → big wins),
    // powers up the matching Champ, and landing this chapter's tactic earns a star.
    // Checkmate is excluded here — its reward is the game-over win bonus.
    const nonMate = events.filter((e) => e.type !== 'checkmate');
    const xpGain = xpForEvents(nonMate);
    const landed = events.some((e) => chapter.starEventTypes.includes(e.type));
    // Collect distinct champIds from this move's events (deduped).
    const champIds = [...new Set(nonMate.map((e) => e.champId).filter(Boolean) as string[])];
    if (xpGain === 0 && !landed && champIds.length === 0) return;
    void awardPlayRewards({
      chapterId: chapter.id,
      starGoal: chapter.starGoal,
      addStar: landed,
      xp: xpGain,
      champIds,
    }).then(({ progress: p, champPowerBefore }) => {
      setProgress(p);
      // Detect pawn morph threshold crossing → show EVOLVED! cutscene.
      const oldPawnPower = champPowerBefore['pawn'];
      const newPawnPower = p.champPower['pawn'];
      if (oldPawnPower != null && newPawnPower != null && newPawnPower !== oldPawnPower) {
        const morph = crossedPawnMorph(oldPawnPower, newPawnPower);
        if (morph) setEvolve({ form: morph.form, gadgets: morph.gadgets, newGadget: morph.newGadget, power: newPawnPower });
      }
    });
  }, [eventSeq, events, phase, chapter]);

  // Detect end of game, persist XP/champ power, record result for auto-calibration.
  useEffect(() => {
    if (phase !== 'playing' || handledGameOver.current) return;
    if (status !== 'checkmate' && status !== 'stalemate' && status !== 'draw') return;

    handledGameOver.current = true;
    const result: RecapData['result'] =
      status === 'checkmate' ? (winner === playerColor ? 'win' : 'lose') : 'draw';
    const xp = result === 'win' ? 100 : result === 'draw' ? 40 : 25;
    // Queen powers up on wins (checkmate champId flows through the event system,
    // but we also bump it here for the recap card's CHAMP POWERED UP panel).
    const championId = result === 'win' ? 'queen' : undefined;

    const gameResult = result === 'lose' ? 'loss' : result;

    void Promise.all([
      completeLevel(level.id, xp, championId),
      recordGameResult(gameResult),
    ]).then(([p]) => {
      setProgress(p);
      // First game: show the name-your-pawn modal after the recap if not named yet.
      if (!p.pawnCustomName && p.levelsCompleted.length === 1) {
        setShowNameModal(true);
      }
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
        topEvent: bestEventRef.current ?? undefined,
        pawnCustomName: p.pawnCustomName,
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

  const onPrimerGateDone = () => {
    void markPrimerSeen(chapter.id).then(setProgress);
    setPhase('lesson');
  };

  const rank = getRank(progress.xp, progress.chaptersMastered);

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
        rankDisplay={rank.displayName}
        rankColor={rank.tier.color}
        rankBadge={rank.tier.badge}
      />

      <div className="center-col">
        <Board />
        {hint && <div className="hint-toast">💡 {hint}</div>}
        <div className="muted">Tap a piece, then tap where to move.</div>
      </div>

      <Celebration />

      {pendingMove && (
        <div className="overlay">
          <div className="card safety-card">
            <div className="safety-emoji">🛡️</div>
            <h3 style={{ margin: '6px 0' }}>Is that square safe?</h3>
            <p className="muted" style={{ marginTop: 0 }}>
              That spot can be taken by your opponent. Want to move there anyway?
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={cancelPendingMove}>
                Let me rethink
              </button>
              <button className="btn" style={{ flex: 1 }} onClick={confirmPendingMove}>
                Move anyway
              </button>
            </div>
          </div>
        </div>
      )}

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

      {evolve && (
        <EvolveCutscene
          form={evolve.form}
          gadgets={evolve.gadgets}
          newGadget={evolve.newGadget}
          power={evolve.power}
          pawnCustomName={progress.pawnCustomName}
          onDone={() => setEvolve(null)}
        />
      )}

      {recap && (
        <RecapCard {...recap} onPlayAgain={begin} onHome={() => router.push('/')} />
      )}

      {showNameModal && (
        <NamePawnModal
          power={progress.champPower['pawn'] ?? 1}
          onSave={async (name) => {
            const p = await setPawnCustomName(name);
            setProgress(p);
            setShowNameModal(false);
          }}
          onSkip={() => setShowNameModal(false)}
        />
      )}
    </>
  );
}
