'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface AuthState {
  isLoggedIn: boolean;
  isLoading: boolean;
  accountId?: number;
  username?: string;
  avatarUrl?: string;
  email?: string;
  role?: 'user' | 'admin' | 'moderator';
  isAdmin: boolean;
  isModerator: boolean;
}

interface AuthContextType extends AuthState {
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  isLoading: true,
  isAdmin: false,
  isModerator: false,
  refreshAuth: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    isLoggedIn: false,
    isLoading: true,
    isAdmin: false,
    isModerator: false,
  });

  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        const role = data.role as 'user' | 'admin' | 'moderator' | undefined;
        setAuthState({
          isLoggedIn: true,
          isLoading: false,
          accountId: data.id,
          username: data.username,
          avatarUrl: data.details?.avatar?.url,
          email: data.email,
          role,
          isAdmin: role === 'admin',
          isModerator: role === 'moderator' || role === 'admin',
        });
      } else {
        setAuthState({ isLoggedIn: false, isLoading: false, isAdmin: false, isModerator: false });
      }
    } catch (err) {
      console.error('Auth check error:', err);
      setAuthState({ isLoggedIn: false, isLoading: false, isAdmin: false, isModerator: false });
    }
  }, []);

  // Run once on mount. Do NOT add pathname here — that caused a /api/auth/me
  // request on every navigation, producing an auth-state flicker.
  // Call refreshAuth() explicitly after login/logout mutations instead.
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return <AuthContext.Provider value={{ ...authState, refreshAuth: checkAuth }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
