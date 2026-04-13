import { useEffect } from 'react';

/**
 * Calls `onFocus` whenever the browser tab becomes visible again.
 * Cleans up the event listener on unmount.
 */
export function useRefetchOnFocus(onFocus: () => void): void {
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        onFocus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [onFocus]);
}
