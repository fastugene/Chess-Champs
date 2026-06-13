# ♟️ Chess Champs

A mobile-first chess **adventure** for kids — collect "Champs," climb the ranks, and
secretly build real chess strength. Built as an installable, offline-capable PWA.

> **100% free to run, zero API tokens.** The opponent, rules, art, and sound all run
> on the device. No accounts, no network calls in play, no ads, no data collection.

---

## Tech

- **Next.js (App Router) + TypeScript**
- **chess.js** for the rules
- **Zustand** for game state, **idb-keyval** (IndexedDB) for on-device progress
- Code-drawn **SVG** art (the Champs) and **Web Audio** synthesised sound — no asset files
- Opponent: a small kid-tuned search now; **Stockfish (WASM, Web Worker)** drops in
  behind the same `getBotMove()` interface in Phase 2.

## Run it locally

```bash
npm install
npm run dev
# open http://localhost:3000  (use your phone on the same network for the real feel)
```

Other scripts:

```bash
npm run build      # production build
npm run start      # serve the production build
npm run typecheck  # tsc --noEmit
```

## Deploy to Vercel

This is a standard Next.js app, so your existing Vercel + GitHub flow works:

1. Push this folder to a GitHub repo.
2. In Vercel: **New Project → Import** the repo. Framework preset auto-detects **Next.js**.
3. No environment variables are needed. Click **Deploy**.
4. Open the deployment on a phone and use **Add to Home Screen** to install it.

(Or from the CLI: `npx vercel` then `npx vercel --prod`.)

## Project layout

```
src/
  app/            routes: home (1-tap PLAY) + /play
  chess/          rules helpers, geometry, tactic detection, hints
  engine/         the opponent (bot + difficulty bands) behind getBotMove()
  curriculum/     level data (Level 1 ships in Phase 1)
  progression/    Champs (collectible mascots) + on-device progress
  components/      board/ champs/ celebrate/ play/
  audio/ haptics/ lib/   sound, vibration, speech
```

## Status

**Phase 1 — Playable core.** Board, kid-tuned opponent, Level 1 end-to-end,
real-time tactic celebrations (a taste of the killer feature), 3 finished Champs,
sound + haptics. See `CHANGELOG.md`.

The single most important input next is the **first playtest with the 9-year-old**:
what he loves and where he gets bored outranks everything.
