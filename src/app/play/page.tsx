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
import { chapterForLevel } from '@/curriculum/chapters';
import {
  awardPlayRewards,
  completeLevel,
  isCampaignComplete,
  loadParentSettings,
  loadProgress,
  markPrimerSeen,
  recordGameResult,
  resumeLevel,
  setPawnCustomName,
  starsFor,
  DEFAULT_PROGRESS,
  type Progress,
} from '@/persistence/progress';
import { BAND_ORDER } from '@/engine/difficulty';
import { getRank } from '@/progression/ranks';
import { getHint } from '@/chess/hints';
import { crossedPawnMorph, pawnFormIndex, type PawnForm, type GadgetId } from '@/progression/champs';
import { speak } from '@/lib/speech';
import { EvolveCutscene } from '@/components/champs/EvolveCutscene';
import { NamePawnModal } from '@/components/onboarding/NamePawnModal';
import { ChapterIntro } from '@/components/play/ChapterIntro';
import { CampaignFinale } from '@/components/play/CampaignFinale';

type Phase = 'chapter-intro' | 'primer' | 'lesson' | 'playing';

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
  const [evolve, setEvolve] = useState<{ form: PawnForm; gadgets: GadgetId[]; newGadget?: GadgetId; pawnXp: number } | null>(null);
  const [showNameModal, setShowNameModal] = useState(false);
  const [campaignDone, setCampaignDone] = useState(false);
  const pendingNameModal = useRef(false);
  const handledGameOver = useRef(false);
  const masteredThisGame = useRef(false);
  const lastPlayedLevel = useRef(1);
  const gameStartPawnXp = useRef(0);
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
      // Already beat the whole campaign? Re-entering /play should celebrate, not
      // silently drop the kid back onto the last level's lesson.
      if (isCampaignComplete(p)) {
        setCampaignDone(true);
        return;
      }
      // Clamp into a real, unlocked level so /play never outruns /campaign.
      const lvl = resumeLevel(p);
      setLevelId(lvl);
      const ch = chapterForLevel(lvl);
      // Unseen chapter → play its title-card intro first, which flows into the
      // tutorial (primer); seen → straight to the lesson.
      setPhase(p.primersSeen.includes(ch.id) ? 'lesson' : 'chapter-intro');
    });
    void loadParentSettings().then((s) => setTrainingWheels(s.trainingWheels));
  }, []);

  // Training-wheels auto-retire: only warn until the bot climbs past `medium`.
  const RETIRE_IDX = BAND_ORDER.indexOf('medium');
  const safetyOn = trainingWheels && BAND_ORDER.indexOf(progress.botBand) < RETIRE_IDX;

  const begin = useCallback(() => {
    handledGameOver.current = false;
    masteredThisGame.current = false;
    lastSeq.current = 0;
    bestEventRef.current = null;
    pendingNameModal.current = false;
    gameStartPawnXp.current = progress.pawnXp ?? 0;
    // Use the auto-calibrated band so difficulty adapts to the son's skill.
    startGame({ playerColor: level.playerColor, band: progress.botBand, safety: safetyOn });
    setPhase('playing');
    setHintsLeft(3);
    setHint(null);
    setRecap(null);
  }, [level, startGame, progress.botBand, progress.pawnXp, safetyOn]);

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

    // Champ growth + stars: each tactic event powers up its matching Champ and,
    // if it's this chapter's tactic, earns a star. Rank XP is NOT touched here —
    // rank comes only from finishing games (clean split, see completeLevel).
    // Checkmate is excluded — its reward is the game-over win bonus.
    const nonMate = events.filter((e) => e.type !== 'checkmate');
    const landed = events.some((e) => chapter.starEventTypes.includes(e.type));
    // Collect distinct champIds from this move's events (deduped).
    const champIds = [...new Set(nonMate.map((e) => e.champId).filter(Boolean) as string[])];
    if (!landed && champIds.length === 0) return;
    void awardPlayRewards({
      chapterId: chapter.id,
      starGoal: chapter.starGoal,
      addStar: landed,
      champIds,
    }).then(({ progress: p, oldPawnXp, chapterMastered }) => {
      setProgress(p);
      // Remember if this game crossed the chapter's star goal, for the recap banner.
      if (chapterMastered) masteredThisGame.current = true;
      // Detect pawn morph threshold crossing → show EVOLVED! cutscene.
      const newPawnXp = p.pawnXp ?? 0;
      if (newPawnXp !== oldPawnXp) {
        const morph = crossedPawnMorph(oldPawnXp, newPawnXp);
        if (morph) setEvolve({ form: morph.form, gadgets: morph.gadgets, newGadget: morph.newGadget, pawnXp: newPawnXp });
      }
    });
  }, [eventSeq, events, phase, chapter]);

  // Detect end of game, persist XP/champ power, record result for auto-calibration.
  useEffect(() => {
    if (phase !== 'playing' || handledGameOver.current) return;
    if (status !== 'checkmate' && status !== 'stalemate' && status !== 'draw') return;

    handledGameOver.current = true;
    lastPlayedLevel.current = level.id;
    const result: RecapData['result'] =
      status === 'checkmate' ? (winner === playerColor ? 'win' : 'lose') : 'draw';
    const xp = result === 'win' ? 100 : result === 'draw' ? 40 : 25;
    // Queen powers up on wins (checkmate champId flows through the event system,
    // but we also bump it here for the recap card's CHAMP POWERED UP panel).
    const championId = result === 'win' ? 'queen' : undefined;

    const gameResult = result === 'lose' ? 'loss' : result;
    const won = result === 'win';

    // Sequence these two writes — NOT Promise.all. Both load+save the same
    // progress record, so running them concurrently lets the second save clobber
    // the first (recordGameResult would wipe completeLevel's XP / level advance /
    // queen power-up). Running completeLevel first, then recordGameResult (which
    // reloads the just-saved state), keeps both sets of changes.
    void (async () => {
      // Only a win (or finishing a now-mastered chapter) advances the level;
      // losses/draws still earn XP (growth-framed).
      await completeLevel(level.id, xp, championId, won);
      const p = await recordGameResult(gameResult);
      setProgress(p);
      // Advance levelId so HUD + chapter reflect the new level before recap shows.
      if (p.currentLevel !== levelId) setLevelId(p.currentLevel);
      // First game: queue the name-your-pawn modal to show AFTER recap is dismissed.
      if (!p.pawnCustomName && p.levelsCompleted.length === 1) {
        pendingNameModal.current = true;
      }
      // The chapter just played (mastery was recorded live in awardPlayRewards).
      const ch = chapterForLevel(level.id);
      // If every chapter is mastered, show the finale instead of the recap.
      if (isCampaignComplete(p)) {
        setCampaignDone(true);
        return;
      }
      setRecap({
        result,
        xp,
        championId,
        championPower: championId ? (p.champPower[championId] ?? 1) : undefined,
        chapter: ch,
        stars: starsFor(p, ch.id),
        chapterXp: p.xp,
        chapterMastered: masteredThisGame.current,
        topEvent: bestEventRef.current ?? undefined,
        pawnCustomName: p.pawnCustomName,
        pawnXp: p.pawnXp ?? 0,
        pawnXpGained: (p.pawnXp ?? 0) - gameStartPawnXp.current,
      });
    })();
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
        pawnXp={progress.pawnXp ?? 0}
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

      {phase === 'chapter-intro' && (
        <ChapterIntro chapter={chapter} onDone={() => setPhase('primer')} />
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
          pawnXp={evolve.pawnXp}
          pawnCustomName={progress.pawnCustomName}
          onDone={() => setEvolve(null)}
        />
      )}

      {recap && (
        <RecapCard
          {...recap}
          onPlayAgain={() => {
            setRecap(null);
            if (pendingNameModal.current) { pendingNameModal.current = false; setShowNameModal(true); return; }
            // Moved on to a different level? Show its primer (if unseen) or lesson;
            // replaying the same level drops straight back into the game.
            if (levelId !== lastPlayedLevel.current) {
              const ch = chapterForLevel(levelId);
              setPhase(progress.primersSeen.includes(ch.id) ? 'lesson' : 'chapter-intro');
            } else {
              begin();
            }
          }}
          onHome={() => {
            if (pendingNameModal.current) { pendingNameModal.current = false; setShowNameModal(true); return; }
            router.push('/');
          }}
        />
      )}

      {showNameModal && (
        <NamePawnModal
          power={pawnFormIndex(progress.pawnXp ?? 0)}
          onSave={async (name) => {
            const p = await setPawnCustomName(name);
            setProgress(p);
            setShowNameModal(false);
          }}
          onSkip={() => setShowNameModal(false)}
        />
      )}

      {campaignDone && (
        <CampaignFinale
          pawnName={progress.pawnCustomName}
          onHome={() => router.push('/')}
          onSquad={() => router.push('/squad')}
        />
      )}
    </>
  );
}
