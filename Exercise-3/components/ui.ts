// Shared Material 3 class recipes, built on the theme tokens in app/globals.css.

const btnBase =
  "inline-flex h-10 items-center justify-center gap-2 rounded-full px-6 text-sm font-medium tracking-[0.1px] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40";

/** M3 filled button: the main action on a screen. */
export const btnFilled = `${btnBase} bg-primary text-on-primary shadow-sm hover:shadow-md hover:brightness-110 active:shadow-sm`;

/** M3 outlined button: secondary actions. */
export const btnOutlined = `${btnBase} border border-outline text-primary hover:bg-primary/10`;

/** M3 text button: low-emphasis actions (Cancel, Try again). */
export const btnText = `${btnBase} px-3 text-primary hover:bg-primary/10`;

/** M3 filled button in the error color, for destructive confirmations. */
export const btnDanger = `${btnBase} bg-error text-on-error hover:shadow-md hover:brightness-110`;

/** M3 outlined text field. */
export const field = (invalid?: boolean) =>
  `w-full rounded border bg-transparent px-3 py-2.5 text-sm text-on-surface placeholder:text-outline outline-none transition focus:border-2 focus:px-[11px] focus:py-[9px] disabled:opacity-50 ${
    invalid ? "border-error focus:border-error" : "border-outline focus:border-primary"
  }`;

/** M3 outlined card. */
export const card = "rounded-xl border border-outline-variant bg-surface";

/** M3 assist chip, used for tags. */
export const chip = "rounded-lg border border-outline-variant px-2 py-0.5 text-xs text-on-surface-variant";

/** Error / notice blocks. */
export const errorBox = "rounded-xl bg-error-container p-4 text-sm text-on-error-container";
