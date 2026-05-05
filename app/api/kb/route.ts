import { knowledgeBaseSummary } from "@/lib/kb";

export const runtime = "nodejs";

export async function GET() {
  return Response.json(knowledgeBaseSummary());
}
