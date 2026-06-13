/**
 * Socratic hints — we never just blurt the move. We ask a guiding question that
 * points the kid at the idea (the full tiered hint system arrives in Phase 2).
 */
import { Chess, type Color } from 'chess.js';
import { PIECE_VALUE, buildGrid, isAttackedBy, toCoord } from './attacks';

export function getHint(fen: string, playerColor: Color): string {
  const chess = new Chess(fen);
  if (chess.turn() !== playerColor) {
    return 'Wait for your turn — then hunt for a safe capture!';
  }

  const grid = buildGrid(chess.board());
  const enemy: Color = playerColor === 'w' ? 'b' : 'w';
  const captures = chess.moves({ verbose: true }).filter((m) => m.flags.includes('c'));

  for (const m of captures) {
    if (!m.captured) continue;
    const { f, r } = toCoord(m.to);
    // Undefended target = no enemy piece attacks that square.
    if (!isAttackedBy(grid, f, r, enemy) && PIECE_VALUE[m.captured] >= 1) {
      return 'Look closely — is there a piece you can grab for FREE? 👀';
    }
  }

  return 'Stay safe! Before you move, ask: can anything capture me there? 🛡️';
}
