'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

interface AuthContextType {
  isLoggedIn: boolean
  username?: string
  avatarUrl?: string
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthContextType>({ isLoggedIn: false })
  const pathname = usePathname()

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const data = await response.json()
        setAuthState({
          isLoggedIn: true,
          username: data.username,
          avatarUrl: data.avatarUrl,
        })
      } else {
        setAuthState({ isLoggedIn: false })
      }
    } catch (err) {
      console.error('Auth check error:', err)
      setAuthState({ isLoggedIn: false })
    }
  }

  useEffect(() => {
    checkAuth()
  }, [pathname]) // Recheck auth when route changes

  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
