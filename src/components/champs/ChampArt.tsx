import { CHAMPS } from '@/progression/champs';

/**
 * Champ art — the chess piece IS the character.
 *
 * Each Champ is drawn as its chess-piece silhouette (instantly recognizable =
 * great collectible identity) given a face with attitude: smirk + confident
 * eyes, drawn with smooth curved paths so they can actually emote. One shared
 * "construction kit" (CoolFace + shade + glow) keeps the squad consistent and
 * makes adding Bishop/Rook/King cheap later.
 *
 * Style target: "cool / battle-brawler", friendly enough for a 9-year-old.
 */
export function ChampArt({
  champId,
  size = 120,
  showGlow = true,
}: {
  champId: string;
  size?: number;
  showGlow?: boolean;
}) {
  const champ = CHAMPS[champId];
  const color = champ?.color ?? '#2f86ff';
  const dark = shade(color, -0.34);
  const light = shade(color, 0.32);
  const foot = shade(color, -0.52);
  const outline = '#14172e';
  const gid = `glow-${champId}`;

  return (
    <svg
      width={size}
      height={(size * 180) / 160}
      viewBox="0 0 160 180"
      role="img"
      aria-label={champ?.name ?? 'Champ'}
    >
      <defs>
        <radialGradient id={gid} cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor={color} stopOpacity="0.55" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>

      {showGlow && <circle cx="80" cy="84" r="78" fill={`url(#${gid})`} />}

      {champId === 'knight' ? (
        <Knight color={color} dark={dark} light={light} foot={foot} outline={outline} />
      ) : champId === 'queen' ? (
        <Queen color={color} dark={dark} light={light} foot={foot} outline={outline} />
      ) : champId === 'bishop' ? (
        <Bishop color={color} dark={dark} light={light} foot={foot} outline={outline} />
      ) : champId === 'rook' ? (
        <Rook color={color} dark={dark} light={light} foot={foot} outline={outline} />
      ) : champId === 'unseen' ? (
        <Unseen color={color} dark={dark} foot={foot} outline={outline} />
      ) : (
        <Pawn color={color} dark={dark} light={light} foot={foot} outline={outline} />
      )}
    </svg>
  );
}

interface PartProps {
  color: string;
  dark: string;
  light: string;
  foot: string;
  outline: string;
}

function Pawn({ color, dark, light, foot, outline }: PartProps) {
  return (
    <g>
      <rect x="44" y="150" width="72" height="14" rx="7" fill={foot} />
      <path d="M52 150 L60 108 Q80 96 100 108 L108 150 Z" fill={color} stroke={dark} strokeWidth="2" />
      <ellipse cx="80" cy="106" rx="24" ry="7" fill={dark} />
      <circle cx="80" cy="72" r="30" fill={color} stroke={dark} strokeWidth="2" />
      <circle cx="70" cy="62" r="10" fill={light} opacity="0.6" />
      <CoolFace cx={80} cy={70} s={1.4} outline={outline} />
    </g>
  );
}

function Queen({ color, dark, light, foot, outline }: PartProps) {
  return (
    <g>
      <rect x="44" y="150" width="72" height="14" rx="7" fill={foot} />
      <path d="M48 150 L60 84 Q80 74 100 84 L112 150 Z" fill={color} stroke={dark} strokeWidth="2" />
      <ellipse cx="80" cy="84" rx="24" ry="7" fill={dark} />
      <circle cx="80" cy="58" r="27" fill={color} stroke={dark} strokeWidth="2" />
      <circle cx="71" cy="49" r="9" fill={light} opacity="0.6" />
      <rect x="56" y="28" width="48" height="10" rx="2" fill={dark} />
      <path
        d="M56 30 L60 16 L65 30 Z M65 30 L70 19 L75 30 Z M75 30 L80 13 L85 30 Z M85 30 L90 19 L95 30 Z M95 30 L100 16 L104 30 Z"
        fill={color}
        stroke={dark}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="80" cy="14" r="2.6" fill="#b06bff" />
      <circle cx="60" cy="17" r="2" fill="#b06bff" />
      <circle cx="100" cy="17" r="2" fill="#b06bff" />
      <CoolFace cx={80} cy={58} s={1.2} outline={outline} />
    </g>
  );
}

function Knight({ color, dark, foot, outline }: PartProps) {
  return (
    <g>
      <rect x="44" y="150" width="72" height="14" rx="7" fill={foot} />
      <path d="M52 150 L58 120 L102 120 L108 150 Z" fill={dark} />
      <ellipse cx="80" cy="120" rx="26" ry="7" fill={dark} />
      <path
        d="M50 96 C52 82 58 70 66 60 C70 50 76 44 80 40 L84 30 L90 44 L94 40 L100 52 C106 70 108 92 104 110 C100 120 88 122 78 118 C70 116 64 110 60 104 C54 102 50 102 50 96 Z"
        fill={color}
        stroke={dark}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M92 46 C104 70 106 96 100 114" stroke={dark} strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M84 50 C94 72 96 96 92 112" stroke={dark} strokeWidth="2" fill="none" strokeLinecap="round" />
      <ellipse cx="55" cy="88" rx="3" ry="2.2" fill={outline} />
      <ellipse cx="72" cy="66" rx="5.5" ry="6.5" fill="#ffffff" />
      <circle cx="71" cy="68" r="3.2" fill={outline} />
      <circle cx="70" cy="65" r="1.2" fill="#ffffff" />
      <path d="M62 56 Q72 53 80 59" stroke={outline} strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M50 95 Q58 102 69 98" stroke={outline} strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </g>
  );
}

function Unseen({ color, dark, foot, outline }: Omit<PartProps, 'light'>) {
  return (
    <g>
      {/* Base */}
      <rect x="44" y="150" width="72" height="14" rx="7" fill={foot} />
      {/* Flowing cloak body */}
      <path
        d="M50 150 C54 128 60 106 70 86 C74 74 77 60 80 46 C83 60 86 74 90 86 C100 106 106 128 110 150 Z"
        fill={dark}
        stroke={outline}
        strokeWidth="2"
      />
      {/* Deep shadow at cloak centre */}
      <path
        d="M64 150 C66 130 70 108 76 90 C78 78 79 64 80 52 C81 64 82 78 84 90 C90 108 94 130 96 150 Z"
        fill={outline}
        opacity="0.55"
      />
      {/* Hood */}
      <circle cx="80" cy="50" r="26" fill={dark} stroke={outline} strokeWidth="2" />
      <circle cx="80" cy="46" r="20" fill={outline} opacity="0.55" />
      {/* Glowing eyes — the only visible feature, no CoolFace */}
      <ellipse cx="72" cy="47" rx="5" ry="4.5" fill={color} />
      <ellipse cx="88" cy="47" rx="5" ry="4.5" fill={color} />
      <ellipse cx="72" cy="46" rx="2.5" ry="2" fill="#ffffff" opacity="0.85" />
      <ellipse cx="88" cy="46" rx="2.5" ry="2" fill="#ffffff" opacity="0.85" />
      {/* Diagonal hidden-attack beam across the cloak */}
      <line x1="52" y1="118" x2="108" y2="82" stroke={color} strokeWidth="3" strokeLinecap="round" opacity="0.5" />
      <line x1="52" y1="118" x2="108" y2="82" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" opacity="0.35" />
      {/* Cloak-edge wisps */}
      <path d="M51 144 Q57 130 60 118" stroke={color} strokeWidth="2" fill="none" opacity="0.4" strokeLinecap="round" />
      <path d="M109 144 Q103 130 100 118" stroke={color} strokeWidth="2" fill="none" opacity="0.4" strokeLinecap="round" />
    </g>
  );
}

function Bishop({ color, dark, light, foot, outline }: PartProps) {
  return (
    <g>
      {/* Base */}
      <rect x="44" y="150" width="72" height="14" rx="7" fill={foot} />
      {/* Body — tapered trapezoid */}
      <path d="M55 150 L63 114 Q80 106 97 114 L105 150 Z" fill={color} stroke={dark} strokeWidth="2" />
      <ellipse cx="80" cy="114" rx="22" ry="6" fill={dark} />
      {/* Head ball */}
      <circle cx="80" cy="90" r="22" fill={color} stroke={dark} strokeWidth="2" />
      <circle cx="71" cy="80" r="8" fill={light} opacity="0.55" />
      {/* Neck collar */}
      <ellipse cx="80" cy="68" rx="10" ry="4" fill={dark} />
      {/* Miter hat — the bishop's distinctive tall point */}
      <path d="M64 68 Q72 52 80 26 Q88 52 96 68 Z" fill={color} stroke={dark} strokeWidth="1.5" />
      {/* Notch groove in miter */}
      <path d="M77 66 L80 46 L83 66" fill={dark} />
      {/* Ball finial at tip */}
      <circle cx="80" cy="26" r="5" fill={color} stroke={dark} strokeWidth="1.5" />
      {/* Face */}
      <CoolFace cx={80} cy={91} s={1.0} outline={outline} />
    </g>
  );
}

function Rook({ color, dark, light, foot, outline }: PartProps) {
  return (
    <g>
      {/* Wide base — rook is the broadest piece */}
      <rect x="34" y="150" width="92" height="14" rx="7" fill={foot} />
      {/* Tower body */}
      <rect x="46" y="82" width="68" height="68" rx="4" fill={color} stroke={dark} strokeWidth="2" />
      {/* Left-side depth shading */}
      <rect x="46" y="82" width="14" height="68" rx="4" fill={dark} opacity="0.22" />
      {/* Highlight stripe */}
      <rect x="64" y="88" width="8" height="54" rx="3" fill={light} opacity="0.22" />
      {/* Base collar */}
      <rect x="40" y="144" width="80" height="8" rx="3" fill={dark} opacity="0.4" />
      {/* Merlon platform */}
      <rect x="42" y="72" width="76" height="14" rx="2" fill={dark} />
      {/* Battlements — 3 merlons with 2 gaps */}
      <rect x="44" y="50" width="20" height="24" rx="3" fill={color} stroke={dark} strokeWidth="1.5" />
      <rect x="70" y="50" width="20" height="24" rx="3" fill={color} stroke={dark} strokeWidth="1.5" />
      <rect x="96" y="50" width="20" height="24" rx="3" fill={color} stroke={dark} strokeWidth="1.5" />
      {/* Arrow-loop windows on sides (below face) */}
      <rect x="50" y="112" width="5" height="10" rx="2" fill={dark} opacity="0.45" />
      <rect x="105" y="112" width="5" height="10" rx="2" fill={dark} opacity="0.45" />
      {/* Face on the tower front */}
      <CoolFace cx={80} cy={106} s={1.2} outline={outline} />
    </g>
  );
}

/**
 * Shared face kit: confident eyes (with a slight lid + sparkle) and an
 * asymmetric smirk. Scales with `s`. Tuned for "cool, not stern" — the
 * attitude comes from the smirk + pupil shift, never an angry brow.
 */
function CoolFace({ cx, cy, s, outline }: { cx: number; cy: number; s: number; outline: string }) {
  const eo = 7 * s;
  const ew = 5 * s;
  const eh = 6 * s;
  return (
    <g>
      <ellipse cx={cx - eo} cy={cy} rx={ew} ry={eh} fill="#ffffff" />
      <ellipse cx={cx + eo} cy={cy} rx={ew} ry={eh} fill="#ffffff" />
      <circle cx={cx - eo + 1.2 * s} cy={cy + 1.5 * s} r={2.8 * s} fill={outline} />
      <circle cx={cx + eo + 1.2 * s} cy={cy + 1.5 * s} r={2.8 * s} fill={outline} />
      <circle cx={cx - eo + 0.2 * s} cy={cy - 0.6 * s} r={1 * s} fill="#ffffff" />
      <circle cx={cx + eo + 0.2 * s} cy={cy - 0.6 * s} r={1 * s} fill="#ffffff" />
      <path
        d={`M${cx - eo - ew} ${cy - eh + 1.5 * s} Q ${cx - eo} ${cy - eh - 1 * s} ${cx - eo + ew} ${cy - eh + 2.5 * s}`}
        stroke={outline}
        strokeWidth={1.7 * s}
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M${cx + eo - ew} ${cy - eh + 2.5 * s} Q ${cx + eo} ${cy - eh - 1 * s} ${cx + eo + ew} ${cy - eh + 1.5 * s}`}
        stroke={outline}
        strokeWidth={1.7 * s}
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M${cx - 7 * s} ${cy + 10 * s} Q ${cx + 1 * s} ${cy + 15.5 * s} ${cx + 8 * s} ${cy + 9 * s}`}
        stroke={outline}
        strokeWidth={2.6 * s}
        fill="none"
        strokeLinecap="round"
      />
    </g>
  );
}

/** Lighten/darken a hex colour by ratio in [-1, 1]. */
function shade(hex: string, ratio: number): string {
  const n = hex.replace('#', '');
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  const adj = (c: number) =>
    Math.max(0, Math.min(255, Math.round(c + (ratio < 0 ? c * ratio : (255 - c) * ratio))));
  const h = (c: number) => adj(c).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}
