import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export type AuthUser = {
  userId: string
  playerId: string
  sessionToken: string
  alias: string
  walletAddress: string
}

type AuthContextType = {
  user: AuthUser | null
  setUser: (u: AuthUser | null) => void
  signOut: () => void
  updateAlias: (alias: string) => void
  signInOpen: boolean
  openSignIn: () => void
  closeSignIn: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

const STORAGE_KEY = 'auth'

function loadStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(loadStoredUser)
  const [signInOpen, setSignInOpen] = useState(false)

  const setUser = useCallback((u: AuthUser | null) => {
    setUserState(u)
    if (u) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(u))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  const signOut = useCallback(() => {
    setUser(null)
  }, [setUser])

  const updateAlias = useCallback((alias: string) => {
    setUserState(prev => {
      if (!prev) return prev
      const updated = { ...prev, alias }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  const openSignIn = useCallback(() => setSignInOpen(true), [])
  const closeSignIn = useCallback(() => setSignInOpen(false), [])

  return (
    <AuthContext.Provider value={{ user, setUser, signOut, updateAlias, signInOpen, openSignIn, closeSignIn }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
