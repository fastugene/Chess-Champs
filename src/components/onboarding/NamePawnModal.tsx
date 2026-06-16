'use client';

import { useState } from 'react';
import { ChampArt } from '@/components/champs/ChampArt';

export function NamePawnModal({
  power = 1,
  onSave,
  onSkip,
}: {
  power?: number;
  onSave: (name: string) => void;
  onSkip: () => void;
}) {
  const [name, setName] = useState('');

  const handleSave = () => {
    const trimmed = name.trim();
    if (trimmed) onSave(trimmed);
    else onSkip();
  };

  return (
    <div className="overlay">
      <div className="card name-pawn-modal">
        <div className="float-anim" style={{ marginBottom: 8 }}>
          <ChampArt champId="pawn" size={100} power={power} />
        </div>
        <h2 style={{ margin: '0 0 4px', fontSize: 22 }}>Name your Pawn!</h2>
        <p className="muted" style={{ margin: '0 0 16px', fontSize: 14 }}>
          Your Pawn is your starter hero. Give them a cool name — it sticks forever!
        </p>
        <input
          className="name-input"
          type="text"
          placeholder="e.g. Blaze, Storm, Rex..."
          maxLength={20}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          autoFocus
        />
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onSkip}>
            Skip
          </button>
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave} disabled={!name.trim()}>
            Name them!
          </button>
        </div>
      </div>
    </div>
  );
}
