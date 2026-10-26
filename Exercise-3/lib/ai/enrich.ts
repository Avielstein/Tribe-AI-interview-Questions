import { db } from "@/lib/db";
import { llmMode } from "./config";
import { classifyError, KEY_ERROR_CODES, TriageError } from "./errors";
import { markKeyInvalid, markKeyValid, resolveKey } from "./key";
import { generateTriage } from "./triage";

/**
 * Run the AI triage for one intake and store the result. Never throws: any failure
 * is recorded on the intake (FAILED + a user-facing message) so the UI can show it.
 * The intake may be deleted while this runs, so writes use updateMany (a no-op if it's gone).
 */
export async function enrichIntake(id: string): Promise<void> {
  await db.intake.updateMany({
    where: { id },
    data: { aiStatus: "PENDING", aiError: null, aiErrorCode: null, aiAttempts: { increment: 1 } },
  });
  const intake = await db.intake.findUnique({ where: { id } });
  if (!intake) return;

  const live = llmMode() === "live";
  try {
    let key: string | null = null;
    if (live) {
      key = (await resolveKey()).key;
      const s = await db.llmSettings.findUnique({ where: { id: 1 } });
      // A key that already got a 401/402/403 won't recover on its own; don't call the API again with it.
      if (key && s?.keyStatus === "INVALID") {
        throw new TriageError("auth", s.keyError ?? "The Claude API key was rejected. Update it in Settings.");
      }
    }

    const triage = await generateTriage(intake, key);
    await db.intake.updateMany({
      where: { id },
      data: { aiStatus: "COMPLETE", summary: triage.summary, tags: triage.tags, risks: triage.risks },
    });
    if (live) await markKeyValid();
  } catch (err) {
    const c = classifyError(err);
    if (c.code !== "unknown") console.warn(`[ai] intake ${id}: ${c.code}`);
    else console.error(`[ai] intake ${id}: unexpected error`, err);

    if (live && c.keyProblem && c.code !== "no_key") await markKeyInvalid(c);
    await db.intake.updateMany({
      where: { id },
      data: { aiStatus: "FAILED", aiError: c.message, aiErrorCode: c.code },
    });
  }
}

/** After a new key is saved, re-run intakes that failed only because of the old key. */
export async function resumeKeyBlockedIntakes(): Promise<number> {
  const blocked = await db.intake.findMany({
    where: { aiStatus: "FAILED", aiErrorCode: { in: KEY_ERROR_CODES } },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  // Mark them pending up front so the UI shows progress immediately.
  await db.intake.updateMany({
    where: { id: { in: blocked.map((b) => b.id) } },
    data: { aiStatus: "PENDING", aiError: null, aiErrorCode: null },
  });
  for (const { id } of blocked) await enrichIntake(id);
  return blocked.length;
}

export async function countKeyBlockedIntakes(): Promise<number> {
  return db.intake.count({ where: { aiStatus: "FAILED", aiErrorCode: { in: KEY_ERROR_CODES } } });
}
