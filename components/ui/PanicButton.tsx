'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Slider } from '@/components/ui/slider'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  AlertTriangle, Shield, Phone, MessageSquare, 
  CheckCircle, X, Loader2, AlertCircle,
  Zap, Eye, Lock, Users
} from 'lucide-react'
// import { manualActivationService, ActivationLevel, UrgencyLevel } from '@/services/manual-activation-service'

// Define types locally to avoid client-side import issues
type ActivationLevel = 'minimal' | 'partial' | 'full'
type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical'
import { useAuth } from '@/hooks/useAuth'

interface PanicButtonProps {
  size?: 'small' | 'medium' | 'large'
  variant?: 'default' | 'floating' | 'minimal'
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center'
  alwaysVisible?: boolean
}

export function PanicButton({
  size = 'medium',
  variant = 'default',
  position = 'bottom-right',
  alwaysVisible = false
}: PanicButtonProps) {
  const { user } = useAuth()
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [loading, setLoading] = useState(false)
  const [holdProgress, setHoldProgress] = useState(0)
  const [isHolding, setIsHolding] = useState(false)
  const [activationLevel, setActivationLevel] = useState<ActivationLevel>(ActivationLevel.FULL)
  const [reason, setReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [activationId, setActivationId] = useState<string>('')
  
  // Predefined reasons
  const predefinedReasons = [
    'Medical emergency',
    'Personal safety concern',
    'Unable to access account',
    'Family emergency',
    'Other urgent matter'
  ]

  // Hold-to-activate timer
  useEffect(() => {
    let interval: NodeJS.Timeout
    
    if (isHolding) {
      interval = setInterval(() => {
        setHoldProgress(prev => {
          const next = prev + 2 // 2% per 20ms = 1 second total
          if (next >= 100) {
            triggerPanic()
            setIsHolding(false)
            return 0
          }
          return next
        })
      }, 20)
    } else {
      setHoldProgress(0)
    }

    return () => clearInterval(interval)
  }, [isHolding])

  const handleMouseDown = () => {
    if (variant === 'minimal') {
      setIsHolding(true)
    } else {
      setShowConfirmDialog(true)
    }
  }

  const handleMouseUp = () => {
    if (isHolding && holdProgress < 100) {
      setIsHolding(false)
      setHoldProgress(0)
    }
  }

  const triggerPanic = async () => {
    setLoading(true)
    
    try {
      const finalReason = reason === 'Other urgent matter' ? customReason : reason
      
      // API call to trigger panic button
      const response = await fetch('/api/activation/panic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id || 'default-user',
          activationLevel,
          reason: finalReason || 'Emergency activation'
        })
      })
      
      if (!response.ok) throw new Error('Failed to trigger panic button')
      const request = await response.json()

      setActivationId(request.id)
      setShowConfirmDialog(false)
      setShowSuccessDialog(true)
    } catch (error) {
      console.error('Failed to trigger panic button:', error)
      // Show error alert
    } finally {
      setLoading(false)
    }
  }

  const cancelActivation = async () => {
    if (!activationId) return

    try {
      // API call to cancel activation
      const response = await fetch('/api/activation/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activationId,
          reason: 'User cancelled activation'
        })
      })
      
      if (!response.ok) throw new Error('Failed to cancel activation')
      setShowSuccessDialog(false)
    } catch (error) {
      console.error('Failed to cancel activation:', error)
    }
  }

  // Button size classes
  const sizeClasses = {
    small: 'h-12 w-12 text-xs',
    medium: 'h-16 w-16 text-sm',
    large: 'h-20 w-20 text-base'
  }

  // Position classes for floating variant
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
  }

  const renderButton = () => {
    const baseClasses = 'relative overflow-hidden transition-all duration-200'
    
    if (variant === 'floating') {
      return (
        <div className={`fixed ${positionClasses[position]} z-50`}>
          <Button
            variant="destructive"
            size="icon"
            className={`${sizeClasses[size]} ${baseClasses} rounded-full shadow-lg hover:shadow-xl`}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            disabled={loading}
          >
            <AlertTriangle className="h-1/2 w-1/2" />
            {holdProgress > 0 && (
              <div 
                className="absolute inset-0 bg-white/30"
                style={{ 
                  clipPath: `inset(${100 - holdProgress}% 0 0 0)`,
                  transition: 'clip-path 0.02s linear'
                }}
              />
            )}
          </Button>
        </div>
      )
    }

    if (variant === 'minimal') {
      return (
        <Button
          variant="ghost"
          size="sm"
          className={`${baseClasses} text-red-600 hover:text-red-700 hover:bg-red-50`}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          disabled={loading}
        >
          <Zap className="h-4 w-4 mr-1" />
          Emergency
          {holdProgress > 0 && (
            <div 
              className="absolute bottom-0 left-0 h-0.5 bg-red-600"
              style={{ width: `${holdProgress}%` }}
            />
          )}
        </Button>
      )
    }

    // Default variant
    return (
      <Button
        variant="destructive"
        size="lg"
        className={`${baseClasses}`}
        onClick={() => setShowConfirmDialog(true)}
        disabled={loading}
      >
        <AlertTriangle className="h-5 w-5 mr-2" />
        Emergency Activation
      </Button>
    )
  }

  return (
    <>
      {renderButton()}

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-600">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Confirm Emergency Activation
            </DialogTitle>
            <DialogDescription>
              This will immediately grant emergency access to your information. 
              Please confirm this is intentional.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Activation Level */}
            <div className="space-y-2">
              <Label>Activation Level</Label>
              <RadioGroup
                value={activationLevel}
                onValueChange={(value) => setActivationLevel(value as ActivationLevel)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value={ActivationLevel.FULL} id="full" />
                  <Label htmlFor="full" className="flex items-center cursor-pointer">
                    <Lock className="h-4 w-4 mr-2 text-red-600" />
                    Full Access - Complete emergency access
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value={ActivationLevel.PARTIAL} id="partial" />
                  <Label htmlFor="partial" className="flex items-center cursor-pointer">
                    <Shield className="h-4 w-4 mr-2 text-orange-600" />
                    Partial Access - Essential information only
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value={ActivationLevel.VIEW_ONLY} id="view" />
                  <Label htmlFor="view" className="flex items-center cursor-pointer">
                    <Eye className="h-4 w-4 mr-2 text-blue-600" />
                    View Only - Read access, no downloads
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Reason Selection */}
            <div className="space-y-2">
              <Label>Reason for Activation</Label>
              <RadioGroup
                value={reason}
                onValueChange={setReason}
              >
                {predefinedReasons.map((r) => (
                  <div key={r} className="flex items-center space-x-2">
                    <RadioGroupItem value={r} id={r} />
                    <Label htmlFor={r} className="cursor-pointer">{r}</Label>
                  </div>
                ))}
              </RadioGroup>
              
              {reason === 'Other urgent matter' && (
                <Textarea
                  placeholder="Please describe the reason..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="mt-2"
                  rows={3}
                />
              )}
            </div>

            {/* Warning */}
            <Alert className="border-orange-200 bg-orange-50">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-sm">
                Emergency contacts will be notified immediately. This action will be logged 
                for security purposes.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={triggerPanic}
              disabled={loading || (!reason || (reason === 'Other urgent matter' && !customReason))}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Activating...
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Activate Emergency Access
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-green-600">
              <CheckCircle className="h-5 w-5 mr-2" />
              Emergency Access Activated
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                Emergency access has been successfully activated. Your emergency contacts 
                have been notified.
              </AlertDescription>
            </Alert>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Activation ID:</span>
                <span className="font-mono">{activationId.slice(0, 8)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Access Level:</span>
                <span className="font-medium">{activationLevel.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Valid For:</span>
                <span className="font-medium">24 hours</span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Next Steps:</p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li className="flex items-start">
                  <Phone className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                  Your emergency contacts will receive access instructions
                </li>
                <li className="flex items-start">
                  <MessageSquare className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                  Check your messages for any updates
                </li>
                <li className="flex items-start">
                  <Users className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                  Contact support if you need assistance
                </li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={cancelActivation}
              className="mr-2"
            >
              Cancel Activation
            </Button>
            <Button onClick={() => setShowSuccessDialog(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}