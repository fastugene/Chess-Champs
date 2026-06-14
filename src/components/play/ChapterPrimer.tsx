'use client';

import { useEffect, useRef, useState } from 'react';
import { ChampArt } from '@/components/champs/ChampArt';
import { TutorialBoard } from '@/components/board/TutorialBoard';
import { Typewriter } from '@/components/play/Typewriter';
import { MissionTracker } from '@/components/play/MissionTracker';
import { CHAMPS } from '@/progression/champs';
import type { Chapter } from '@/curriculum/chapters';
import { speakSlug } from '@/audio/speech';

const LAST = 4; // 0 intro · 1 explain · 2 watch · 3 try · 4 mission

/**
 * The interactive guided tutorial shown before a chapter. Five paced beats turn
 * "shooting blind" into a coaching session: meet the coach, learn the tactic,
 * watch it demoed on a live board, perform it yourself, then see the mission.
 *
 * Text reveals typewriter-style (encourages reading) with narrative ElevenLabs
 * voice-over per beat (silent until the mp3s land). The practice beat guides but
 * never blocks: wrong taps nudge, and after a couple misses the coach shows the
 * move then lets the child try it himself. Replayable via the 🎯 HUD button.
 */
export function ChapterPrimer({
  chapter,
  stars,
  xp,
  ctaLabel = 'Start! ▶',
  onClose,
}: {
  chapter: Chapter;
  stars: number;
  xp: number;
  ctaLabel?: string;
  onClose: () => void;
}) {
  const t = chapter.tutorial;
  const champ = CHAMPS[chapter.mentor];

  const [step, setStep] = useState(0);
  const [textDone, setTextDone] = useState(false);

  // Beat 3 (practice) state.
  const [solved, setSolved] = useState(false);
  const [misses, setMisses] = useState(0);
  const [boardMode, setBoardMode] = useState<'demo' | 'guided'>('guided');
  const [showMePlayed, setShowMePlayed] = useState(false);
  const [playToken, setPlayToken] = useState(0);

  // The voice line for the current beat (narration plays on entry).
  const voiceFor = (s: number): string => {
    switch (s) {
      case 0: return t.intro.voice;
      case 1: return t.explain.voice;
      case 2: return t.demo.voice;
      case 3: return t.practice.voice;
      default: return '';
    }
  };

  // On entering a beat: reset its reveal state and play its narration.
  const enteredStep = useRef(-1);
  useEffect(() => {
    setTextDone(false);
    if (step === 3) {
      setSolved(false);
      setMisses(0);
      setShowMePlayed(false);
      setBoardMode('guided');
    }
    if (step === 2) setBoardMode('demo');
    setPlayToken((n) => n + 1);
    if (enteredStep.current !== step) {
      enteredStep.current = step;
      const v = voiceFor(step);
      if (v) speakSlug(v);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const next = () => setStep((s) => Math.min(LAST, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  // Practice handlers.
  const onCorrect = () => {
    setSolved(true);
    if (t.practice.successVoice) speakSlug(t.practice.successVoice);
  };
  const onWrong = () => setMisses((m) => m + 1);
  const showMe = () => {
    setBoardMode('demo');
    setShowMePlayed(true);
    setPlayToken((n) => n + 1);
    if (t.demo.voice) speakSlug(t.demo.voice);
  };
  const tryAgain = () => {
    setBoardMode('guided');
    setSolved(false);
    setMisses(0);
    setPlayToken((n) => n + 1);
  };
  const watchAgain = () => {
    setBoardMode('demo');
    setPlayToken((n) => n + 1);
    if (t.demo.voice) speakSlug(t.demo.voice);
  };

  // Whether the primary "Next/Start" button is available on this beat.
  const canAdvance =
    step === 3 ? solved || showMePlayed : step === 2 ? true : textDone;

  return (
    <div className="overlay">
      <div className="card primer-card">
        <div className="primer-dots" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className={`primer-dot ${i === step ? 'on' : ''}`} />
          ))}
        </div>
        <div className="muted">
          Chapter {chapter.id} · {chapter.title}
        </div>

        {step === 0 && (
          <div className="primer-beat" key="b0">
            <h2>Meet your coach</h2>
            <div className="coach-pop">
              <ChampArt champId={chapter.mentor} size={124} />
            </div>
            <div className="mentor-line">
              <b>{champ?.name}:</b>{' '}
              <Typewriter text={t.intro.text} onDone={() => setTextDone(true)} />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="primer-beat" key="b1">
            <h2>What is it?</h2>
            <div className="big-emoji" aria-hidden="true">🛡️✨</div>
            <div className="mentor-line">
              <Typewriter text={t.explain.text} onDone={() => setTextDone(true)} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="primer-beat" key="b2">
            <h2>Watch me do it</h2>
            <TutorialBoard
              fen={t.fen}
              from={t.demo.from}
              to={t.demo.to}
              mode="demo"
              badSquare={t.demo.badTarget}
              playToken={playToken}
              onDemoDone={() => setTextDone(true)}
            />
            <div className="mentor-line">
              <Typewriter text={t.demo.caption} startDelayMs={400} />
            </div>
            <button className="btn btn-ghost btn-sm" onClick={watchAgain}>
              🔁 Watch again
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="primer-beat" key="b3">
            <h2>Now you try! 👇</h2>
            <TutorialBoard
              fen={t.fen}
              from={t.practice.from}
              to={t.practice.to}
              mode={boardMode}
              badSquare={t.demo.badTarget}
              playToken={playToken}
              onCorrect={onCorrect}
              onWrong={onWrong}
              onDemoDone={() => { /* show-me finished */ }}
            />
            <div className={`mentor-line ${solved ? 'mentor-win' : ''}`}>
              {solved ? (
                <Typewriter text={t.practice.success} />
              ) : misses > 0 ? (
                <span className="nudge">{t.practice.nudge}</span>
              ) : (
                <Typewriter text={t.practice.prompt} />
              )}
            </div>
            {!solved && misses >= 2 && boardMode === 'guided' && (
              <button className="btn btn-ghost btn-sm" onClick={showMe}>
                👀 Show me
              </button>
            )}
            {!solved && boardMode === 'demo' && (
              <button className="btn btn-ghost btn-sm" onClick={tryAgain}>
                ✋ Try it yourself
              </button>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="primer-beat" key="b4">
            <h2>Your Mission</h2>
            <p>
              Master the <b>{chapter.tactic}</b>! Clear both bars to unlock the next chapter:
            </p>
            <MissionTracker chapter={chapter} stars={stars} xp={xp} />
            <p className="never-stuck">
              💪 You can’t get stuck — just keep playing and you’ll get there!
            </p>
          </div>
        )}

        <div className="card-actions">
          {step > 0 && (
            <button className="btn btn-ghost" onClick={back}>
              ◀ Back
            </button>
          )}
          {step < LAST ? (
            <button className="btn btn-primary" onClick={next} disabled={!canAdvance}>
              Next ▶
            </button>
          ) : (
            <button className="btn btn-primary btn-big" onClick={onClose}>
              {ctaLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
