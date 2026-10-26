import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, isEncrypted, readMasterKey } from "@/lib/secrets";

const key = randomBytes(32);
const secret = "sk-ant-api03-example-secret-value-1234";

describe("encryptSecret / decryptSecret", () => {
  it("round-trips and never stores the plain text", () => {
    const stored = encryptSecret(secret, key);
    expect(isEncrypted(stored)).toBe(true);
    expect(stored).not.toContain(secret);
    expect(stored).not.toContain("1234");
    expect(decryptSecret(stored, key)).toBe(secret);
  });

  it("uses a fresh IV each time, so the same key never encrypts the same way twice", () => {
    expect(encryptSecret(secret, key)).not.toBe(encryptSecret(secret, key));
  });

  it("rejects a different master key", () => {
    expect(() => decryptSecret(encryptSecret(secret, key), randomBytes(32))).toThrow();
  });

  it("rejects a tampered value", () => {
    const stored = encryptSecret(secret, key);
    const raw = Buffer.from(stored.slice("enc:v1:".length), "base64");
    raw[raw.length - 1] ^= 1; // flip one bit of the ciphertext
    expect(() => decryptSecret("enc:v1:" + raw.toString("base64"), key)).toThrow();
  });

  it("treats legacy plain-text values as not encrypted", () => {
    expect(isEncrypted(secret)).toBe(false);
  });
});

describe("readMasterKey", () => {
  it("accepts 32 bytes of base64", () => {
    expect(readMasterKey(randomBytes(32).toString("base64")).ok).toBe(true);
  });

  it("reports a missing or malformed key", () => {
    expect(readMasterKey(undefined)).toEqual({ ok: false, reason: "missing" });
    expect(readMasterKey("  ")).toEqual({ ok: false, reason: "missing" });
    expect(readMasterKey("too-short")).toEqual({ ok: false, reason: "invalid" });
    expect(readMasterKey(randomBytes(16).toString("base64"))).toEqual({ ok: false, reason: "invalid" });
  });
});
