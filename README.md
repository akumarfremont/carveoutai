# CarveoutAI

Carve-out financial statements research and debate, grounded in the four Big 4 carve-out guides (EY, KPMG, PwC, Deloitte).

Two features:

1. **Research** — Ask a carve-out question. Claude answers with inline citations to the firm and page. A "Verify with ChatGPT" button on the side runs GPT-4o as an independent reviewer; its critique slides in as a separate panel. The verification is opt-in, not automatic.
2. **Debate** — Pick two voices (SEC Reviewer, External Auditor, Carve-out Preparer) and a topic. Five turns of opening, rebuttal, and synthesis play out, every claim sourced from the guides.

No login. No saved data. Editorial / consulting visual style.

---

## Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS — Source Serif 4 + Inter
- Anthropic SDK (Claude Sonnet 4.5) for primary answers and the regulator/auditor personas
- OpenAI SDK (GPT-4o) for the verifier and the preparer persona
- Embeddings: `text-embedding-3-small` (OpenAI)
- Vector store: a single `data/chunks.json` loaded into memory at server start; brute-force cosine similarity (small dataset, sub-millisecond)

---

## Local setup

Prerequisites: Node 20+ and `pnpm` (or `npm`).

```bash
pnpm install
cp .env.local.example .env.local
# edit .env.local with your real ANTHROPIC_API_KEY and OPENAI_API_KEY
pnpm embed         # one-time: builds data/chunks.json from data/raw_chunks.json
pnpm dev           # http://localhost:3000
```

If you skip `pnpm embed`, the app still loads but Research and Debate will return empty source lists — the knowledge base is empty without it.

---

## Knowledge base

The repo ships with `data/raw_chunks.json` — 275 text chunks of EY (73), KPMG (188), and PwC (14), extracted from a prior ChromaDB instance. To use them you must run `pnpm embed` once, which writes `data/chunks.json` (text + embeddings) used by the app at runtime.

### Adding the Deloitte guide

The previous build only had a Deloitte summary. To bring the full guide in:

1. Save the PDF as **`data/source-pdfs/deloitte.pdf`**.
2. Run `pnpm ingest:deloitte`. This chunks the PDF, embeds each chunk, and merges them into `data/chunks.json`.

You can re-run that command whenever you swap in a newer copy of the guide.

### Re-ingesting EY / KPMG / PwC

The chunks shipped here came from a corrupted SQLite store, so PwC coverage in particular is thin (only ~14 chunks). If you have the original PDFs, drop them into `data/source-pdfs/` and adapt `scripts/ingest-deloitte.ts` (or ask Claude to add an `ingest-pwc.ts` etc.) to ingest them fresh.

---

## Deploy

The app is a single Next.js project. The simplest path is **Vercel**:

```bash
pnpm dlx vercel
# add ANTHROPIC_API_KEY and OPENAI_API_KEY in Project → Settings → Environment Variables
pnpm dlx vercel --prod
```

`data/chunks.json` is committed in production builds, so the knowledge base ships with the deploy.

---

## Project layout

```
app/
  layout.tsx              # Fonts, header, footer
  page.tsx                # Landing
  research/page.tsx       # Research tab
  debate/page.tsx         # Debate tab
  api/
    research/route.ts     # POST → Claude streams an answer + citations header
    verify/route.ts       # POST → GPT-4o critique stream
    debate/route.ts       # POST → next persona turn stream
    kb/route.ts           # GET → knowledge base summary
components/
  Citations.tsx
  RenderedAnswer.tsx
  VerificationPanel.tsx
lib/
  kb.ts                   # Loads chunks, search()
  embeddings.ts           # OpenAI embed + cosine similarity
  prompts.ts              # System prompts for Claude, GPT, personas
  claude.ts               # Streaming wrapper
  openai.ts               # Streaming wrapper
  types.ts
scripts/
  embed-all.ts            # One-shot embedder
  ingest-deloitte.ts      # Re-runnable Deloitte ingest
data/
  raw_chunks.json         # Text + metadata, no embeddings
  chunks.json             # Generated; text + metadata + embeddings
  source-pdfs/
    deloitte.pdf          # You put this here
```

---

## Notes

- Models are pinned in `lib/claude.ts` (`claude-sonnet-4-5`) and `lib/openai.ts` (`gpt-4o`). Bump them as new versions ship.
- The verifier prompt forces a four-section structured critique (`AGREES WITH`, `DISAGREES WITH`, `ADDS`, `CAVEATS`) which the right-side panel parses and renders.
- Persona system prompts live in `lib/prompts.ts`. Edit those to tune voice, scope, or citation style.
