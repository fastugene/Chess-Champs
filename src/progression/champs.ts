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
 * The 5 morph forms in order, and the round pawnXp milestone where each unlocks.
 * +1 pawnXp per safe capture → a new form every 50 grabs. Kid-readable: "50 to
 * become a Knight!". Queen (the top form) lands near the end of the campaign.
 */
export const PAWN_FORM_ORDER: readonly PawnForm[] = ['pawn', 'knight', 'bishop', 'rook', 'queen'];
export const PAWN_FORM_XP: readonly number[] = [0, 50, 100, 150, 200];

/** One signature gadget per form, gained on that morph (cumulative across forms). */
const FORM_GADGET: Record<PawnForm, GadgetId> = {
  pawn:   'buckler',
  knight: 'hooves',
  bishop: 'lance',
  rook:   'spear',
  queen:  'crown',
};

/** Returns the current form index (1–5) from raw accumulated pawnXp. */
export function pawnFormIndex(xp: number): number {
  for (let i = PAWN_FORM_XP.length - 1; i >= 0; i--) {
    if (xp >= PAWN_FORM_XP[i]) return i + 1;
  }
  return 1;
}

/** Returns 0–1 progress toward the next form (for the XP bar fill). */
export function pawnXpProgress(xp: number): number {
  const idx = pawnFormIndex(xp);
  if (idx >= PAWN_FORM_XP.length) return 1;
  const start = PAWN_FORM_XP[idx - 1];
  const end = PAWN_FORM_XP[idx];
  return (xp - start) / (end - start);
}

/** Maps raw pawnXp to the Pawn's current form + cumulative gadgets. */
export function pawnStage(xp: number): PawnStage {
  const idx = pawnFormIndex(xp);
  const form = PAWN_FORM_ORDER[idx - 1];
  const gadgets = PAWN_FORM_ORDER.slice(0, idx).map((f) => FORM_GADGET[f]);
  return { form, gadgets };
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

/** Display label + emoji for each pawn form, for the roadmap track. */
const FORM_META: Record<PawnForm, { label: string; emoji: string }> = {
  pawn:   { label: 'Pawn',   emoji: '🛡️' },
  knight: { label: 'Knight', emoji: '🐴' },
  bishop: { label: 'Bishop', emoji: '🏹' },
  rook:   { label: 'Rook',   emoji: '🗼' },
  queen:  { label: 'Queen',  emoji: '👑' },
};

export function pawnFormMeta(form: PawnForm): { label: string; emoji: string } {
  return FORM_META[form];
}

export interface PawnFormStop {
  form: PawnForm;
  /** Form index (1–5) at which this form appears. */
  atLevel: number;
  /** Cumulative pawnXp needed to reach this form. */
  atXp: number;
}

/**
 * The ordered morph roadmap: each form with the index + pawnXp where it unlocks.
 * One source of truth shared by the roadmap UI and the "Next:" label.
 */
export function pawnForms(): PawnFormStop[] {
  return PAWN_FORM_ORDER.map((form, i) => ({ form, atLevel: i + 1, atXp: PAWN_FORM_XP[i] }));
}

/** The next form the pawn will morph into, or null if already at the final form. */
export function nextPawnForm(xp: number): PawnFormStop | null {
  const current = pawnStage(xp).form;
  const stops = pawnForms();
  const idx = stops.findIndex((s) => s.form === current);
  return stops[idx + 1] ?? null;
}
