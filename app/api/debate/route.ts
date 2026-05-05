import { NextRequest } from "next/server";
import {
  buildContextBlock,
  resultsToCitations,
  searchKB,
} from "@/lib/kb";
import { PERSONAS, debateTurnPrompt } from "@/lib/prompts";
import { streamClaude } from "@/lib/claude";
import { streamGPT } from "@/lib/openai";
import type { PersonaId } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface DebateBody {
  topic: string;
  speaker: PersonaId;
  opponent: PersonaId;
  role: "opening" | "rebuttal" | "synthesis";
  prior: { speaker: string; text: string }[];
}

// Models per persona — Claude for the regulator/auditor lens, GPT for the preparer.
const PERSONA_MODELS: Record<PersonaId, "claude" | "gpt"> = {
  sec_reviewer: "claude",
  external_auditor: "claude",
  preparer: "gpt",
};

export async function POST(req: NextRequest) {
  const body = (await req.json()) as DebateBody;
  const { topic, speaker, opponent, role, prior } = body;
  if (!topic || !speaker || !opponent || !role) {
    return Response.json(
      { error: "topic, speaker, opponent, role required" },
      { status: 400 }
    );
  }
  const persona = PERSONAS[speaker];
  if (!persona) {
    return Response.json({ error: "Unknown persona" }, { status: 400 });
  }

  const results = await searchKB(topic, 10);
  const citations = resultsToCitations(results);
  const context = buildContextBlock(results);

  const userMessage = debateTurnPrompt({
    topic,
    context,
    prior: prior ?? [],
    role,
    opponentName: PERSONAS[opponent].name,
  });

  const provider = PERSONA_MODELS[speaker];
  const stream =
    provider === "claude"
      ? await streamClaude({
          system: persona.system,
          userMessage,
          maxTokens: 1200,
        })
      : await streamGPT({
          system: persona.system,
          userMessage,
          maxTokens: 1200,
        });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Citations": Buffer.from(JSON.stringify(citations)).toString("base64"),
      "Cache-Control": "no-store",
    },
  });
}
