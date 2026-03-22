import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'

const AuthContext = createContext(null)

const USER_STORAGE_KEY = 'mann_user'

function getStoredUser() {
  try {
    const s = localStorage.getItem(USER_STORAGE_KEY)
    return s ? JSON.parse(s) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser())
  const [token, setToken] = useState(() => localStorage.getItem('mann_token') || null)
  const [pin, setPinState] = useState(() => sessionStorage.getItem('mann_pin') || null)
  const [encryptionSalt, setEncryptionSalt] = useState(() => sessionStorage.getItem('mann_salt') || null)

  const login = useCallback(async (email, pinValue) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, pin: pinValue }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || 'Login failed')
    }
    const data = await res.json()
    localStorage.setItem('mann_token', data.access_token)
    if (data.user) localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user))
    sessionStorage.setItem('mann_pin', pinValue)
    sessionStorage.setItem('mann_salt', data.encryption_salt || '')
    setToken(data.access_token)
    setPinState(pinValue)
    setEncryptionSalt(data.encryption_salt || '')
    setUser(data.user)
    return data
  }, [])

  const signup = useCallback(async (name, email, pinValue) => {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, pin: pinValue }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || 'Signup failed')
    }
    const data = await res.json()
    return login(email, pinValue)
  }, [login])

  const logout = useCallback(() => {
    localStorage.removeItem('mann_token')
    localStorage.removeItem(USER_STORAGE_KEY)
    sessionStorage.removeItem('mann_pin')
    sessionStorage.removeItem('mann_salt')
    setToken(null)
    setPinState(null)
    setEncryptionSalt(null)
    setUser(null)
  }, [])

  useEffect(() => {
    if (!token) {
      setUser(null)
      return
    }
    setUser(prev => prev || getStoredUser())
  }, [token])

  const value = {
    user,
    token,
    pin,
    encryptionSalt,
    login,
    signup,
    logout,
    isAuthenticated: !!token,
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
