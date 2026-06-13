/**
 * The Champs — collectible brawler mascots, each embodying one chess tactic.
 * A Champ powers up (Power Level 1 -> 11) only when the player executes its
 * tactic in a real game. Rarity is fixed; power level grows. (See design doc.)
 *
 * Phase 1 ships 3 finished Champs so we can gut-check the art style early.
 */
export type Rarity = 'Common' | 'Rare' | 'Super Rare' | 'Epic' | 'Mythic' | 'Legendary';

export interface Champ {
  id: string;
  name: string;
  tactic: string;
  rarity: Rarity;
  /** Main accent color for the Champ's art + glow. */
  color: string;
  gear: string;
  /** One-line, kid-voice tagline. */
  tagline: string;
}

export const RARITY_COLOR: Record<Rarity, string> = {
  Common: '#9aa3c7',
  Rare: '#4fd675',
  'Super Rare': '#4aa8ff',
  Epic: '#b06bff',
  Mythic: '#ff5d73',
  Legendary: '#ffc93c',
};

export const CHAMPS: Record<string, Champ> = {
  bulwark: {
    id: 'bulwark',
    name: 'Bulwark',
    tactic: 'Defense',
    rarity: 'Common',
    color: '#7c9cff',
    gear: 'Tower Shield',
    tagline: 'Nothing gets past me.',
  },
  forkfang: {
    id: 'forkfang',
    name: 'Forkfang',
    tactic: 'Fork',
    rarity: 'Rare',
    color: '#4fd675',
    gear: 'Twin Glaive',
    tagline: 'Two targets, one strike!',
  },
  finisher: {
    id: 'finisher',
    name: 'Finisher',
    tactic: 'Checkmate',
    rarity: 'Common',
    color: '#ffc93c',
    gear: 'Warhammer',
    tagline: "Let's end this!",
  },
};

export function getChamp(id: string): Champ | undefined {
  return CHAMPS[id];
}
