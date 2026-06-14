/**
 * Chapters group the campaign levels into skill arcs, each owned by a mentor
 * Champ and a single tactic to master. A chapter unlocks the next when BOTH
 * goals are met: land the tactic `starGoal` times (the 3-star bar) AND reach
 * `xpGoal` XP. This is the "never stuck" loop — XP always rises from playing.
 *
 * Phase 2 ships Chapters 1–5 fully; Chapters 6–7 are stubbed for Phase 3.
 */
import type { Square } from 'chess.js';
import type { TacticEvent } from '@/chess/tactics/detect';

export interface TutorialScript {
  fen: string;
  intro: { text: string; voice: string };
  explain: { text: string; voice: string };
  demo: { badTarget?: Square; from: Square; to: Square; caption: string; voice: string };
  practice: {
    prompt: string;
    voice: string;
    from: Square;
    to: Square;
    success: string;
    successVoice: string;
    nudge: string;
  };
}

export interface Chapter {
  id: number;
  title: string;
  mentor: string;
  tactic: string;
  concept: string;
  demo: { fen: string; highlight: Square[]; caption: string };
  tutorial: TutorialScript;
  starGoal: number;
  xpGoal: number;
  starEventTypes: TacticEvent['type'][];
  levelIds: number[];
}

export const CHAPTERS: Chapter[] = [
  // ── Chapter 1: Safety & Sight ──────────────────────────────────────────
  {
    id: 1,
    title: 'Safety & Sight',
    mentor: 'pawn',
    tactic: 'Safety',
    concept: 'Before you move, ask: is that piece guarded? If nobody is protecting it -- that is a FREE KILL. Grab it!',
    demo: {
      fen: '7k/2n3p1/8/4B3/8/8/5PPP/6K1 w - - 0 1',
      highlight: ['e5', 'c7'],
      caption: 'The c7 knight has no guards -- FREE KILL! The g7 pawn is protected by the king -- bad trade.',
    },
    tutorial: {
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
    levelIds: [1, 2, 3, 4],
  },

  // ── Chapter 2: Checkmate Basics ────────────────────────────────────────
  {
    id: 2,
    title: 'Checkmate Basics',
    mentor: 'queen',
    tactic: 'Checkmate',
    concept: 'Checkmate means the king is trapped with NO escape. That ends the game instantly -- YOU WIN!',
    demo: {
      // White Ke6, Qh1 vs Black Ke8. Qh8# is mate.
      fen: '4k3/8/4K3/8/8/8/8/7Q w - - 0 1',
      highlight: ['h1', 'h8', 'e8'],
      caption: 'The queen slides to h8 -- checkmate! The black king has nowhere to run.',
    },
    tutorial: {
      fen: '4k3/8/4K3/8/8/8/8/7Q w - - 0 1',
      intro: {
        text: "I'm Finisher the Queen. The most powerful piece on the board -- and I deliver checkmate!",
        voice: 'tut-checkmate-intro',
      },
      explain: {
        text: 'Checkmate means the king is in check and has NO squares to move to. The king is trapped. Game over -- you win!',
        voice: 'tut-checkmate-what',
      },
      demo: {
        from: 'h1',
        to: 'h8',
        caption: 'The queen swoops to h8 -- every escape square is covered. CHECKMATE!',
        voice: 'tut-checkmate-watch',
      },
      practice: {
        prompt: 'Your turn! Move the queen to h8 to deliver checkmate!',
        voice: 'tut-checkmate-try',
        from: 'h1',
        to: 'h8',
        success: 'CHECKMATE! The king had nowhere to go. You WIN!',
        successVoice: 'tut-checkmate-yes',
        nudge: 'The king is still escaping! Move the queen to h8 to block ALL the escape squares.',
      },
    },
    starGoal: 3,
    xpGoal: 700,
    starEventTypes: ['checkmate'],
    levelIds: [5, 6, 7, 8],
  },

  // ── Chapter 3: Opening Principles ─────────────────────────────────────
  {
    id: 3,
    title: 'Opening Principles',
    mentor: 'pawn',
    tactic: 'Development',
    concept: 'Control the center with pawns, bring your knights and bishops out fast, then castle to keep your king safe!',
    demo: {
      // Standard starting position after 1.e4 e5 2.Nf3 Nc6 3.Bc4 -- Italian Game
      fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 2 3',
      highlight: ['e4', 'd5', 'f3', 'c4'],
      caption: 'Pawns in the center, knights and bishop developed, ready to castle. Perfect start!',
    },
    tutorial: {
      // Simple position: White has castled, Black has not. Show the value of castling.
      fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 0 6',
      intro: {
        text: "It's Scrapper again! Now let's talk about the OPENING. The first few moves set up the whole game!",
        voice: 'tut-opening-intro',
      },
      explain: {
        text: 'Three golden rules: move a center pawn first, bring your knights and bishops out, then CASTLE to keep your king safe. Do these and you start every game strong!',
        voice: 'tut-opening-what',
      },
      demo: {
        from: 'e1',
        to: 'g1',
        caption: 'Castle kingside -- the king hides behind pawns. Safe and ready to attack!',
        voice: 'tut-opening-watch',
      },
      practice: {
        prompt: 'Castle your king to safety! Move the king two squares toward the rook.',
        voice: 'tut-opening-try',
        from: 'e1',
        to: 'g1',
        success: 'Castled! Your king is safe and your rook is now active. Great opening!',
        successVoice: 'tut-opening-yes',
        nudge: 'Castle by moving the KING two squares toward the rook on h1.',
      },
    },
    starGoal: 3,
    xpGoal: 1200,
    starEventTypes: ['win-material', 'fork'],
    levelIds: [9, 10, 11, 12],
  },

  // ── Chapter 4: Fork & Double Attack ───────────────────────────────────
  {
    id: 4,
    title: 'Fork & Double Attack',
    mentor: 'knight',
    tactic: 'Fork',
    concept: 'A fork attacks TWO enemy pieces at the same time! They can only save one -- you grab the other for FREE!',
    demo: {
      // White: Kh1, Nd5 — Black: Kc8, Rg8. Nd5→e7+ forks King and Rook.
      fen: '2k3r1/8/8/3N4/8/8/8/7K w - - 0 1',
      highlight: ['d5', 'e7', 'c8', 'g8'],
      caption: 'The knight jumps to e7 -- attacking the black king AND the rook at the same time. Fork!',
    },
    tutorial: {
      fen: '2k3r1/8/8/3N4/8/8/8/7K w - - 0 1',
      intro: {
        text: "Forkmane the Knight here! I'm the KING of the fork -- I can attack two pieces with one jump!",
        voice: 'tut-fork-intro',
      },
      explain: {
        text: 'A fork attacks two pieces at once. Your enemy can only move ONE piece out of danger -- you grab the other for free! Knights are perfect for forks because they jump in unexpected directions.',
        voice: 'tut-fork-what',
      },
      demo: {
        from: 'd5',
        to: 'e7',
        caption: 'Knight jumps to e7 -- check on the king AND attacking the rook. They can only save one!',
        voice: 'tut-fork-watch',
      },
      practice: {
        prompt: 'Jump the knight to e7 to fork the king and the rook!',
        voice: 'tut-fork-try',
        from: 'd5',
        to: 'e7',
        success: 'FORK! The king must move, then you grab the rook for FREE!',
        successVoice: 'tut-fork-yes',
        nudge: 'Move the knight to e7 -- that square attacks both the king AND the rook!',
      },
    },
    starGoal: 3,
    xpGoal: 2000,
    starEventTypes: ['fork'],
    levelIds: [13, 14, 15, 16, 17],
  },

  // ── Chapter 5: Pins & Skewers ─────────────────────────────────────────
  {
    id: 5,
    title: 'Pins & Skewers',
    mentor: 'pawn',
    tactic: 'Pin',
    concept: 'A pin traps a piece in front of something more valuable. It cannot move or the bigger piece gets captured!',
    demo: {
      // White: Ke1, Bb5 — Black: Ke8, Nc6 (bishop pins knight to king)
      fen: '4k3/8/2n5/1B6/8/8/8/4K3 w - - 0 1',
      highlight: ['b5', 'c6', 'e8'],
      caption: 'The bishop pins the knight -- if it moves, the king is in check! The knight is stuck.',
    },
    tutorial: {
      fen: '4k3/8/2n5/1B6/8/8/8/4K3 w - - 0 1',
      intro: {
        text: "Scrapper here with a sneaky trick! Pins trap enemy pieces so they CAN'T move without losing something bigger!",
        voice: 'tut-pin-intro',
      },
      explain: {
        text: 'Line up your bishop, rook, or queen with an enemy piece AND a more valuable piece behind it. The front piece is PINNED -- if it moves, you take the bigger piece!',
        voice: 'tut-pin-what',
      },
      demo: {
        from: 'b5',
        to: 'c6',
        caption: 'The bishop takes the knight -- it was pinned and could never escape!',
        voice: 'tut-pin-watch',
      },
      practice: {
        prompt: 'The knight is pinned! Take it with your bishop!',
        voice: 'tut-pin-try',
        from: 'b5',
        to: 'c6',
        success: 'Got it! The pinned knight had nowhere to hide. Free piece!',
        successVoice: 'tut-pin-yes',
        nudge: 'The bishop can take the knight on c6 -- it is pinned to the king!',
      },
    },
    starGoal: 3,
    xpGoal: 3000,
    starEventTypes: ['pin', 'skewer'],
    levelIds: [18, 19, 20],
  },
];

export function getChapter(id: number): Chapter {
  return CHAPTERS.find((c) => c.id === id) ?? CHAPTERS[0];
}

export function chapterForLevel(levelId: number): Chapter {
  return CHAPTERS.find((c) => c.levelIds.includes(levelId)) ?? CHAPTERS[0];
}

export function nextChapter(id: number): Chapter | undefined {
  return CHAPTERS.find((c) => c.id === id + 1);
}
