/**
 * Ingest the Deloitte carve-out guide PDF.
 *
 * Place the PDF at: data/source-pdfs/deloitte.pdf
 * Then run:        pnpm ingest:deloitte
 *
 * What it does:
 *   1. Extracts text page-by-page with pdf-parse.
 *   2. Chunks each page (~600 tokens, 80-token overlap).
 *   3. Tags every chunk with firm=Deloitte and the page number.
 *   4. Appends to data/raw_chunks.json (de-duping any prior Deloitte entries).
 *   5. Re-runs embedding for the new Deloitte chunks and merges into data/chunks.json.
 *
 * Re-run this any time you update the Deloitte PDF.
 */
import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";
import type { EmbeddedChunk, RawChunk } from "../lib/types";

// pdf-parse has no published types; require it dynamically.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse: (b: Buffer) => Promise<{ text: string; numpages: number }> =
  require("pdf-parse");

const PDF_PATH = path.join(process.cwd(), "data", "source-pdfs", "deloitte.pdf");
const RAW_PATH = path.join(process.cwd(), "data", "raw_chunks.json");
const OUT_PATH = path.join(process.cwd(), "data", "chunks.json");
const MODEL = "text-embedding-3-small";

const FIRM = "Deloitte";
const TITLE = "Deloitte Carve-out Financial Statements Guide";
const YEAR = "2025";

const CHUNK_WORDS = 460; // ~600 tokens
const OVERLAP_WORDS = 60;

async function main() {
  if (!fs.existsSync(PDF_PATH)) {
    console.error(`Missing PDF: ${PDF_PATH}`);
    console.error(
      "Place the Deloitte carve-out guide PDF at that path, then re-run."
    );
    process.exit(1);
  }
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is not set. Add it to .env.local first.");
    process.exit(1);
  }

  console.log(`Reading ${PDF_PATH}…`);
  const buf = fs.readFileSync(PDF_PATH);
  const parsed = await pdfParse(buf);
  // pdf-parse returns the whole document as one string. We approximate page
  // boundaries by splitting on form feed characters; if absent, distribute
  // chunks across pages by length.
  const pages = splitIntoPages(parsed.text, parsed.numpages);
  console.log(`Pages: ${pages.length}`);

  const newChunks: RawChunk[] = [];
  pages.forEach((pageText, idx) => {
    const pageNum = idx + 1;
    const chunks = chunkText(pageText);
    chunks.forEach((text, ci) => {
      newChunks.push({
        id: `deloitte-p${pageNum}-c${ci}`,
        firm: FIRM,
        title: TITLE,
        year: YEAR,
        page: pageNum,
        chunk_index: ci,
        source_file: "deloitte.pdf",
        category: "big4",
        text,
      });
    });
  });
  console.log(`Created ${newChunks.length} Deloitte chunks.`);

  // Update raw_chunks.json (drop any existing Deloitte entries first)
  const raw: RawChunk[] = fs.existsSync(RAW_PATH)
    ? JSON.parse(fs.readFileSync(RAW_PATH, "utf-8"))
    : [];
  const others = raw.filter((c) => c.firm !== FIRM);
  const updatedRaw = [...others, ...newChunks];
  fs.writeFileSync(RAW_PATH, JSON.stringify(updatedRaw, null, 2));
  console.log(`Wrote ${RAW_PATH} (${updatedRaw.length} total chunks).`);

  // Update chunks.json: keep non-Deloitte entries as-is, embed new Deloitte
  const existingEmbedded: EmbeddedChunk[] = fs.existsSync(OUT_PATH)
    ? JSON.parse(fs.readFileSync(OUT_PATH, "utf-8"))
    : [];
  const keep = existingEmbedded.filter((c) => c.firm !== FIRM);

  console.log(`Embedding ${newChunks.length} new Deloitte chunks with ${MODEL}…`);
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const BATCH = 64;
  const newEmbedded: EmbeddedChunk[] = [];
  for (let i = 0; i < newChunks.length; i += BATCH) {
    const slice = newChunks.slice(i, i + BATCH);
    const res = await openai.embeddings.create({
      model: MODEL,
      input: slice.map((c) => c.text),
    });
    res.data.forEach((d, j) => {
      newEmbedded.push({ ...slice[j], embedding: d.embedding });
    });
    process.stdout.write(`  ${newEmbedded.length}/${newChunks.length}\r`);
  }
  process.stdout.write("\n");

  const merged = [...keep, ...newEmbedded];
  fs.writeFileSync(OUT_PATH, JSON.stringify(merged));
  console.log(`Wrote ${OUT_PATH} — ${merged.length} total embedded chunks.`);
}

function splitIntoPages(text: string, numpages: number): string[] {
  if (text.includes("\f")) {
    return text.split("\f");
  }
  // Fallback: chop the text into roughly equal pieces by page count.
  const total = text.length;
  const per = Math.ceil(total / numpages);
  const out: string[] = [];
  for (let i = 0; i < numpages; i++) {
    out.push(text.slice(i * per, (i + 1) * per));
  }
  return out;
}

function chunkText(text: string): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  if (words.length <= CHUNK_WORDS) return [words.join(" ")];
  const out: string[] = [];
  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + CHUNK_WORDS, words.length);
    out.push(words.slice(start, end).join(" "));
    if (end >= words.length) break;
    start = end - OVERLAP_WORDS;
  }
  return out;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
