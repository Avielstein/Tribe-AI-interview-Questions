import { z } from "zod";

// A trimmed string field with friendly messages, including when the field is missing entirely.
const text = (min: number, max: number, required: string, tooLong: string) =>
  z.string({ error: required }).trim().min(min, required).max(max, tooLong);

export const TIMELINE_UNITS = ["days", "weeks", "months", "years"] as const;
export type TimelineUnit = (typeof TIMELINE_UNITS)[number];

const MAX_BUDGET = 1_000_000_000;
const money = (required: string) =>
  z
    .number({ error: required })
    .int("Use whole dollars.")
    .min(0, "The amount can't be negative.")
    .max(MAX_BUDGET, "That's over $1B; double-check the amount.");

// Shared by the API (authoritative) and the form (instant feedback).
// Budget and timeline arrive as numbers and are stored as readable strings (see toIntakeRecord).
export const IntakeInputSchema = z
  .object({
    title: text(3, 120, "Add a title (at least 3 characters).", "Keep the title under 120 characters."),
    description: text(
      20,
      5000,
      "Describe the request in a bit more detail (at least 20 characters).",
      "Keep the description under 5,000 characters.",
    ),
    industry: text(1, 60, "Add the client's industry.", "Keep this under 60 characters."),
    budgetMin: money("Enter the low end, like 50,000 or 50k."),
    budgetMax: money("Enter the high end, like 80,000 or 80k."),
    timelineAmount: z
      .number({ error: "Enter how long, like 6." })
      .int("Use a whole number.")
      .min(1, "Must be at least 1.")
      .max(999, "Keep this under 1,000."),
    timelineUnit: z.enum(TIMELINE_UNITS, { error: "Pick days, weeks, months, or years." }),
  })
  .refine((v) => v.budgetMax >= v.budgetMin, {
    path: ["budgetMax"],
    message: "The high end can't be less than the low end.",
  });

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function formatBudget(min: number, max: number): string {
  return min === max ? usd.format(min) : `${usd.format(min)}–${usd.format(max)}`;
}

export function formatTimeline(amount: number, unit: TimelineUnit): string {
  return `${amount} ${amount === 1 ? unit.slice(0, -1) : unit}`;
}

/** Turn what someone typed ("$50,000", "50k", "1.2m") into whole dollars; NaN if it isn't an amount. */
export function parseMoney(raw: string): number {
  const m = raw.replace(/[$,\s]/g, "").match(/^(\d+(?:\.\d+)?)([km])?$/i);
  if (!m) return Number.NaN;
  const mult = m[2]?.toLowerCase() === "m" ? 1_000_000 : m[2] ? 1_000 : 1;
  return Math.round(parseFloat(m[1]) * mult);
}

/** The validated form input as stored on the intake row. */
export function toIntakeRecord(i: IntakeInput) {
  return {
    title: i.title,
    description: i.description,
    industry: i.industry,
    budgetRange: formatBudget(i.budgetMin, i.budgetMax),
    timeline: formatTimeline(i.timelineAmount, i.timelineUnit),
  };
}

export type IntakeInput = z.infer<typeof IntakeInputSchema>;
export type FieldErrors = Partial<Record<keyof IntakeInput, string>>;

export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as keyof IntakeInput;
    out[key] ??= issue.message;
  }
  return out;
}

/** An intake stuck in PENDING this long (e.g. the server restarted mid-call) can be retried. */
export const STALE_PENDING_MS = 3 * 60 * 1000;

export interface IntakeDTO {
  id: string;
  title: string;
  description: string;
  budgetRange: string;
  timeline: string;
  industry: string;
  createdAt: string;
  updatedAt: string;
  aiStatus: "PENDING" | "COMPLETE" | "FAILED";
  summary: string | null;
  tags: string[];
  risks: string[];
  aiError: string | null;
  aiErrorCode: string | null;
  aiAttempts: number;
  stalled: boolean;
}

type IntakeRow = Omit<IntakeDTO, "createdAt" | "updatedAt" | "tags" | "risks" | "stalled"> & {
  createdAt: Date;
  updatedAt: Date;
  tags: unknown;
  risks: unknown;
};

const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

export function toDTO(row: IntakeRow): IntakeDTO {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    tags: strings(row.tags),
    risks: strings(row.risks),
    stalled: row.aiStatus === "PENDING" && Date.now() - row.updatedAt.getTime() > STALE_PENDING_MS,
  };
}
