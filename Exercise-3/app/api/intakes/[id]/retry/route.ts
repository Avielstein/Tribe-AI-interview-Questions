import { after } from "next/server";
import { enrichIntake } from "@/lib/ai/enrich";
import { db } from "@/lib/db";
import { toDTO } from "@/lib/intake";

/** Re-run the AI triage for one intake. */
export async function POST(_req: Request, ctx: RouteContext<"/api/intakes/[id]/retry">) {
  const { id } = await ctx.params;
  const intake = await db.intake.findUnique({ where: { id } });
  if (!intake) return Response.json({ error: "Intake not found." }, { status: 404 });
  if (intake.aiStatus === "PENDING" && !toDTO(intake).stalled) {
    return Response.json({ error: "AI analysis is already running for this intake." }, { status: 409 });
  }

  const pending = await db.intake.update({
    where: { id },
    data: { aiStatus: "PENDING", aiError: null, aiErrorCode: null },
  });
  after(() => enrichIntake(id));
  return Response.json(toDTO(pending), { status: 202 });
}
