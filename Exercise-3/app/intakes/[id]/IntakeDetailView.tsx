"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import DeleteIntakeButton from "@/components/DeleteIntakeButton";
import StatusBadge from "@/components/StatusBadge";
import { btnFilled, btnOutlined, card, chip, errorBox } from "@/components/ui";
import { KEY_ERROR_CODES, type AiErrorCode } from "@/lib/ai/codes";
import type { IntakeDTO } from "@/lib/intake";
import { usePolledJson } from "@/lib/usePolledJson";

export default function IntakeDetailView() {
  const { id } = useParams<{ id: string }>();
  const { state, setState } = usePolledJson<IntakeDTO>(`/api/intakes/${id}`, (i) => i.aiStatus === "PENDING" && !i.stalled);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <Link href="/" className="text-sm text-on-surface-variant hover:text-on-surface">
        ← All intakes
      </Link>

      {state.status === "loading" && <DetailSkeleton />}

      {state.status === "error" && (
        <div role="alert" className={`mt-4 ${errorBox}`}>
          {state.notFound ? "This intake doesn't exist. It may have been deleted, or the link is wrong." : state.message}
        </div>
      )}

      {state.status === "ready" && (
        <IntakeDetail intake={state.data} onUpdate={(data) => setState({ status: "ready", data })} />
      )}
    </main>
  );
}

function IntakeDetail({ intake, onUpdate }: { intake: IntakeDTO; onUpdate: (i: IntakeDTO) => void }) {
  const router = useRouter();
  return (
    <article className="mt-2">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-[28px] leading-9">{intake.title}</h1>
        <div className="flex shrink-0 items-center gap-1">
          <StatusBadge intake={intake} />
          <DeleteIntakeButton id={intake.id} title={intake.title} onDeleted={() => router.replace("/")} />
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-[7rem_1fr] gap-y-1 text-sm">
        <dt className="text-on-surface-variant">Industry</dt>
        <dd>{intake.industry}</dd>
        <dt className="text-on-surface-variant">Budget</dt>
        <dd>{intake.budgetRange}</dd>
        <dt className="text-on-surface-variant">Timeline</dt>
        <dd>{intake.timeline}</dd>
        <dt className="text-on-surface-variant">Created</dt>
        <dd>{new Date(intake.createdAt).toLocaleString()}</dd>
      </dl>

      <section className="mt-6">
        <h2 className="text-base font-medium">Description</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-on-surface">{intake.description}</p>
      </section>

      <section className={`mt-6 bg-surface-container-low p-4 ${card}`}>
        <h2 className="text-base font-medium">AI triage</h2>
        <AiSection intake={intake} onUpdate={onUpdate} />
      </section>
    </article>
  );
}

function AiSection({ intake, onUpdate }: { intake: IntakeDTO; onUpdate: (i: IntakeDTO) => void }) {
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  async function retry() {
    setRetrying(true);
    setRetryError(null);
    try {
      const res = await fetch(`/api/intakes/${intake.id}/retry`, { method: "POST" });
      const body = await res.json().catch(() => null);
      if (!res.ok) setRetryError(body?.error ?? "Couldn't start the retry. Try again.");
      else onUpdate(body); // now PENDING, which restarts polling
    } catch {
      setRetryError("Couldn't reach the server. Try again.");
    } finally {
      setRetrying(false);
    }
  }

  if (intake.aiStatus === "PENDING" && !intake.stalled) {
    return (
      <div className="mt-3 space-y-2" aria-live="polite">
        <p className="text-sm text-on-surface-variant">Claude is reading the request. This usually takes a few seconds…</p>
        <div className="h-4 w-full animate-pulse rounded bg-surface-container-high" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-surface-container-high" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-surface-container-high" />
      </div>
    );
  }

  if (intake.aiStatus === "COMPLETE") {
    return (
      <div className="mt-3 space-y-4 text-sm">
        <p>{intake.summary}</p>
        <div className="flex flex-wrap gap-1">
          {intake.tags.map((t) => (
            <span key={t} className={chip}>
              {t}
            </span>
          ))}
        </div>
        <div>
          <h3 className="font-medium">Risk checklist</h3>
          <ul className="mt-2 space-y-1">
            {intake.risks.map((r) => (
              <li key={r} className="flex gap-2">
                <span aria-hidden className="text-outline">☐</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  // FAILED, or PENDING for too long (e.g. the server restarted mid-call).
  const keyProblem = KEY_ERROR_CODES.includes(intake.aiErrorCode as AiErrorCode);
  const message = intake.stalled
    ? "The AI analysis is taking much longer than expected and may have stopped. Retry to start it again."
    : (intake.aiError ?? "The AI analysis failed.");

  return (
    <div role="alert" className={`mt-3 ${errorBox}`}>
      <p>{message}</p>
      <p className="mt-1 opacity-80">The intake itself is saved; only the AI analysis is missing.</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {keyProblem ? (
          <Link href="/settings" className={btnFilled}>
            Update API key
          </Link>
        ) : null}
        <button
          onClick={retry}
          disabled={retrying}
          className={btnOutlined}
        >
          {retrying ? "Retrying…" : "Retry analysis"}
        </button>
      </div>
      {keyProblem && (
        <p className="mt-2 text-xs opacity-80">Saving a working key re-runs this automatically.</p>
      )}
      {retryError && <p className="mt-2">{retryError}</p>}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="mt-4 space-y-3" aria-label="Loading intake">
      <div className="h-8 w-2/3 animate-pulse rounded bg-surface-container-high" />
      <div className="h-24 animate-pulse rounded bg-surface-container-high" />
    </div>
  );
}
