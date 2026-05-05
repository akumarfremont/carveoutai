/**
 * Pre-build hook: ensure data/chunks.json exists and is fresh.
 *
 * - If data/chunks.json is missing OR older than data/raw_chunks.json,
 *   run the embedder. Otherwise skip.
 * - Requires OPENAI_API_KEY in the environment when embedding.
 *
 * Wired up via package.json `prebuild`.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const RAW = path.join(process.cwd(), "data", "raw_chunks.json");
const OUT = path.join(process.cwd(), "data", "chunks.json");

if (!fs.existsSync(RAW)) {
  console.log("[maybe-embed] no data/raw_chunks.json — skipping.");
  process.exit(0);
}

const rawMtime = fs.statSync(RAW).mtimeMs;
const outExists = fs.existsSync(OUT);
const outMtime = outExists ? fs.statSync(OUT).mtimeMs : 0;

if (outExists && outMtime >= rawMtime) {
  console.log("[maybe-embed] data/chunks.json is fresh — skipping embed.");
  process.exit(0);
}

if (!process.env.OPENAI_API_KEY) {
  console.warn(
    "[maybe-embed] OPENAI_API_KEY not set; cannot embed. App will run with an empty knowledge base until you set the key and re-run the build."
  );
  process.exit(0);
}

console.log("[maybe-embed] data/chunks.json missing or stale — embedding…");
const r = spawnSync("pnpm", ["tsx", "scripts/embed-all.ts"], {
  stdio: "inherit",
  shell: false,
});
process.exit(r.status ?? 1);
