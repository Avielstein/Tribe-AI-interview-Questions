import { Suspense } from "react";
import IntakeDetailView, { DetailSkeleton } from "./IntakeDetailView";

export default function IntakeDetailPage() {
  return (
    <Suspense fallback={<main className="mx-auto w-full max-w-3xl px-4 py-8"><DetailSkeleton /></main>}>
      <IntakeDetailView />
    </Suspense>
  );
}
