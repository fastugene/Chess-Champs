'use client';

import { ChampArt } from './ChampArt';
import { gadgetName, pawnFormMeta, type GadgetId, type PawnForm } from '@/progression/champs';

const FORM_NAME: Record<PawnForm, string> = {
  pawn:   'Scrapper',
  knight: 'Scrapper the Knight',
  bishop: 'Scrapper the Bishop',
  rook:   'Scrapper the Rook',
  queen:  'Scrapper the Queen',
};

export function EvolveCutscene({
  form,
  gadgets,
  newGadget,
  pawnXp,
  pawnCustomName,
  onDone,
}: {
  form: PawnForm;
  gadgets: GadgetId[];
  newGadget?: GadgetId;
  /** Raw pawnXp after the power-up (used to render the correct form + level). */
  pawnXp: number;
  pawnCustomName?: string;
  onDone: () => void;
}) {
  const champName = pawnCustomName
    ? form === 'pawn' ? pawnCustomName : `${pawnCustomName} the ${capitalize(form)}`
    : FORM_NAME[form];

  const formChanged = form !== 'pawn';

  return (
    <div className="overlay evolve-overlay" onClick={onDone}>
      <div className="evolve-cutscene">
        <div className="evolve-burst" />
        <div className="evolve-label">EVOLVED!</div>
        <div className="evolve-champ float-anim">
          <ChampArt champId="pawn" size={140} power={pawnXp} showGlow />
        </div>
        <div className="evolve-name">{champName}</div>
        <div className="evolve-power">{pawnFormMeta(form).emoji} {pawnFormMeta(form).label} Form!</div>
        {newGadget && (
          <div className="evolve-gadget">
            <span className="evolve-gadget-label">New gadget unlocked!</span>
            <span className="evolve-gadget-name">{gadgetName(newGadget)}</span>
          </div>
        )}
        {formChanged && (
          <div className="evolve-form-change">
            Scrapper transformed into a <strong>{capitalize(form)}</strong>!
          </div>
        )}
        <div className="evolve-tap">Tap to continue</div>
      </div>
    </div>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
