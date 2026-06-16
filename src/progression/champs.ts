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

/**
 * Cumulative pawnXp needed to reach each power level (index i → power i+1).
 * Calibrated so Queen form (power 11) is only reached near the end of the
 * 30-level campaign (~90 games at ~2 win-material events/game = ~180 total).
 *
 * Morph targets: Buckler ≈ Ch1/2 boundary, Knight ≈ Ch3, Bishop ≈ Ch5,
 * Rook ≈ Ch7, Queen ≈ Ch8 end.
 */
export const PAWN_THRESHOLDS: readonly number[] = [0, 18, 38, 58, 76, 94, 112, 130, 148, 166, 180];

/** Returns the visual power level (1–11) from raw accumulated pawnXp. */
export function pawnXpToLevel(xp: number): number {
  for (let i = PAWN_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= PAWN_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

/** Returns 0–1 progress within the current power level (for the XP bar fill). */
export function pawnXpProgress(xp: number): number {
  const level = pawnXpToLevel(xp);
  if (level >= 11) return 1;
  const start = PAWN_THRESHOLDS[level - 1];
  const end = PAWN_THRESHOLDS[level];
  return (xp - start) / (end - start);
}

/** Maps raw pawnXp to the Pawn's current form + cumulative gadgets. */
export function pawnStage(xp: number): PawnStage {
  const level = pawnXpToLevel(xp);
  if (level <= 2) return { form: 'pawn',   gadgets: [] };
  if (level <= 4) return { form: 'pawn',   gadgets: ['buckler'] };
  if (level <= 6) return { form: 'knight', gadgets: ['buckler', 'hooves'] };
  if (level <= 8) return { form: 'bishop', gadgets: ['buckler', 'hooves', 'lance'] };
  if (level <= 10) return { form: 'rook',  gadgets: ['buckler', 'hooves', 'lance', 'spear'] };
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
 * Returns the new PawnStage if a morph threshold was crossed between oldXp and
 * newXp (both raw pawnXp values), otherwise null. Drives the EVOLVED! cutscene.
 */
export function crossedPawnMorph(oldXp: number, newXp: number): (PawnStage & { newGadget?: GadgetId }) | null {
  const before = pawnStage(oldXp);
  const after  = pawnStage(newXp);
  if (before.form === after.form && before.gadgets.length === after.gadgets.length) return null;
  const newGadget = after.gadgets.find((g) => !before.gadgets.includes(g));
  return { ...after, newGadget };
}

export function gadgetName(id: GadgetId): string {
  return GADGET_NAME[id];
}
