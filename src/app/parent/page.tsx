'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  loadParentSettings,
  saveParentSettings,
  resetProgress,
  type ParentSettings,
  DEFAULT_PARENT,
} from '@/persistence/progress';
import { setSpeechMuted } from '@/audio/speech';
import { BAND_ORDER, type Band } from '@/engine/difficulty';

const BAND_LABELS: Record<Band, string> = {
  rookie: 'Rookie (easiest)',
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard (hardest)',
};

export default function ParentPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<ParentSettings>(DEFAULT_PARENT);
  const [saved, setSaved] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  useEffect(() => {
    void loadParentSettings().then(setSettings);
  }, []);

  const save = async (next: ParentSettings) => {
    setSettings(next);
    await saveParentSettings(next);
    setSpeechMuted(next.speechMuted);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const handleReset = async () => {
    await resetProgress();
    setConfirmReset(false);
    setResetDone(true);
    setTimeout(() => setResetDone(false), 2500);
  };

  return (
    <div className="shell" style={{ gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <button className="btn btn-ghost" style={{ padding: '8px 14px', fontSize: 15 }} onClick={() => router.push('/')}>
          ← Back
        </button>
        <h2 style={{ margin: 0, fontSize: 20 }}>Parent Dashboard</h2>
      </div>

      <p className="muted" style={{ textAlign: 'left', marginTop: 0 }}>
        These settings are hidden from your child. Adjust difficulty and manage progress here.
      </p>

      {/* Speech / announcer */}
      <div className="parent-section">
        <div className="parent-row">
          <div>
            <div className="parent-label">Mute Announcer Voice</div>
            <div className="parent-sub">Turns off ElevenLabs mp3 voiceovers</div>
          </div>
          <button
            className={`toggle-btn ${settings.speechMuted ? 'on' : ''}`}
            onClick={() => void save({ ...settings, speechMuted: !settings.speechMuted })}
            aria-label="Toggle speech"
          >
            {settings.speechMuted ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Bot floor */}
      <div className="parent-section">
        <div className="parent-label">Minimum Bot Difficulty</div>
        <div className="parent-sub">Bot will never go easier than this (floor)</div>
        <div className="band-picker">
          {BAND_ORDER.map((band) => (
            <button
              key={band}
              className={`band-btn ${settings.bandFloor === band ? 'active' : ''}`}
              onClick={() => void save({ ...settings, bandFloor: band, bandCeiling: BAND_ORDER[Math.max(BAND_ORDER.indexOf(band), BAND_ORDER.indexOf(settings.bandCeiling))] })}
            >
              {BAND_LABELS[band]}
            </button>
          ))}
        </div>
      </div>

      {/* Bot ceiling */}
      <div className="parent-section">
        <div className="parent-label">Maximum Bot Difficulty</div>
        <div className="parent-sub">Bot will never go harder than this (ceiling)</div>
        <div className="band-picker">
          {BAND_ORDER.map((band) => (
            <button
              key={band}
              className={`band-btn ${settings.bandCeiling === band ? 'active' : ''}`}
              onClick={() => void save({ ...settings, bandCeiling: band, bandFloor: BAND_ORDER[Math.min(BAND_ORDER.indexOf(band), BAND_ORDER.indexOf(settings.bandFloor))] })}
            >
              {BAND_LABELS[band]}
            </button>
          ))}
        </div>
      </div>

      {saved && <div className="parent-toast">✅ Saved!</div>}

      {/* Reset */}
      <div className="parent-section" style={{ borderColor: 'var(--ruby)' }}>
        <div className="parent-label" style={{ color: 'var(--ruby)' }}>Reset All Progress</div>
        <div className="parent-sub">Clears XP, stars, unlocked chapters, and Champ powers. Cannot be undone.</div>
        {resetDone && <div className="parent-toast" style={{ color: 'var(--emerald)' }}>Progress reset!</div>}
        {!confirmReset ? (
          <button
            className="btn"
            style={{ background: 'var(--ruby)', color: '#fff', marginTop: 12, width: '100%' }}
            onClick={() => setConfirmReset(true)}
          >
            Reset Progress
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setConfirmReset(false)}>Cancel</button>
            <button
              className="btn"
              style={{ flex: 1, background: 'var(--ruby)', color: '#fff' }}
              onClick={() => void handleReset()}
            >
              Yes, Reset
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
