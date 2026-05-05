import Anthropic from "@anthropic-ai/sdk";

export const CLAUDE_MODEL = "claude-sonnet-4-5";

let client: Anthropic | null = null;
function getClient() {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export async function streamClaude(args: {
  system: string;
  userMessage: string;
  maxTokens?: number;
}): Promise<ReadableStream<Uint8Array>> {
  const { system, userMessage, maxTokens = 2048 } = args;
  const anthropic = getClient();
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        const stream = anthropic.messages.stream({
          model: CLAUDE_MODEL,
          max_tokens: maxTokens,
          system,
          messages: [{ role: "user", content: userMessage }],
        });
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Unknown error from Claude";
        controller.enqueue(encoder.encode(`\n\n[stream error: ${msg}]`));
        controller.close();
      }
    },
  });
}
