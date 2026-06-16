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

  // ── Chapter 5: Pins ───────────────────────────────────────────────────
  {
    id: 5,
    title: 'Pins',
    mentor: 'bishop',
    tactic: 'Pin',
    concept: 'A pin traps a piece in front of something more valuable. It cannot move or the bigger piece gets captured!',
    demo: {
      // White: Ke1, Bb5 — Black: Ke8, Nc6. Bishop pins the knight to the king.
      fen: '4k3/8/2n5/1B6/8/8/8/4K3 w - - 0 1',
      highlight: ['b5', 'c6', 'e8'],
      caption: 'The bishop pins the knight -- if it moves, the king is in check! The knight is stuck.',
    },
    tutorial: {
      fen: '4k3/8/2n5/1B6/8/8/8/4K3 w - - 0 1',
      intro: {
        text: "Pinpoint the Bishop here! I shoot diagonals and trap pieces so they can NEVER move safely!",
        voice: 'tut-pin-intro',
      },
      explain: {
        text: 'Line up your bishop with an enemy piece AND a more valuable piece behind it. The front piece is PINNED -- if it moves, you take the bigger piece behind it!',
        voice: 'tut-pin-what',
      },
      demo: {
        from: 'b5',
        to: 'c6',
        caption: 'The knight was pinned to the king -- it could not escape. Free piece!',
        voice: 'tut-pin-watch',
      },
      practice: {
        prompt: 'The knight is pinned and cannot run! Take it with your bishop!',
        voice: 'tut-pin-try',
        from: 'b5',
        to: 'c6',
        success: 'Got it! The pinned knight had nowhere to hide. Free piece!',
        successVoice: 'tut-pin-yes',
        nudge: 'The knight on c6 is pinned to the king -- take it with your bishop!',
      },
    },
    starGoal: 3,
    xpGoal: 3000,
    starEventTypes: ['pin'],
    levelIds: [18, 19, 20, 21],
  },

  // ── Chapter 6: Skewers ────────────────────────────────────────────────
  {
    id: 6,
    title: 'Skewers',
    mentor: 'rook',
    tactic: 'Skewer',
    concept: 'A skewer attacks the BIG piece first! It has to run -- then you grab the smaller piece hiding behind it!',
    demo: {
      // White: Kh1, Ra1 — Black: Ka8, Ra6. Ra1→a8+ skewers king, exposing the rook.
      fen: 'k7/8/r7/8/8/8/8/R6K w - - 0 1',
      highlight: ['a1', 'a8', 'a6'],
      caption: 'The rook attacks the king -- it must run. Then the rook on a6 is free for the taking!',
    },
    tutorial: {
      fen: 'k7/8/r7/8/8/8/8/R6K w - - 0 1',
      intro: {
        text: "Harpoon the Rook here! I fire down the whole file and skewer big pieces to grab the treasure behind them!",
        voice: 'tut-skewer-intro',
      },
      explain: {
        text: 'A skewer is a reverse pin! Attack the BIG piece -- king or queen -- and it has to run out of the way. Then you grab the smaller piece that was hiding behind it. Free treasure!',
        voice: 'tut-skewer-what',
      },
      demo: {
        from: 'a1',
        to: 'a8',
        caption: 'Rook charges to a8 -- the king must run! Then the rook on a6 is yours for free.',
        voice: 'tut-skewer-watch',
      },
      practice: {
        prompt: 'Skewer the king! Move the rook to a8 to force it to run!',
        voice: 'tut-skewer-try',
        from: 'a1',
        to: 'a8',
        success: 'SKEWER! The king must move, then you grab the rook behind it. Free piece!',
        successVoice: 'tut-skewer-yes',
        nudge: 'Move your rook from a1 all the way to a8 to attack the king!',
      },
    },
    starGoal: 3,
    xpGoal: 4000,
    starEventTypes: ['skewer'],
    levelIds: [22, 23, 24],
  },

  // ── Chapter 7: Discovered Attacks ─────────────────────────────────────
  {
    id: 7,
    title: 'Discovered Attacks',
    mentor: 'unseen',
    tactic: 'Discovery',
    concept: 'A discovered attack hides a secret weapon! Move one piece out of the way and reveal a devastating attack from behind it!',
    demo: {
      // White: Ke1, Bg2, Nd5 — Black: Ke8, Ra8. Nd5→b4 reveals Bg2 attacking Ra8.
      fen: 'r3k3/8/8/3N4/8/8/6B1/4K3 w - - 0 1',
      highlight: ['d5', 'b4', 'g2', 'a8'],
      caption: 'The knight steps aside -- the bishop fires through and wins the rook. Discovered attack!',
    },
    tutorial: {
      fen: 'r3k3/8/8/3N4/8/8/6B1/4K3 w - - 0 1',
      intro: {
        text: "I am... the Unseen. You never saw me coming. Move one piece aside -- and the weapon hiding behind it strikes. That is a discovered attack.",
        voice: 'tut-discovered-intro',
      },
      explain: {
        text: 'A discovered attack works like a trap. You move one piece out of the way, and the piece BEHIND IT suddenly attacks something big. The enemy never sees it coming!',
        voice: 'tut-discovered-what',
      },
      demo: {
        from: 'd5',
        to: 'b4',
        caption: 'The knight jumps away -- and the bishop shoots all the way to win the rook. Discovered attack!',
        voice: 'tut-discovered-watch',
      },
      practice: {
        prompt: 'Move the knight out of the way to unleash the bishop!',
        voice: 'tut-discovered-try',
        from: 'd5',
        to: 'b4',
        success: 'YES! The knight revealed the bishop -- free rook!',
        successVoice: 'tut-discovered-yes',
        nudge: 'Move the knight from d5 to b4 to reveal the bishop behind it!',
      },
    },
    starGoal: 3,
    xpGoal: 5500,
    starEventTypes: ['discovered-attack'],
    levelIds: [25, 26, 27],
  },

  // ── Chapter 8: Endgames & Planning ────────────────────────────────────
  {
    id: 8,
    title: 'Endgames & Planning',
    mentor: 'pawn',
    tactic: 'Endgame',
    concept: 'In the endgame, your PAWN can become a QUEEN! March it forward, use your king to lead the way, and never stop pushing!',
    demo: {
      // White: Kd1, Pd7 — Black: Kf3 (pawn about to queen)
      fen: '8/3P4/8/8/8/5k2/8/3K4 w - - 0 1',
      highlight: ['d7', 'd8', 'd1'],
      caption: 'The pawn is one step from becoming a queen! Push it forward and win!',
    },
    tutorial: {
      fen: '8/3P4/8/8/8/5k2/8/3K4 w - - 0 1',
      intro: {
        text: "It is Scrapper -- and I am about to become QUEEN! In the endgame, pawns are the secret weapon. Push me forward!",
        voice: 'tut-endgame-intro',
      },
      explain: {
        text: 'When most pieces are gone, pawns rule! March your pawn to the other side of the board and it BECOMES A QUEEN. Use your king to protect it on the way!',
        voice: 'tut-endgame-what',
      },
      demo: {
        from: 'd7',
        to: 'd8',
        caption: 'The pawn reaches the end -- PROMOTION! It becomes a queen and wins the game!',
        voice: 'tut-endgame-watch',
      },
      practice: {
        prompt: 'Promote the pawn! Move it from d7 to d8!',
        voice: 'tut-endgame-try',
        from: 'd7',
        to: 'd8',
        success: 'QUEEN! You promoted the pawn! Now you have overwhelming power!',
        successVoice: 'tut-endgame-yes',
        nudge: 'Move the pawn one step forward from d7 to d8 to promote!',
      },
    },
    starGoal: 3,
    xpGoal: 7000,
    starEventTypes: ['checkmate', 'win-material'],
    levelIds: [28, 29, 30],
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
