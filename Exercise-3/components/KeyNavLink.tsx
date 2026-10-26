import Link from "next/link";
import { connection } from "next/server";
import { getKeyStatus, type KeyStatusView } from "@/lib/ai/key";

const DOT: Record<KeyStatusView["status"], { className: string; label: string }> = {
  VALID: { className: "bg-success", label: "key working" },
  UNVERIFIED: { className: "bg-warning", label: "key not checked yet" },
  INVALID: { className: "bg-error", label: "key rejected" },
  MISSING: { className: "bg-error", label: "no key set" },
};

/** Key icon linking to the API key page, with a status badge (dot). */
export function KeyLink({ status }: { status?: KeyStatusView["status"] }) {
  const dot = status ? DOT[status] : null;
  const label = dot ? `API key settings (${dot.label})` : "API key settings";
  return (
    <Link
      href="/settings"
      aria-label={label}
      title={dot ? `API key: ${dot.label}` : "API key"}
      className="relative rounded-full p-2 text-on-surface-variant hover:bg-on-surface/10 hover:text-on-surface"
    >
      {/* Material "key" icon */}
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
        <path d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
      </svg>
      {dot && (
        <span
          aria-hidden="true"
          className={`absolute right-1 top-1 h-2.5 w-2.5 rounded-full ring-2 ring-surface-container-low ${dot.className}`}
        />
      )}
    </Link>
  );
}

/** Reads the current key status at request time; render inside <Suspense fallback={<KeyLink />}>. */
export default async function KeyNavLink() {
  await connection();
  const { status } = await getKeyStatus();
  return <KeyLink status={status} />;
}
