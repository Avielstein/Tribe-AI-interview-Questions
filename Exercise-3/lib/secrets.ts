import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Encryption at rest for secrets stored in the database (the Claude API key).
// AES-256-GCM with a random 12-byte IV per value; the GCM tag detects tampering
// or a wrong master key. The master key lives in APP_ENCRYPTION_KEY, never in the DB.
//
// Stored format: "enc:v1:" + base64(iv | tag | ciphertext)

const PREFIX = "enc:v1:";
const AAD = Buffer.from("llm_settings.api_key"); // binds the ciphertext to this one field

export type MasterKey = { ok: true; key: Buffer } | { ok: false; reason: "missing" | "invalid" };

/** Read and check APP_ENCRYPTION_KEY: 32 bytes, base64. Generate one with `npm run gen:secret`. */
export function readMasterKey(raw = process.env.APP_ENCRYPTION_KEY): MasterKey {
  const value = raw?.trim();
  if (!value) return { ok: false, reason: "missing" };
  const key = Buffer.from(value, "base64");
  return key.length === 32 ? { ok: true, key } : { ok: false, reason: "invalid" };
}

export const MASTER_KEY_HELP: Record<"missing" | "invalid", string> = {
  missing:
    "Saving a key in the app needs APP_ENCRYPTION_KEY, so the key is encrypted in the database. Run `npm run gen:secret`, add the result to .env as APP_ENCRYPTION_KEY, and restart. Or set ANTHROPIC_API_KEY in .env instead.",
  invalid:
    "APP_ENCRYPTION_KEY must be 32 random bytes, base64-encoded. Generate one with `npm run gen:secret`, put it in .env, and restart.",
};

export function encryptSecret(plaintext: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(AAD);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return PREFIX + Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64");
}

export function isEncrypted(stored: string): boolean {
  return stored.startsWith(PREFIX);
}

/** Throws if the value was tampered with or was encrypted under a different master key. */
export function decryptSecret(stored: string, key: Buffer): string {
  if (!isEncrypted(stored)) throw new Error("Value is not encrypted.");
  const raw = Buffer.from(stored.slice(PREFIX.length), "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const ciphertext = raw.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAAD(AAD);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
