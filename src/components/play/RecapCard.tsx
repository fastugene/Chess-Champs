'use client';

import { ChampCard } from '@/components/champs/ChampCard';
import { MissionTracker } from '@/components/play/MissionTracker';
import type { Chapter } from '@/curriculum/chapters';
import type { TacticEvent } from '@/chess/tactics/detect';

export interface RecapData {
  result: 'win' | 'lose' | 'draw';
  xp: number;
  championId?: string;
  championPower?: number;
  chapter?: Chapter;
  stars?: number;
  chapterXp?: number;
  chapterMastered?: boolean;
  /** Best tactic fired this game, for the shining-moment panel. */
  topEvent?: TacticEvent;
}

const TIPS: Record<number, string> = {
  1: 'Before every move, ask: is that piece guarded?',
  2: 'Box the king into the corner step by step!',
  3: 'Develop knights and bishops before attacking!',
  4: 'Look for squares where your knight hits two pieces at once!',
  5: 'Bishops and rooks can pin enemy pieces to their king!',
  6: 'Move one piece to reveal a hidden attacker behind it!',
  7: 'In the endgame, every pawn is worth its weight in gold!',
};

export function RecapCard({
  result,
  xp,
  championId,
  championPower,
  chapter,
  stars,
  chapterXp,
  chapterMastered,
  topEvent,
  onPlayAgain,
  onHome,
}: RecapData & { onPlayAgain: () => void; onHome: () => void }) {
  const p1Color =
    result === 'win' ? 'var(--gold)' : result === 'draw' ? 'var(--diamond)' : 'var(--ruby)';
  const p1Title =
    result === 'win' ? 'VICTORY! 🏆' : result === 'draw' ? 'TOUGH DRAW 🤝' : 'GOOD FIGHT! 💪';
  const p1Msg =
    result === 'win'
      ? 'You played smart chess — champions are made one game at a time!'
      : result === 'draw'
        ? 'So close! Every game sharpens your skills.'
        : 'Losing teaches you the most. You are getting stronger!';

  const starsRemaining = chapter && stars != null ? chapter.starGoal - stars : null;
  const tip = chapter ? TIPS[chapter.id] ?? '' : '';

  return (
    <div className="overlay">
      <div className="card recap-comic">
        <div className="comic-panels">

          {/* Panel 1 — YOUR MOMENT */}
          <div className="comic-panel" style={{ borderColor: p1Color }}>
            <div className="panel-label" style={{ color: p1Color }}>YOUR MOMENT</div>
            <div className="panel-headline">{p1Title}</div>
            {topEvent && (
              <div className="panel-tactic">
                ⚡ {topEvent.label}
                {topEvent.sub && <span className="panel-tactic-sub"> {topEvent.sub}</span>}
              </div>
            )}
            {!topEvent && <p className="panel-msg">{p1Msg}</p>}
            {championId && (
              <div className="powerup-stage" style={{ marginTop: 8 }}>
                <div className="level-up">⚡ CHAMP POWERED UP! ⚡</div>
                <ChampCard champId={championId} size={88} power={championPower ?? 1} />
              </div>
            )}
          </div>

          {/* Panel 2 — CHAPTER QUEST */}
          {chapter && stars != null && chapterXp != null && (
            <div className="comic-panel" style={{ borderColor: 'var(--purple)' }}>
              <div className="panel-label" style={{ color: 'var(--purple)' }}>CHAPTER QUEST</div>
              {chapterMastered ? (
                <div className="chapter-mastered" style={{ margin: '6px 0 0' }}>
                  🎉 {chapter.title} Mastered!
                </div>
              ) : (
                <div className="panel-msg" style={{ marginBottom: 6 }}>
                  {starsRemaining != null && starsRemaining > 0
                    ? `${starsRemaining} more ${chapter.tactic} landing${starsRemaining > 1 ? 's' : ''} to master this chapter!`
                    : `${chapter.tactic} mastered! ⭐`}
                </div>
              )}
              <MissionTracker chapter={chapter} stars={stars} xp={chapterXp} />
            </div>
          )}

          {/* Panel 3 — WHAT'S NEXT */}
          <div className="comic-panel" style={{ borderColor: 'var(--emerald)' }}>
            <div className="panel-label" style={{ color: 'var(--emerald)' }}>WHAT'S NEXT</div>
            <div className="panel-xp">+{xp} XP earned!</div>
            {tip && <div className="panel-tip">💡 {tip}</div>}
            <p className="never-stuck" style={{ marginTop: 6 }}>
              💪 Keep playing — you can&apos;t get stuck!
            </p>
          </div>

        </div>

        <div className="card-actions" style={{ marginTop: 14 }}>
          <button className="btn btn-ghost" onClick={onHome}>Home</button>
          <button className="btn btn-primary" onClick={onPlayAgain}>Play Again</button>
        </div>
      </div>
    </div>
  );
}
