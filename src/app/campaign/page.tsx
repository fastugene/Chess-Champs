'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChampArt } from '@/components/champs/ChampArt';
import { ChapterPrimer } from '@/components/play/ChapterPrimer';
import { CHAPTERS, type Chapter } from '@/curriculum/chapters';
import { loadProgress, starsFor, type Progress, DEFAULT_PROGRESS } from '@/persistence/progress';

function StarRow({ filled, total }: { filled: number; total: number }) {
  return (
    <span className="star-row" aria-label={`${filled} of ${total} stars`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`star ${i < filled ? 'on' : ''}`}>
          {i < filled ? '⭐' : '☆'}
        </span>
      ))}
    </span>
  );
}

export default function CampaignPage() {
  const router = useRouter();
  const [progress, setProgress] = useState<Progress>(DEFAULT_PROGRESS);
  const [tutorialChapter, setTutorialChapter] = useState<Chapter | null>(null);

  useEffect(() => {
    void loadProgress().then(setProgress);
  }, []);

  return (
    <div className="shell">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button
          className="btn btn-ghost"
          style={{ padding: '8px 14px', fontSize: 15 }}
          onClick={() => router.push('/')}
        >
          ← Back
        </button>
        <h2 style={{ margin: 0, fontSize: 22 }}>📜 Campaign</h2>
      </div>

      <div className="campaign-grid">
        {CHAPTERS.map((ch) => {
          const unlocked = progress.unlockedChapters.includes(ch.id);
          const mastered = progress.chaptersMastered.includes(ch.id);
          const stars = starsFor(progress, ch.id);

          return (
            <div
              key={ch.id}
              className={`chapter-node ${unlocked ? '' : 'node-locked'}`}
            >
              <div className="node-header">
                <div className="node-num">Ch.{ch.id}</div>
                <ChampArt champId={ch.mentor} size={52} />
                {mastered && <div className="node-mastered">✅</div>}
                {!unlocked && <div className="node-lock">🔒</div>}
              </div>

              <div className="node-body">
                <div className="node-title">{ch.title}</div>
                <div className="node-tactic">{ch.tactic}</div>
                <StarRow filled={stars} total={ch.starGoal} />
              </div>

              {unlocked && (
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button
                    className="btn btn-ghost"
                    style={{ flex: 1, fontSize: 14, padding: '10px 0' }}
                    onClick={() => setTutorialChapter(ch)}
                  >
                    🎓 Tutorial
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1, fontSize: 14, padding: '10px 0' }}
                    onClick={() => router.push('/play')}
                  >
                    {mastered ? '🔁 Replay' : '▶ Play'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="muted" style={{ marginTop: 20 }}>
        Master each chapter's tactic to unlock the next!
      </p>

      {tutorialChapter && (
        <ChapterPrimer
          chapter={tutorialChapter}
          stars={starsFor(progress, tutorialChapter.id)}
          xp={progress.xp}
          ctaLabel="Got it! ▶"
          onClose={() => setTutorialChapter(null)}
        />
      )}
    </div>
  );
}
