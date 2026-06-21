/**
 * Offline move explainer for Grandmaster Training Mode.
 *
 * Two jobs, both 100% local/deterministic (no LLM, no network — see the hard
 * constraints in CLAUDE.md):
 *  1. `analyzeCandidate` — a kid-readable, two-part rationale for a candidate
 *     move, built from chess.js move characteristics + simple board geometry.
 *  2. `rateCandidates` / `buildVerdict` — translate Stockfish's eval gap into a
 *     ⭐ star rating (NO centipawns shown — "no eval bars ever") and a
 *     growth-framed verdict that says which move is stronger and why.
 *
 * Scores are Stockfish side-to-move-relative (see EvaluatedMove): higher = better
 * for the side choosing, so the two candidates from one position are directly
 * comparable with no sign-flipping.
 */
import { Chess, type PieceSymbol } from 'chess.js';
import { PIECE_VALUE, attackedSquares, buildGrid, toCoord, type Grid } from '@/chess/attacks';
import type { EvaluatedMove } from '@/engine/stockfishClient';

const PIECE_NAME: Record<PieceSymbol, string> = {
  p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king',
};

/** Central squares a developing/space move aims for. */
const CENTER = new Set(['c4', 'd4', 'e4', 'f4', 'c5', 'd5', 'e5', 'f5', 'd3', 'e3', 'd6', 'e6']);

type Tag =
  | 'mate' | 'castle' | 'capture' | 'check' | 'promotion'
  | 'threat' | 'develop' | 'center' | 'quiet';

export interface Candidate {
  move: EvaluatedMove;
  /** Standard algebraic notation, for display (e.g. "Nf3", "Qxh7+"). */
  san: string;
  /** Two-part kid-readable rationale (e.g. "Develops the knight and eyes the center"). */
  rationale: string;
  tags: Tag[];
}

export interface StarRating {
  bestStars: number;
  secondStars: number;
}

/** Single-clause phrase per tag (the moved piece is `mover`, victim is `victim`). */
function phrase(tag: Tag, ctx: { mover: PieceSymbol; victim?: PieceSymbol }): string {
  switch (tag) {
    case 'mate': return 'Forces checkmate';
    case 'castle': return 'Castles the king to safety';
    case 'capture': return `Wins the ${PIECE_NAME[ctx.victim ?? 'p']}`;
    case 'check': return 'Checks the king';
    case 'promotion': return 'Promotes to a queen';
    case 'threat': return `Threatens the ${PIECE_NAME[ctx.victim ?? 'p']}`;
    case 'develop': return `Develops the ${PIECE_NAME[ctx.mover]}`;
    case 'center': return 'Fights for the center';
    case 'quiet': return 'A calm, solid move';
  }
}

/** Lowercase the first letter so a secondary clause reads naturally after "and". */
function lower(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/**
 * After a non-capturing move, does the moved piece (now on its target square)
 * attack an enemy piece worth more than itself? That's a "threat" worth naming.
 */
function findThreat(afterGrid: Grid, toSq: string, mover: PieceSymbol, moverColor: 'w' | 'b'): PieceSymbol | undefined {
  const { f, r } = toCoord(toSq as Parameters<typeof toCoord>[0]);
  // Reuse attack geometry: scan the piece's attacked squares for a fat enemy.
  // (Imported lazily to avoid a cycle-free helper just for this.)
  const moverVal = PIECE_VALUE[mover];
  let best: PieceSymbol | undefined;
  let bestVal = moverVal;
  for (const s of attackedSquares(afterGrid, f, r)) {
    const t = afterGrid[s.r][s.f];
    if (t && t.color !== moverColor && PIECE_VALUE[t.type] > bestVal) {
      best = t.type;
      bestVal = PIECE_VALUE[t.type];
    }
  }
  return best;
}

/**
 * Build a candidate's SAN + two-part rationale + tags from the position before
 * the move and the move itself. `mate` (from the engine eval) forces the mate tag.
 */
export function analyzeCandidate(fenBefore: string, mv: EvaluatedMove): Candidate {
  const chess = new Chess(fenBefore);
  const applied = chess.move({ from: mv.from, to: mv.to, promotion: mv.promotion ?? 'q' });
  const san = applied?.san ?? `${mv.from}${mv.to}`;
  const mover = applied?.piece ?? 'p';
  const moverColor = applied?.color ?? 'w';

  const tags: Tag[] = [];
  const victim = applied?.captured;
  const isMate = (mv.mate ?? 0) > 0 && chess.isCheckmate();

  if (isMate) tags.push('mate');
  if (applied?.flags.includes('k') || applied?.flags.includes('q')) tags.push('castle');
  if (victim) tags.push('capture');
  if (!isMate && chess.isCheck()) tags.push('check');
  if (applied?.flags.includes('p')) tags.push('promotion');

  // Threat only matters for non-captures (a capture already grabbed the piece).
  let threatVictim: PieceSymbol | undefined;
  if (!victim && !isMate) {
    threatVictim = findThreat(buildGrid(chess.board()), mv.to, mover, moverColor);
    if (threatVictim) tags.push('threat');
  }

  // Development: a knight/bishop leaving its own back rank.
  const backRank = moverColor === 'w' ? '1' : '8';
  if ((mover === 'n' || mover === 'b') && mv.from[1] === backRank) tags.push('develop');

  if (CENTER.has(mv.to)) tags.push('center');
  if (tags.length === 0) tags.push('quiet');

  // Compose up to two distinct clauses.
  const ctxFor = (t: Tag) => ({ mover, victim: t === 'capture' ? victim : threatVictim });
  const primary = phrase(tags[0], ctxFor(tags[0]));
  const secondary = tags[1] ? phrase(tags[1], ctxFor(tags[1])) : undefined;
  const rationale = secondary ? `${primary} and ${lower(secondary)}` : primary;

  return { move: mv, san, rationale, tags };
}

/** Convert a side-to-move score into a single comparable "pawns" number. */
function scoreVal(m: EvaluatedMove): number {
  if (m.mate != null) return m.mate > 0 ? 1000 - m.mate : -1000 - m.mate;
  return (m.scoreCp ?? 0) / 100;
}

/**
 * Stars (no centipawns): the engine's #1 is always ⭐⭐⭐; the #2 scales down by
 * how far behind it is. A mate beats any non-mate.
 */
export function rateCandidates(best: EvaluatedMove, second: EvaluatedMove): StarRating {
  const delta = scoreVal(best) - scoreVal(second); // >= 0 (best is ranked first)
  let secondStars: number;
  if (delta < 0.3) secondStars = 3;
  else if (delta < 1.0) secondStars = 2;
  else secondStars = 1;
  return { bestStars: 3, secondStars };
}

/** One short clause explaining WHY the stronger move wins, from tag contrast. */
function strongerReason(best: Candidate, weaker: Candidate): string {
  const has = (c: Candidate, t: Tag) => c.tags.includes(t);
  if (has(best, 'mate')) return 'it forces checkmate';
  if (has(best, 'capture') && !has(weaker, 'capture')) return 'it wins material the other move leaves behind';
  if ((has(best, 'check') || has(best, 'threat')) && !(has(weaker, 'check') || has(weaker, 'threat')))
    return 'it creates a bigger threat';
  if ((has(best, 'develop') || has(best, 'center')) && has(weaker, 'quiet'))
    return 'it improves your position more';
  return 'it keeps a stronger long-term edge';
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * The verdict copy shown after the player picks. Growth-framed: never "wrong" —
 * a non-best pick is still "good," the grandmaster just "slightly prefers" the
 * other. `best`/`second` are the engine-ranked candidates (best first).
 */
export function buildVerdict(best: Candidate, second: Candidate, chosenIsBest: boolean): string {
  const delta = scoreVal(best.move) - scoreVal(second.move);
  if (delta < 0.3) {
    return 'Both are grandmaster moves — basically equal. You can’t go wrong! 👑';
  }
  const reason = strongerReason(best, second);
  if (chosenIsBest) {
    return `✅ You picked the grandmaster’s move! ${capitalize(best.san)} is best — ${reason}.`;
  }
  return `Good pick! The grandmaster slightly prefers ${best.san} — ${reason}.`;
}
