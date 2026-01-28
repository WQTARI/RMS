import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { User } from '../types'
import { fetchMe, login as loginRequest, logout as logoutRequest } from '../api/auth'
import { resetEcho } from '../realtime/echo'

interface AuthContextValue {
  user: User | null
  token: string | null
  isLoading: boolean
  hasRole: (role: string) => boolean
  hasPermission: (permission: string) => boolean
  hasAnyRole: (roles: string[]) => boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const TOKEN_KEY = 'rms_token'
const USER_KEY = 'rms_user'

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  })
  const [isLoading, setIsLoading] = useState(true)

  const persist = (nextToken: string | null, nextUser: User | null) => {
    if (nextToken) {
      localStorage.setItem(TOKEN_KEY, nextToken)
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }
    if (nextUser) {
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
    } else {
      localStorage.removeItem(USER_KEY)
    }
  }

  const login = async (email: string, password: string) => {
    const response = await loginRequest({ email, password })
    setToken(response.token)
    setUser(response.user)
    persist(response.token, response.user)
    resetEcho(response.token)
  }

  const logout = async () => {
    try {
      await logoutRequest()
    } finally {
      setToken(null)
      setUser(null)
      persist(null, null)
      resetEcho(null)
    }
  }

  useEffect(() => {
    const hydrate = async () => {
      if (!token) {
        setIsLoading(false)
        return
      }
      try {
        const me = await fetchMe()
        setUser(me)
        persist(token, me)
      } catch {
        setToken(null)
        setUser(null)
        persist(null, null)
      } finally {
        setIsLoading(false)
      }
    }
    hydrate()
  }, [token])

  const hasRole = (role: string) => {
    const target = role.trim().toLowerCase()
    return Boolean(user?.roles?.some((r) => r.name.toLowerCase() === target))
  }

  const hasAnyRole = (roles: string[]) => roles.some((role) => hasRole(role))

  const hasPermission = (permission: string) => {
    if (!user?.roles) return false
    return user.roles.some((role) =>
      role.permissions?.some((perm) => perm.name === permission)
    )
  }

  const value = useMemo(
    () => ({ user, token, isLoading, login, logout, hasRole, hasAnyRole, hasPermission }),
    [user, token, isLoading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
