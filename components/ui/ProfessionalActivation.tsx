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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Stethoscope, Scale, Shield, AlertTriangle, 
  CheckCircle, Loader2, FileText, User,
  Building, Hash, Calendar, Clock,
  AlertCircle, Upload, Check
} from 'lucide-react'
import { manualActivationService, UrgencyLevel, ProfessionalCredentials } from '@/services/manual-activation-service'

interface ProfessionalActivationProps {
  userId: string
  onActivationComplete?: (requestId: string) => void
}

export function ProfessionalActivation({
  userId,
  onActivationComplete
}: ProfessionalActivationProps) {
  const [activeTab, setActiveTab] = useState<'medical' | 'legal'>('medical')
  const [isRegistered, setIsRegistered] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [requestId, setRequestId] = useState('')

  // Registration fields
  const [credentials, setCredentials] = useState<Partial<ProfessionalCredentials>>({
    type: 'medical',
    name: '',
    licenseNumber: '',
    organization: ''
  })

  // Activation fields
  const [urgencyLevel, setUrgencyLevel] = useState<UrgencyLevel>(UrgencyLevel.HIGH)
  const [reason, setReason] = useState('')
  const [medicalJustification, setMedicalJustification] = useState('')
  const [legalJustification, setLegalJustification] = useState('')
  const [courtOrder, setCourtOrder] = useState('')
  const [courtOrderFile, setCourtOrderFile] = useState<File | null>(null)

  const handleRegister = async () => {
    setLoading(true)
    setError('')

    try {
      if (!credentials.name || !credentials.licenseNumber) {
        throw new Error('Please fill in all required fields')
      }

      const fullCredentials: ProfessionalCredentials = {
        id: `${credentials.type}_${credentials.licenseNumber}`,
        type: activeTab,
        name: credentials.name,
        licenseNumber: credentials.licenseNumber,
        organization: credentials.organization,
        authorizedUsers: [userId]
      }

      await manualActivationService.registerProfessionalCredentials(fullCredentials)
      setIsRegistered(true)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const handleMedicalActivation = async () => {
    setLoading(true)
    setError('')

    try {
      if (!reason || !medicalJustification) {
        throw new Error('Please provide all required information')
      }

      const request = await manualActivationService.requestActivationByMedicalProfessional(
        `medical_${credentials.licenseNumber}`,
        userId,
        reason,
        medicalJustification,
        urgencyLevel
      )

      setRequestId(request.id)
      setSuccess(true)
      
      if (onActivationComplete) {
        onActivationComplete(request.id)
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Activation request failed')
    } finally {
      setLoading(false)
    }
  }

  const handleLegalActivation = async () => {
    setLoading(true)
    setError('')

    try {
      if (!reason || !legalJustification) {
        throw new Error('Please provide all required information')
      }

      const request = await manualActivationService.requestActivationByLegalRepresentative(
        `legal_${credentials.licenseNumber}`,
        userId,
        reason,
        legalJustification,
        courtOrder
      )

      setRequestId(request.id)
      setSuccess(true)
      
      if (onActivationComplete) {
        onActivationComplete(request.id)
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Activation request failed')
    } finally {
      setLoading(false)
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
            <h3 className="text-lg font-semibold">Emergency Access Granted</h3>
            <p className="text-sm text-gray-600 mt-1">
              Professional activation has been approved
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Request ID:</span>
              <span className="font-mono">{requestId.slice(0, 8)}...</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Professional:</span>
              <span className="font-medium">{credentials.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Access Duration:</span>
              <span className="font-medium">
                {activeTab === 'medical' ? '72 hours' : '30 days'}
              </span>
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
      </Card>
    )
  }

  return (
    <Card className="p-6 max-w-2xl mx-auto">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <h3 className="text-lg font-semibold">Professional Emergency Access</h3>
          <p className="text-sm text-gray-600 mt-1">
            Medical professionals and legal representatives can request emergency access
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'medical' | 'legal')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="medical">
              <Stethoscope className="h-4 w-4 mr-2" />
              Medical Professional
            </TabsTrigger>
            <TabsTrigger value="legal">
              <Scale className="h-4 w-4 mr-2" />
              Legal Representative
            </TabsTrigger>
          </TabsList>

          <TabsContent value="medical" className="space-y-4">
            {!isRegistered ? (
              // Medical Registration Form
              <div className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    First-time medical professionals must register their credentials
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="med-name">Full Name</Label>
                  <Input
                    id="med-name"
                    placeholder="Dr. Jane Smith"
                    value={credentials.name}
                    onChange={(e) => setCredentials({ ...credentials, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="med-license">Medical License Number</Label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="med-license"
                      placeholder="MD123456"
                      value={credentials.licenseNumber}
                      onChange={(e) => setCredentials({ ...credentials, licenseNumber: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="med-org">Hospital/Clinic (Optional)</Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="med-org"
                      placeholder="City General Hospital"
                      value={credentials.organization}
                      onChange={(e) => setCredentials({ ...credentials, organization: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleRegister}
                  disabled={loading || !credentials.name || !credentials.licenseNumber}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verifying Credentials...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Register & Continue
                    </>
                  )}
                </Button>
              </div>
            ) : (
              // Medical Activation Form
              <div className="space-y-4">
                <div className="bg-blue-50 rounded-lg p-4 flex items-start space-x-3">
                  <Stethoscope className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-blue-900">{credentials.name}</p>
                    <p className="text-sm text-blue-700">License: {credentials.licenseNumber}</p>
                    {credentials.organization && (
                      <p className="text-sm text-blue-700">{credentials.organization}</p>
                    )}
                  </div>
                  <Badge variant="secondary">Verified</Badge>
                </div>

                <div className="space-y-2">
                  <Label>Urgency Level</Label>
                  <RadioGroup
                    value={urgencyLevel}
                    onValueChange={(v) => setUrgencyLevel(v as UrgencyLevel)}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value={UrgencyLevel.CRITICAL} id="med-critical" />
                      <Label htmlFor="med-critical" className="flex items-center cursor-pointer">
                        <AlertTriangle className="h-4 w-4 mr-2 text-red-600" />
                        Critical - Immediate medical emergency
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value={UrgencyLevel.HIGH} id="med-high" />
                      <Label htmlFor="med-high" className="flex items-center cursor-pointer">
                        <Clock className="h-4 w-4 mr-2 text-orange-600" />
                        High - Urgent medical situation
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="med-reason">Reason for Access</Label>
                  <Input
                    id="med-reason"
                    placeholder="e.g., Patient unconscious, emergency treatment needed"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="med-justification">Medical Justification</Label>
                  <Textarea
                    id="med-justification"
                    placeholder="Provide medical justification for emergency access..."
                    value={medicalJustification}
                    onChange={(e) => setMedicalJustification(e.target.value)}
                    rows={4}
                  />
                  <p className="text-xs text-gray-500">
                    This will be logged for compliance and audit purposes
                  </p>
                </div>

                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    Access will be granted for 72 hours with partial access level. 
                    All actions will be logged and audited.
                  </AlertDescription>
                </Alert>

                <Button
                  onClick={handleMedicalActivation}
                  disabled={loading || !reason || !medicalJustification}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Requesting Access...
                    </>
                  ) : (
                    <>
                      <Stethoscope className="h-4 w-4 mr-2" />
                      Request Medical Emergency Access
                    </>
                  )}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="legal" className="space-y-4">
            {!isRegistered ? (
              // Legal Registration Form
              <div className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Legal representatives must register their credentials
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="legal-name">Full Name</Label>
                  <Input
                    id="legal-name"
                    placeholder="John Doe, Esq."
                    value={credentials.name}
                    onChange={(e) => setCredentials({ ...credentials, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="legal-license">Bar Number</Label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="legal-license"
                      placeholder="123456"
                      value={credentials.licenseNumber}
                      onChange={(e) => setCredentials({ ...credentials, licenseNumber: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="legal-org">Law Firm (Optional)</Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="legal-org"
                      placeholder="Smith & Associates"
                      value={credentials.organization}
                      onChange={(e) => setCredentials({ ...credentials, organization: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleRegister}
                  disabled={loading || !credentials.name || !credentials.licenseNumber}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verifying Credentials...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Register & Continue
                    </>
                  )}
                </Button>
              </div>
            ) : (
              // Legal Activation Form
              <div className="space-y-4">
                <div className="bg-purple-50 rounded-lg p-4 flex items-start space-x-3">
                  <Scale className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-purple-900">{credentials.name}</p>
                    <p className="text-sm text-purple-700">Bar #: {credentials.licenseNumber}</p>
                    {credentials.organization && (
                      <p className="text-sm text-purple-700">{credentials.organization}</p>
                    )}
                  </div>
                  <Badge variant="secondary">Verified</Badge>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="legal-reason">Reason for Access</Label>
                  <Input
                    id="legal-reason"
                    placeholder="e.g., Client incapacitated, legal matters require attention"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="legal-justification">Legal Justification</Label>
                  <Textarea
                    id="legal-justification"
                    placeholder="Provide legal basis for emergency access..."
                    value={legalJustification}
                    onChange={(e) => setLegalJustification(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="court-order">Court Order Number (Optional)</Label>
                  <Input
                    id="court-order"
                    placeholder="e.g., 2024-CV-12345"
                    value={courtOrder}
                    onChange={(e) => setCourtOrder(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="court-file">Upload Court Order (Optional)</Label>
                  <div className="border-2 border-dashed rounded-lg p-4 text-center">
                    <input
                      id="court-file"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => setCourtOrderFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <label
                      htmlFor="court-file"
                      className="cursor-pointer flex flex-col items-center"
                    >
                      <Upload className="h-8 w-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600">
                        {courtOrderFile ? courtOrderFile.name : 'Click to upload document'}
                      </span>
                    </label>
                  </div>
                </div>

                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    Access will be granted for 30 days with limited access level. 
                    All actions will be logged and audited.
                  </AlertDescription>
                </Alert>

                <Button
                  onClick={handleLegalActivation}
                  disabled={loading || !reason || !legalJustification}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Requesting Access...
                    </>
                  ) : (
                    <>
                      <Scale className="h-4 w-4 mr-2" />
                      Request Legal Emergency Access
                    </>
                  )}
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    </Card>
  )
}