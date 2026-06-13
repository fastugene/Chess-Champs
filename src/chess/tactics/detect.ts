/**
 * Real-time tactic detection — the heart of Chess Champs.
 *
 * After the player's move we analyse the resulting position and decide whether
 * something celebration-worthy happened, and *how big* the celebration should be
 * (the "reward ladder"). Two rules from the design doc keep this honest:
 *   1. Bias conservative — a missed celebration is a shrug, a false one is toxic.
 *   2. Reward what's valuable, scaled — every safe capture gets a little love,
 *      real tactics get the big show.
 *
 * Phase 1 ships the most reliable detectors (clean material wins + a
 * conservative fork). Phase 2 adds an engine eval-gate plus pin/skewer/
 * discovered-attack detectors validated against the bundled puzzle corpus.
 */
import { Chess, type Color, type Move } from 'chess.js';
import {
  PIECE_VALUE,
  attackedSquares,
  buildGrid,
  isAttackedBy,
  toCoord,
  type Grid,
} from '@/chess/attacks';

export type RewardTier = 'micro' | 'minor' | 'major' | 'epic';

export interface TacticEvent {
  type: 'capture' | 'win-material' | 'fork' | 'check' | 'checkmate';
  tier: RewardTier;
  /** Big, kid-readable headline. */
  label: string;
  /** Optional small subtitle (e.g. "+5"). */
  sub?: string;
  /** Champ that should power up from this event, if any. */
  champId?: string;
  /** Material gained, for XP. */
  value?: number;
}

/**
 * Analyse the position AFTER the player's move. `move` is the verbose move that
 * was just played; `afterFen` is the position it produced.
 */
export function detectPlayerEvents(afterFen: string, move: Move): TacticEvent[] {
  const chess = new Chess(afterFen);
  const grid = buildGrid(chess.board());
  const events: TacticEvent[] = [];
  const me: Color = move.color;
  const enemy: Color = me === 'w' ? 'b' : 'w';
  const { f, r } = toCoord(move.to);

  // Checkmate trumps everything.
  if (chess.isCheckmate()) {
    return [
      {
        type: 'checkmate',
        tier: 'epic',
        label: 'CHECKMATE!',
        sub: 'You win the battle!',
        champId: 'finisher',
      },
    ];
  }

  // --- Capture / winning material (the reward ladder) ---
  if (move.captured) {
    const gained = PIECE_VALUE[move.captured];
    const attackerVal = PIECE_VALUE[move.piece];
    const canBeRecaptured = isAttackedBy(grid, f, r, enemy);

    if (!canBeRecaptured && gained >= 1) {
      // Clean win — the captured piece was undefended. This is THE Level 1 skill.
      events.push({
        type: 'win-material',
        tier: gained >= 3 ? 'major' : 'minor',
        label: gained >= 3 ? 'GREAT GRAB!' : 'Free Real Estate!',
        sub: `+${gained}`,
        value: gained,
        champId: 'bulwark',
      });
    } else if (gained > attackerVal) {
      events.push({
        type: 'win-material',
        tier: 'minor',
        label: 'Nice win!',
        sub: `+${gained - attackerVal}`,
        value: gained - attackerVal,
        champId: 'bulwark',
      });
    } else {
      // Safe-ish capture / fair trade → small acknowledgement only.
      events.push({ type: 'capture', tier: 'micro', label: 'Capture!', sub: `+${gained}` });
    }
  }

  // --- Fork (conservative) ---
  if (detectFork(grid, f, r)) {
    events.push({
      type: 'fork',
      tier: 'major',
      label: 'FORK!',
      sub: 'Two targets at once!',
      champId: 'forkfang',
    });
  } else if (chess.isCheck() && events.length === 0) {
    // A plain check, only if nothing bigger happened.
    events.push({ type: 'check', tier: 'micro', label: 'Check!' });
  }

  return events;
}

/**
 * Conservative fork: the piece that just moved attacks two or more valuable
 * enemy targets, and at least one of those is the king (a check) or a piece
 * worth strictly more than the forking piece. This catches the iconic, "whoa!"
 * forks (especially knight royal forks) while keeping false positives near zero.
 */
function detectFork(grid: Grid, f: number, r: number): boolean {
  const piece = grid[r][f];
  if (!piece) return false;
  const enemy: Color = piece.color === 'w' ? 'b' : 'w';
  const attackerVal = PIECE_VALUE[piece.type];

  let valuableTargets = 0;
  let hasKingOrBigger = false;

  for (const s of attackedSquares(grid, f, r)) {
    const t = grid[s.r][s.f];
    if (!t || t.color !== enemy) continue;
    if (t.type === 'k') {
      valuableTargets++;
      hasKingOrBigger = true;
    } else if (PIECE_VALUE[t.type] >= 3) {
      valuableTargets++;
      if (PIECE_VALUE[t.type] > attackerVal) hasKingOrBigger = true;
    }
  }

  return valuableTargets >= 2 && hasKingOrBigger;
}
