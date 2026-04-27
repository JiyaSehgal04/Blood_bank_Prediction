import { useState } from 'react'
import type { ReactNode } from 'react'
import api from '../lib/api'
import { AuthContext } from './auth'
import { prefetchAllCaches } from '../lib/sessionCache'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => !!sessionStorage.getItem('auth_token')
  )

  const login = async (username: string, password: string) => {
    try {
      const { data } = await api.post('/auth/login', { username, password })
      sessionStorage.setItem('auth_token', data.token || 'authenticated')
      setIsAuthenticated(true)
      prefetchAllCaches(api)
      return true
    } catch {
      return false
    }
  }

  const logout = () => {
    sessionStorage.removeItem('auth_token')
    setIsAuthenticated(false)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
