'use client';

import { useEffect } from 'react';

export default function Error({
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
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="font-cinzel text-3xl font-bold text-amber-900">Something went wrong</h1>
      <p className="max-w-md text-amber-700">
        An unexpected error occurred. You can try again, or return to the home page.
      </p>
      <div className="flex gap-4">
        <button
          onClick={reset}
          className="rounded-md bg-amber-700 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
        >
          Try again
        </button>
        <a
          href="/"
          className="rounded-md border border-amber-700 px-5 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
        >
          Go home
        </a>
      </div>
      {error.digest && (
        <p className="text-xs text-amber-500">Error ID: {error.digest}</p>
      )}
    </div>
  );
}
