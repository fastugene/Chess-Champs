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
  bishop: {
    id: 'bishop',
    name: 'Pinpoint the Bishop',
    tactic: 'Pin',
    rarity: 'Rare',
    color: '#a78bfa',
    gear: 'Diagonal Lance',
    tagline: 'Pinned — you cannot move!',
    lesson: 'A pin traps a piece in front of something more valuable — move it and you lose the big prize!',
  },
  rook: {
    id: 'rook',
    name: 'Harpoon the Rook',
    tactic: 'Skewer',
    rarity: 'Super Rare',
    color: '#f97316',
    gear: 'Tower Spear',
    tagline: 'Run... and lose what is behind you!',
    lesson: 'A skewer attacks the big piece — it must run, and you grab the smaller piece left behind!',
  },
  unseen: {
    id: 'unseen',
    name: 'The Unseen',
    tactic: 'Discovered Attack',
    rarity: 'Epic',
    color: '#b06bff',
    gear: 'Cloaked Blades',
    tagline: 'You never saw me coming!',
    lesson: 'A discovered attack moves one piece aside to unleash a hidden piece behind it — two threats in one!',
  },
};

export function getChamp(id: string): Champ | undefined {
  return CHAMPS[id];
}

/** Display name for a champ, respecting the son's custom Pawn name if set. */
export function getChampDisplayName(champId: string, pawnCustomName?: string): string {
  if (champId === 'pawn' && pawnCustomName) return pawnCustomName;
  return CHAMPS[champId]?.name ?? champId;
}

export type PawnForm = 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen';
export type GadgetId = 'buckler' | 'hooves' | 'lance' | 'spear' | 'crown';

export interface PawnStage {
  form: PawnForm;
  gadgets: GadgetId[];
}

/** Maps power level 1-11 to the Pawn's current form + cumulative gadgets. */
export function pawnStage(power: number): PawnStage {
  const p = Math.max(1, Math.min(11, power));
  if (p <= 2) return { form: 'pawn',   gadgets: [] };
  if (p <= 4) return { form: 'pawn',   gadgets: ['buckler'] };
  if (p <= 6) return { form: 'knight', gadgets: ['buckler', 'hooves'] };
  if (p <= 8) return { form: 'bishop', gadgets: ['buckler', 'hooves', 'lance'] };
  if (p <= 10) return { form: 'rook',  gadgets: ['buckler', 'hooves', 'lance', 'spear'] };
  return { form: 'queen', gadgets: ['buckler', 'hooves', 'lance', 'spear', 'crown'] };
}

const GADGET_NAME: Record<GadgetId, string> = {
  buckler: 'Battle Buckler',
  hooves:  'Twin Hooves',
  lance:   'Diagonal Lance',
  spear:   'Tower Spear',
  crown:   'Royal Crown',
};

/**
 * Returns the new PawnStage if crossing a morph threshold between oldPower and
 * newPower, otherwise null. Drives the EVOLVED! cutscene.
 */
export function crossedPawnMorph(oldPower: number, newPower: number): (PawnStage & { newGadget?: GadgetId }) | null {
  const before = pawnStage(oldPower);
  const after  = pawnStage(newPower);
  if (before.form === after.form && before.gadgets.length === after.gadgets.length) return null;
  const newGadget = after.gadgets.find((g) => !before.gadgets.includes(g));
  return { ...after, newGadget };
}

export function gadgetName(id: GadgetId): string {
  return GADGET_NAME[id];
}
