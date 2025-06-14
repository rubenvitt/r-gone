'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { 
  Phone, MessageSquare, Send, CheckCircle, 
  AlertCircle, Loader2, Shield, Clock,
  Smartphone, Hash
} from 'lucide-react'
import { manualActivationService, ActivationLevel } from '@/services/manual-activation-service'
import { useAuth } from '@/hooks/useAuth'

interface SMSActivationProps {
  phoneNumber?: string
  onActivationComplete?: (activationId: string) => void
}

export function SMSActivation({
  phoneNumber: defaultPhoneNumber = '',
  onActivationComplete
}: SMSActivationProps) {
  const { user } = useAuth()
  const [step, setStep] = useState<'setup' | 'verify' | 'complete'>('setup')
  const [phoneNumber, setPhoneNumber] = useState(defaultPhoneNumber)
  const [activationLevel, setActivationLevel] = useState<ActivationLevel>(ActivationLevel.PARTIAL)
  const [verificationCode, setVerificationCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [codeExpiry, setCodeExpiry] = useState<Date | null>(null)
  const [activationId, setActivationId] = useState('')
  const [resendTimer, setResendTimer] = useState(0)

  // Countdown timer for resend
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendTimer])

  // Format phone number
  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '')
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/)
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`
    }
    return value
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    setPhoneNumber(formatted)
  }

  const sendActivationCode = async () => {
    setLoading(true)
    setError('')

    try {
      const cleanPhone = phoneNumber.replace(/\D/g, '')
      if (cleanPhone.length !== 10) {
        throw new Error('Please enter a valid 10-digit phone number')
      }

      const smsCode = await manualActivationService.generateSMSActivationCode(
        user?.id || 'default-user',
        cleanPhone,
        activationLevel
      )

      setCodeExpiry(smsCode.expiresAt)
      setStep('verify')
      setResendTimer(60) // 60 second cooldown
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to send code')
    } finally {
      setLoading(false)
    }
  }

  const verifyAndActivate = async () => {
    setLoading(true)
    setError('')

    try {
      if (verificationCode.length !== 6) {
        throw new Error('Please enter the 6-digit code')
      }

      const request = await manualActivationService.activateWithSMSCode(
        verificationCode,
        'SMS emergency activation'
      )

      setActivationId(request.id)
      setStep('complete')
      
      if (onActivationComplete) {
        onActivationComplete(request.id)
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Invalid or expired code')
    } finally {
      setLoading(false)
    }
  }

  const resendCode = async () => {
    if (resendTimer > 0) return
    await sendActivationCode()
  }

  const formatTimeRemaining = () => {
    if (!codeExpiry) return ''
    
    const now = new Date()
    const diff = codeExpiry.getTime() - now.getTime()
    
    if (diff <= 0) return 'Expired'
    
    const minutes = Math.floor(diff / 60000)
    const seconds = Math.floor((diff % 60000) / 1000)
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <Card className="p-6 max-w-md mx-auto">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Phone className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold">SMS Emergency Activation</h3>
          <p className="text-sm text-gray-600 mt-1">
            Activate emergency access using your phone
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center space-x-2">
          <div className={`flex items-center ${step === 'setup' ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
              step === 'setup' ? 'border-blue-600 bg-blue-50' : 'border-gray-300'
            }`}>
              1
            </div>
            <span className="ml-2 text-sm">Setup</span>
          </div>
          <div className="w-8 border-t-2 border-gray-300" />
          <div className={`flex items-center ${step === 'verify' ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
              step === 'verify' ? 'border-blue-600 bg-blue-50' : 'border-gray-300'
            }`}>
              2
            </div>
            <span className="ml-2 text-sm">Verify</span>
          </div>
          <div className="w-8 border-t-2 border-gray-300" />
          <div className={`flex items-center ${step === 'complete' ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
              step === 'complete' ? 'border-green-600 bg-green-50' : 'border-gray-300'
            }`}>
              {step === 'complete' ? <CheckCircle className="h-5 w-5" /> : '3'}
            </div>
            <span className="ml-2 text-sm">Active</span>
          </div>
        </div>

        {/* Step Content */}
        {step === 'setup' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-gray-500">
                We'll send a verification code to this number
              </p>
            </div>

            <div className="space-y-2">
              <Label>Access Level</Label>
              <RadioGroup
                value={activationLevel}
                onValueChange={(value) => setActivationLevel(value as ActivationLevel)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value={ActivationLevel.PARTIAL} id="partial" />
                  <Label htmlFor="partial" className="flex items-center cursor-pointer">
                    <Shield className="h-4 w-4 mr-2 text-orange-600" />
                    Partial Access (Recommended)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value={ActivationLevel.FULL} id="full" />
                  <Label htmlFor="full" className="flex items-center cursor-pointer">
                    <Shield className="h-4 w-4 mr-2 text-red-600" />
                    Full Access
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={sendActivationCode}
              disabled={loading || !phoneNumber}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending Code...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Activation Code
                </>
              )}
            </Button>
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-4">
            <Alert>
              <MessageSquare className="h-4 w-4" />
              <AlertDescription>
                A 6-digit code has been sent to {phoneNumber}
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="code">Verification Code</Label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="code"
                  type="text"
                  placeholder="123456"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="pl-10 text-center text-2xl tracking-widest"
                  maxLength={6}
                />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">
                  Code expires in: {formatTimeRemaining()}
                </span>
                <button
                  onClick={resendCode}
                  disabled={resendTimer > 0}
                  className="text-blue-600 hover:text-blue-700 disabled:text-gray-400"
                >
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend code'}
                </button>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setStep('setup')}
                disabled={loading}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={verifyAndActivate}
                disabled={loading || verificationCode.length !== 6}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Activating...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Activate Access
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'complete' && (
          <div className="space-y-4 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>

            <div>
              <h4 className="font-semibold text-green-900">Emergency Access Activated</h4>
              <p className="text-sm text-gray-600 mt-1">
                Your emergency contacts now have access
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Activation ID:</span>
                <span className="font-mono">{activationId.slice(0, 8)}...</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Access Level:</span>
                <span className="font-medium">{activationLevel.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Valid For:</span>
                <span className="font-medium">24 hours</span>
              </div>
            </div>

            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="w-full"
            >
              Done
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}