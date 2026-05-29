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

export interface InitialSession {
  isLoggedIn: boolean;
  id?: number;
  username?: string;
  email?: string;
  details?: { avatar?: { url?: string } } | null;
  role?: string;
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  isLoading: true,
  isAdmin: false,
  isModerator: false,
  refreshAuth: async () => {},
});

function sessionToAuthState(session: InitialSession): AuthState {
  const role = session.role as 'user' | 'admin' | 'moderator' | undefined;
  return {
    isLoggedIn: session.isLoggedIn,
    isLoading: false,
    accountId: session.id,
    username: session.username,
    avatarUrl: session.details?.avatar?.url,
    email: session.email,
    role,
    isAdmin: role === 'admin',
    isModerator: role === 'moderator' || role === 'admin',
  };
}

interface AuthProviderProps {
  children: React.ReactNode;
  /**
   * Initial session state fetched server-side by the root layout.
   * When provided, AuthProvider starts in the correct auth state and
   * skips the isLoading: true → resolved flash on every hard page load.
   */
  initialSession?: InitialSession;
}

export function AuthProvider({ children, initialSession }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>(() => {
    if (initialSession) {
      return sessionToAuthState(initialSession);
    }
    return { isLoggedIn: false, isLoading: true, isAdmin: false, isModerator: false };
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
    } catch {
      setAuthState({ isLoggedIn: false, isLoading: false, isAdmin: false, isModerator: false });
    }
  }, []);

  // If no initial session was provided by the server, fall back to the
  // client-side check. When initialSession is present this effect is a no-op
  // (state is already correct) but refreshAuth() remains available for
  // explicit re-checks after login/logout mutations.
  useEffect(() => {
    if (!initialSession) {
      checkAuth();
    }
  }, [checkAuth, initialSession]);

  return <AuthContext.Provider value={{ ...authState, refreshAuth: checkAuth }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
