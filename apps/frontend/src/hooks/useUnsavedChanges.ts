'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Hook for handling unsaved changes warnings (2.3.3)
 *
 * Features:
 * - Browser beforeunload warning on refresh/close
 * - Browser back button interception with confirmation
 * - Confirmation dialog for in-app navigation
 *
 * @param isDirty - Whether the form has unsaved changes
 * @param message - Custom warning message (optional)
 * @returns navigateWithWarning - Function to navigate with confirmation if dirty
 *
 * @example
 * const isDirty = name !== originalName;
 * const { navigateWithWarning } = useUnsavedChanges(isDirty);
 *
 * <button onClick={() => navigateWithWarning('/profiles')}>Cancel</button>
 */
export function useUnsavedChanges(
  isDirty: boolean,
  message: string = 'You have unsaved changes. Are you sure you want to leave?',
) {
  const router = useRouter();
  const hasBlockedRef = useRef(false);

  // Browser beforeunload warning for refresh/close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Browser back button interception
  useEffect(() => {
    if (!isDirty) {
      hasBlockedRef.current = false;
      return undefined;
    }

    // Push a state to history so we can intercept back navigation
    if (!hasBlockedRef.current) {
      window.history.pushState({ unsavedChanges: true }, '');
      hasBlockedRef.current = true;
    }

    const handlePopState = () => {
      if (isDirty) {
        const confirmed = window.confirm(message);
        if (confirmed) {
          // User confirmed - allow navigation by going back again
          hasBlockedRef.current = false;
          window.history.back();
        } else {
          // User cancelled - push state again to stay on page
          window.history.pushState({ unsavedChanges: true }, '');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isDirty, message]);

  // Navigation handler with confirmation
  const navigateWithWarning = useCallback(
    (href: string) => {
      if (isDirty) {
        const confirmed = window.confirm(message);
        if (!confirmed) return;
      }
      // Clean up the extra history entry we added
      if (hasBlockedRef.current) {
        hasBlockedRef.current = false;
        window.history.back();
      }
      router.push(href);
    },
    [isDirty, message, router],
  );

  return { navigateWithWarning, isDirty };
}
