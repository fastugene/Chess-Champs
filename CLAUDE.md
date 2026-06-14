# Chess Champs — CLAUDE.md

A mobile-first chess adventure PWA for a dad's 9-year-old son. The son's playtest reactions outrank this document and any of Claude's instincts — always prioritise his feedback first.

---

## Stack

- **Next.js 15 (App Router) + TypeScript** — project root IS the Next app
- **chess.js** — all rules, move generation, FEN
- **Zustand** — all in-game state (`src/state/gameStore.ts`)
- **idb-keyval** — progress/persistence (IndexedDB + localStorage fallback)
- **Web Audio API** — all sound effects synthesised live (`src/audio/sfx.ts`); no audio library
- **ElevenLabs pre-rendered mp3s** — announcer voiceover (`public/audio/`, `src/audio/speech.ts`)
- **SVG** — all art is inline code-drawn SVG, no image files (except audio)

## Hard constraints — never break these

- **No accounts, no network calls at runtime, no ads, no data collection** — 100% offline-capable once installed
- **No external fonts or images** — system font stack + inline SVG only
- **Losing is always growth-framed** — never punishing; loss XP is a thing
- **Hidden parent settings page** — don't expose to the kid UI
- **No gacha/loot-box mechanics** — all rewards are deterministic and earned

## Commands

```bash
npm run dev       # dev server (localhost:3000)
npm run typecheck # tsc --noEmit — run after every code change
npm run build     # production build
```

Always run `npm run typecheck` after edits to confirm clean compilation.

---

## Project structure

```
src/
  app/              # Next.js routes: / (home), /play
  audio/
    sfx.ts          # Web Audio synth — move/capture/reward/kill-streak sounds
    speech.ts       # ElevenLabs announcer — FILE_MAP + new Audio() playback
  chess/
    attacks.ts      # PIECE_VALUE, attack grid helpers
    tactics/
      detect.ts     # Real-time tactic detection (fork, win-material, checkmate)
    hints.ts
  components/
    board/          # Board.tsx, Piece.tsx — SVG board + pieces
    celebrate/      # Celebration.tsx — reward ladder animations
    champs/         # ChampArt.tsx (piece-hero SVG), ChampCard.tsx
    play/           # Hud.tsx, LessonCard.tsx, RecapCard.tsx
  curriculum/
    levels.ts       # Campaign levels (Phase 1: Level 1 only)
  engine/
    bot.ts          # In-app minimax bot (Phase 1)
    engineClient.ts # getBotMove() interface (Phase 2: swap to Stockfish WASM)
    difficulty.ts   # Band configs: rookie/easy/medium/hard
  haptics/
    haptics.ts      # navigator.vibrate patterns
  persistence/
    progress.ts     # idb-keyval read/write
  progression/
    champs.ts       # CHAMPS roster, Champ interface, RARITY_COLOR
  state/
    gameStore.ts    # Zustand store — the single source of truth for a game
  app/
    globals.css     # All CSS — animations, celebration keyframes, theme vars
```

---

## Champs (collectible characters)

Three piece-shaped heroes in Phase 1. Each owns the tactic it performs in real chess:

| id | Name | Tactic | Rarity | Color |
|---|---|---|---|---|
| `pawn` | Scrapper the Pawn | Safety / win-material | Common | `#2f86ff` |
| `knight` | Forkmane the Knight | Fork | Rare | `#18c85f` |
| `queen` | Finisher the Queen | Checkmate | Epic | `#ffc21f` |

Champs are defined in `src/progression/champs.ts`. Each has a `lesson` field (1–2 lines, kid-voice) shown at every tactic celebration and on character cards.

---

## Tactic detection (`src/chess/tactics/detect.ts`)

`detectPlayerEvents(afterFen, move)` runs after every player move and returns `TacticEvent[]`.

Reward tiers: `micro` (quiet capture) → `minor` (free kill / worth it) → `major` (fork, big capture) → `epic` (checkmate).

**Detection bias: conservative.** A missed celebration is a shrug; a false one is toxic. When unsure, don't fire.

---

## Sound architecture

- **Web Audio synth** (`sfx.ts`): move, capture, check, reward, win, lose, powerup, and `playKillStreak(level)` — escalating arpeggio per kill-streak tier
- **ElevenLabs announcer** (`speech.ts`): 9 fixed phrases as mp3 files in `public/audio/`. Phrase → slug via `FILE_MAP`. Stop current clip before playing next.
- **Never suggest Web Speech API or Azure TTS** — Web Speech API voices on Windows are robotic SAPI5; Azure TTS was evaluated and rejected as too complex.
- To add a new announcer phrase: generate it on ElevenLabs, drop `slug.mp3` in `public/audio/`, add `'Phrase text': 'slug'` to `FILE_MAP` in `speech.ts`.

---

## Kill-streak system

Consecutive captures escalate:

| Streak | Label | Voice |
|---|---|---|
| 2 | DOUBLE KILL! | "Double Kill!" |
| 3 | TRIPLE KILL! | "Triple Kill!" |
| 4 | MEGA KILL! | "Mega Kill!" |
| 5 | UNSTOPPABLE! | "Unstoppable!" |
| 6+ | RAMPAGE! | "Rampage!" |

A non-capturing move resets the streak. Wired in `gameStore.ts` → `afterPlayerMove`.

---

## Phase status

- **Phase 1 — DONE:** board, bot, Level 1, 3 Champs, tactic celebrations, sound/haptics, ElevenLabs announcer voice
- **Phase 2 — next:** Stockfish WASM + auto-calibration to 55–65% win band, 3-star + XP chapter-unlock progression, full 30-level campaign, ranks/badges, full tactic detection
- **Phase 3 — later:** animation polish, PWA install flow, offline precache, hidden parent settings page, 3-beat comic recap

---

## Design principles

- **Every tactic is a Champ** — recognition and reward are fused into the collectible meta
- **55–65% win band** — bot calibrates to keep the son winning more than losing without feeling the floor
- **Reward ladder** — everything good gets love, sized to how good it is; bad trades never get cheered
- **Learning at the dopamine moment** — lessons shown exactly when the tactic fires, not in a menu
- **No eval bars ever** — Socratic hints only (Phase 2)
