'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Shield, AlertTriangle, CheckCircle, X,
  Loader2, Clock, Smartphone, Mail,
  Fingerprint, Key, AlertCircle, RefreshCw,
  User, Calendar
} from 'lucide-react'
import { 
  manualActivationService, 
  ActivationRequest, 
  VerificationMethod,
  ActivationType
} from '@/services/manual-activation-service'

interface ActivationVerificationProps {
  request: ActivationRequest
  onVerified?: (requestId: string) => void
  onCancelled?: (requestId: string) => void
}

export function ActivationVerification({
  request,
  onVerified,
  onCancelled
}: ActivationVerificationProps) {
  const [verificationMethod, setVerificationMethod] = useState<VerificationMethod>(VerificationMethod.IN_APP)
  const [verificationCode, setVerificationCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [timeRemaining, setTimeRemaining] = useState(300) // 5 minutes
  const [showDetails, setShowDetails] = useState(false)

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 0) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getActivationIcon = (type: ActivationType) => {
    switch (type) {
      case ActivationType.PANIC_BUTTON:
        return <AlertTriangle className="h-5 w-5 text-red-600" />
      case ActivationType.SMS_CODE:
        return <Smartphone className="h-5 w-5 text-blue-600" />
      case ActivationType.TRUSTED_CONTACT:
        return <User className="h-5 w-5 text-green-600" />
      case ActivationType.MEDICAL_PROFESSIONAL:
        return <Shield className="h-5 w-5 text-purple-600" />
      case ActivationType.LEGAL_REPRESENTATIVE:
        return <Shield className="h-5 w-5 text-indigo-600" />
      default:
        return <Shield className="h-5 w-5 text-gray-600" />
    }
  }

  const getUrgencyBadge = () => {
    const colors = {
      critical: 'destructive',
      high: 'default',
      medium: 'secondary',
      low: 'outline'
    }
    return (
      <Badge variant={colors[request.urgencyLevel] as any}>
        {request.urgencyLevel.toUpperCase()}
      </Badge>
    )
  }

  const handleVerify = async () => {
    setLoading(true)
    setError('')

    try {
      const verified = await manualActivationService.verifyActivation(
        request.id,
        verificationCode,
        verificationMethod
      )

      if (verified) {
        if (onVerified) {
          onVerified(request.id)
        }
      } else {
        setError('Verification failed. Please try again.')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    setLoading(true)
    try {
      await manualActivationService.cancelActivation(
        request.id,
        'User rejected activation request'
      )
      if (onCancelled) {
        onCancelled(request.id)
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to cancel')
    } finally {
      setLoading(false)
    }
  }

  if (timeRemaining === 0) {
    return (
      <Card className="p-6 max-w-md mx-auto">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
            <Clock className="h-8 w-8 text-gray-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Verification Expired</h3>
            <p className="text-sm text-gray-600 mt-1">
              This activation request has expired
            </p>
          </div>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Close
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6 max-w-lg mx-auto">
      <div className="space-y-6">
        {/* Header with Timer */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center">
            {getActivationIcon(request.type)}
            <span className="ml-2">Verify Emergency Activation</span>
          </h3>
          <div className="flex items-center space-x-2">
            {getUrgencyBadge()}
            <Badge variant="outline" className="text-orange-600">
              <Clock className="h-3 w-3 mr-1" />
              {formatTime(timeRemaining)}
            </Badge>
          </div>
        </div>

        {/* Request Details */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium">Requested by</p>
              <p className="text-sm text-gray-600">{request.initiatorName}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? 'Hide' : 'Show'} Details
            </Button>
          </div>

          {showDetails && (
            <>
              <div className="border-t pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Request Type:</span>
                  <span className="font-medium">{request.type.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Access Level:</span>
                  <span className="font-medium">{request.activationLevel.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Requested at:</span>
                  <span className="font-medium">
                    {new Date(request.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>
              <div className="border-t pt-3">
                <p className="text-sm font-medium mb-1">Reason:</p>
                <p className="text-sm text-gray-600">{request.reason}</p>
              </div>
            </>
          )}
        </div>

        {/* Warning Alert */}
        <Alert className="border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription>
            <strong>Important:</strong> Only approve this request if you recognize the 
            requester and understand why they need emergency access. This action will 
            be permanently logged.
          </AlertDescription>
        </Alert>

        {/* Verification Methods */}
        <div className="space-y-4">
          <Label>Verification Method</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={verificationMethod === VerificationMethod.IN_APP ? 'default' : 'outline'}
              size="sm"
              onClick={() => setVerificationMethod(VerificationMethod.IN_APP)}
              className="justify-start"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Quick Verify
            </Button>
            <Button
              variant={verificationMethod === VerificationMethod.SMS ? 'default' : 'outline'}
              size="sm"
              onClick={() => setVerificationMethod(VerificationMethod.SMS)}
              className="justify-start"
            >
              <Smartphone className="h-4 w-4 mr-2" />
              SMS Code
            </Button>
            <Button
              variant={verificationMethod === VerificationMethod.EMAIL ? 'default' : 'outline'}
              size="sm"
              onClick={() => setVerificationMethod(VerificationMethod.EMAIL)}
              className="justify-start"
            >
              <Mail className="h-4 w-4 mr-2" />
              Email Code
            </Button>
            <Button
              variant={verificationMethod === VerificationMethod.TWO_FACTOR ? 'default' : 'outline'}
              size="sm"
              onClick={() => setVerificationMethod(VerificationMethod.TWO_FACTOR)}
              className="justify-start"
            >
              <Key className="h-4 w-4 mr-2" />
              2FA Code
            </Button>
          </div>

          {verificationMethod !== VerificationMethod.IN_APP && (
            <div className="space-y-2">
              <Label htmlFor="code">Verification Code</Label>
              <Input
                id="code"
                type="text"
                placeholder="Enter 6-digit code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                maxLength={6}
              />
            </div>
          )}
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
            className="flex-1"
          >
            <X className="h-4 w-4 mr-2" />
            Deny Access
          </Button>
          <Button
            onClick={handleVerify}
            disabled={loading || (verificationMethod !== VerificationMethod.IN_APP && !verificationCode)}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve Access
              </>
            )}
          </Button>
        </div>

        {/* Security Notice */}
        <p className="text-xs text-center text-gray-500">
          This verification request will expire in {formatTime(timeRemaining)}. 
          Your IP address and decision will be logged for security purposes.
        </p>
      </div>
    </Card>
  )
}