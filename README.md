# SDU — Sharp Diligence Unit

A judgment training game for finance professionals. Mobile-first web app
themed as a Law & Order procedural. Players are investigators on a Diligence
Unit; each case is a deal under investigation, inspired by real failed
transactions but anonymized.

The structural hook: every case opens with an AI diligence agent's analysis.
The player's job is to decide whether to follow it or override it. Override
rate is the headline metric — it's the muscle that agents can't replace.

## Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS — Source Serif 4, Inter, JetBrains Mono, Times New Roman
- Player state in `localStorage` (no backend in v1)

## Run it

```bash
pnpm install
pnpm dev    # http://localhost:3000
```

## Audio

Cold-open audio lives in `public/audio/`:

- `voiceover.mp3` — generated on ElevenLabs (deep masculine voice)
- `dun-dun.mp3` — sourced from Freesound or Pixabay

See `public/audio/README.md`. The cold open plays its visuals regardless;
audio is a graceful enhancement.

## Cases

Case 1 (single-stage, Inflated EBITDA) and Case 4 (two-stage, Earnout Gambit)
are fully written in `lib/cases.ts`. Cases 2, 3, 5, 6, 7, 8 are placeholders —
their tiles render in the dashboard with the title visible and play disabled
("Case file pending. Check back soon.") until copy is provided.

## Routes

- `/` — splash + signup (or redirect for returning players)
- `/dashboard` — investigator's case board
- `/case/[id]` — full case flow (cold open → stages → reveal)
- `/intro` — replay the cold open

## Metrics

- **Calibration**: per-decision log score, normalized to 0–100. Counts both
  stages of two-stage cases.
- **Override rate**: stage-1 only, across cases that have an agent
  recommendation. Override accuracy = % of overrides that were correct or
  defensible.
