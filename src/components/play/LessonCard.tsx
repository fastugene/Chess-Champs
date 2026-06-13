'use client';

import { ChampArt } from '@/components/champs/ChampArt';
import { CHAMPS } from '@/progression/champs';
import type { Level } from '@/curriculum/levels';
import { speak } from '@/lib/speech';

export function LessonCard({ level, onStart }: { level: Level; onStart: () => void }) {
  const champ = CHAMPS[level.mentor];
  return (
    <div className="overlay">
      <div className="card">
        <div className="muted">{level.chapter}</div>
        <h2>
          Level {level.id}: {level.title}
        </h2>
        <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0' }}>
          <ChampArt champId={level.mentor} size={120} />
        </div>
        <div className="mentor-line">
          <span style={{ flex: 1 }}>
            <b>{champ?.name}:</b> {level.intro}
          </span>
          <button
            className="speak-btn"
            aria-label="Read aloud"
            onClick={() => speak(`${champ?.name} says: ${level.intro}`)}
          >
            🔊
          </button>
        </div>
        <p>🎯 {level.goalText}</p>
        <div className="card-actions">
          <button className="btn btn-primary btn-big" onClick={onStart}>
            Start! ▶
          </button>
        </div>
      </div>
    </div>
  );
}
