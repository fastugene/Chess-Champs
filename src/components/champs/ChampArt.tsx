import { CHAMPS } from '@/progression/champs';

/**
 * Champ mascot art — chunky, bold-outlined "brawler" characters drawn entirely
 * in SVG (no image files). They share a base rig (body + big head + determined
 * eyes + feet) and differ by colour, headgear, and a signature weapon — the
 * "shared construction kit" from the design doc, so the squad stays consistent
 * and new Champs are cheap to add.
 *
 * This is the early art gut-check for the playtest: if the style lands with him,
 * we build the rest of the roster the same way; if not, we pivot cheaply.
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
  const color = champ?.color ?? '#7c9cff';
  const dark = shade(color, -0.35);
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

      {/* weapon drawn behind the body for some champs */}
      {champId === 'forkfang' && <Glaive color={dark} outline={outline} />}
      {champId === 'finisher' && <Warhammer outline={outline} />}

      {/* feet */}
      <g stroke={outline} strokeWidth="4" strokeLinejoin="round">
        <rect x="56" y="146" width="20" height="14" rx="6" fill={dark} />
        <rect x="84" y="146" width="20" height="14" rx="6" fill={dark} />
      </g>

      {/* body */}
      <rect
        x="46"
        y="96"
        width="68"
        height="56"
        rx="22"
        fill={color}
        stroke={outline}
        strokeWidth="4"
      />

      {/* head */}
      <rect
        x="38"
        y="38"
        width="84"
        height="72"
        rx="28"
        fill={color}
        stroke={outline}
        strokeWidth="4"
      />

      {/* per-champ headgear */}
      {champId === 'bulwark' && <Helmet color={dark} outline={outline} />}
      {champId === 'forkfang' && <Horns color={dark} outline={outline} />}

      {/* face */}
      <Face champId={champId} outline={outline} />

      {/* shield held to the side */}
      {champId === 'bulwark' && <Shield outline={outline} />}
    </svg>
  );
}

function Face({ champId, outline }: { champId: string; outline: string }) {
  const angry = champId === 'finisher';
  return (
    <g>
      {/* eyes */}
      <g>
        <ellipse cx="66" cy="74" rx="10" ry="12" fill="#fff" stroke={outline} strokeWidth="3" />
        <ellipse cx="94" cy="74" rx="10" ry="12" fill="#fff" stroke={outline} strokeWidth="3" />
        <circle cx="67" cy="77" r="5" fill={outline} />
        <circle cx="93" cy="77" r="5" fill={outline} />
        <circle cx="64.5" cy="72" r="2" fill="#fff" />
        <circle cx="90.5" cy="72" r="2" fill="#fff" />
      </g>
      {/* eyebrows — slope inward for a confident/determined look */}
      <g stroke={outline} strokeWidth="5" strokeLinecap="round">
        <line x1="54" y1={angry ? '60' : '58'} x2="76" y2={angry ? '68' : '64'} />
        <line x1="106" y1={angry ? '60' : '58'} x2="84" y2={angry ? '68' : '64'} />
      </g>
      {/* mouth */}
      {champId === 'forkfang' ? (
        <g>
          <path d="M70 92 q10 8 20 0" fill="none" stroke={outline} strokeWidth="3.5" strokeLinecap="round" />
          <path d="M72 92 l3 7 l3 -7 Z" fill="#fff" stroke={outline} strokeWidth="1.5" />
          <path d="M85 92 l3 7 l3 -7 Z" fill="#fff" stroke={outline} strokeWidth="1.5" />
        </g>
      ) : (
        <path d="M71 92 q9 7 18 0" fill="none" stroke={outline} strokeWidth="3.5" strokeLinecap="round" />
      )}
    </g>
  );
}

function Helmet({ color, outline }: { color: string; outline: string }) {
  return (
    <g stroke={outline} strokeWidth="4" strokeLinejoin="round">
      <path d="M38 64 q0 -26 42 -26 q42 0 42 26 Z" fill={color} />
      <rect x="74" y="22" width="12" height="18" rx="4" fill={color} />
      <circle cx="80" cy="20" r="6" fill={color} />
    </g>
  );
}

function Horns({ color, outline }: { color: string; outline: string }) {
  return (
    <g fill={color} stroke={outline} strokeWidth="4" strokeLinejoin="round">
      <path d="M46 44 l-10 -22 l20 12 Z" />
      <path d="M114 44 l10 -22 l-20 12 Z" />
    </g>
  );
}

function Shield({ outline }: { outline: string }) {
  return (
    <g stroke={outline} strokeWidth="4" strokeLinejoin="round">
      <path d="M118 84 h30 v26 q0 18 -15 24 q-15 -6 -15 -24 Z" fill="#cdd6ee" />
      <line x1="133" y1="90" x2="133" y2="126" stroke="#8893b8" strokeWidth="4" />
      <line x1="120" y1="103" x2="146" y2="103" stroke="#8893b8" strokeWidth="4" />
    </g>
  );
}

function Glaive({ color, outline }: { color: string; outline: string }) {
  return (
    <g stroke={outline} strokeWidth="4" strokeLinejoin="round" strokeLinecap="round">
      <line x1="128" y1="158" x2="128" y2="40" stroke="#8a6a3a" strokeWidth="7" />
      <path d="M118 44 l10 -22 l10 22" fill={color} />
      <line x1="121" y1="40" x2="121" y2="20" stroke={color} strokeWidth="6" />
      <line x1="135" y1="40" x2="135" y2="20" stroke={color} strokeWidth="6" />
    </g>
  );
}

function Warhammer({ outline }: { outline: string }) {
  return (
    <g stroke={outline} strokeWidth="4" strokeLinejoin="round">
      <line x1="126" y1="156" x2="126" y2="44" stroke="#8a6a3a" strokeWidth="7" strokeLinecap="round" />
      <rect x="110" y="26" width="34" height="26" rx="6" fill="#b8bed6" />
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
