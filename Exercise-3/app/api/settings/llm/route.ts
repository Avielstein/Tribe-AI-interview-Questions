import { after } from "next/server";
import { countKeyBlockedIntakes, resumeKeyBlockedIntakes } from "@/lib/ai/enrich";
import { clearKey, getKeyStatus, saveKey } from "@/lib/ai/key";

export async function GET() {
  return Response.json(await getKeyStatus());
}

/** Verify and save a new Claude API key, then resume intakes that were waiting on one. */
export async function PUT(request: Request) {
  const body = await request.json().catch(() => null);
  const apiKey = typeof body?.apiKey === "string" ? body.apiKey : "";

  const result = await saveKey(apiKey);
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });

  const resumed = await countKeyBlockedIntakes();
  if (resumed > 0) after(() => resumeKeyBlockedIntakes());
  return Response.json({ ...(await getKeyStatus()), resumed });
}

export async function DELETE() {
  await clearKey();
  return Response.json(await getKeyStatus());
}
