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
  /**
   * 1-2 line, kid-voice explanation of this Champ's tactic. Shown every time the
   * tactic is performed and whenever the character comes up, so the learning is
   * reinforced right at the dopamine moment.
   */
  lesson: string;
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
  pawn: {
    id: 'pawn',
    name: 'Scrapper the Pawn',
    tactic: 'Safety',
    rarity: 'Common',
    color: '#2f86ff',
    gear: 'Battle Buckler',
    tagline: 'Small but mighty.',
    lesson: 'Keep your squad safe — never leave a piece where it can be grabbed for free.',
  },
  knight: {
    id: 'knight',
    name: 'Forkmane the Knight',
    tactic: 'Fork',
    rarity: 'Rare',
    color: '#18c85f',
    gear: 'Twin Hooves',
    tagline: 'Two targets, one strike!',
    lesson: 'A fork hits two pieces at once — your foe can only save one!',
  },
  queen: {
    id: 'queen',
    name: 'Finisher the Queen',
    tactic: 'Checkmate',
    rarity: 'Epic',
    color: '#ffc21f',
    gear: 'Royal Crown',
    tagline: "Let's end this!",
    lesson: 'Checkmate! The king is trapped with nowhere to run. You win!',
  },
};

export function getChamp(id: string): Champ | undefined {
  return CHAMPS[id];
}
