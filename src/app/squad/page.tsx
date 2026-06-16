'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChampCard } from '@/components/champs/ChampCard';
import { CHAMPS } from '@/progression/champs';
import { loadProgress, type Progress } from '@/persistence/progress';
import { DEFAULT_PROGRESS } from '@/persistence/progress';

// The Unseen is a secret slot — only shown after first discovered-attack unlock.
const SQUAD_ORDER = ['pawn', 'knight', 'queen', 'bishop', 'rook', 'unseen'];

export default function SquadPage() {
  const router = useRouter();
  const [progress, setProgress] = useState<Progress>(DEFAULT_PROGRESS);

  useEffect(() => {
    void loadProgress().then(setProgress);
  }, []);

  // Pawn is the starter champ — always unlocked, tracked via pawnXp not champPower.
  const unlockedIds = new Set(['pawn', ...Object.keys(progress.champPower)]);
  const unseenUnlocked = unlockedIds.has('unseen');

  return (
    <div className="squad-page">
      <div className="squad-header">
        <button className="btn btn-ghost" onClick={() => router.push('/')}>← Back</button>
        <h1 className="squad-title">Your Squad</h1>
      </div>

      <p className="squad-sub muted">
        Land a tactic in-game to unlock and power up its Champ.
      </p>

      <div className="squad-grid">
        {SQUAD_ORDER.map((id) => {
          if (id === 'unseen' && !unseenUnlocked) {
            return (
              <div key="unseen-secret" className="champ-card champ-locked champ-secret">
                <div className="secret-glyph">?</div>
                <div style={{ fontWeight: 900, fontSize: 15 }}>???</div>
                <div className="muted" style={{ fontSize: 12 }}>A hidden Champ lurks...</div>
                <div className="champ-lesson muted">Land a discovered attack to reveal them!</div>
              </div>
            );
          }
          const locked = !unlockedIds.has(id);
          return (
            <ChampCard
              key={id}
              champId={id}
              size={100}
              power={locked ? undefined : (id === 'pawn' ? undefined : (progress.champPower[id] ?? 1))}
              pawnXp={id === 'pawn' && !locked ? (progress.pawnXp ?? 0) : undefined}
              pawnCustomName={progress.pawnCustomName}
              locked={locked}
            />
          );
        })}
      </div>
    </div>
  );
}
