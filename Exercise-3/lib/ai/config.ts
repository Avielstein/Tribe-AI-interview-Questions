export type LlmMode = "live" | "mock" | "fail";

// live: call Claude | mock: canned triage, no key needed | fail: always error (demo the error state)
export function llmMode(): LlmMode {
  const mode = process.env.LLM_MODE ?? "live";
  return mode === "mock" || mode === "fail" ? mode : "live";
}

export const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";
