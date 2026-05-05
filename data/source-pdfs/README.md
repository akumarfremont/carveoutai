# Drop carve-out guide PDFs here

This folder is where you put the source PDFs that the ingestion scripts read.

## Deloitte (priority)

Save the PDF as exactly:

```
data/source-pdfs/deloitte.pdf
```

Then run:

```
pnpm ingest:deloitte
```

That script chunks the PDF page-by-page, embeds each chunk, and merges them into `data/chunks.json` so Claude can cite from it.

## Other firms

If you re-supply the original EY / KPMG / PwC PDFs (the existing chunks come from a corrupted ChromaDB and PwC coverage in particular is thin), drop them here and ask me to add `ingest-ey.ts` / `ingest-kpmg.ts` / `ingest-pwc.ts` modeled on `ingest-deloitte.ts`.
