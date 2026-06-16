import type { Color, PieceSymbol } from 'chess.js';

/**
 * Board pieces use the solid Unicode chess glyphs for BOTH colors, then colour
 * + outline them via CSS. This is fully self-contained (no image files) and
 * renders crisply on iOS and Android. (Custom SVG pieces are a later polish; the
 * collectible "Champs" are where the bespoke art goes.)
 */
// ︎ = Variation Selector-15: forces TEXT rendering on iOS/Android, which
// would otherwise upgrade these symbols to emoji (ignoring CSS color entirely).
const GLYPH: Record<PieceSymbol, string> = {
  k: '♚︎',
  q: '♛︎',
  r: '♜︎',
  b: '♝︎',
  n: '♞︎',
  p: '♟︎',
};

export function Piece({ type, color }: { type: PieceSymbol; color: Color }) {
  return (
    <div className={`piece ${color === 'w' ? 'white' : 'black'}`} aria-hidden="true">
      <span>{GLYPH[type]}</span>
    </div>
  );
}
