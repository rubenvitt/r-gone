'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import { 
  Users, Shield, AlertTriangle, CheckCircle, 
  Loader2, Mail, Phone, User, Clock,
  MessageSquare, AlertCircle, UserCheck
} from 'lucide-react'
import { manualActivationService, ActivationLevel, UrgencyLevel } from '@/services/manual-activation-service'
import { EmergencyContact } from '@/types/data'

interface TrustedContactActivationProps {
  contacts: EmergencyContact[]
  userId: string
  onActivationRequest?: (requestId: string) => void
}

export function TrustedContactActivation({
  contacts,
  userId,
  onActivationRequest
}: TrustedContactActivationProps) {
  const [selectedContact, setSelectedContact] = useState<string>('')
  const [urgencyLevel, setUrgencyLevel] = useState<UrgencyLevel>(UrgencyLevel.HIGH)
  const [activationLevel, setActivationLevel] = useState<ActivationLevel>(ActivationLevel.PARTIAL)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [requestId, setRequestId] = useState('')

  const handleRequestActivation = async () => {
    if (!selectedContact || !reason) {
      setError('Please select a contact and provide a reason')
      return
    }

    setLoading(true)
    setError('')

    try {
      const contact = contacts.find(c => c.id === selectedContact)
      if (!contact) throw new Error('Contact not found')

      const request = await manualActivationService.requestActivationByTrustedContact(
        contact.id,
        contact.name,
        userId,
        reason,
        urgencyLevel,
        activationLevel
      )

      setRequestId(request.id)
      setSuccess(true)
      
      if (onActivationRequest) {
        onActivationRequest(request.id)
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to request activation')
    } finally {
      setLoading(false)
    }
  }

  const getUrgencyColor = (level: UrgencyLevel) => {
    switch (level) {
      case UrgencyLevel.CRITICAL:
        return 'text-red-600 bg-red-50 border-red-200'
      case UrgencyLevel.HIGH:
        return 'text-orange-600 bg-orange-50 border-orange-200'
      case UrgencyLevel.MEDIUM:
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case UrgencyLevel.LOW:
        return 'text-blue-600 bg-blue-50 border-blue-200'
    }
  }

  if (success) {
    return (
      <Card className="p-6 max-w-lg mx-auto">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Activation Request Sent</h3>
            <p className="text-sm text-gray-600 mt-1">
              The user will be notified and asked to verify the request
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Request ID:</span>
              <span className="font-mono">{requestId.slice(0, 8)}...</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Status:</span>
              <Badge variant="secondary">Pending Verification</Badge>
            </div>
          </div>
          <Button
            onClick={() => {
              setSuccess(false)
              setReason('')
              setSelectedContact('')
            }}
            variant="outline"
            className="w-full"
          >
            Submit Another Request
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6 max-w-lg mx-auto">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h3 className="text-lg font-semibold flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Request Emergency Access
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            As a trusted contact, you can request emergency access on behalf of the user
          </p>
        </div>

        {/* Contact Selection */}
        <div className="space-y-2">
          <Label>Select Your Identity</Label>
          <RadioGroup
            value={selectedContact}
            onValueChange={setSelectedContact}
          >
            {contacts.map((contact) => (
              <div key={contact.id} className="flex items-center space-x-2">
                <RadioGroupItem value={contact.id} id={contact.id} />
                <Label 
                  htmlFor={contact.id} 
                  className="flex items-center justify-between w-full cursor-pointer p-3 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-2 text-gray-400" />
                    <span>{contact.name}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    {contact.email && <Mail className="h-3 w-3" />}
                    {contact.phone && <Phone className="h-3 w-3" />}
                  </div>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Urgency Level */}
        <div className="space-y-2">
          <Label>Urgency Level</Label>
          <RadioGroup
            value={urgencyLevel}
            onValueChange={(value) => setUrgencyLevel(value as UrgencyLevel)}
          >
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={UrgencyLevel.CRITICAL} id="critical" />
                <Label 
                  htmlFor="critical" 
                  className={`cursor-pointer px-3 py-2 rounded-lg border ${
                    urgencyLevel === UrgencyLevel.CRITICAL ? getUrgencyColor(UrgencyLevel.CRITICAL) : ''
                  }`}
                >
                  <AlertTriangle className="h-4 w-4 inline mr-1" />
                  Critical
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={UrgencyLevel.HIGH} id="high" />
                <Label 
                  htmlFor="high" 
                  className={`cursor-pointer px-3 py-2 rounded-lg border ${
                    urgencyLevel === UrgencyLevel.HIGH ? getUrgencyColor(UrgencyLevel.HIGH) : ''
                  }`}
                >
                  <AlertCircle className="h-4 w-4 inline mr-1" />
                  High
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={UrgencyLevel.MEDIUM} id="medium" />
                <Label 
                  htmlFor="medium" 
                  className={`cursor-pointer px-3 py-2 rounded-lg border ${
                    urgencyLevel === UrgencyLevel.MEDIUM ? getUrgencyColor(UrgencyLevel.MEDIUM) : ''
                  }`}
                >
                  <Clock className="h-4 w-4 inline mr-1" />
                  Medium
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={UrgencyLevel.LOW} id="low" />
                <Label 
                  htmlFor="low" 
                  className={`cursor-pointer px-3 py-2 rounded-lg border ${
                    urgencyLevel === UrgencyLevel.LOW ? getUrgencyColor(UrgencyLevel.LOW) : ''
                  }`}
                >
                  <MessageSquare className="h-4 w-4 inline mr-1" />
                  Low
                </Label>
              </div>
            </div>
          </RadioGroup>
        </div>

        {/* Access Level */}
        <div className="space-y-2">
          <Label>Requested Access Level</Label>
          <RadioGroup
            value={activationLevel}
            onValueChange={(value) => setActivationLevel(value as ActivationLevel)}
          >
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={ActivationLevel.VIEW_ONLY} id="view_only" />
                <Label htmlFor="view_only" className="flex items-center cursor-pointer">
                  <Shield className="h-4 w-4 mr-2 text-blue-600" />
                  View Only - Read access to essential information
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={ActivationLevel.LIMITED} id="limited" />
                <Label htmlFor="limited" className="flex items-center cursor-pointer">
                  <Shield className="h-4 w-4 mr-2 text-green-600" />
                  Limited - Access to most information
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={ActivationLevel.PARTIAL} id="partial" />
                <Label htmlFor="partial" className="flex items-center cursor-pointer">
                  <Shield className="h-4 w-4 mr-2 text-orange-600" />
                  Partial - Standard emergency access
                </Label>
              </div>
            </div>
          </RadioGroup>
        </div>

        {/* Reason */}
        <div className="space-y-2">
          <Label htmlFor="reason">Reason for Request</Label>
          <Textarea
            id="reason"
            placeholder="Please explain why you need emergency access..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            className="resize-none"
          />
          <p className="text-xs text-gray-500">
            This will be shown to the user for verification
          </p>
        </div>

        {/* Warning */}
        <Alert>
          <UserCheck className="h-4 w-4" />
          <AlertDescription>
            The user will receive a notification and must approve this request before 
            access is granted. False requests may result in removal as a trusted contact.
          </AlertDescription>
        </Alert>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Submit Button */}
        <Button
          onClick={handleRequestActivation}
          disabled={loading || !selectedContact || !reason}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending Request...
            </>
          ) : (
            <>
              <Shield className="h-4 w-4 mr-2" />
              Request Emergency Access
            </>
          )}
        </Button>
      </div>
    </Card>
  )
}