import { db } from "@/lib/db";
import { toDTO } from "@/lib/intake";

export async function GET(_req: Request, ctx: RouteContext<"/api/intakes/[id]">) {
  const { id } = await ctx.params;
  const intake = await db.intake.findUnique({ where: { id } });
  if (!intake) return Response.json({ error: "Intake not found." }, { status: 404 });
  return Response.json(toDTO(intake));
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/intakes/[id]">) {
  const { id } = await ctx.params;
  const { count } = await db.intake.deleteMany({ where: { id } });
  if (count === 0) return Response.json({ error: "Intake not found. It may already have been deleted." }, { status: 404 });
  return new Response(null, { status: 204 });
}
