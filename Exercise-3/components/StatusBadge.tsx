import type { IntakeDTO } from "@/lib/intake";

export default function StatusBadge({ intake }: { intake: Pick<IntakeDTO, "aiStatus" | "stalled"> }) {
  const { text, className } =
    intake.aiStatus === "COMPLETE"
      ? { text: "Triaged", className: "bg-success-container text-on-success-container" }
      : intake.aiStatus === "FAILED"
        ? { text: "AI failed", className: "bg-error-container text-on-error-container" }
        : intake.stalled
          ? { text: "Stalled", className: "bg-warning-container text-on-warning-container" }
          : { text: "Analyzing…", className: "bg-info-container text-on-info-container animate-pulse" };
  return <span className={`whitespace-nowrap rounded-lg px-2 py-0.5 text-xs font-medium ${className}`}>{text}</span>;
}
