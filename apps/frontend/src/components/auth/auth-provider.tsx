'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

interface AuthContextType {
  isLoggedIn: boolean;
  isLoading: boolean;
  accountId?: number;
  username?: string;
  avatarUrl?: string;
  email?: string;
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  isLoading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthContextType>({
    isLoggedIn: false,
    isLoading: true,
  });
  const pathname = usePathname();

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setAuthState({
          isLoggedIn: true,
          isLoading: false,
          accountId: data.id,
          username: data.username,
          avatarUrl: data.avatarUrl,
          email: data.email,
        });
      } else {
        setAuthState({ isLoggedIn: false, isLoading: false });
      }
    } catch (err) {
      console.error('Auth check error:', err);
      setAuthState({ isLoggedIn: false, isLoading: false });
    }
  };

  useEffect(() => {
    checkAuth();
  }, [pathname]); // Recheck auth when route changes

  return <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
