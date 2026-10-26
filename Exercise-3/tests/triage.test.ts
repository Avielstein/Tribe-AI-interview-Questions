import { describe, expect, it } from "vitest";
import { TriageError } from "@/lib/ai/errors";
import { normalizeTriage } from "@/lib/ai/triage";

const base = { summary: " A summary. ", tags: ["RAG", "healthcare", "tight-timeline"], risks: [" Risk one. "] };

describe("normalizeTriage", () => {
  it("trims text and lowercases tags", () => {
    expect(normalizeTriage(base)).toEqual({
      summary: "A summary.",
      tags: ["rag", "healthcare", "tight-timeline"],
      risks: ["Risk one."],
    });
  });

  it("keeps exactly 3 tags when the model returns more", () => {
    expect(normalizeTriage({ ...base, tags: ["a", "b", "c", "d"] }).tags).toEqual(["a", "b", "c"]);
  });

  it("rejects fewer than 3 distinct tags", () => {
    expect(() => normalizeTriage({ ...base, tags: ["a", "A", " a "] })).toThrow(TriageError);
  });

  it("rejects an empty summary or no risks", () => {
    expect(() => normalizeTriage({ ...base, summary: "  " })).toThrow(TriageError);
    expect(() => normalizeTriage({ ...base, risks: ["", " "] })).toThrow(TriageError);
  });
});
