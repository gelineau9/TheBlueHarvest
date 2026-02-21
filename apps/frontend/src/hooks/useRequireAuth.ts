'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';

interface UseRequireAuthOptions {
  /** URL to redirect to if not authenticated (default: '/') */
  redirectTo?: string;
}

interface UseRequireAuthReturn {
  /** True if user is authenticated and ready */
  isAuthorized: boolean;
  /** True while checking authentication status */
  isLoading: boolean;
  /** The current user object (if authenticated) */
  user: ReturnType<typeof useAuth>['user'];
}

/**
 * Hook that requires authentication to access a page.
 * Automatically redirects unauthenticated users.
 *
 * @example
 * ```tsx
 * export default function ProtectedPage() {
 *   const { isAuthorized, isLoading } = useRequireAuth();
 *
 *   if (isLoading) {
 *     return <LoadingSpinner />;
 *   }
 *
 *   if (!isAuthorized) {
 *     return null; // Redirecting...
 *   }
 *
 *   return <div>Protected content</div>;
 * }
 * ```
 */
export function useRequireAuth(options: UseRequireAuthOptions = {}): UseRequireAuthReturn {
  const { redirectTo = '/' } = options;
  const router = useRouter();
  const { isLoggedIn, isLoading, user } = useAuth();

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.push(redirectTo);
    }
  }, [isLoggedIn, isLoading, router, redirectTo]);

  return {
    isAuthorized: !isLoading && isLoggedIn,
    isLoading,
    user,
  };
}
