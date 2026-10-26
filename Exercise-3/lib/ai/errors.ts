import Anthropic from "@anthropic-ai/sdk";
import { KEY_ERROR_CODES, type AiErrorCode } from "./codes";

export { KEY_ERROR_CODES, type AiErrorCode };

export interface ClassifiedError {
  code: AiErrorCode;
  message: string; // safe to show the user
  keyProblem: boolean;
  retryable: boolean;
}

/** Errors we raise ourselves, with a code and a user-facing message. */
export class TriageError extends Error {
  constructor(
    readonly code: AiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "TriageError";
  }
}

const MESSAGES: Record<AiErrorCode, string> = {
  no_key: "No Claude API key is set. Add one in Settings.",
  auth: "The Claude API key was rejected. It may have expired or been revoked. Update it in Settings.",
  billing: "The Claude account behind this key is out of credits. Add credits or use a different key in Settings.",
  permission: "This Claude API key isn't allowed to use the configured model. Use a different key in Settings.",
  model: "The configured Claude model isn't available to this key.",
  rate_limit: "Claude is rate-limiting requests right now. Retry in a minute.",
  overloaded: "Claude is temporarily unavailable. Retry in a minute.",
  network: "Couldn't reach Claude. Check your connection and retry.",
  refusal: "Claude declined to analyze this intake.",
  invalid_output: "Claude's response didn't have the expected shape. Retry to try again.",
  unknown: "Something went wrong generating the AI analysis. Retry to try again.",
};

function make(code: AiErrorCode, message = MESSAGES[code]): ClassifiedError {
  return {
    code,
    message,
    keyProblem: KEY_ERROR_CODES.includes(code),
    retryable: !KEY_ERROR_CODES.includes(code) && code !== "model",
  };
}

/** Map any error from the AI step to a stable code and a message we can show the user. */
export function classifyError(err: unknown): ClassifiedError {
  if (err instanceof TriageError) return make(err.code, err.message);

  // Most specific first. APIConnectionError extends APIError, so check it before the status checks.
  if (err instanceof Anthropic.APIConnectionError) return make("network");
  if (err instanceof Anthropic.AuthenticationError) return make("auth");
  if (err instanceof Anthropic.PermissionDeniedError) return make("permission");
  if (err instanceof Anthropic.NotFoundError) return make("model");
  if (err instanceof Anthropic.RateLimitError) return make("rate_limit");
  if (err instanceof Anthropic.APIError) {
    if (err.status === 402 || err.type === "billing_error") return make("billing");
    if (err.status !== undefined && err.status >= 500) return make("overloaded");
  }
  return make("unknown");
}
