'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  ChevronRight,
  ChevronLeft,
  FileText,
  Users,
  Package,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  Info,
  Sparkles,
  Lock,
  Heart
} from 'lucide-react'

interface OnboardingWizardProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (data: OnboardingData) => void
  currentMetrics?: {
    contactsCount: number
    assetsCount: number
    filesCount: number
    messagesCount: number
  }
}

interface OnboardingData {
  profile: {
    displayName: string
    timezone: string
    notifications: boolean
  }
  security: {
    backupReminders: boolean
    twoFactorEnabled: boolean
    emergencyKitCreated: boolean
  }
  priorities: string[]
  skippedSteps: string[]
  selectedTemplates?: string[]
}

const TOTAL_STEPS = 5

export default function OnboardingWizard({ isOpen, onClose, onComplete, currentMetrics }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<OnboardingData>({
    profile: {
      displayName: '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      notifications: true
    },
    security: {
      backupReminders: true,
      twoFactorEnabled: false,
      emergencyKitCreated: false
    },
    priorities: [],
    skippedSteps: []
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {}

    switch (step) {
      case 2: // Profile
        if (!formData.profile.displayName.trim()) {
          newErrors.displayName = 'Display name is required'
        }
        break
      case 3: // Security
        // Security step is optional, no validation needed
        break
      case 4: // Priorities
        if (formData.priorities.length === 0) {
          newErrors.priorities = 'Please select at least one priority area'
        }
        break
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (currentStep === 1 || validateStep(currentStep)) {
      if (currentStep < TOTAL_STEPS) {
        setCurrentStep(currentStep + 1)
      } else {
        handleComplete()
      }
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = () => {
    setFormData(prev => ({
      ...prev,
      skippedSteps: [...prev.skippedSteps, `step-${currentStep}`]
    }))
    handleNext()
  }

  const handleComplete = () => {
    onComplete(formData)
  }

  const updateFormData = (section: keyof OnboardingData, data: Record<string, unknown>) => {
    setFormData(prev => ({
      ...prev,
      [section]: { ...prev[section as any], ...data }
    }))
  }

  const togglePriority = (priority: string) => {
    setFormData(prev => ({
      ...prev,
      priorities: prev.priorities.includes(priority)
        ? prev.priorities.filter(p => p !== priority)
        : [...prev.priorities, priority]
    }))
  }

  const getStepContent = () => {
    switch (currentStep) {
      case 1:
        return <WelcomeStep metrics={currentMetrics} />
      case 2:
        return (
          <ProfileStep
            data={formData.profile}
            onChange={(data) => updateFormData('profile', data)}
            errors={errors}
          />
        )
      case 3:
        return (
          <SecurityStep
            data={formData.security}
            onChange={(data) => updateFormData('security', data)}
          />
        )
      case 4:
        return (
          <PrioritiesStep
            selectedPriorities={formData.priorities}
            onTogglePriority={togglePriority}
            errors={errors}
          />
        )
      case 5:
        return <CompletionStep formData={formData} />
      default:
        return null
    }
  }

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return 'Welcome to If I\'m Gone'
      case 2: return 'Set Up Your Profile'
      case 3: return 'Security Settings'
      case 4: return 'Choose Your Priorities'
      case 5: return 'You&apos;re All Set!'
      default: return ''
    }
  }

  const progress = (currentStep / TOTAL_STEPS) * 100

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{getStepTitle()}</DialogTitle>
          <DialogDescription>
            Step {currentStep} of {TOTAL_STEPS}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Progress value={progress} className="mb-6" />
          {getStepContent()}
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            {currentStep > 1 && (
              <Button variant="outline" onClick={handleBack}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {currentStep > 1 && currentStep < 5 && (
              <Button variant="ghost" onClick={handleSkip}>
                Skip
              </Button>
            )}
            <Button onClick={handleNext}>
              {currentStep === TOTAL_STEPS ? 'Get Started' : 'Next'}
              {currentStep < TOTAL_STEPS && <ChevronRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Step Components
function WelcomeStep({ metrics }: { metrics?: { contactsCount?: number; assetsCount?: number; filesCount?: number; messagesCount?: number } }) {
  const totalItems = (metrics?.contactsCount || 0) + (metrics?.assetsCount || 0) + 
                    (metrics?.filesCount || 0) + (metrics?.messagesCount || 0)

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <Sparkles className="h-8 w-8 text-blue-600" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Welcome to Your Digital Legacy</h3>
        <p className="text-gray-600">
          Let's set up your account to help you organize and protect your most important information.
        </p>
      </div>

      {totalItems === 0 ? (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">First Time Here?</p>
                <p className="text-sm text-blue-700 mt-1">
                  This quick setup will help you get started with organizing your emergency information,
                  important documents, and messages for your loved ones.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-900">Welcome Back!</p>
                <p className="text-sm text-green-700 mt-1">
                  You already have {totalItems} items stored. This wizard will help you complete your setup
                  and discover new features.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <Lock className="h-5 w-5 text-gray-600 mb-2" />
            <CardTitle className="text-sm">Secure & Private</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-600">
              Your data is encrypted client-side. Only you have access.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <Heart className="h-5 w-5 text-gray-600 mb-2" />
            <CardTitle className="text-sm">Peace of Mind</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-600">
              Ensure your loved ones have access when they need it most.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

interface ProfileStepProps {
  data: {
    displayName: string
    timezone: string
    notifications: boolean
  }
  onChange: (data: Partial<ProfileStepProps['data']>) => void
  errors: Record<string, string>
}

function ProfileStep({ data, onChange, errors }: ProfileStepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="displayName">Display Name</Label>
          <Input
            id="displayName"
            value={data.displayName}
            onChange={(e) => onChange({ displayName: e.target.value })}
            placeholder="How should we address you?"
            className={errors.displayName ? 'border-red-500' : ''}
          />
          {errors.displayName && (
            <p className="text-sm text-red-500 mt-1">{errors.displayName}</p>
          )}
        </div>

        <div>
          <Label htmlFor="timezone">Timezone</Label>
          <Input
            id="timezone"
            value={data.timezone}
            onChange={(e) => onChange({ timezone: e.target.value })}
            placeholder="Your timezone"
          />
          <p className="text-xs text-gray-500 mt-1">
            Used for scheduling and notifications
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="notifications"
            checked={data.notifications}
            onCheckedChange={(checked) => onChange({ notifications: checked })}
          />
          <Label htmlFor="notifications" className="font-normal">
            Send me helpful reminders and updates
          </Label>
        </div>
      </div>
    </div>
  )
}

interface SecurityStepProps {
  data: {
    backupReminders: boolean
    twoFactorEnabled: boolean
    emergencyKitCreated: boolean
  }
  onChange: (data: Partial<SecurityStepProps['data']>) => void
}

function SecurityStep({ data, onChange }: SecurityStepProps) {
  return (
    <div className="space-y-6">
      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-900">Important Security Settings</p>
              <p className="text-sm text-yellow-700 mt-1">
                These settings help protect your account and ensure your data remains accessible.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="backupReminders"
            checked={data.backupReminders}
            onCheckedChange={(checked) => onChange({ backupReminders: checked })}
          />
          <Label htmlFor="backupReminders" className="font-normal">
            <div>
              <p className="font-medium">Enable backup reminders</p>
              <p className="text-sm text-gray-500">Get notified to backup your data regularly</p>
            </div>
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="twoFactor"
            checked={data.twoFactorEnabled}
            onCheckedChange={(checked) => onChange({ twoFactorEnabled: checked })}
          />
          <Label htmlFor="twoFactor" className="font-normal">
            <div>
              <p className="font-medium">Enable two-factor authentication</p>
              <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
            </div>
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="emergencyKit"
            checked={data.emergencyKitCreated}
            onCheckedChange={(checked) => onChange({ emergencyKitCreated: checked })}
          />
          <Label htmlFor="emergencyKit" className="font-normal">
            <div>
              <p className="font-medium">Create an emergency access kit</p>
              <p className="text-sm text-gray-500">Prepare offline access instructions for emergencies</p>
            </div>
          </Label>
        </div>
      </div>
    </div>
  )
}

interface PrioritiesStepProps {
  selectedPriorities: string[]
  onTogglePriority: (priority: string) => void
  errors: Record<string, string>
}

function PrioritiesStep({ selectedPriorities, onTogglePriority, errors }: PrioritiesStepProps) {
  const priorities = [
    {
      id: 'contacts',
      title: 'Emergency Contacts',
      description: 'Important people to notify',
      icon: Users,
      color: 'blue'
    },
    {
      id: 'documents',
      title: 'Critical Documents',
      description: 'Wills, insurance, medical directives',
      icon: FileText,
      color: 'green'
    },
    {
      id: 'assets',
      title: 'Digital Assets',
      description: 'Online accounts and subscriptions',
      icon: Package,
      color: 'purple'
    },
    {
      id: 'messages',
      title: 'Personal Messages',
      description: 'Letters and instructions for loved ones',
      icon: MessageSquare,
      color: 'pink'
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <p className="text-gray-600 mb-4">
          Select the areas you&apos;d like to focus on first. You can always add more later.
        </p>
        {errors.priorities && (
          <p className="text-sm text-red-500 mb-4">{errors.priorities}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {priorities.map((priority) => {
          const Icon = priority.icon
          const isSelected = selectedPriorities.includes(priority.id)
          
          return (
            <Card
              key={priority.id}
              className={`cursor-pointer transition-all ${
                isSelected 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'hover:border-gray-300'
              }`}
              onClick={() => onTogglePriority(priority.id)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Icon className={`h-6 w-6 ${
                    isSelected ? 'text-blue-600' : 'text-gray-400'
                  }`} />
                  {isSelected && <CheckCircle className="h-5 w-5 text-blue-600" />}
                </div>
                <CardTitle className="text-base">{priority.title}</CardTitle>
                <CardDescription>{priority.description}</CardDescription>
              </CardHeader>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

interface CompletionStepProps {
  formData: OnboardingData
}

function CompletionStep({ formData }: CompletionStepProps) {
  const getPriorityInfo = (priorityId: string) => {
    const map: Record<string, { title: string; action: string }> = {
      contacts: { title: 'Emergency Contacts', action: 'Add your first contact' },
      documents: { title: 'Critical Documents', action: 'Upload a document' },
      assets: { title: 'Digital Assets', action: 'Add an online account' },
      messages: { title: 'Personal Messages', action: 'Write your first message' }
    }
    return map[priorityId] || { title: priorityId, action: 'Get started' }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-xl font-semibold mb-2">You&apos;re All Set!</h3>
        <p className="text-gray-600">
          Your account is ready. Here&apos;s what we&apos;ll help you do first:
        </p>
      </div>

      {formData.priorities.length > 0 && (
        <div>
          <h4 className="font-medium mb-3">Your Priority Areas:</h4>
          <div className="space-y-2">
            {formData.priorities.map((priority: string) => {
              const info = getPriorityInfo(priority)
              return (
                <Card key={priority} className="bg-gray-50">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{info.title}</span>
                      <span className="text-xs text-gray-500">{info.action}</span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <h4 className="font-medium mb-2">Next Steps:</h4>
          <ul className="space-y-2 text-sm text-blue-700">
            <li className="flex items-start">
              <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
              <span>Your dashboard will guide you through setting up each area</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
              <span>Start with adding one or two items in your priority areas</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
              <span>Set up emergency access for your trusted contacts</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}