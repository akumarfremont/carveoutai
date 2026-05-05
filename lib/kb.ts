import fs from "node:fs";
import path from "node:path";
import { cosineSim, embed } from "./embeddings";
import type { Citation, EmbeddedChunk } from "./types";

const CHUNKS_PATH = path.join(process.cwd(), "data", "chunks.json");

let cache: EmbeddedChunk[] | null = null;

export function loadChunks(): EmbeddedChunk[] {
  if (cache) return cache;
  if (!fs.existsSync(CHUNKS_PATH)) {
    console.warn(
      `[kb] ${CHUNKS_PATH} not found. Run \`pnpm embed\` after providing API keys to build the knowledge base.`
    );
    cache = [];
    return cache;
  }
  const raw = fs.readFileSync(CHUNKS_PATH, "utf-8");
  cache = JSON.parse(raw) as EmbeddedChunk[];
  return cache;
}

export interface SearchResult {
  chunk: EmbeddedChunk;
  score: number;
}

export async function searchKB(
  query: string,
  topK = 12,
  firmFilter?: string[]
): Promise<SearchResult[]> {
  const chunks = loadChunks();
  if (chunks.length === 0) return [];
  const qVec = await embed(query);
  const filtered = firmFilter
    ? chunks.filter((c) => firmFilter.includes(c.firm))
    : chunks;
  const scored = filtered.map((chunk) => ({
    chunk,
    score: cosineSim(qVec, chunk.embedding),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

export function buildContextBlock(results: SearchResult[]): string {
  return results
    .map(
      (r, i) =>
        `[${i + 1}] ${r.chunk.firm} — ${r.chunk.title}, p. ${r.chunk.page}\n${r.chunk.text}`
    )
    .join("\n\n---\n\n");
}

export function resultsToCitations(results: SearchResult[]): Citation[] {
  return results.map((r, i) => ({
    index: i + 1,
    firm: r.chunk.firm,
    title: r.chunk.title,
    page: r.chunk.page,
    excerpt: r.chunk.text.slice(0, 220).replace(/\s+/g, " ").trim() + "…",
  }));
}

export function knowledgeBaseSummary() {
  const chunks = loadChunks();
  const byFirm: Record<string, number> = {};
  for (const c of chunks) byFirm[c.firm] = (byFirm[c.firm] ?? 0) + 1;
  return { total: chunks.length, byFirm };
}
