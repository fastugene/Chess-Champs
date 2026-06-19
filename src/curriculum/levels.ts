/**
 * Campaign levels — 30 levels across 8 chapters.
 */
import type { Band } from '@/engine/difficulty';
import type { Color } from 'chess.js';

export interface Level {
  id: number;
  chapterId: number;
  chapter: string;
  title: string;
  mentor: string;
  intro: string;
  goalText: string;
  botBand: Band;
  playerColor: Color;
  startFen?: string;
}

export const LEVELS: Level[] = [
  // ── Chapter 1: Safety & Sight ──────────────────────────────────────────
  {
    id: 1,
    chapterId: 1,
    chapter: 'Chapter 1 · Safety & Sight',
    title: 'First Battle',
    mentor: 'pawn',
    intro: "Grab any piece your foe leaves undefended — that's free treasure! Keep YOUR pieces safe.",
    goalText: 'Win the battle by capturing safely.',
    botBand: 'rookie',
    playerColor: 'w',
  },
  {
    id: 2,
    chapterId: 1,
    chapter: 'Chapter 1 · Safety & Sight',
    title: 'Hold Your Ground',
    mentor: 'pawn',
    intro: "Playing as Black now! Same rules — grab the free pieces and protect yours.",
    goalText: 'Win playing as Black.',
    botBand: 'rookie',
    playerColor: 'b',
  },
  {
    id: 3,
    chapterId: 1,
    chapter: 'Chapter 1 · Safety & Sight',
    title: 'Sharper Eyes',
    mentor: 'pawn',
    intro: "The bot is a little smarter. Look twice before every move — is that square safe?",
    goalText: 'Win without leaving any pieces undefended.',
    botBand: 'easy',
    playerColor: 'w',
  },
  {
    id: 4,
    chapterId: 1,
    chapter: 'Chapter 1 · Safety & Sight',
    title: 'Double Check',
    mentor: 'pawn',
    intro: "Trickier opponent. Ask: who is protecting that piece before you grab it.",
    goalText: 'Win with smart, safe captures.',
    botBand: 'easy',
    playerColor: 'b',
  },

  // ── Chapter 2: Checkmate Basics ────────────────────────────────────────
  {
    id: 5,
    chapterId: 2,
    chapter: 'Chapter 2 · Checkmate Basics',
    title: 'The Final Move',
    mentor: 'queen',
    intro: "Winning is cool. Checkmate is AMAZING. The king has nowhere to run — game over!",
    goalText: 'Deliver checkmate to win.',
    botBand: 'easy',
    playerColor: 'w',
  },
  {
    id: 6,
    chapterId: 2,
    chapter: 'Chapter 2 · Checkmate Basics',
    title: 'Hunt the King',
    mentor: 'queen',
    intro: "Chase the enemy king to the edge of the board. Cornered kings get mated!",
    goalText: 'Checkmate the enemy king.',
    botBand: 'easy',
    playerColor: 'b',
  },
  {
    id: 7,
    chapterId: 2,
    chapter: 'Chapter 2 · Checkmate Basics',
    title: 'Closing In',
    mentor: 'queen',
    intro: "Tougher opponent, same mission. Keep the pressure on and find that mate!",
    goalText: 'Checkmate with Queen and King working together.',
    botBand: 'medium',
    playerColor: 'w',
  },
  {
    id: 8,
    chapterId: 2,
    chapter: 'Chapter 2 · Checkmate Basics',
    title: 'King Hunter',
    mentor: 'queen',
    intro: "The bot won't make it easy. Corner the king step by step — you've got this!",
    goalText: 'Win by checkmate.',
    botBand: 'medium',
    playerColor: 'b',
  },

  // ── Chapter 3: Opening Principles ─────────────────────────────────────
  {
    id: 9,
    chapterId: 3,
    chapter: 'Chapter 3 · Opening Principles',
    title: 'Control the Center',
    mentor: 'pawn',
    intro: "Move pawns to the center first. The player who controls the middle controls the game!",
    goalText: 'Win by controlling the center and developing your pieces.',
    botBand: 'easy',
    playerColor: 'w',
  },
  {
    id: 10,
    chapterId: 3,
    chapter: 'Chapter 3 · Opening Principles',
    title: 'Develop First',
    mentor: 'pawn',
    intro: "Bring your knights and bishops out early. Don't move the same piece twice in a row!",
    goalText: 'Win with all your pieces developed.',
    botBand: 'easy',
    playerColor: 'b',
  },
  {
    id: 11,
    chapterId: 3,
    chapter: 'Chapter 3 · Opening Principles',
    title: 'Castle Up',
    mentor: 'pawn',
    intro: "Castle early to keep your king safe. Uncastled kings get attacked fast!",
    goalText: 'Castle within the first 10 moves and win.',
    botBand: 'medium',
    playerColor: 'w',
  },
  {
    id: 12,
    chapterId: 3,
    chapter: 'Chapter 3 · Opening Principles',
    title: 'Race to Safety',
    mentor: 'pawn',
    intro: "Same plan as Black: develop fast, castle early, then attack!",
    goalText: 'Win with smart opening play.',
    botBand: 'medium',
    playerColor: 'b',
  },

  // ── Chapter 4: Fork & Double Attack ──────────────────────────────────
  {
    id: 13,
    chapterId: 4,
    chapter: 'Chapter 4 · Fork & Double Attack',
    title: 'Two for One',
    mentor: 'knight',
    intro: "A fork attacks TWO pieces at once! Your enemy can only save one. Score!",
    goalText: 'Win material with a fork.',
    botBand: 'medium',
    playerColor: 'w',
  },
  {
    id: 14,
    chapterId: 4,
    chapter: 'Chapter 4 · Fork & Double Attack',
    title: 'Fork Attack',
    mentor: 'knight',
    intro: "Knights are fork machines. Jump into the middle and hit two targets at once!",
    goalText: 'Land a fork and win.',
    botBand: 'medium',
    playerColor: 'b',
  },
  {
    id: 15,
    chapterId: 4,
    chapter: "Chapter 4 · Fork & Double Attack",
    title: "Knight's Trick",
    mentor: 'knight',
    intro: "Queens, bishops, and pawns can fork too — not just knights! Look for the double attack.",
    goalText: 'Win with a fork or double attack.',
    botBand: 'medium',
    playerColor: 'w',
  },
  {
    id: 16,
    chapterId: 4,
    chapter: 'Chapter 4 · Fork & Double Attack',
    title: 'Fork or Fight',
    mentor: 'knight',
    intro: "Set up a fork! Move your piece where it can hit two targets next move.",
    goalText: 'Win with a fork tactic.',
    botBand: 'medium',
    playerColor: 'b',
  },
  {
    id: 17,
    chapterId: 4,
    chapter: 'Chapter 4 · Fork & Double Attack',
    title: 'Fork Master',
    mentor: 'knight',
    intro: "Hardest opponent yet. Find the fork — the bot has no idea it's coming!",
    goalText: 'Land a fork against a strong bot.',
    botBand: 'hard',
    playerColor: 'w',
  },

  // ── Chapter 5: Pins ───────────────────────────────────────────────────
  {
    id: 18,
    chapterId: 5,
    chapter: 'Chapter 5 · Pins',
    title: 'The Pin',
    mentor: 'bishop',
    intro: "A pin traps a piece in place! The piece in front cannot move or the bigger piece behind it gets captured!",
    goalText: 'Win material with a pin.',
    botBand: 'medium',
    playerColor: 'w',
  },
  {
    id: 19,
    chapterId: 5,
    chapter: 'Chapter 5 · Pins',
    title: 'Pinned Down',
    mentor: 'bishop',
    intro: "Playing as Black! Find the pin — line up your bishop or queen to trap an enemy piece to its king.",
    goalText: 'Land a pin and win material.',
    botBand: 'medium',
    playerColor: 'b',
  },
  {
    id: 20,
    chapterId: 5,
    chapter: 'Chapter 5 · Pins',
    title: 'Attack the Pin',
    mentor: 'bishop',
    intro: "Once a piece is pinned, attack it with pawns or other pieces to win it for free!",
    goalText: 'Win with a pin tactic.',
    botBand: 'hard',
    playerColor: 'w',
  },
  {
    id: 21,
    chapterId: 5,
    chapter: 'Chapter 5 · Pins',
    title: 'Pin Master',
    mentor: 'bishop',
    intro: "Toughest pin challenge yet! Find the absolute pin against the king and exploit it.",
    goalText: 'Win by pinning and capturing the pinned piece.',
    botBand: 'hard',
    playerColor: 'b',
  },

  // ── Chapter 6: Skewers ────────────────────────────────────────────────
  {
    id: 22,
    chapterId: 6,
    chapter: 'Chapter 6 · Skewers',
    title: 'Skewer Strike',
    mentor: 'rook',
    intro: "A skewer is a reverse pin — attack the BIG piece first! It must run, and you grab what's behind it!",
    goalText: 'Win material with a skewer.',
    botBand: 'medium',
    playerColor: 'w',
  },
  {
    id: 23,
    chapterId: 6,
    chapter: 'Chapter 6 · Skewers',
    title: 'Run and Lose',
    mentor: 'rook',
    intro: "Playing as Black! Fire a rook or queen at their king or queen — make them run, then grab the piece behind!",
    goalText: 'Land a skewer as Black.',
    botBand: 'medium',
    playerColor: 'b',
  },
  {
    id: 24,
    chapterId: 6,
    chapter: 'Chapter 6 · Skewers',
    title: 'The Harpoon',
    mentor: 'rook',
    intro: "Tougher bot! Set up the skewer — get your rook on the right file or rank first, then fire!",
    goalText: 'Win with a skewer against a strong bot.',
    botBand: 'hard',
    playerColor: 'w',
  },

  // ── Chapter 7: Discovered Attacks ─────────────────────────────────────
  {
    id: 25,
    chapterId: 7,
    chapter: 'Chapter 7 · Discovered Attacks',
    title: 'The Reveal',
    mentor: 'unseen',
    intro: "Move one piece to reveal a hidden attacker behind it. The enemy won't know what hit them!",
    goalText: 'Win with a discovered attack.',
    botBand: 'medium',
    playerColor: 'w',
  },
  {
    id: 26,
    chapterId: 7,
    chapter: 'Chapter 7 · Discovered Attacks',
    title: 'Hidden Power',
    mentor: 'unseen',
    intro: "Playing as Black! Look for pieces blocking your own long-range attackers. Step aside and unleash them!",
    goalText: 'Land a discovered attack as Black.',
    botBand: 'medium',
    playerColor: 'b',
  },
  {
    id: 27,
    chapterId: 7,
    chapter: 'Chapter 7 · Discovered Attacks',
    title: 'Shadow Strike',
    mentor: 'unseen',
    intro: "The ultimate stealth move! The best discoveries hit two targets at once — the moving piece AND the revealed attacker.",
    goalText: 'Win with a discovered attack or double attack.',
    botBand: 'hard',
    playerColor: 'w',
  },

  // ── Chapter 8: Endgames & Planning ────────────────────────────────────
  {
    id: 28,
    chapterId: 8,
    chapter: 'Chapter 8 · Endgames & Planning',
    title: 'Pawn Power',
    mentor: 'pawn',
    intro: "The endgame is where pawns shine! March them forward -- the first to queen usually wins!",
    goalText: 'Win by promoting a pawn or checkmating.',
    botBand: 'hard',
    playerColor: 'w',
  },
  {
    id: 29,
    chapterId: 8,
    chapter: 'Chapter 8 · Endgames & Planning',
    title: 'King March',
    mentor: 'pawn',
    intro: "In the endgame your king is a FIGHTER, not a hider. March it toward the center!",
    goalText: 'Win using your king actively.',
    botBand: 'hard',
    playerColor: 'b',
  },
  {
    id: 30,
    chapterId: 8,
    chapter: 'Chapter 8 · Endgames & Planning',
    title: 'Legend Finale',
    mentor: 'pawn',
    intro: "The final battle! You have conquered every chapter. Show what you have learned and become a Chess Legend!",
    goalText: 'Win the final battle and complete the campaign!',
    botBand: 'hard',
    playerColor: 'b',
  },
];

export function getLevel(id: number): Level {
  return LEVELS.find((l) => l.id === id) ?? LEVELS[0];
}

/** Whether a level with this id actually exists in the campaign. */
export function levelExists(id: number): boolean {
  return LEVELS.some((l) => l.id === id);
}

export const FIRST_LEVEL_ID = LEVELS[0].id;
export const LAST_LEVEL_ID = LEVELS[LEVELS.length - 1].id;
