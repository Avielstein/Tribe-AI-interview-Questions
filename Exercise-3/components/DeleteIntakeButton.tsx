"use client";

import { useRef, useState } from "react";
import { btnDanger, btnText, field } from "./ui";

const CONFIRM_WORD = "delete";

/**
 * Trash-icon button that opens a confirmation dialog; the user must type "delete"
 * before the delete goes through. Calls `onDeleted` after the server confirms.
 */
export default function DeleteIntakeButton({
  id,
  title,
  onDeleted,
}: {
  id: string;
  title: string;
  onDeleted: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmed = typed.trim().toLowerCase() === CONFIRM_WORD;

  function open(e: React.MouseEvent) {
    // The icon sits on a clickable card; don't also open the intake.
    e.preventDefault();
    e.stopPropagation();
    setTyped("");
    setError(null);
    dialog.current?.showModal();
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (!confirmed) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/intakes/${id}`, { method: "DELETE" });
      // 404 means it's already gone, which is what the user wanted.
      if (!res.ok && res.status !== 404) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? `Couldn't delete the intake (error ${res.status}). Try again.`);
        return;
      }
      dialog.current?.close();
      onDeleted();
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label={`Delete "${title}"`}
        title="Delete"
        className="rounded-full p-2 text-on-surface-variant hover:bg-error/10 hover:text-error"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
        </svg>
      </button>

      <dialog
        ref={dialog}
        onClick={(e) => e.stopPropagation()}
        className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-[28px] bg-surface-container-high p-6 text-on-surface shadow-xl backdrop:bg-black/50"
      >
        <form onSubmit={confirm}>
          <h2 className="text-2xl">Delete this intake?</h2>
          <p className="mt-4 text-sm text-on-surface-variant">
            &ldquo;{title}&rdquo; and its AI triage will be permanently deleted. This can&apos;t be undone.
          </p>
          <label htmlFor={`confirm-${id}`} className="mt-4 block text-sm">
            Type <strong className="font-mono">{CONFIRM_WORD}</strong> to confirm.
          </label>
          <input
            id={`confirm-${id}`}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            disabled={deleting}
            autoComplete="off"
            spellCheck={false}
            className={`mt-1 font-mono ${field()}`}
          />
          {error && (
            <p role="alert" className="mt-3 text-sm text-error">
              {error}
            </p>
          )}
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              disabled={deleting}
              className={btnText}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!confirmed || deleting}
              className={btnDanger}
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
