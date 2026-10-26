import Link from "next/link";
import { connection } from "next/server";
import { getKeyStatus } from "@/lib/ai/key";

/** Site-wide notice when AI analysis can't run because of the key. Intakes still save either way. */
export default async function KeyBanner() {
  await connection(); // key status changes at runtime; never prerender this
  const s = await getKeyStatus();
  if (s.mode !== "live" || (s.status !== "MISSING" && s.status !== "INVALID")) return null;

  const text =
    s.status === "MISSING"
      ? "AI analysis is paused: no Claude API key is set."
      : `AI analysis is paused: ${s.error ?? "the Claude API key was rejected."}`;

  return (
    <div role="alert" className="border-b border-warning/40 bg-warning-container px-4 py-2 text-sm text-on-warning-container">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2">
        <span>{text} New intakes are still saved and will be analyzed once a working key is added.</span>
        <Link href="/settings" className="font-medium underline">
          Update key
        </Link>
      </div>
    </div>
  );
}
