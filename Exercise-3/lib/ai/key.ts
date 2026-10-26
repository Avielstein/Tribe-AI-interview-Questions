import { db } from "@/lib/db";
import { decryptSecret, encryptSecret, isEncrypted, MASTER_KEY_HELP, readMasterKey } from "@/lib/secrets";
import { llmMode, MODEL, type LlmMode } from "./config";
import { classifyError, type ClassifiedError } from "./errors";
import { verifyKey } from "./triage";

export type KeySource = "ui" | "env" | null;

/** What the UI is allowed to see. Never includes the key itself. */
export interface KeyStatusView {
  mode: LlmMode;
  model: string;
  source: KeySource;
  last4: string | null;
  status: "UNVERIFIED" | "VALID" | "INVALID" | "MISSING";
  error: string | null;
  checkedAt: string | null;
  /** False when APP_ENCRYPTION_KEY is missing or invalid: the app won't store a key it can't encrypt. */
  canSaveInApp: boolean;
  saveBlockedReason: string | null;
}

function settings() {
  return db.llmSettings.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} });
}

const UNREADABLE =
  "The saved key can't be decrypted with the current APP_ENCRYPTION_KEY (was it changed?). Delete it and add the key again.";

/**
 * The key the app should use: one saved in the UI wins over ANTHROPIC_API_KEY.
 * Saved keys are encrypted at rest; a legacy plain-text key is encrypted the first time it's read.
 */
export async function resolveKey(): Promise<{ key: string | null; source: KeySource; unreadable?: boolean }> {
  const s = await settings();
  if (s.apiKey) {
    const master = readMasterKey();
    if (!isEncrypted(s.apiKey)) {
      if (master.ok) {
        await db.llmSettings.update({ where: { id: 1 }, data: { apiKey: encryptSecret(s.apiKey, master.key) } });
      }
      return { key: s.apiKey, source: "ui" };
    }
    if (!master.ok) return { key: null, source: "ui", unreadable: true };
    try {
      return { key: decryptSecret(s.apiKey, master.key), source: "ui" };
    } catch {
      return { key: null, source: "ui", unreadable: true };
    }
  }
  const env = process.env.ANTHROPIC_API_KEY?.trim();
  if (env) return { key: env, source: "env" };
  return { key: null, source: null };
}

export async function getKeyStatus(): Promise<KeyStatusView> {
  const s = await settings();
  const { key, source, unreadable } = await resolveKey();
  const master = readMasterKey();
  return {
    mode: llmMode(),
    model: MODEL,
    source,
    last4: key ? key.slice(-4) : null,
    status: unreadable ? "INVALID" : key ? s.keyStatus : "MISSING",
    error: unreadable ? UNREADABLE : key ? s.keyError : null,
    checkedAt: s.checkedAt?.toISOString() ?? null,
    canSaveInApp: master.ok,
    saveBlockedReason: master.ok ? null : MASTER_KEY_HELP[master.reason],
  };
}

export async function markKeyInvalid(err: ClassifiedError) {
  await db.llmSettings.update({
    where: { id: 1 },
    data: { keyStatus: "INVALID", keyError: err.message, checkedAt: new Date() },
  });
}

export async function markKeyValid() {
  const s = await settings();
  if (s.keyStatus === "VALID") return;
  await db.llmSettings.update({
    where: { id: 1 },
    data: { keyStatus: "VALID", keyError: null, checkedAt: new Date() },
  });
}

export type SaveKeyResult = { ok: true } | { ok: false; error: string; status: number };

/** Verify a key with Anthropic, and store it (encrypted) only if it works. */
export async function saveKey(raw: string): Promise<SaveKeyResult> {
  const master = readMasterKey();
  if (!master.ok) return { ok: false, status: 503, error: MASTER_KEY_HELP[master.reason] };

  const key = raw.trim();
  if (!key) return { ok: false, status: 400, error: "Paste an API key first." };
  if (/\s/.test(key) || !key.startsWith("sk-ant-")) {
    return { ok: false, status: 400, error: "That doesn't look like an Anthropic API key. Keys start with \"sk-ant-\"." };
  }

  try {
    await verifyKey(key);
  } catch (err) {
    const c = classifyError(err);
    if (c.code === "network") {
      return { ok: false, status: 502, error: "Couldn't reach Anthropic to verify the key. Check your connection and try again." };
    }
    if (c.code === "auth") return { ok: false, status: 422, error: "Anthropic rejected this key. Check it's copied correctly and hasn't been revoked." };
    return { ok: false, status: 422, error: c.message };
  }

  const apiKey = encryptSecret(key, master.key);
  await db.llmSettings.upsert({
    where: { id: 1 },
    create: { id: 1, apiKey, keyStatus: "VALID", checkedAt: new Date() },
    update: { apiKey, keyStatus: "VALID", keyError: null, checkedAt: new Date() },
  });
  return { ok: true };
}

/** Remove the UI key; the app falls back to ANTHROPIC_API_KEY if set. */
export async function clearKey() {
  await db.llmSettings.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: { apiKey: null, keyStatus: "UNVERIFIED", keyError: null, checkedAt: null },
  });
}
