'use client';

import { useEffect } from 'react';

// global-error.tsx catches errors thrown in the root layout itself
// (e.g. ThemeProvider, AuthProvider, Banner).
// It MUST include its own <html> and <body> tags — the root layout is bypassed.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#f5e6c8] px-4 text-center">
        <h1 className="text-3xl font-bold text-amber-900">Something went wrong</h1>
        <p className="max-w-md text-amber-700">
          A critical error occurred. Please refresh the page or return to the home page.
        </p>
        <div className="flex gap-4">
          <button
            onClick={reset}
            className="rounded-md bg-amber-700 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-800"
          >
            Try again
          </button>
          <a
            href="/"
            className="rounded-md border border-amber-700 px-5 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50"
          >
            Go home
          </a>
        </div>
        {error.digest && (
          <p className="text-xs text-amber-500">Error ID: {error.digest}</p>
        )}
      </body>
    </html>
  );
}
