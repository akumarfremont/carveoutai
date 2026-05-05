import OpenAI from "openai";

export const GPT_MODEL = "gpt-4o";

let client: OpenAI | null = null;
function getClient() {
  if (!client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export async function streamGPT(args: {
  system: string;
  userMessage: string;
  maxTokens?: number;
}): Promise<ReadableStream<Uint8Array>> {
  const { system, userMessage, maxTokens = 2048 } = args;
  const openai = getClient();
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        const stream = await openai.chat.completions.create({
          model: GPT_MODEL,
          max_tokens: maxTokens,
          stream: true,
          messages: [
            { role: "system", content: system },
            { role: "user", content: userMessage },
          ],
        });
        for await (const part of stream) {
          const text = part.choices[0]?.delta?.content ?? "";
          if (text) controller.enqueue(encoder.encode(text));
        }
        controller.close();
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Unknown error from GPT";
        controller.enqueue(encoder.encode(`\n\n[stream error: ${msg}]`));
        controller.close();
      }
    },
  });
}
