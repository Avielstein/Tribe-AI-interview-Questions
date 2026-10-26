import { after } from "next/server";
import { enrichIntake } from "@/lib/ai/enrich";
import { db } from "@/lib/db";
import { fieldErrors, IntakeInputSchema, toDTO, toIntakeRecord } from "@/lib/intake";

export async function GET() {
  const rows = await db.intake.findMany({ orderBy: { createdAt: "desc" } });
  return Response.json(rows.map(toDTO));
}

/** Save the intake immediately, then run the AI triage after the response is sent. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = IntakeInputSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return Response.json(
      { error: "Some fields need attention.", fieldErrors: fieldErrors(parsed.error) },
      { status: 400 },
    );
  }

  const intake = await db.intake.create({ data: toIntakeRecord(parsed.data) });
  after(() => enrichIntake(intake.id));
  return Response.json(toDTO(intake), { status: 201 });
}
