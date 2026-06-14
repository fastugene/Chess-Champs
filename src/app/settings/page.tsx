'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  loadParentSettings,
  saveParentSettings,
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

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<ParentSettings>(DEFAULT_PARENT);
  const [saved, setSaved] = useState(false);

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

  return (
    <div className="shell" style={{ gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <button
          className="btn btn-ghost"
          style={{ padding: '8px 14px', fontSize: 15 }}
          onClick={() => router.push('/')}
        >
          ← Back
        </button>
        <h2 style={{ margin: 0, fontSize: 20 }}>⚙️ Settings</h2>
      </div>

      {/* Speech / announcer */}
      <div className="parent-section">
        <div className="parent-row">
          <div>
            <div className="parent-label">Mute Announcer Voice</div>
            <div className="parent-sub">Turns off the voiceover clips</div>
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
        <div className="parent-sub">Bot will never go easier than this</div>
        <div className="band-picker">
          {BAND_ORDER.map((band) => (
            <button
              key={band}
              className={`band-btn ${settings.bandFloor === band ? 'active' : ''}`}
              onClick={() =>
                void save({
                  ...settings,
                  bandFloor: band,
                  bandCeiling:
                    BAND_ORDER[
                      Math.max(
                        BAND_ORDER.indexOf(band),
                        BAND_ORDER.indexOf(settings.bandCeiling),
                      )
                    ],
                })
              }
            >
              {BAND_LABELS[band]}
            </button>
          ))}
        </div>
      </div>

      {/* Bot ceiling */}
      <div className="parent-section">
        <div className="parent-label">Maximum Bot Difficulty</div>
        <div className="parent-sub">Bot will never go harder than this</div>
        <div className="band-picker">
          {BAND_ORDER.map((band) => (
            <button
              key={band}
              className={`band-btn ${settings.bandCeiling === band ? 'active' : ''}`}
              onClick={() =>
                void save({
                  ...settings,
                  bandCeiling: band,
                  bandFloor:
                    BAND_ORDER[
                      Math.min(
                        BAND_ORDER.indexOf(band),
                        BAND_ORDER.indexOf(settings.bandFloor),
                      )
                    ],
                })
              }
            >
              {BAND_LABELS[band]}
            </button>
          ))}
        </div>
      </div>

      {saved && <div className="parent-toast">✅ Saved!</div>}
    </div>
  );
}
