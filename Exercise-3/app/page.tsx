"use client";

import Link from "next/link";
import DeleteIntakeButton from "@/components/DeleteIntakeButton";
import { card, chip, errorBox } from "@/components/ui";
import NewIntakeButton from "@/components/NewIntakeButton";
import StatusBadge from "@/components/StatusBadge";
import type { IntakeDTO } from "@/lib/intake";
import { usePolledJson } from "@/lib/usePolledJson";

export default function IntakeListPage() {
  const { state, reload, setState } = usePolledJson<IntakeDTO[]>("/api/intakes", (rows) =>
    rows.some((r) => r.aiStatus === "PENDING" && !r.stalled),
  );

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] leading-9">Intakes</h1>
          <p className="mt-1 text-sm text-on-surface-variant">Inbound project requests, newest first.</p>
        </div>
        <NewIntakeButton />
      </div>

      <div className="mt-6">
        {state.status === "loading" && (
          <ul className="space-y-3" aria-label="Loading intakes">
            {[0, 1, 2].map((i) => (
              <li key={i} className="h-24 animate-pulse rounded-xl bg-surface-container" />
            ))}
          </ul>
        )}

        {state.status === "error" && (
          <div role="alert" className={errorBox}>
            <p>Couldn&apos;t load intakes. {state.message}</p>
            <button onClick={reload} className="mt-2 font-medium underline">
              Try again
            </button>
          </div>
        )}

        {state.status === "ready" && state.data.length === 0 && (
          <div className="rounded-xl border border-dashed border-outline-variant p-10 text-center">
            <p className="font-medium">No intakes yet</p>
            <p className="mt-1 text-sm text-on-surface-variant">
              Log your first inbound request and Claude will summarize it, tag it, and flag risks.
            </p>
            <div className="mt-4">
              <NewIntakeButton label="Create the first intake" />
            </div>
          </div>
        )}

        {state.status === "ready" && state.data.length > 0 && (
          <ul className="space-y-3">
            {state.data.map((intake) => (
              <li key={intake.id} className="relative">
                <Link
                  href={`/intakes/${intake.id}`}
                  className={`block p-4 pb-10 transition hover:bg-surface-container-low ${card}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="font-medium">{intake.title}</h2>
                    <StatusBadge intake={intake} />
                  </div>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    {intake.industry} · {intake.budgetRange} · {intake.timeline} ·{" "}
                    {new Date(intake.createdAt).toLocaleDateString()}
                  </p>
                  {intake.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {intake.tags.map((t) => (
                        <span key={t} className={chip}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
                {/* Outside the link: a button can't be nested inside an <a>. */}
                <div className="absolute bottom-1 right-1">
                  <DeleteIntakeButton
                    id={intake.id}
                    title={intake.title}
                    onDeleted={() =>
                      setState((prev) =>
                        prev.status === "ready" ? { ...prev, data: prev.data.filter((r) => r.id !== intake.id) } : prev,
                      )
                    }
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
