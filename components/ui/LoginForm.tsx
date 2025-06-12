'use client'

import { useState, useEffect } from 'react'
import { Lock, AlertTriangle, Clock, Shield, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PassphraseInput } from '@/components/ui/PassphraseInput'
import { useAuth } from '@/hooks/useAuth'

interface LoginFormProps {
  onLoginSuccess?: () => void
  showSetup?: boolean
  className?: string
}

export default function LoginForm({
  onLoginSuccess,
  showSetup = true,
  className = ''
}: LoginFormProps) {
  const [passphrase, setPassphrase] = useState('')
  const [isSetupMode, setIsSetupMode] = useState(false)
  const [recoveryHint, setRecoveryHint] = useState('')
  const [showRecoveryHint, setShowRecoveryHint] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const {
    state,
    login,
    setupPassphrase,
    clearError
  } = useAuth()

  // Handle lockout countdown
  useEffect(() => {
    if (state.lockedUntil) {
      const lockEndTime = new Date(state.lockedUntil).getTime()
      const updateCountdown = () => {
        const now = Date.now()
        const remaining = Math.max(0, Math.ceil((lockEndTime - now) / 1000))
        setCountdown(remaining)
        
        if (remaining <= 0) {
          clearError()
        }
      }

      updateCountdown()
      const interval = setInterval(updateCountdown, 1000)
      return () => clearInterval(interval)
    }
  }, [state.lockedUntil, clearError])

  // Auto-switch to setup mode if no passphrase configured
  useEffect(() => {
    if (!state.hasPassphrase && showSetup) {
      setIsSetupMode(true)
    }
  }, [state.hasPassphrase, showSetup])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!passphrase.trim()) return

    let success = false
    
    if (isSetupMode) {
      success = await setupPassphrase(passphrase, recoveryHint || undefined)
      if (success) {
        setIsSetupMode(false)
        setPassphrase('')
        setRecoveryHint('')
      }
    } else {
      success = await login(passphrase)
      if (success) {
        onLoginSuccess?.()
      }
    }
  }

  const formatCountdown = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const isLocked = countdown > 0
  const canSubmit = passphrase.trim().length >= 8 && !isLocked && !state.isLoading

  return (
    <div className={`max-w-md mx-auto ${className}`}>
      <div className="bg-white rounded-lg shadow-lg p-8 border">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            {isSetupMode ? (
              <Shield className="h-8 w-8 text-blue-600" />
            ) : (
              <Lock className="h-8 w-8 text-blue-600" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            {isSetupMode ? 'Setup Security' : 'Secure Access'}
          </h2>
          <p className="text-gray-600 mt-2">
            {isSetupMode 
              ? 'Create a strong passphrase to protect your emergency information'
              : 'Enter your passphrase to access your encrypted data'
            }
          </p>
        </div>

        {/* Recovery Hint Display */}
        {!isSetupMode && state.recoveryHint && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900">Recovery Hint</span>
              <button
                type="button"
                onClick={() => setShowRecoveryHint(!showRecoveryHint)}
                className="text-blue-600 hover:text-blue-800"
              >
                {showRecoveryHint ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {showRecoveryHint && (
              <p className="text-blue-800 mt-2">{state.recoveryHint}</p>
            )}
          </div>
        )}

        {/* Rate Limiting Warning */}
        {isLocked && (
          <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-red-600 mr-2" />
              <div>
                <p className="text-red-800 font-medium">Account Temporarily Locked</p>
                <p className="text-red-600 text-sm">
                  Too many failed attempts. Try again in {formatCountdown(countdown)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Remaining Attempts Warning */}
        {!isLocked && state.remainingAttempts !== undefined && state.remainingAttempts < 3 && (
          <div className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-orange-600 mr-2" />
              <p className="text-orange-800 text-sm">
                Warning: {state.remainingAttempts} attempt{state.remainingAttempts !== 1 ? 's' : ''} remaining
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Passphrase Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isSetupMode ? 'Create Passphrase' : 'Passphrase'}
            </label>
            <PassphraseInput
              value={passphrase}
              onChange={setPassphrase}
              placeholder={isSetupMode ? 'Create a strong passphrase' : 'Enter your passphrase'}
              showStrengthIndicator={isSetupMode}
              showGenerateButton={isSetupMode}
              disabled={state.isLoading || isLocked}
              error={state.error || undefined}
            />
          </div>

          {/* Recovery Hint Input (Setup Mode) */}
          {isSetupMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recovery Hint (Optional)
              </label>
              <input
                type="text"
                value={recoveryHint}
                onChange={(e) => setRecoveryHint(e.target.value)}
                placeholder="A hint to help you remember your passphrase"
                disabled={state.isLoading}
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                maxLength={100}
              />
              <p className="text-xs text-gray-500 mt-1">
                This hint will be shown when you login (stored unencrypted)
              </p>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={!canSubmit}
            className="w-full py-3"
          >
            {state.isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                {isSetupMode ? 'Setting up...' : 'Authenticating...'}
              </div>
            ) : (
              <>
                {isSetupMode ? (
                  <>
                    <Shield className="h-5 w-5 mr-2" />
                    Setup Passphrase
                  </>
                ) : (
                  <>
                    <Lock className="h-5 w-5 mr-2" />
                    {isLocked ? `Locked (${formatCountdown(countdown)})` : 'Unlock'}
                  </>
                )}
              </>
            )}
          </Button>

          {/* Mode Switch */}
          {showSetup && state.hasPassphrase && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSetupMode(!isSetupMode)
                  setPassphrase('')
                  setRecoveryHint('')
                  clearError()
                }}
                className="text-blue-600 hover:text-blue-800 text-sm"
                disabled={state.isLoading}
              >
                {isSetupMode ? 'Back to Login' : 'Change Passphrase'}
              </button>
            </div>
          )}
        </form>

        {/* Error Display */}
        {state.error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                <span className="text-red-700 text-sm">{state.error}</span>
              </div>
              <button
                onClick={clearError}
                className="text-red-600 hover:text-red-800 text-sm"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}