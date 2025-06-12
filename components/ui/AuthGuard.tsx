'use client'

import { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import LoginForm from '@/components/ui/LoginForm'

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { state, checkSession } = useAuth()

  // Periodically check session validity
  useEffect(() => {
    if (state.isAuthenticated) {
      const interval = setInterval(() => {
        checkSession()
      }, 5 * 60 * 1000) // Check every 5 minutes

      return () => clearInterval(interval)
    }
  }, [state.isAuthenticated, checkSession])

  // Show loading state
  if (state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Show authentication form if not authenticated
  if (!state.isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        {fallback || (
          <LoginForm 
            onLoginSuccess={() => {
              // Authentication successful, component will re-render
            }}
          />
        )}
      </div>
    )
  }

  // Render protected content
  return <>{children}</>
}