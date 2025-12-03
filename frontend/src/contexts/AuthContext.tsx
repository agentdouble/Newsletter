import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { fetchMe, login as apiLogin } from '../api/client'
import type { User } from '../types'

interface AuthContextValue {
  user: User | null
  token: string | null
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  clearError: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)
const TOKEN_KEY = 'newsletter_token'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState<boolean>(Boolean(token))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }

    const loadUser = async () => {
      setLoading(true)
      try {
        const me = await fetchMe(token)
        setUser(me)
        setError(null)
      } catch (err) {
        console.error('Impossible de récupérer la session', err)
        setError(err instanceof Error ? err.message : 'Session expirée')
        localStorage.removeItem(TOKEN_KEY)
        setToken(null)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    void loadUser()
  }, [token])

  const login = async (email: string, password: string) => {
    setLoading(true)
    setError(null)
    try {
      const { token: newToken } = await apiLogin(email, password)
      localStorage.setItem(TOKEN_KEY, newToken)
      setToken(newToken)
      const me = await fetchMe(newToken)
      setUser(me)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion impossible')
      localStorage.removeItem(TOKEN_KEY)
      setToken(null)
      setUser(null)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
  }

  const clearError = () => setError(null)

  return (
    <AuthContext.Provider value={{ user, token, loading, error, login, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
