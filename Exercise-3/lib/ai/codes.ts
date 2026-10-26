// No SDK imports here: this file is also used in the browser.

export type AiErrorCode =
  | "no_key" // no key configured
  | "auth" // key invalid, expired, or revoked (401)
  | "billing" // key's account is out of credits (402)
  | "permission" // key not allowed to use this model (403)
  | "model" // model not found / not available (404)
  | "rate_limit" // 429, after SDK retries
  | "overloaded" // 5xx / 529, after SDK retries
  | "network" // couldn't reach the API or timed out
  | "refusal" // Claude declined the request
  | "invalid_output" // response didn't match the triage schema
  | "unknown";

/** Codes caused by the key itself: the key is marked bad, and these intakes resume when a new key is saved. */
export const KEY_ERROR_CODES: AiErrorCode[] = ["no_key", "auth", "billing", "permission"];
