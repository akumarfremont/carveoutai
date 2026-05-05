/**
 * Chunk a PDF (no embedding) and merge it into data/raw_chunks.json.
 * Embedding happens later via `pnpm embed`.
 *
 * Usage:
 *   pnpm tsx scripts/chunk-pdf.ts <firm> <pdf-filename> [title] [year]
 *
 * Examples:
 *   pnpm tsx scripts/chunk-pdf.ts Deloitte deloitte.pdf "Deloitte Carve-out Guide" 2025
 *   pnpm tsx scripts/chunk-pdf.ts PwC pwc.pdf
 */
import fs from "node:fs";
import path from "node:path";
import type { RawChunk } from "../lib/types";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse: (b: Buffer) => Promise<{ text: string; numpages: number }> =
  require("pdf-parse");

const RAW_PATH = path.join(process.cwd(), "data", "raw_chunks.json");

const CHUNK_WORDS = 460;
const OVERLAP_WORDS = 60;

async function main() {
  const [, , firm, file, titleArg, yearArg] = process.argv;
  if (!firm || !file) {
    console.error("Usage: tsx scripts/chunk-pdf.ts <Firm> <file.pdf> [title] [year]");
    process.exit(1);
  }
  const pdfPath = path.join(process.cwd(), "data", "source-pdfs", file);
  if (!fs.existsSync(pdfPath)) {
    console.error(`Missing PDF: ${pdfPath}`);
    process.exit(1);
  }
  const title = titleArg ?? `${firm} Carve-out Guide`;
  const year = yearArg ?? "2025";

  console.log(`Reading ${pdfPath}…`);
  const buf = fs.readFileSync(pdfPath);
  const parsed = await pdfParse(buf);
  const pages = splitIntoPages(parsed.text, parsed.numpages);
  console.log(`Pages: ${pages.length}`);

  const newChunks: RawChunk[] = [];
  pages.forEach((pageText, idx) => {
    const pageNum = idx + 1;
    const chunks = chunkText(pageText);
    chunks.forEach((text, ci) => {
      newChunks.push({
        id: `${firm.toLowerCase()}-p${pageNum}-c${ci}`,
        firm,
        title,
        year,
        page: pageNum,
        chunk_index: ci,
        source_file: file,
        category: "big4",
        text,
      });
    });
  });
  console.log(`Created ${newChunks.length} ${firm} chunks.`);

  const raw: RawChunk[] = fs.existsSync(RAW_PATH)
    ? JSON.parse(fs.readFileSync(RAW_PATH, "utf-8"))
    : [];
  const others = raw.filter((c) => c.firm !== firm);
  const updated = [...others, ...newChunks];
  fs.writeFileSync(RAW_PATH, JSON.stringify(updated, null, 2));

  const byFirm: Record<string, number> = {};
  for (const c of updated) byFirm[c.firm] = (byFirm[c.firm] ?? 0) + 1;
  console.log(`Wrote ${RAW_PATH} (${updated.length} chunks total).`);
  console.log("By firm:", byFirm);
  console.log("\nNext: run `pnpm embed` to (re)build embeddings into data/chunks.json.");
}

function splitIntoPages(text: string, numpages: number): string[] {
  if (text.includes("\f")) return text.split("\f");
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
