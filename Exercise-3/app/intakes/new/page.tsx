"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  fieldErrors,
  formatBudget,
  formatTimeline,
  IntakeInputSchema,
  parseMoney,
  TIMELINE_UNITS,
  type FieldErrors,
  type IntakeInput,
  type TimelineUnit,
} from "@/lib/intake";
import { btnFilled, field } from "@/components/ui";

// What the inputs hold while typing; converted to numbers on submit.
interface FormState {
  title: string;
  description: string;
  industry: string;
  budgetMin: string;
  budgetMax: string;
  timelineAmount: string;
  timelineUnit: TimelineUnit;
}

const EMPTY: FormState = {
  title: "",
  description: "",
  industry: "",
  budgetMin: "",
  budgetMax: "",
  timelineAmount: "",
  timelineUnit: "weeks",
};

function toInput(f: FormState) {
  const amount = f.timelineAmount.trim();
  return {
    title: f.title,
    description: f.description,
    industry: f.industry,
    budgetMin: parseMoney(f.budgetMin),
    budgetMax: parseMoney(f.budgetMax),
    timelineAmount: amount === "" ? Number.NaN : Number(amount),
    timelineUnit: f.timelineUnit,
  };
}

const inputClass = (err?: string) => field(!!err);

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={`${id}-error`} className="mt-1 text-sm text-error">
      {message}
    </p>
  );
}

export default function NewIntakePage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (key in errors) setErrors((x) => ({ ...x, [key]: undefined }));
  }

  /** On blur, show the amount the way it will be read back: "50k" -> "50,000". */
  function tidyMoney(key: "budgetMin" | "budgetMax") {
    const n = parseMoney(form[key]);
    if (Number.isFinite(n)) setForm((f) => ({ ...f, [key]: n.toLocaleString("en-US") }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const input = toInput(form);
    const check = IntakeInputSchema.safeParse(input);
    if (!check.success) {
      setErrors(fieldErrors(check.error));
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const res = await fetch("/api/intakes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(check.data satisfies IntakeInput),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        // Keep everything the user typed; just show what went wrong.
        setErrors(body?.fieldErrors ?? {});
        setFormError(body?.error ?? `Couldn't save the intake (error ${res.status}). Your input is still here; try again.`);
        setSaving(false);
        return;
      }
      router.push(`/intakes/${body.id}`);
    } catch {
      setFormError("Couldn't reach the server. Your input is still here; check the app is running and try again.");
      setSaving(false);
    }
  }

  const preview = toInput(form);
  const budgetPreview =
    Number.isFinite(preview.budgetMin) && Number.isFinite(preview.budgetMax) && preview.budgetMax >= preview.budgetMin
      ? formatBudget(preview.budgetMin, preview.budgetMax)
      : null;

  const textField = (key: "title" | "industry", label: string, placeholder: string) => (
    <div>
      <label htmlFor={key} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <input
        id={key}
        type="text"
        value={form[key]}
        placeholder={placeholder}
        disabled={saving}
        aria-invalid={!!errors[key]}
        aria-describedby={errors[key] ? `${key}-error` : undefined}
        onChange={(e) => update(key, e.target.value)}
        className={inputClass(errors[key])}
      />
      <FieldError id={key} message={errors[key]} />
    </div>
  );

  const moneyField = (key: "budgetMin" | "budgetMax", label: string, placeholder: string) => (
    <div className="flex-1">
      <label htmlFor={key} className="mb-1 block text-xs text-on-surface-variant">
        {label}
      </label>
      <div
        className={`flex items-center rounded border transition focus-within:outline-1 focus-within:outline-offset-0 ${
          errors[key] ? "border-error focus-within:outline-error" : "border-outline focus-within:border-primary focus-within:outline-primary"
        }`}
      >
        <span className="pl-3 text-sm text-on-surface-variant" aria-hidden="true">
          $
        </span>
        <input
          id={key}
          type="text"
          inputMode="decimal"
          value={form[key]}
          placeholder={placeholder}
          disabled={saving}
          aria-invalid={!!errors[key]}
          aria-describedby={errors[key] ? `${key}-error` : "budget-hint"}
          onChange={(e) => update(key, e.target.value)}
          onBlur={() => tidyMoney(key)}
          className="w-full rounded bg-transparent px-2 py-2.5 text-sm text-on-surface outline-none placeholder:text-outline"
        />
      </div>
      <FieldError id={key} message={errors[key]} />
    </div>
  );

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <Link href="/" className="text-sm text-on-surface-variant hover:text-on-surface">
        ← All intakes
      </Link>
      <h1 className="mt-2 text-[28px] leading-9">New intake</h1>
      <p className="mt-1 text-sm text-on-surface-variant">
        Saved right away. Claude then adds a summary, tags, and a risk checklist, which takes a few seconds.
      </p>

      <form onSubmit={submit} noValidate className="mt-6 space-y-5">
        {textField("title", "Title", "Support ticket deflection assistant")}

        <div>
          <label htmlFor="description" className="mb-1 block text-sm font-medium">
            Description
          </label>
          <textarea
            id="description"
            rows={6}
            value={form.description}
            placeholder="What does the client want to build, for whom, and why now? Paste the request if you have it."
            disabled={saving}
            aria-invalid={!!errors.description}
            aria-describedby={errors.description ? "description-error" : undefined}
            onChange={(e) => update("description", e.target.value)}
            className={inputClass(errors.description)}
          />
          <FieldError id="description" message={errors.description} />
        </div>

        {textField("industry", "Industry", "B2B SaaS")}

        <fieldset>
          <legend className="mb-1 text-sm font-medium">Budget</legend>
          <div className="flex items-start gap-3">
            {moneyField("budgetMin", "Low end", "50,000")}
            <span className="mt-9 text-outline" aria-hidden="true">
              –
            </span>
            {moneyField("budgetMax", "High end", "80,000")}
          </div>
          <p id="budget-hint" className="mt-1 text-xs text-on-surface-variant">
            {budgetPreview ? (
              <>
                Saved as <span className="font-medium text-on-surface">{budgetPreview}</span>
              </>
            ) : (
              "Shorthand works: 50k, 1.2m. Use the same number twice for a fixed budget."
            )}
          </p>
        </fieldset>

        <fieldset>
          <legend className="mb-1 text-sm font-medium">Timeline</legend>
          <div className="flex gap-2">
            <input
              id="timelineAmount"
              type="number"
              inputMode="numeric"
              min={1}
              max={999}
              step={1}
              value={form.timelineAmount}
              placeholder="6"
              disabled={saving}
              aria-label="Timeline amount"
              aria-invalid={!!errors.timelineAmount}
              aria-describedby={errors.timelineAmount ? "timelineAmount-error" : undefined}
              onChange={(e) => update("timelineAmount", e.target.value)}
              className={`w-24 ${inputClass(errors.timelineAmount)}`}
            />
            {/* M3 outlined dropdown: native select (keyboard + mobile pickers for free) with a custom chevron. */}
            <div className="relative w-36">
              <select
                id="timelineUnit"
                value={form.timelineUnit}
                disabled={saving}
                aria-label="Timeline unit"
                onChange={(e) => update("timelineUnit", e.target.value as TimelineUnit)}
                className={`cursor-pointer appearance-none pr-10 ${field(!!errors.timelineUnit)}`}
              >
                {TIMELINE_UNITS.map((u) => (
                  <option key={u} value={u} className="bg-surface-container text-on-surface">
                    {u[0].toUpperCase() + u.slice(1)}
                  </option>
                ))}
              </select>
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="pointer-events-none absolute right-2.5 top-1/2 h-5 w-5 -translate-y-1/2 text-on-surface-variant"
                aria-hidden="true"
              >
                <path d="M7 10l5 5 5-5z" />
              </svg>
            </div>
          </div>
          {Number.isInteger(preview.timelineAmount) && preview.timelineAmount >= 1 && !errors.timelineAmount && (
            <p className="mt-1 text-xs text-on-surface-variant">
              Saved as{" "}
              <span className="font-medium text-on-surface">
                {formatTimeline(preview.timelineAmount, preview.timelineUnit)}
              </span>
            </p>
          )}
          <FieldError id="timelineAmount" message={errors.timelineAmount} />
          <FieldError id="timelineUnit" message={errors.timelineUnit} />
        </fieldset>

        {formError && (
          <p role="alert" className="rounded-xl bg-error-container px-4 py-3 text-sm text-on-error-container">
            {formError}
          </p>
        )}

        <button type="submit" disabled={saving} className={btnFilled}>
          {saving ? "Saving…" : "Create intake"}
        </button>
      </form>
    </main>
  );
}
