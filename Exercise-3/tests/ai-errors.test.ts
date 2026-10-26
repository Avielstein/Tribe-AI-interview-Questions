import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { classifyError, TriageError } from "@/lib/ai/errors";

// Build the same typed errors the SDK throws for a given HTTP response.
function apiError(status: number, type: string) {
  return Anthropic.APIError.generate(status, { type: "error", error: { type, message: "x" } }, "x", new Headers());
}

describe("classifyError", () => {
  it.each([
    [401, "authentication_error", "auth"],
    [402, "billing_error", "billing"],
    [403, "permission_error", "permission"],
    [404, "not_found_error", "model"],
    [429, "rate_limit_error", "rate_limit"],
    [500, "api_error", "overloaded"],
    [529, "overloaded_error", "overloaded"],
  ])("HTTP %i (%s) -> %s", (status, type, code) => {
    expect(classifyError(apiError(status, type)).code).toBe(code);
  });

  it("treats an expired or revoked key as a key problem that retrying won't fix", () => {
    const c = classifyError(apiError(401, "authentication_error"));
    expect(c).toMatchObject({ keyProblem: true, retryable: false });
    expect(c.message).toMatch(/Settings/);
  });

  it("treats rate limits and outages as retryable, not a key problem", () => {
    for (const err of [apiError(429, "rate_limit_error"), apiError(529, "overloaded_error")]) {
      expect(classifyError(err)).toMatchObject({ keyProblem: false, retryable: true });
    }
  });

  it("classifies connection failures and timeouts as network", () => {
    expect(classifyError(new Anthropic.APIConnectionError({ message: "down" })).code).toBe("network");
    expect(classifyError(new Anthropic.APIConnectionTimeoutError()).code).toBe("network");
  });

  it("passes our own errors through with their message", () => {
    expect(classifyError(new TriageError("refusal", "nope"))).toMatchObject({ code: "refusal", message: "nope" });
  });

  it("never leaks raw error text for unknown errors", () => {
    const c = classifyError(new Error("secret internal detail sk-ant-abc"));
    expect(c.code).toBe("unknown");
    expect(c.message).not.toMatch(/secret|sk-ant/);
  });
});
