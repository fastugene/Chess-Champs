/**
 * Rank system — Minecraft-flavoured tiers with Brawl Stars division colours.
 *
 * Each tier has 3 XP-based divisions (III → II → I). Crossing into a new tier
 * also requires the matching chapter to be mastered (the skill gate), so the
 * son always earns his rank rather than grinding past it.
 *
 * Phase 2 fully implements Wood–Diamond. Emerald–Ender are defined here so
 * the display code is future-proof; they unlock as chapters are built.
 */

export interface RankTier {
  id: string;
  name: string;
  color: string;
  /** XP required to reach division 3 of this tier (skill gate also applies). */
  minXp: number;
  /** XP per division step within this tier. */
  xpPerDivision: number;
  /** Chapter id that must be mastered before this tier can be entered. */
  skillGate?: number;
  /** Emoji badge shown in the UI. */
  badge: string;
}

export const TIERS: RankTier[] = [
  { id: 'wood',      name: 'Wood',      color: '#a07850', badge: '🪵', minXp: 0,     xpPerDivision: 150  },
  { id: 'stone',     name: 'Stone',     color: '#8a9aaa', badge: '🪨', minXp: 500,   xpPerDivision: 250,  skillGate: 1 },
  { id: 'iron',      name: 'Iron',      color: '#c0d0e0', badge: '⚙️', minXp: 1500,  xpPerDivision: 350,  skillGate: 2 },
  { id: 'gold',      name: 'Gold',      color: '#ffd700', badge: '🏅', minXp: 3500,  xpPerDivision: 500,  skillGate: 3 },
  { id: 'diamond',   name: 'Diamond',   color: '#00e8ff', badge: '💎', minXp: 7000,  xpPerDivision: 700,  skillGate: 4 },
  { id: 'emerald',   name: 'Emerald',   color: '#00c87a', badge: '💚', minXp: 12000, xpPerDivision: 900,  skillGate: 5 },
  { id: 'netherite', name: 'Netherite', color: '#4a3f5e', badge: '🔥', minXp: 20000, xpPerDivision: 1200, skillGate: 6 },
  { id: 'ender',     name: 'Ender',     color: '#9b59b6', badge: '🌌', minXp: 35000, xpPerDivision: 0,    skillGate: 7 },
];

export interface Rank {
  tier: RankTier;
  /** 3 = lowest division, 1 = highest within tier. */
  division: number;
  /** Display string, e.g. "Stone II". */
  displayName: string;
}

/**
 * Compute the player's current rank from their XP and mastered chapters.
 * The rank is always the highest tier whose XP threshold AND skill gate
 * (if any) are both satisfied.
 */
export function getRank(xp: number, masteredChapters: number[]): Rank {
  let activeTier = TIERS[0];

  for (const tier of TIERS) {
    if (xp < tier.minXp) break;
    if (tier.skillGate && !masteredChapters.includes(tier.skillGate)) break;
    activeTier = tier;
  }

  // Compute division within the tier (3 → 2 → 1).
  let division = 3;
  if (activeTier.xpPerDivision > 0) {
    const xpInTier = xp - activeTier.minXp;
    const divStep = Math.floor(xpInTier / activeTier.xpPerDivision);
    division = Math.max(1, 3 - divStep);
  }

  const displayName =
    activeTier.id === 'ender' ? 'Ender Legend' : `${activeTier.name} ${toRoman(division)}`;

  return { tier: activeTier, division, displayName };
}

function toRoman(n: number): string {
  return n === 1 ? 'I' : n === 2 ? 'II' : 'III';
}
