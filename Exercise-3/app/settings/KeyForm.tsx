"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnDanger, btnFilled, btnOutlined, btnText, card, field } from "@/components/ui";
import type { KeyStatusView } from "@/lib/ai/key";

const STATUS_LABEL: Record<KeyStatusView["status"], { text: string; className: string }> = {
  VALID: { text: "Working", className: "bg-success-container text-on-success-container" },
  UNVERIFIED: { text: "Not checked yet", className: "bg-surface-container-high text-on-surface-variant" },
  INVALID: { text: "Rejected", className: "bg-error-container text-on-error-container" },
  MISSING: { text: "No key", className: "bg-warning-container text-on-warning-container" },
};

const SOURCE_LABEL = { ui: "Saved in the app", env: "ANTHROPIC_API_KEY in .env", none: "None" };

/**
 * One card at a time: "Add a key" when there's no key (or while replacing one),
 * otherwise "Current key" with Replace and Delete.
 */
export default function KeyForm({ initial }: { initial: KeyStatusView }) {
  const router = useRouter();
  const [status, setStatus] = useState(initial);
  const [apiKey, setApiKey] = useState("");
  const [replacing, setReplacing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState<"save" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function send(method: "PUT" | "DELETE") {
    setBusy(method === "PUT" ? "save" : "delete");
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/settings/llm", {
        method,
        headers: { "Content-Type": "application/json" },
        body: method === "PUT" ? JSON.stringify({ apiKey }) : undefined,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Try again.");
        return;
      }
      setStatus(data);
      setApiKey("");
      setReplacing(false);
      setConfirmingDelete(false);
      if (method === "PUT") {
        setNotice(
          data.resumed > 0
            ? `Key verified and saved. Re-running AI analysis for ${data.resumed} intake${data.resumed === 1 ? "" : "s"} that were waiting on a key.`
            : "Key verified and saved.",
        );
      } else {
        setNotice(data.source === "env" ? "Key deleted. Now using ANTHROPIC_API_KEY from .env." : "Key deleted.");
      }
      router.refresh(); // update the header dot and the site-wide banner
    } catch {
      setError("Couldn't reach the server. Check that the app is running and try again.");
    } finally {
      setBusy(null);
    }
  }

  const showForm = status.status === "MISSING" || replacing;
  const label = STATUS_LABEL[status.status];

  return (
    <div className="mt-6 space-y-6">
      {status.mode !== "live" && (
        <p className="rounded-xl bg-info-container px-4 py-3 text-sm text-on-info-container">
          LLM_MODE is <code>{status.mode}</code>, so the app isn&apos;t calling Claude right now. The key is used once
          LLM_MODE is <code>live</code>.
        </p>
      )}

      {notice && (
        <p role="status" className="rounded-xl bg-success-container px-4 py-3 text-sm text-on-success-container">
          {notice}
        </p>
      )}

      {showForm ? (
        <form
          className={`p-4 ${card}`}
          onSubmit={(e) => {
            e.preventDefault();
            send("PUT");
          }}
        >
          <label htmlFor="apiKey" className="text-base font-medium">
            {replacing ? "Replace key" : "Add a key"}
          </label>
          <p className="mt-1 text-sm text-on-surface-variant">
            We check the key with Anthropic before saving. It&apos;s encrypted in the local database and never sent
            back to the browser.
          </p>
          {!status.canSaveInApp && (
            <p className="mt-3 rounded-xl bg-warning-container px-4 py-3 text-sm text-on-warning-container">
              {status.saveBlockedReason}
            </p>
          )}
          <input
            id="apiKey"
            type="password"
            autoComplete="off"
            spellCheck={false}
            autoFocus={replacing}
            placeholder="sk-ant-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            disabled={busy !== null || !status.canSaveInApp}
            className={`mt-3 font-mono ${field(!!error)}`}
          />
          {error && (
            <p role="alert" className="mt-2 text-sm text-error">
              {error}
            </p>
          )}
          <div className="mt-4 flex gap-2">
            <button type="submit" disabled={busy !== null || !apiKey.trim() || !status.canSaveInApp} className={btnFilled}>
              {busy === "save" ? "Verifying with Anthropic…" : "Verify & save"}
            </button>
            {replacing && (
              <button
                type="button"
                onClick={() => {
                  setReplacing(false);
                  setApiKey("");
                  setError(null);
                }}
                disabled={busy !== null}
                className={btnText}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      ) : (
        <section className={`p-4 ${card}`}>
          <h2 className="text-base font-medium">Current key</h2>
          <dl className="mt-3 grid grid-cols-[8rem_1fr] gap-y-2 text-sm">
            <dt className="text-on-surface-variant">Status</dt>
            <dd>
              <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${label.className}`}>{label.text}</span>
            </dd>
            <dt className="text-on-surface-variant">Key</dt>
            <dd className="font-mono">{status.last4 ? `sk-ant-…${status.last4}` : "—"}</dd>
            <dt className="text-on-surface-variant">Source</dt>
            <dd>{SOURCE_LABEL[status.source ?? "none"]}</dd>
            <dt className="text-on-surface-variant">Model</dt>
            <dd className="font-mono">{status.model}</dd>
            {status.checkedAt && (
              <>
                <dt className="text-on-surface-variant">Last checked</dt>
                <dd>{new Date(status.checkedAt).toLocaleString()}</dd>
              </>
            )}
          </dl>
          {status.error && <p className="mt-3 text-sm text-error">{status.error}</p>}

          {confirmingDelete ? (
            <div role="alert" className="mt-4 rounded-xl bg-error-container p-4 text-sm text-on-error-container">
              <p className="font-medium">Delete this key?</p>
              <p className="mt-1">
                AI analysis pauses until you add another key. New intakes are still saved and will be analyzed once
                you do.
              </p>
              {error && <p className="mt-2">{error}</p>}
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => send("DELETE")} disabled={busy !== null} className={btnDanger}>
                  {busy === "delete" ? "Deleting…" : "Delete key"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmingDelete(false);
                    setError(null);
                  }}
                  disabled={busy !== null}
                  className={btnText}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setReplacing(true);
                  setNotice(null);
                  setError(null);
                }}
                className={btnOutlined}
              >
                Replace key
              </button>
              {status.source === "ui" ? (
                <button
                  type="button"
                  onClick={() => {
                    setConfirmingDelete(true);
                    setNotice(null);
                  }}
                  className="inline-flex h-10 items-center rounded-full px-4 text-sm font-medium text-error hover:bg-error/10"
                >
                  Delete key
                </button>
              ) : (
                <p className="text-xs text-on-surface-variant">
                  This key comes from <code>ANTHROPIC_API_KEY</code> in <code>.env</code>. To delete it, remove it there
                  and restart the app.
                </p>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
