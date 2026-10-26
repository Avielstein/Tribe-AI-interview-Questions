import { describe, expect, it } from "vitest";
import {
  fieldErrors,
  formatBudget,
  formatTimeline,
  IntakeInputSchema,
  parseMoney,
  toIntakeRecord,
} from "@/lib/intake";

const valid = {
  title: "Ticket deflection bot",
  description: "Answer support questions from 10k historical tickets.",
  industry: "B2B SaaS",
  budgetMin: 50_000,
  budgetMax: 80_000,
  timelineAmount: 6,
  timelineUnit: "weeks",
};

describe("IntakeInputSchema", () => {
  it("accepts a complete intake and trims whitespace", () => {
    const r = IntakeInputSchema.parse({ ...valid, title: "  Ticket deflection bot  " });
    expect(r.title).toBe("Ticket deflection bot");
  });

  it("gives a friendly message per field, including fields missing from the request", () => {
    const r = IntakeInputSchema.safeParse({ title: "   ", description: "too short", budgetMin: Number.NaN });
    expect(r.success).toBe(false);
    const errs = fieldErrors(r.error!);
    expect(Object.keys(errs).sort()).toEqual(
      ["budgetMax", "budgetMin", "description", "industry", "timelineAmount", "timelineUnit", "title"].sort(),
    );
    expect(Object.values(errs).join(" ")).not.toMatch(/expected|undefined|NaN/);
  });

  it("rejects a high end below the low end, on the high-end field", () => {
    const r = IntakeInputSchema.safeParse({ ...valid, budgetMin: 80_000, budgetMax: 50_000 });
    expect(fieldErrors(r.error!)).toEqual({ budgetMax: "The high end can't be less than the low end." });
  });

  it("accepts a fixed budget (low = high)", () => {
    expect(IntakeInputSchema.safeParse({ ...valid, budgetMin: 60_000, budgetMax: 60_000 }).success).toBe(true);
  });

  it("rejects negative budgets, zero or fractional timelines, and unknown units", () => {
    for (const bad of [{ budgetMin: -1 }, { timelineAmount: 0 }, { timelineAmount: 1.5 }, { timelineUnit: "fortnights" }]) {
      expect(IntakeInputSchema.safeParse({ ...valid, ...bad }).success).toBe(false);
    }
  });

  it("rejects overly long input", () => {
    expect(IntakeInputSchema.safeParse({ ...valid, description: "x".repeat(5001) }).success).toBe(false);
  });
});

describe("parseMoney", () => {
  it.each([
    ["50000", 50_000],
    ["50,000", 50_000],
    ["$50,000", 50_000],
    ["50k", 50_000],
    ["50K", 50_000],
    ["1.2m", 1_200_000],
    [" 2.5k ", 2_500],
  ])("%s -> %i", (raw, n) => expect(parseMoney(raw)).toBe(n));

  it.each(["", "abc", "50kk", "-5", "5 0 k x"])("%j is not an amount", (raw) => expect(parseMoney(raw)).toBeNaN());
});

describe("formatting for storage", () => {
  it("formats budgets as a dollar range, or one amount when fixed", () => {
    expect(formatBudget(50_000, 80_000)).toBe("$50,000–$80,000");
    expect(formatBudget(60_000, 60_000)).toBe("$60,000");
  });

  it("formats timelines with the right singular/plural unit", () => {
    expect(formatTimeline(6, "weeks")).toBe("6 weeks");
    expect(formatTimeline(1, "months")).toBe("1 month");
    expect(formatTimeline(1, "days")).toBe("1 day");
  });

  it("builds the stored record from validated input", () => {
    const rec = toIntakeRecord(IntakeInputSchema.parse(valid));
    expect(rec).toMatchObject({ budgetRange: "$50,000–$80,000", timeline: "6 weeks" });
  });
});
