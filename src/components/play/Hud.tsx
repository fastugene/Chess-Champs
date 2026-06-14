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
}: {
  chapter: string;
  title: string;
  onHint: () => void;
  hintsLeft: number;
  missionChapter: Chapter;
  stars: number;
  chapterXp: number;
  onInfo: () => void;
}) {
  const thinking = useGame((s) => s.thinking);
  const turn = useGame((s) => s.turn);
  const playerColor = useGame((s) => s.playerColor);
  const captured = useGame((s) => s.playerCaptured);
  const status = useGame((s) => s.status);
  const yourTurn = turn === playerColor && status === 'playing';

  return (
    <div>
      <div className="hud">
        <div>
          <div className="hud-title">{chapter}</div>
          <div className="hud-sub">{title}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="chip" onClick={onInfo} aria-label="Chapter goal">
            🎯
          </button>
          <div className="chip" title="Material captured">
            ⚔️ {captured}
          </div>
          <button className="chip" onClick={onHint} disabled={hintsLeft <= 0} aria-label="Hint">
            💡 {hintsLeft}
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
