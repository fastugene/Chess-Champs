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
 * Phase 2 adds: pin, skewer, and discovered-attack detectors.
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
  type: 'capture' | 'win-material' | 'fork' | 'pin' | 'skewer' | 'discovered-attack' | 'check' | 'checkmate';
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
        champId: 'queen',
      },
    ];
  }

  // --- Capture / winning material (the reward ladder) ---
  if (move.captured) {
    const gained = PIECE_VALUE[move.captured];
    const attackerVal = PIECE_VALUE[move.piece];
    const canBeRecaptured = isAttackedBy(grid, f, r, enemy);

    if (!canBeRecaptured && gained >= 1) {
      events.push({
        type: 'win-material',
        tier: gained >= 3 ? 'major' : 'minor',
        label: 'FREE KILL!',
        sub: `+${gained}`,
        value: gained,
        champId: 'pawn',
      });
    } else if (gained > attackerVal) {
      events.push({
        type: 'win-material',
        tier: 'minor',
        label: 'WORTH IT!',
        sub: `+${gained - attackerVal}`,
        value: gained - attackerVal,
        champId: 'pawn',
      });
    } else {
      events.push({ type: 'capture', tier: 'micro', label: 'Kill!', sub: `+${gained}` });
    }
  }

  // --- Fork (conservative) ---
  if (detectFork(grid, f, r, enemy)) {
    events.push({
      type: 'fork',
      tier: 'major',
      label: 'FORK!',
      sub: 'Two targets at once!',
      champId: 'knight',
    });
  }

  // --- Pin ---
  const pin = detectPin(grid, f, r, me, enemy);
  if (pin) {
    events.push({
      type: 'pin',
      tier: 'major',
      label: 'PIN!',
      sub: pin,
      champId: 'bishop',
    });
  }

  // --- Skewer ---
  const skewer = detectSkewer(grid, f, r, me, enemy);
  if (skewer) {
    events.push({
      type: 'skewer',
      tier: 'major',
      label: 'SKEWER!',
      sub: skewer,
      champId: 'rook',
    });
  }

  // --- Discovered attack ---
  const discovered = detectDiscoveredAttack(move, grid, me, enemy);
  if (discovered) {
    events.push({
      type: 'discovered-attack',
      tier: 'major',
      label: 'DISCOVERED ATTACK!',
      sub: 'Hidden threat revealed!',
      champId: 'unseen',
    });
  }

  // --- Plain check (only if nothing bigger happened) ---
  if (events.length === 0 && chess.isCheck()) {
    events.push({ type: 'check', tier: 'micro', label: 'Check!' });
  }

  return events;
}

// ---------------------------------------------------------------------------
// Individual detectors
// ---------------------------------------------------------------------------

/**
 * Conservative fork: the piece that just moved attacks two or more valuable
 * enemy targets, and at least one of those is the king (a check) or a piece
 * worth strictly more than the forking piece.
 */
function detectFork(grid: Grid, f: number, r: number, enemy: Color): boolean {
  const piece = grid[r][f];
  if (!piece) return false;
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

/**
 * Pin: a sliding piece just moved to a square from which it attacks an enemy
 * piece, and directly behind that piece (same ray) is a more valuable enemy
 * piece or the enemy king. The "pinned" piece can't move without exposing the
 * more valuable piece behind it.
 *
 * Returns a human-readable sub-label or null.
 */
function detectPin(
  grid: Grid,
  f: number,
  r: number,
  me: Color,
  enemy: Color,
): string | null {
  const piece = grid[r][f];
  if (!piece || piece.color !== me) return null;
  // Only sliding pieces create pins.
  if (!['b', 'r', 'q'].includes(piece.type)) return null;

  const directions = getSlideDirections(piece.type);

  for (const [df, dr] of directions) {
    let cf = f + df;
    let cr = r + dr;
    let firstEnemy: { val: number } | null = null;

    while (cf >= 0 && cf < 8 && cr >= 0 && cr < 8) {
      const sq = grid[cr][cf];
      if (sq) {
        if (sq.color === me) break; // own piece blocks the ray
        if (sq.color === enemy) {
          if (!firstEnemy) {
            firstEnemy = { val: PIECE_VALUE[sq.type] };
          } else {
            // Second enemy piece on the same ray — is it more valuable?
            if (sq.type === 'k' || PIECE_VALUE[sq.type] > firstEnemy.val) {
              const pinned = firstEnemy.val;
              const behind = sq.type === 'k' ? 'King' : `piece worth ${PIECE_VALUE[sq.type]}`;
              return pinned < PIECE_VALUE[sq.type] || sq.type === 'k'
                ? `The ${sq.type === 'k' ? 'king' : 'bigger piece'} is behind!`
                : null;
            }
            break;
          }
        }
      }
      cf += df;
      cr += dr;
    }
  }
  return null;
}

/**
 * Skewer: a sliding piece attacks a high-value enemy piece, and directly behind
 * it (same ray) is another enemy piece. When the front piece flees, the piece
 * behind it gets captured.
 */
function detectSkewer(
  grid: Grid,
  f: number,
  r: number,
  me: Color,
  enemy: Color,
): string | null {
  const piece = grid[r][f];
  if (!piece || piece.color !== me) return null;
  if (!['b', 'r', 'q'].includes(piece.type)) return null;

  const attackerVal = PIECE_VALUE[piece.type];
  const directions = getSlideDirections(piece.type);

  for (const [df, dr] of directions) {
    let cf = f + df;
    let cr = r + dr;
    let firstEnemy: { val: number } | null = null;

    while (cf >= 0 && cf < 8 && cr >= 0 && cr < 8) {
      const sq = grid[cr][cf];
      if (sq) {
        if (sq.color === me) break;
        if (sq.color === enemy) {
          if (!firstEnemy) {
            firstEnemy = { val: PIECE_VALUE[sq.type] };
          } else {
            // Front piece is more valuable than attacker (must flee) → skewer!
            if (firstEnemy.val > attackerVal) {
              return `Piece worth ${PIECE_VALUE[sq.type]} is left behind!`;
            }
            break;
          }
        }
      }
      cf += df;
      cr += dr;
    }
  }
  return null;
}

/**
 * Discovered attack: the moving piece vacated a square that was blocking a ray
 * from one of our other sliding pieces to a valuable enemy piece.
 * We compare the before/after positions using move.before (chess.js v1 field).
 */
function detectDiscoveredAttack(
  move: Move,
  afterGrid: Grid,
  me: Color,
  enemy: Color,
): boolean {
  // chess.js Move objects include a `before` FEN in v1.x
  const beforeFen: string | undefined = (move as Move & { before?: string }).before;
  if (!beforeFen) return false;

  try {
    const beforeChess = new Chess(beforeFen);
    const beforeGrid = buildGrid(beforeChess.board());

    // From-square: where the piece WAS before moving.
    const { f: fromF, r: fromR } = toCoord(move.from);
    // The piece that moved is no longer on fromF/fromR — it has vacated.

    // Find all our sliding pieces in the AFTER position.
    for (let pr = 0; pr < 8; pr++) {
      for (let pf = 0; pf < 8; pf++) {
        const p = afterGrid[pr][pf];
        if (!p || p.color !== me) continue;
        if (!['b', 'r', 'q'].includes(p.type)) continue;
        // Skip the piece that moved (it moved to a different square).
        if (pf === fromF && pr === fromR) continue;

        const dirs = getSlideDirections(p.type);
        for (const [df, dr] of dirs) {
          // Does this ray pass through the vacated from-square?
          let onRay = false;
          let cf = pf + df;
          let cr = pr + dr;
          while (cf >= 0 && cf < 8 && cr >= 0 && cr < 8) {
            if (cf === fromF && cr === fromR) { onRay = true; break; }
            // If something blocks before reaching fromF/fromR, skip
            if (afterGrid[cr][cf] || beforeGrid[cr][cf]) break;
            cf += df; cr += dr;
          }
          if (!onRay) continue;

          // Follow the ray past fromF/fromR to find what is NOW attacked
          // that wasn't attacked BEFORE (because fromF/fromR was blocking).
          cf = fromF + df;
          cr = fromR + dr;
          while (cf >= 0 && cf < 8 && cr >= 0 && cr < 8) {
            const sq = afterGrid[cr][cf];
            if (sq) {
              if (sq.color === enemy && PIECE_VALUE[sq.type] >= 3) {
                // Conservative: only fire if the before position didn't already
                // have this piece attacked on this ray.
                const beforeSq = beforeGrid[cr][cf];
                if (beforeSq && beforeSq.type === sq.type) {
                  return true;
                }
              }
              break;
            }
            cf += df; cr += dr;
          }
        }
      }
    }
  } catch {
    // Parsing before-FEN failed — skip silently.
  }
  return false;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Dir = [number, number];

function getSlideDirections(pieceType: string): Dir[] {
  if (pieceType === 'b') return [[-1,-1],[-1,1],[1,-1],[1,1]];
  if (pieceType === 'r') return [[-1,0],[1,0],[0,-1],[0,1]];
  // queen = both
  return [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]];
}
