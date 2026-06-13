/**
 * Campaign levels. Phase 1 ships Level 1 end-to-end; Phase 2 fills in the full
 * 30-level, 7-chapter curriculum from the design doc (starting with the
 * "Safety & Sight" anti-blunder chapter — the #1 strength lever at this level).
 */
import type { Band } from '@/engine/difficulty';
import type { Color } from 'chess.js';

export interface Level {
  id: number;
  chapter: string;
  title: string;
  /** Champ id who mentors this level. */
  mentor: string;
  /** One short line, kid-voice. */
  intro: string;
  goalText: string;
  botBand: Band;
  playerColor: Color;
  /** Optional custom starting position; defaults to the normal start. */
  startFen?: string;
}

export const LEVELS: Level[] = [
  {
    id: 1,
    chapter: 'Chapter 1 · Safety & Sight',
    title: 'First Battle',
    mentor: 'bulwark',
    intro:
      "Grab any piece your foe leaves undefended — that's free treasure! And keep YOUR pieces safe.",
    goalText: 'Win the battle by capturing safely.',
    botBand: 'rookie',
    playerColor: 'w',
  },
];

export function getLevel(id: number): Level {
  return LEVELS.find((l) => l.id === id) ?? LEVELS[0];
}

export const FIRST_LEVEL_ID = LEVELS[0].id;
