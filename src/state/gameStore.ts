/**
 * The game store: the single source of truth for an in-progress game.
 *
 * It owns a chess.js instance (kept out of React state) and publishes
 * serialisable snapshots the UI renders from. It also drives sound, haptics,
 * the opponent, and real-time tactic detection after each player move.
 */
import { create } from 'zustand';
import { Chess, type Color, type Move, type Square } from 'chess.js';
import { PIECE_VALUE } from '@/chess/attacks';
import { detectPlayerEvents, type TacticEvent } from '@/chess/tactics/detect';
import { getBotMove } from '@/engine/engineClient';
import type { Band } from '@/engine/difficulty';
import { playSound, resumeAudio } from '@/audio/sfx';
import { HAPTIC, vibrate } from '@/haptics/haptics';

let game = new Chess();

export type GameStatus = 'idle' | 'playing' | 'checkmate' | 'stalemate' | 'draw';

interface StartOptions {
  fen?: string;
  playerColor?: Color;
  band: Band;
}

interface GameStore {
  fen: string;
  turn: Color;
  playerColor: Color;
  botBand: Band;
  selected: Square | null;
  legalTargets: Square[];
  lastMove: { from: Square; to: Square } | null;
  inCheck: boolean;
  status: GameStatus;
  winner: Color | null;
  thinking: boolean;
  /** Events detected from the most recent player move (drives celebrations). */
  events: TacticEvent[];
  /** Bumps on every detection so the UI can re-trigger the same animation. */
  eventSeq: number;
  /** Total material the player has captured this game (for the HUD). */
  playerCaptured: number;

  startGame: (opts: StartOptions) => void;
  selectSquare: (sq: Square) => void;
  clearEvents: () => void;
}

export const useGame = create<GameStore>((set, get) => {
  function sync(extra: Partial<GameStore> = {}): void {
    const turn = game.turn();
    let status: GameStatus = 'playing';
    let winner: Color | null = null;
    if (game.isCheckmate()) {
      status = 'checkmate';
      winner = turn === 'w' ? 'b' : 'w';
    } else if (game.isStalemate()) {
      status = 'stalemate';
    } else if (game.isDraw()) {
      status = 'draw';
    }
    set({ fen: game.fen(), turn, inCheck: game.isCheck(), status, winner, ...extra });
  }

  function tryMove(from: Square, to: Square, promotion: 'q' | 'r' | 'b' | 'n' = 'q'): Move | null {
    try {
      return game.move({ from, to, promotion });
    } catch {
      return null; // illegal move
    }
  }

  function endSoundsIfOver(): void {
    if (!game.isGameOver()) return;
    if (game.isCheckmate()) {
      const playerWon = game.turn() !== get().playerColor;
      playSound(playerWon ? 'win' : 'lose');
      if (playerWon) vibrate(HAPTIC.win);
    }
  }

  async function scheduleBot(): Promise<void> {
    set({ thinking: true });
    const fenAtRequest = game.fen();
    const move = await getBotMove(fenAtRequest, get().botBand);

    // Abort if the game was reset/changed while the bot was "thinking".
    if (game.fen() !== fenAtRequest) {
      set({ thinking: false });
      return;
    }
    if (!move) {
      sync({ thinking: false });
      return;
    }
    const applied = tryMove(
      move.from as Square,
      move.to as Square,
      (move.promotion ?? 'q') as 'q' | 'r' | 'b' | 'n',
    );
    if (applied) {
      playSound(applied.captured ? 'capture' : 'move');
      sync({ thinking: false, lastMove: { from: applied.from, to: applied.to } });
    } else {
      sync({ thinking: false });
    }
    endSoundsIfOver();
  }

  function afterPlayerMove(move: Move): void {
    if (move.captured) {
      playSound('capture');
      vibrate(HAPTIC.capture);
    } else {
      playSound('move');
      vibrate(HAPTIC.move);
    }

    const events = detectPlayerEvents(game.fen(), move);
    const gainedMaterial = move.captured ? PIECE_VALUE[move.captured] : 0;
    const hasBigEvent = events.some((e) => e.tier !== 'micro');
    if (hasBigEvent) {
      playSound('reward');
      vibrate(HAPTIC.reward);
    }

    sync({
      selected: null,
      legalTargets: [],
      lastMove: { from: move.from, to: move.to },
      events,
      eventSeq: get().eventSeq + 1,
      playerCaptured: get().playerCaptured + gainedMaterial,
    });

    if (game.isGameOver()) {
      endSoundsIfOver();
    } else {
      void scheduleBot();
    }
  }

  return {
    fen: game.fen(),
    turn: 'w',
    playerColor: 'w',
    botBand: 'rookie',
    selected: null,
    legalTargets: [],
    lastMove: null,
    inCheck: false,
    status: 'idle',
    winner: null,
    thinking: false,
    events: [],
    eventSeq: 0,
    playerCaptured: 0,

    startGame: ({ fen, playerColor = 'w', band }) => {
      game = fen ? new Chess(fen) : new Chess();
      resumeAudio();
      set({
        playerColor,
        botBand: band,
        selected: null,
        legalTargets: [],
        lastMove: null,
        events: [],
        eventSeq: 0,
        playerCaptured: 0,
        thinking: false,
        winner: null,
        status: 'playing',
      });
      sync();
      if (game.turn() !== playerColor && !game.isGameOver()) void scheduleBot();
    },

    selectSquare: (sq) => {
      const st = get();
      if (st.status !== 'playing' || st.thinking) return;
      if (game.turn() !== st.playerColor) return;
      resumeAudio();

      const piece = game.get(sq);
      // Tapping one of your own pieces (re)selects it.
      if (piece && piece.color === st.playerColor) {
        const targets = game.moves({ square: sq, verbose: true }).map((m) => m.to);
        playSound('select');
        set({ selected: sq, legalTargets: targets });
        return;
      }
      // Tapping a legal destination with a piece already selected makes the move.
      if (st.selected && st.legalTargets.includes(sq)) {
        const move = tryMove(st.selected, sq);
        if (move) afterPlayerMove(move);
        return;
      }
      // Otherwise clear the selection.
      set({ selected: null, legalTargets: [] });
    },

    clearEvents: () => set({ events: [] }),
  };
});
