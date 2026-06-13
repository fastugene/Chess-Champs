# Changelog

All notable changes to Chess Champs, by checkpoint.

## [Phase 1] — Playable core

The first playtestable slice.

### Added
- **Project scaffold**: Next.js (App Router) + TypeScript, mobile-first PWA shell,
  web manifest, app icon, Vercel-ready.
- **Interactive board**: responsive SVG board with tap-to-select / tap-to-move,
  legal-move dots, last-move and check highlights, board flips for the player's colour.
- **Chess core**: `chess.js`-backed rules with a Zustand game store driving turns,
  status (check/checkmate/stalemate/draw), and material tracking.
- **Opponent**: a self-contained, kid-tuned negamax bot with difficulty "bands"
  (depth + a human-like blunder rate so it leaves free pieces to practise on).
  Lives behind a `getBotMove()` interface so Stockfish (WASM) can slot in next phase.
- **Real-time tactic detection (taste of the killer feature)**: clean
  winning-material ("Free Real Estate!") and a conservative fork detector, with an
  in-the-moment celebration burst. Built to be conservative (a missed cheer beats a
  false one).
- **Champs**: 3 finished collectible mascots (Bulwark, Forkfang, Finisher) drawn from
  a shared SVG construction kit — the early art gut-check.
- **Level 1 end-to-end**: home (1-tap PLAY) → mentor lesson card (with read-aloud) →
  game vs the bot → growth-framed recap with a Champ power-up and XP.
- **Juice**: Web Audio sound effects (move/capture/reward/win/lose), vibration
  haptics, celebration confetti, pop/rise animations.
- **Hints**: a budgeted, Socratic hint that asks a guiding question (never blurts the move).
- **Progress**: saved on-device (IndexedDB with a localStorage fallback).

### Notes / known limits (intentional for this phase)
- Pawn promotion auto-queens for now (promotion picker comes later).
- Only Level 1 exists; higher levels fall back to it until the full campaign (Phase 2).
- Opponent is the in-app search; Stockfish WASM + 55–65% auto-calibration is Phase 2.
- PWA install flow + full offline precache + parent page are Phase 3.
