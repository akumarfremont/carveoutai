import { NextRequest } from "next/server";
import {
  buildContextBlock,
  resultsToCitations,
  searchKB,
} from "@/lib/kb";
import { RESEARCH_SYSTEM } from "@/lib/prompts";
import { streamClaude } from "@/lib/claude";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { question, firm } = (await req.json()) as {
    question?: string;
    firm?: string;
  };
  if (!question || question.trim().length < 3) {
    return Response.json({ error: "Question is required" }, { status: 400 });
  }

  const firmFilter =
    firm && firm !== "All" ? [firm] : undefined;
  const results = await searchKB(question, 12, firmFilter);
  const citations = resultsToCitations(results);
  const context = buildContextBlock(results);

  const userMessage = `QUESTION:
${question}

SOURCE EXCERPTS:
${context}

Answer the question using only these excerpts. Cite with [1], [2], etc. matching the bracketed numbers above.`;

  const stream = await streamClaude({
    system: RESEARCH_SYSTEM,
    userMessage,
    maxTokens: 2048,
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Citations": Buffer.from(JSON.stringify(citations)).toString("base64"),
      "Cache-Control": "no-store",
    },
  });
}
