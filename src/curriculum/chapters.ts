/**
 * Chapters group the campaign levels into skill arcs, each owned by a mentor
 * Champ and a single tactic to master. A chapter unlocks the next when BOTH
 * goals are met: land the tactic `starGoal` times (the 3-star bar) AND reach
 * `xpGoal` XP. This is the "never stuck" loop from the design doc — XP always
 * rises from playing, so the bar is always reachable.
 *
 * Phase 1 ships Chapter 1 fully; Chapters 2-7 fill in alongside the full
 * 30-level campaign in Phase 2.
 */
import type { Square } from 'chess.js';
import type { TacticEvent } from '@/chess/tactics/detect';

/**
 * The interactive guided tutorial shown before a chapter. Five paced beats:
 * meet the coach, learn what the tactic is, watch it demoed, do it yourself on a
 * live board, then see the mission. Each text beat carries a `voice` slug -> an
 * ElevenLabs mp3 in /public/audio (narration is silent until the file is added).
 */
export interface TutorialScript {
  /** The position used for both the demo and the practice beats. */
  fen: string;
  /** Beat 1 -- the coach introduces himself. */
  intro: { text: string; voice: string };
  /** Beat 2 -- what the tactic is, in kid words. */
  explain: { text: string; voice: string };
  /** Beat 3 -- the move the coach auto-plays, with a caption.
   *  `badTarget` is an enemy piece that IS defended -- shown in red as a contrast
   *  to the free piece, so the child can see the difference visually. */
  demo: { badTarget?: Square; from: Square; to: Square; caption: string; voice: string };
  /** Beat 4 -- the child performs the same move (from->to is the solution). */
  practice: {
    prompt: string;
    voice: string;
    from: Square;
    to: Square;
    /** Shown + narrated on a correct move. */
    success: string;
    successVoice: string;
    /** Gentle nudge shown on a wrong tap (never a buzzer). */
    nudge: string;
  };
}

export interface Chapter {
  id: number;
  /** Short chapter name, e.g. "Safety & Sight". */
  title: string;
  /** Champ id who mentors this chapter (see champs.ts). */
  mentor: string;
  /** Display name of the skill to master, e.g. "Safety". */
  tactic: string;
  /** Primer step 1 -- kid-voice explanation of the concept. */
  concept: string;
  /** Primer step 2 -- a demo position + the squares to look at. */
  demo: { fen: string; highlight: Square[]; caption: string };
  /** The interactive guided tutorial (5-beat coaching session). */
  tutorial: TutorialScript;
  /** Land the tactic this many times to fill the star bar. */
  starGoal: number;
  /** XP threshold to advance to the next chapter. */
  xpGoal: number;
  /** Which detected tactic-event types earn a star in this chapter. */
  starEventTypes: TacticEvent['type'][];
  /** Campaign level ids that belong to this chapter. */
  levelIds: number[];
}

export const CHAPTERS: Chapter[] = [
  {
    id: 1,
    title: 'Safety & Sight',
    mentor: 'pawn',
    tactic: 'Safety',
    concept: 'Before you move, ask: is that piece guarded? If nobody is protecting it -- that is a FREE KILL. Grab it!',
    demo: {
      // Bishop on e5 can take c7 (FREE KILL, unguarded knight) or g7 (guarded by king on h8).
      fen: '7k/2n3p1/8/4B3/8/8/5PPP/6K1 w - - 0 1',
      highlight: ['e5', 'c7'],
      caption: 'The c7 knight has no guards -- FREE KILL! The g7 pawn is protected by the king -- bad trade.',
    },
    tutorial: {
      // Bishop on e5. Knight on c7 = FREE KILL (unguarded, bishop can take it).
      // Pawn on g7 = DANGER (guarded by black king on h8, bishop can also reach it but should NOT).
      // Both are real options on the bishop's diagonals -- the child must choose the right one.
      fen: '7k/2n3p1/8/4B3/8/8/5PPP/6K1 w - - 0 1',
      intro: {
        text: "Hey champ! I'm Scrapper. Let's learn to spot FREE KILLS -- enemy pieces with nobody guarding them!",
        voice: 'tut-safety-intro',
      },
      explain: {
        text: 'Some enemy pieces are guarded -- take them and the enemy takes back. Bad trade! But if a piece has NO guard, it is a FREE KILL. Grab it!',
        voice: 'tut-safety-what',
      },
      demo: {
        // g7 pawn is guarded by the king on h8 -- shown red (bad trade).
        // c7 knight has NO guards -- shown gold (FREE KILL).
        // The bishop can actually take BOTH; the lesson is to pick the right one.
        badTarget: 'g7',
        from: 'e5',
        to: 'c7',
        caption: 'Red = guarded by the king, bad trade! Gold = no guards -- FREE KILL! Watch me grab the right one.',
        voice: 'tut-safety-watch',
      },
      practice: {
        prompt: 'Your turn! Tap the glowing bishop. Then choose -- which piece has NO guard?',
        voice: 'tut-safety-try',
        from: 'e5',
        to: 'c7',
        success: 'YES! The knight had no guards -- that is a FREE KILL!',
        successVoice: 'tut-safety-yes',
        nudge: 'That one is guarded by the king -- bad trade! Grab the piece with NO guards instead.',
      },
    },
    starGoal: 3,
    xpGoal: 300,
    starEventTypes: ['win-material'],
    levelIds: [1],
  },
];

export function getChapter(id: number): Chapter {
  return CHAPTERS.find((c) => c.id === id) ?? CHAPTERS[0];
}

/** The chapter that owns a given level (falls back to Chapter 1). */
export function chapterForLevel(levelId: number): Chapter {
  return CHAPTERS.find((c) => c.levelIds.includes(levelId)) ?? CHAPTERS[0];
}

/** The next chapter after `id`, if one exists. */
export function nextChapter(id: number): Chapter | undefined {
  return CHAPTERS.find((c) => c.id === id + 1);
}
