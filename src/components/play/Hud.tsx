'use client';

import { useGame } from '@/state/gameStore';
import { MissionTracker } from '@/components/play/MissionTracker';
import type { Chapter } from '@/curriculum/chapters';

export function Hud({
  chapter,
  title,
  onHint,
  hintsLeft,
  missionChapter,
  stars,
  chapterXp,
  onInfo,
  rankDisplay,
  rankColor,
  rankBadge,
}: {
  chapter: string;
  title: string;
  onHint: () => void;
  hintsLeft: number;
  missionChapter: Chapter;
  stars: number;
  chapterXp: number;
  onInfo: () => void;
  rankDisplay: string;
  rankColor: string;
  rankBadge: string;
}) {
  const thinking = useGame((s) => s.thinking);
  const turn = useGame((s) => s.turn);
  const playerColor = useGame((s) => s.playerColor);
  const captured = useGame((s) => s.playerCaptured);
  const status = useGame((s) => s.status);
  const undosRemaining = useGame((s) => s.undosRemaining);
  const moveCount = useGame((s) => s.moveCount);
  const undoMove = useGame((s) => s.undoMove);
  const yourTurn = turn === playerColor && status === 'playing';
  const canUndo = undosRemaining > 0 && !thinking && status === 'playing' && moveCount >= 2;

  return (
    <div>
      <div className="hud">
        <div>
          <div className="hud-title">{chapter}</div>
          <div className="hud-sub">{title}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div
            className="chip rank-chip"
            style={{ color: rankColor, borderColor: rankColor }}
            title="Your rank"
          >
            {rankBadge} {rankDisplay}
          </div>
          <button className="chip" onClick={onInfo} aria-label="Chapter goal">
            🎯
          </button>
          <div className="chip" title="Material captured">
            ⚔️ {captured}
          </div>
          <button className="chip" onClick={onHint} disabled={hintsLeft <= 0} aria-label="Hint">
            💡 {hintsLeft}
          </button>
          <button className="chip" onClick={undoMove} disabled={!canUndo} aria-label="Undo move">
            ↩ {undosRemaining}
          </button>
        </div>
      </div>

      <div className="mission-row">
        <MissionTracker chapter={missionChapter} stars={stars} xp={chapterXp} compact />
        <div className="chip">
          {thinking ? (
            <>
              <span className="thinking-dot" /> Opponent thinking…
            </>
          ) : yourTurn ? (
            '👉 Your move!'
          ) : (
            'Get ready…'
          )}
        </div>
      </div>
    </div>
  );
}
