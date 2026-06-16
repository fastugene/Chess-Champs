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
import { hangsMaterial } from '@/chess/safety';
import { detectPlayerEvents, type TacticEvent } from '@/chess/tactics/detect';
import { getBotMove } from '@/engine/engineClient';
import type { Band } from '@/engine/difficulty';
import { playKillStreak, playSound, resumeAudio } from '@/audio/sfx';
import { speak } from '@/audio/speech';
import { HAPTIC, killStreakHaptic, vibrate } from '@/haptics/haptics';

let game = new Chess();

/** Escalating kill-streak headline (Dota-flavoured, kid-appropriate). */
function streakLabel(n: number): string {
  if (n >= 6) return 'RAMPAGE!';
  if (n === 5) return 'UNSTOPPABLE!';
  if (n === 4) return 'MEGA KILL!';
  if (n === 3) return 'TRIPLE KILL!';
  return 'DOUBLE KILL!';
}

/** Natural-speech version of the streak label for the announcer voice. */
function streakVoice(n: number): string {
  if (n >= 6) return 'Rampage!';
  if (n === 5) return 'Unstoppable!';
  if (n === 4) return 'Mega Kill!';
  if (n === 3) return 'Triple Kill!';
  return 'Double Kill!';
}

/** Announcer line for a non-streak tactic event. Only called for major/epic. */
function tacticVoice(event: import('@/chess/tactics/detect').TacticEvent): string {
  switch (event.type) {
    case 'checkmate':  return 'Checkmate! You win!';
    case 'fork':       return 'Fork! Two targets at once!';
    case 'win-material':
      return event.label === 'FREE KILL!' ? 'Free Kill!' : 'Worth it!';
    default:           return '';
  }
}

export type GameStatus = 'idle' | 'playing' | 'checkmate' | 'stalemate' | 'draw';

interface StartOptions {
  fen?: string;
  playerColor?: Color;
  band: Band;
  /** Blunder training-wheels: confirm before a move that clearly hangs material. */
  safety?: boolean;
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
  /** Consecutive captures by the player this game (drives DOUBLE KILL / TRIPLE KILL). */
  captureStreak: number;
  /** Training-wheels on for this game. */
  safety: boolean;
  /** A move awaiting confirmation because it would hang material (or null). */
  pendingMove: { from: Square; to: Square } | null;
  /** Limited undos left this game. */
  undosRemaining: number;
  /** Half-moves played so far (so the HUD can disable undo with no history). */
  moveCount: number;

  startGame: (opts: StartOptions) => void;
  selectSquare: (sq: Square) => void;
  confirmPendingMove: () => void;
  cancelPendingMove: () => void;
  undoMove: () => void;
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
    set({
      fen: game.fen(),
      turn,
      inCheck: game.isCheck(),
      status,
      winner,
      moveCount: game.history().length,
      ...extra,
    });
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
    const prevStreak = get().captureStreak;
    const newStreak = move.captured ? prevStreak + 1 : 0;
    const isStreak = move.captured && newStreak >= 2;

    // Escalating kill-streak (Brawl Stars / Dota 2 vibe): relabel the capture and
    // make sure it earns the big slam-in banner.
    if (isStreak) {
      const killEvent = events.find((e) => e.type === 'capture' || e.type === 'win-material');
      if (killEvent) {
        killEvent.label = streakLabel(newStreak);
        if (newStreak >= 4) killEvent.tier = 'major';
        else if (killEvent.tier === 'micro') killEvent.tier = 'minor';
      }
    }

    const gainedMaterial = move.captured ? PIECE_VALUE[move.captured] : 0;
    const hasBigEvent = events.some((e) => e.tier !== 'micro');
    if (isStreak) {
      playKillStreak(newStreak);
      vibrate(killStreakHaptic(newStreak));
      speak(streakVoice(newStreak));
    } else if (hasBigEvent) {
      playSound('reward');
      vibrate(HAPTIC.reward);
      const bigEvent = events.find((e) => e.tier === 'major' || e.tier === 'epic');
      if (bigEvent) {
        const line = tacticVoice(bigEvent);
        if (line) speak(line);
      }
    }

    sync({
      selected: null,
      legalTargets: [],
      lastMove: { from: move.from, to: move.to },
      events,
      eventSeq: get().eventSeq + 1,
      playerCaptured: get().playerCaptured + gainedMaterial,
      captureStreak: newStreak,
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
    captureStreak: 0,
    safety: false,
    pendingMove: null,
    undosRemaining: 3,
    moveCount: 0,

    startGame: ({ fen, playerColor = 'w', band, safety = false }) => {
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
        captureStreak: 0,
        safety,
        pendingMove: null,
        undosRemaining: 3,
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
        // Training-wheels: if the move clearly hangs material, ask first.
        if (st.safety && hangsMaterial(game.fen(), st.selected, sq)) {
          playSound('select');
          set({ pendingMove: { from: st.selected, to: sq } });
          return;
        }
        const move = tryMove(st.selected, sq);
        if (move) afterPlayerMove(move);
        return;
      }
      // Otherwise clear the selection.
      set({ selected: null, legalTargets: [] });
    },

    confirmPendingMove: () => {
      const { pendingMove } = get();
      if (!pendingMove) return;
      set({ pendingMove: null });
      const move = tryMove(pendingMove.from, pendingMove.to);
      if (move) afterPlayerMove(move);
    },

    cancelPendingMove: () => set({ pendingMove: null }),

    undoMove: () => {
      const st = get();
      if (st.undosRemaining <= 0 || st.thinking || st.status !== 'playing') return;
      // Roll back to before the player's last move: undo the bot's reply, then
      // the player's move, handing the turn back to the player.
      if (game.history().length < 2) return;
      game.undo();
      game.undo();
      sync({
        selected: null,
        legalTargets: [],
        events: [],
        pendingMove: null,
        captureStreak: 0,
        undosRemaining: st.undosRemaining - 1,
        lastMove: null,
      });
    },

    clearEvents: () => set({ events: [] }),
  };
});
