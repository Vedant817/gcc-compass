"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] unhandled error:", error.message);
  }, [error]);

  return (
    <div className="max-w-2xl">
      <h1>Something broke on this page</h1>
      <p className="text-sm text-muted mt-2">
        The registry and the score didn&apos;t change, so this is a page-level fault, not a data
        problem. Try again; if it keeps happening, the plan link may be truncated.
      </p>
      <div className="flex items-center gap-3 mt-4">
        <button
          className="px-3 py-1.5 text-sm border border-ink bg-ink text-white rounded"
          onClick={reset}
        >
          Try again
        </button>
        <a href="/truth" className="text-sm text-slate underline">
          Back to the truth table
        </a>
      </div>
      {error.digest && <p className="text-xs text-muted mt-3">Reference: {error.digest}</p>}
    </div>
  );
}
