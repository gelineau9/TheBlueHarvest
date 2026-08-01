'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface AuthState {
  isLoggedIn: boolean;
  isLoading: boolean;
  accountId?: number;
  username?: string;
  avatarUrl?: string;
  email?: string;
  /** Role names held by the account; empty for an ordinary user */
  roles: string[];
  isAdmin: boolean;
  isModerator: boolean;
  isGuideAuthor: boolean;
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
  roles?: string[];
}

const LOGGED_OUT: AuthState = {
  isLoggedIn: false,
  isLoading: false,
  roles: [],
  isAdmin: false,
  isModerator: false,
  isGuideAuthor: false,
};

const AuthContext = createContext<AuthContextType>({
  ...LOGGED_OUT,
  isLoading: true,
  refreshAuth: async () => {},
});

function sessionToAuthState(session: InitialSession): AuthState {
  const roles = session.roles ?? [];
  const isAdmin = roles.includes('admin');
  return {
    isLoggedIn: session.isLoggedIn,
    isLoading: false,
    accountId: session.id,
    username: session.username,
    avatarUrl: session.details?.avatar?.url,
    email: session.email,
    roles,
    isAdmin,
    // Admins retain every moderator capability
    isModerator: isAdmin || roles.includes('moderator'),
    isGuideAuthor: roles.includes('guide_author'),
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
    return { ...LOGGED_OUT, isLoading: true };
  });

  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setAuthState(sessionToAuthState({ ...data, isLoggedIn: true }));
      } else {
        setAuthState(LOGGED_OUT);
      }
    } catch {
      setAuthState(LOGGED_OUT);
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
