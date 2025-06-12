'use client'

import { useState, forwardRef } from 'react'
import { Eye, EyeOff, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEncryption } from '@/hooks/useEncryption'

interface PassphraseInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  showStrengthIndicator?: boolean
  showGenerateButton?: boolean
  disabled?: boolean
  error?: string
  className?: string
}

export const PassphraseInput = forwardRef<HTMLInputElement, PassphraseInputProps>(
  ({ 
    value, 
    onChange, 
    placeholder = 'Enter passphrase',
    showStrengthIndicator = true,
    showGenerateButton = true,
    disabled = false,
    error,
    className = ''
  }, ref) => {
    const [showPassphrase, setShowPassphrase] = useState(false)
    const { validatePassphrase, generatePassphrase } = useEncryption()

    const validation = validatePassphrase(value)
    const strengthScore = getStrengthScore(value)

    const handleGenerate = () => {
      const newPassphrase = generatePassphrase(16)
      onChange(newPassphrase)
    }

    const toggleVisibility = () => {
      setShowPassphrase(!showPassphrase)
    }

    return (
      <div className={`space-y-2 ${className}`}>
        {/* Input Field */}
        <div className="relative">
          <input
            ref={ref}
            type={showPassphrase ? 'text' : 'password'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className={`
              w-full px-4 py-3 pr-20 border rounded-lg
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              disabled:bg-gray-100 disabled:cursor-not-allowed
              ${error ? 'border-red-500 bg-red-50' : 'border-gray-300'}
            `}
            aria-describedby={error ? 'passphrase-error' : undefined}
          />
          
          {/* Toggle Visibility Button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleVisibility}
            disabled={disabled}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
            aria-label={showPassphrase ? 'Hide passphrase' : 'Show passphrase'}
          >
            {showPassphrase ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Generate Button */}
        {showGenerateButton && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            disabled={disabled}
            className="w-full"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Generate Secure Passphrase
          </Button>
        )}

        {/* Strength Indicator */}
        {showStrengthIndicator && value && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Strength:</span>
              <div className="flex items-center space-x-1">
                {validation.isValid ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                )}
                <span className={`text-sm ${getStrengthColor(strengthScore)}`}>
                  {getStrengthText(strengthScore)}
                </span>
              </div>
            </div>
            
            {/* Strength Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${getStrengthBarColor(strengthScore)}`}
                style={{ width: `${(strengthScore / 4) * 100}%` }}
              />
            </div>
            
            {/* Validation Errors */}
            {!validation.isValid && validation.errors.length > 0 && (
              <ul className="text-sm text-orange-600 space-y-1">
                {validation.errors.map((error, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-orange-600 mr-1">•</span>
                    {error}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div id="passphrase-error" className="flex items-center text-red-600 text-sm">
            <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0" />
            {error}
          </div>
        )}
      </div>
    )
  }
)

PassphraseInput.displayName = 'PassphraseInput'

// Helper functions
function getStrengthScore(passphrase: string): number {
  let score = 0
  
  if (passphrase.length >= 8) score++
  if (passphrase.length >= 12) score++
  if (/[A-Z]/.test(passphrase) && /[a-z]/.test(passphrase)) score++
  if (/[0-9]/.test(passphrase)) score++
  if (/[^A-Za-z0-9]/.test(passphrase)) score++
  
  return Math.min(score, 4)
}

function getStrengthText(score: number): string {
  switch (score) {
    case 0:
    case 1:
      return 'Weak'
    case 2:
      return 'Fair'
    case 3:
      return 'Good'
    case 4:
      return 'Strong'
    default:
      return 'Weak'
  }
}

function getStrengthColor(score: number): string {
  switch (score) {
    case 0:
    case 1:
      return 'text-red-600'
    case 2:
      return 'text-orange-600'
    case 3:
      return 'text-yellow-600'
    case 4:
      return 'text-green-600'
    default:
      return 'text-red-600'
  }
}

function getStrengthBarColor(score: number): string {
  switch (score) {
    case 0:
    case 1:
      return 'bg-red-500'
    case 2:
      return 'bg-orange-500'
    case 3:
      return 'bg-yellow-500'
    case 4:
      return 'bg-green-500'
    default:
      return 'bg-red-500'
  }
}