/**
 * One-shot: read data/raw_chunks.json, embed every chunk with OpenAI,
 * write data/chunks.json. Run after you have OPENAI_API_KEY set.
 *
 *   pnpm embed
 */
import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";
import type { EmbeddedChunk, RawChunk } from "../lib/types";

const RAW_PATH = path.join(process.cwd(), "data", "raw_chunks.json");
const OUT_PATH = path.join(process.cwd(), "data", "chunks.json");
const MODEL = "text-embedding-3-small";
const BATCH = 64;

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is not set. Add it to .env.local first.");
    process.exit(1);
  }
  if (!fs.existsSync(RAW_PATH)) {
    console.error(`Missing ${RAW_PATH}.`);
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(RAW_PATH, "utf-8")) as RawChunk[];
  console.log(`Embedding ${raw.length} chunks with ${MODEL}…`);

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const out: EmbeddedChunk[] = [];

  for (let i = 0; i < raw.length; i += BATCH) {
    const slice = raw.slice(i, i + BATCH);
    const res = await openai.embeddings.create({
      model: MODEL,
      input: slice.map((c) => c.text),
    });
    res.data.forEach((d, j) => {
      out.push({ ...slice[j], embedding: d.embedding });
    });
    process.stdout.write(`  ${out.length}/${raw.length}\r`);
  }
  console.log(`\nWriting ${OUT_PATH}…`);
  fs.writeFileSync(OUT_PATH, JSON.stringify(out));
  const sizeMb = (fs.statSync(OUT_PATH).size / 1024 / 1024).toFixed(2);
  console.log(`Done. ${out.length} chunks, ${sizeMb} MB.`);

  // Summary
  const byFirm: Record<string, number> = {};
  for (const c of out) byFirm[c.firm] = (byFirm[c.firm] ?? 0) + 1;
  console.log("By firm:", byFirm);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
