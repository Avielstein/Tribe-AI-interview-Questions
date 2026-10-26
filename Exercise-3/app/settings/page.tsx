import { connection } from "next/server";
import { Suspense } from "react";
import { getKeyStatus } from "@/lib/ai/key";
import KeyForm from "./KeyForm";

export default function SettingsPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="text-[28px] leading-9">Settings</h1>
      <p className="mt-1 text-sm text-on-surface-variant">
        The Claude API key used to generate each intake&apos;s summary, tags, and risk checklist.
      </p>
      <Suspense fallback={<p className="mt-6 text-sm text-on-surface-variant">Loading key status…</p>}>
        <KeySettings />
      </Suspense>
    </main>
  );
}

async function KeySettings() {
  await connection();
  return <KeyForm initial={await getKeyStatus()} />;
}
