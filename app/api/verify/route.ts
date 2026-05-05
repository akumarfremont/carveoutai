import { NextRequest } from "next/server";
import { VERIFY_SYSTEM } from "@/lib/prompts";
import { streamGPT } from "@/lib/openai";
import type { Citation } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface VerifyBody {
  question: string;
  answer: string;
  citations: Citation[];
}

export async function POST(req: NextRequest) {
  const { question, answer, citations } = (await req.json()) as VerifyBody;
  if (!question || !answer) {
    return Response.json(
      { error: "question and answer are required" },
      { status: 400 }
    );
  }

  const sourceBlock = (citations ?? [])
    .map(
      (c) =>
        `[${c.index}] ${c.firm} — ${c.title}, p. ${c.page}\nExcerpt: ${c.excerpt}`
    )
    .join("\n\n");

  const userMessage = `QUESTION:
${question}

SOURCE EXCERPTS PROVIDED TO THE ORIGINAL MODEL:
${sourceBlock}

ORIGINAL MODEL'S ANSWER:
${answer}

Now produce your structured critique in the four sections.`;

  const stream = await streamGPT({
    system: VERIFY_SYSTEM,
    userMessage,
    maxTokens: 1500,
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
