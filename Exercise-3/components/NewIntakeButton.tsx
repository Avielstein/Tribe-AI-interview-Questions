import Link from "next/link";
import { btnFilled } from "./ui";

/** Material 3 filled button: pill shape, primary color, leading icon, elevation on hover. */
export default function NewIntakeButton({ label = "New intake" }: { label?: string }) {
  return (
    <Link
      href="/intakes/new"
      className={`${btnFilled} pl-4`}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px]" aria-hidden="true">
        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
      </svg>
      {label}
    </Link>
  );
}
