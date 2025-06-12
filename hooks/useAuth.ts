'use client'

import { useState, useCallback, useEffect } from 'react'

export interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  hasPassphrase: boolean
  recoveryHint: string | null
  error: string | null
  remainingAttempts?: number
  lockedUntil?: string
}

export interface RateLimitInfo {
  attempts: number
  resetTime: number
  isLocked: boolean
  lockDuration: number
}

export interface UseAuthReturn {
  state: AuthState
  login: (passphrase: string) => Promise<boolean>
  logout: () => Promise<void>
  setupPassphrase: (passphrase: string, recoveryHint?: string) => Promise<boolean>
  changePassphrase: (currentPassphrase: string, newPassphrase: string) => Promise<boolean>
  checkSetup: () => Promise<void>
  checkSession: () => Promise<void>
  getRateLimit: () => Promise<RateLimitInfo | null>
  clearError: () => void
}

export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: false,
    hasPassphrase: false,
    recoveryHint: null,
    error: null
  })

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  const handleError = useCallback((error: unknown, defaultMessage: string) => {
    const errorMessage = error instanceof Error ? error.message : defaultMessage
    setState(prev => ({ ...prev, error: errorMessage, isLoading: false }))
  }, [])

  const checkSetup = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/setup')
      const result = await response.json()

      if (result.success) {
        setState(prev => ({
          ...prev,
          hasPassphrase: result.hasPassphrase,
          recoveryHint: result.recoveryHint
        }))
      }
    } catch (error) {
      console.error('Failed to check setup:', error)
    }
  }, [])

  const checkSession = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }))

    try {
      const response = await fetch('/api/auth/session')
      const result = await response.json()

      setState(prev => ({
        ...prev,
        isAuthenticated: result.authenticated || false,
        isLoading: false,
        error: result.authenticated ? null : prev.error
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        isAuthenticated: false,
        isLoading: false
      }))
    }
  }, [])

  const setupPassphrase = useCallback(async (
    passphrase: string,
    recoveryHint?: string
  ): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ passphrase, recoveryHint }),
      })

      const result = await response.json()

      if (result.success) {
        setState(prev => ({
          ...prev,
          hasPassphrase: true,
          recoveryHint: recoveryHint || null,
          isLoading: false
        }))
        return true
      } else {
        setState(prev => ({
          ...prev,
          error: result.error || 'Setup failed',
          isLoading: false
        }))
        return false
      }
    } catch (error) {
      handleError(error, 'Failed to setup passphrase')
      return false
    }
  }, [handleError])

  const login = useCallback(async (passphrase: string): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ passphrase }),
      })

      const result = await response.json()

      if (result.success) {
        setState(prev => ({
          ...prev,
          isAuthenticated: true,
          isLoading: false,
          remainingAttempts: undefined,
          lockedUntil: undefined
        }))
        return true
      } else {
        setState(prev => ({
          ...prev,
          error: result.error || 'Login failed',
          remainingAttempts: result.remainingAttempts,
          lockedUntil: result.lockedUntil,
          isLoading: false
        }))
        return false
      }
    } catch (error) {
      handleError(error, 'Login failed')
      return false
    }
  }, [handleError])

  const logout = useCallback(async (): Promise<void> => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      setState(prev => ({
        ...prev,
        isAuthenticated: false,
        error: null
      }))
    } catch (error) {
      console.error('Logout failed:', error)
      // Force logout on client side even if server request failed
      setState(prev => ({
        ...prev,
        isAuthenticated: false
      }))
    }
  }, [])

  const changePassphrase = useCallback(async (
    currentPassphrase: string,
    newPassphrase: string
  ): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await fetch('/api/auth/change-passphrase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currentPassphrase, newPassphrase }),
      })

      const result = await response.json()

      if (result.success) {
        setState(prev => ({ ...prev, isLoading: false }))
        return true
      } else {
        setState(prev => ({
          ...prev,
          error: result.error || 'Failed to change passphrase',
          isLoading: false
        }))
        return false
      }
    } catch (error) {
      handleError(error, 'Failed to change passphrase')
      return false
    }
  }, [handleError])

  const getRateLimit = useCallback(async (): Promise<RateLimitInfo | null> => {
    try {
      const response = await fetch('/api/auth/rate-limit')
      const result = await response.json()

      if (result.success) {
        return result.rateLimit
      }
      return null
    } catch (error) {
      console.error('Failed to get rate limit info:', error)
      return null
    }
  }, [])

  // Check setup and session on mount
  useEffect(() => {
    checkSetup()
    checkSession()
  }, [checkSetup, checkSession])

  return {
    state,
    login,
    logout,
    setupPassphrase,
    changePassphrase,
    checkSetup,
    checkSession,
    getRateLimit,
    clearError
  }
}