"use client";

import { BaseButton } from "@/components/shared/BaseButton";

/** Route-level error boundary. It never shows the underlying error text (FE-07). */
export default function ErrorBoundary({ reset }: { error: Error; reset: () => void }) {
  return (
    <main role="alert" className="border-3 border-ink bg-paper p-8 shadow-hard">
      <h1 className="text-2xl font-black">Something went wrong</h1>
      <p className="mb-6 mt-2 text-concrete-700">We couldn&apos;t load this page. Please try again.</p>
      <BaseButton onClick={reset}>Try again</BaseButton>
    </main>
  );
}
