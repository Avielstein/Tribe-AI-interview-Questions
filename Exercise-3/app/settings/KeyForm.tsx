"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnFilled, btnOutlined, card, field } from "@/components/ui";
import type { KeyStatusView } from "@/lib/ai/key";

const STATUS_LABEL: Record<KeyStatusView["status"], { text: string; className: string }> = {
  VALID: { text: "Working", className: "bg-success-container text-on-success-container" },
  UNVERIFIED: { text: "Not checked yet", className: "bg-surface-container-high text-on-surface-variant" },
  INVALID: { text: "Rejected", className: "bg-error-container text-on-error-container" },
  MISSING: { text: "No key", className: "bg-warning-container text-on-warning-container" },
};

const SOURCE_LABEL = { ui: "Saved here", env: "From ANTHROPIC_API_KEY", none: "None" };

export default function KeyForm({ initial }: { initial: KeyStatusView }) {
  const router = useRouter();
  const [status, setStatus] = useState(initial);
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState<"save" | "remove" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function send(method: "PUT" | "DELETE") {
    setBusy(method === "PUT" ? "save" : "remove");
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
      if (method === "PUT") {
        setNotice(
          data.resumed > 0
            ? `Key verified and saved. Re-running AI analysis for ${data.resumed} intake${data.resumed === 1 ? "" : "s"} that were waiting on a key.`
            : "Key verified and saved.",
        );
      } else {
        setNotice("Key removed.");
      }
      router.refresh(); // update the site-wide banner
    } catch {
      setError("Couldn't reach the server. Check that the app is running and try again.");
    } finally {
      setBusy(null);
    }
  }

  const label = STATUS_LABEL[status.status];

  return (
    <div className="mt-6 space-y-6">
      {status.mode !== "live" && (
        <p className="rounded-xl bg-info-container px-4 py-3 text-sm text-on-info-container">
          LLM_MODE is <code>{status.mode}</code>, so the app isn&apos;t calling Claude right now. The key below is
          used once LLM_MODE is <code>live</code>.
        </p>
      )}

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
      </section>

      <form
        className={`p-4 ${card}`}
        onSubmit={(e) => {
          e.preventDefault();
          send("PUT");
        }}
      >
        <label htmlFor="apiKey" className="text-base font-medium">
          {status.last4 ? "Replace key" : "Add a key"}
        </label>
        <p className="mt-1 text-sm text-on-surface-variant">
          We check the key with Anthropic before saving. It&apos;s stored in the local database and never sent back
          to the browser.
        </p>
        <input
          id="apiKey"
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder="sk-ant-..."
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          disabled={busy !== null}
          className={`mt-3 font-mono ${field(!!error)}`}
        />
        {error && (
          <p role="alert" className="mt-2 text-sm text-error">
            {error}
          </p>
        )}
        {notice && <p className="mt-2 text-sm text-success">{notice}</p>}
        <div className="mt-3 flex gap-2">
          <button
            type="submit"
            disabled={busy !== null || !apiKey.trim()}
            className={btnFilled}
          >
            {busy === "save" ? "Verifying with Anthropic…" : "Verify & save"}
          </button>
          {status.source === "ui" && (
            <button
              type="button"
              onClick={() => send("DELETE")}
              disabled={busy !== null}
              className={btnOutlined}
            >
              {busy === "remove" ? "Removing…" : "Remove saved key"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
