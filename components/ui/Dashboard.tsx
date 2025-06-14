'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Shield,
  Users,
  Package,
  TrendingUp,
  Calendar,
  Search,
  Settings,
  HelpCircle,
  Bell,
  Eye,
  EyeOff,
  RefreshCw,
  Download,
  Upload,
  Lock,
  Unlock,
  ChevronRight,
  Plus,
  Edit,
  Trash2,
  Star,
  Zap,
  BarChart3,
  PieChart,
  Target,
  Sparkles,
  FileCheck
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import OnboardingWizard from './OnboardingWizard'
import TemplateLibrary from './TemplateLibrary'
import ContextualHelp from './ContextualHelp'
import HelpTooltip from './HelpTooltip'
import { onboardingService } from '@/services/onboarding-service'

interface DashboardProps {
  onNavigate: (view: string) => void
  contactsCount?: number
  assetsCount?: number
  filesCount?: number
  messagesCount?: number
}

interface ActivityItem {
  id: string
  type: 'created' | 'updated' | 'accessed' | 'backed_up' | 'deleted'
  description: string
  timestamp: Date
  category: 'file' | 'contact' | 'asset' | 'backup' | 'security' | 'message'
}

interface SystemMetric {
  id: string
  title: string
  value: number
  total: number
  percentage: number
  status: 'excellent' | 'good' | 'warning' | 'critical'
  description: string
  actionText?: string
  actionCallback?: () => void
}

export default function Dashboard({
  onNavigate,
  contactsCount = 0,
  assetsCount = 0,
  filesCount = 0,
  messagesCount = 0
}: DashboardProps) {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [showAllActivity, setShowAllActivity] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false)

  // Check if user needs onboarding
  useEffect(() => {
    const shouldShow = onboardingService.shouldShowOnboarding({
      contactsCount,
      assetsCount,
      filesCount,
      messagesCount
    })
    
    if (shouldShow) {
      setShowOnboarding(true)
    }
  }, [contactsCount, assetsCount, filesCount, messagesCount])

  const handleOnboardingComplete = (data: any) => {
    // Save onboarding completion
    onboardingService.completeOnboarding(data)
    setShowOnboarding(false)
    
    // Navigate to first priority area if selected
    if (data.priorities.length > 0) {
      const firstPriority = data.priorities[0]
      const navigationMap: Record<string, string> = {
        contacts: 'contacts',
        documents: 'files',
        assets: 'assets',
        messages: 'messages'
      }
      
      if (navigationMap[firstPriority]) {
        setTimeout(() => onNavigate(navigationMap[firstPriority]), 500)
      }
    }
  }

  // Mock activity data - in a real app this would come from an API
  const [recentActivity] = useState<ActivityItem[]>([
    {
      id: '1',
      type: 'created',
      description: 'Added new emergency contact: Sarah Johnson',
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      category: 'contact'
    },
    {
      id: '2',
      type: 'updated',
      description: 'Updated bank account information',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      category: 'asset'
    },
    {
      id: '3',
      type: 'backed_up',
      description: 'Automatic backup completed successfully',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
      category: 'backup'
    },
    {
      id: '4',
      type: 'created',
      description: 'Created farewell message for family',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      category: 'message'
    },
    {
      id: '5',
      type: 'accessed',
      description: 'Emergency access verified',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
      category: 'security'
    }
  ])

  // Calculate system health metrics
  const systemMetrics = useMemo<SystemMetric[]>(() => {
    const contactsMetric = {
      id: 'contacts',
      title: 'Emergency Contacts',
      value: contactsCount,
      total: 5, // Recommended minimum
      percentage: Math.min((contactsCount / 5) * 100, 100),
      status: contactsCount >= 5 ? 'excellent' : contactsCount >= 3 ? 'good' : contactsCount >= 1 ? 'warning' : 'critical' as const,
      description: contactsCount >= 5 ? 'Great! You have sufficient emergency contacts.' : 'Consider adding more emergency contacts for better coverage.',
      actionText: contactsCount === 0 ? 'Add Contact' : 'Manage Contacts',
      actionCallback: () => onNavigate('contacts')
    }

    const assetsMetric = {
      id: 'assets',
      title: 'Digital Assets',
      value: assetsCount,
      total: 10,
      percentage: Math.min((assetsCount / 10) * 100, 100),
      status: assetsCount >= 10 ? 'excellent' : assetsCount >= 5 ? 'good' : assetsCount >= 2 ? 'warning' : 'critical' as const,
      description: assetsCount >= 5 ? 'Good asset documentation.' : 'Document more of your digital assets.',
      actionText: 'Manage Assets',
      actionCallback: () => onNavigate('assets')
    }

    const filesMetric = {
      id: 'files',
      title: 'Important Files',
      value: filesCount,
      total: 8,
      percentage: Math.min((filesCount / 8) * 100, 100),
      status: filesCount >= 8 ? 'excellent' : filesCount >= 4 ? 'good' : filesCount >= 1 ? 'warning' : 'critical' as const,
      description: filesCount >= 4 ? 'Your files are well organized.' : 'Store more important documents securely.',
      actionText: 'Manage Files',
      actionCallback: () => onNavigate('files')
    }

    const messagesMetric = {
      id: 'messages',
      title: 'Messages & Instructions',
      value: messagesCount,
      total: 3,
      percentage: Math.min((messagesCount / 3) * 100, 100),
      status: messagesCount >= 3 ? 'excellent' : messagesCount >= 2 ? 'good' : messagesCount >= 1 ? 'warning' : 'critical' as const,
      description: messagesCount >= 2 ? 'Good message coverage.' : 'Create messages for different scenarios.',
      actionText: 'Create Message',
      actionCallback: () => onNavigate('messages')
    }

    return [contactsMetric, assetsMetric, filesMetric, messagesMetric]
  }, [contactsCount, assetsCount, filesCount, messagesCount, onNavigate])

  // Calculate overall completion percentage
  const overallCompletion = useMemo(() => {
    const totalPercentage = systemMetrics.reduce((sum, metric) => sum + metric.percentage, 0)
    return Math.round(totalPercentage / systemMetrics.length)
  }, [systemMetrics])

  // Get status color classes
  const getStatusColor = (status: SystemMetric['status']) => {
    switch (status) {
      case 'excellent': return 'text-green-600 bg-green-50 border-green-200'
      case 'good': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'critical': return 'text-red-600 bg-red-50 border-red-200'
    }
  }

  const getStatusIcon = (status: SystemMetric['status']) => {
    switch (status) {
      case 'excellent': return CheckCircle
      case 'good': return CheckCircle
      case 'warning': return AlertTriangle
      case 'critical': return AlertTriangle
    }
  }

  const formatRelativeTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  const getActivityIcon = (category: ActivityItem['category']) => {
    switch (category) {
      case 'file': return FileText
      case 'contact': return Users
      case 'asset': return Package
      case 'backup': return Shield
      case 'security': return Lock
      case 'message': return Edit
    }
  }

  const handleRefresh = () => {
    setLastRefresh(new Date())
    // In a real app, this would trigger data refresh
  }

  return (
    <div className="space-y-6">
      {/* Onboarding Wizard */}
      <OnboardingWizard
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={handleOnboardingComplete}
        currentMetrics={{ contactsCount, assetsCount, filesCount, messagesCount }}
      />

      {/* Template Library */}
      <TemplateLibrary
        isOpen={showTemplateLibrary}
        onClose={() => setShowTemplateLibrary(false)}
        onApplyTemplate={(templateId, fieldValues) => {
          // For now, just log the template application
          console.log('Applying template:', templateId, fieldValues)
          setShowTemplateLibrary(false)
          // In a real implementation, this would call the template service
          // and navigate to the appropriate section
        }}
        mode="apply"
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <p className="text-gray-600">Welcome back, {user?.email || 'User'}. Here's your digital legacy overview.</p>
        </div>
        <div className="flex items-center space-x-2">
          <ContextualHelp
            context={{
              page: 'dashboard',
              completionLevel: overallCompletion
            }}
            buttonText="Dashboard Help"
            buttonVariant="outline"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </Button>
          <span className="text-xs text-gray-500">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Overall Progress */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <HelpTooltip
              tooltipId="dashboard-setup-completion"
              config={{
                content: "This shows your overall progress in setting up your digital legacy. Complete all recommended tasks to reach 100%.",
                placement: "right"
              }}
            >
              <h3 className="text-lg font-semibold">Setup Completion</h3>
            </HelpTooltip>
            <p className="text-sm text-gray-600">Your digital legacy preparation progress</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-600">{overallCompletion}%</div>
            <div className="text-sm text-gray-500">Complete</div>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-300"
            style={{ width: `${overallCompletion}%` }}
          />
        </div>
        {overallCompletion < 100 && (
          <div className="mt-2 space-y-2">
            <p className="text-sm text-gray-600">
              Continue setting up your account to ensure your digital legacy is complete.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOnboarding(true)}
                className="text-xs"
              >
                <HelpCircle className="h-3 w-3 mr-1" />
                Setup Guide
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTemplateLibrary(true)}
                className="text-xs"
              >
                <Sparkles className="h-3 w-3 mr-1" />
                Quick Templates
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* System Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {systemMetrics.map((metric) => {
          const StatusIcon = getStatusIcon(metric.status)
          return (
            <div key={metric.id} className={`p-4 rounded-lg border ${getStatusColor(metric.status)}`}>
              <div className="flex items-center justify-between mb-2">
                <StatusIcon className="h-5 w-5" />
                <span className="text-lg font-bold">{metric.value}</span>
              </div>
              <h4 className="font-medium mb-1">{metric.title}</h4>
              <p className="text-xs mb-3">{metric.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex-1 bg-white bg-opacity-50 rounded-full h-2 mr-2">
                  <div 
                    className="h-2 rounded-full bg-current opacity-60 transition-all duration-300"
                    style={{ width: `${metric.percentage}%` }}
                  />
                </div>
                {metric.actionCallback && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={metric.actionCallback}
                    className="text-xs p-1 h-auto"
                  >
                    {metric.actionText}
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button
            variant="outline"
            onClick={() => onNavigate('editor')}
            className="flex items-center justify-center space-x-2 p-4 h-auto"
          >
            <Plus className="h-5 w-5" />
            <span>Create Document</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => onNavigate('contacts')}
            className="flex items-center justify-center space-x-2 p-4 h-auto"
          >
            <Users className="h-5 w-5" />
            <span>Add Contact</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowTemplateLibrary(true)}
            className="flex items-center justify-center space-x-2 p-4 h-auto"
          >
            <Sparkles className="h-5 w-5" />
            <span>Use Template</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => onNavigate('emergency')}
            className="flex items-center justify-center space-x-2 p-4 h-auto"
          >
            <Shield className="h-5 w-5" />
            <span>Test Access</span>
          </Button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Recent Activity</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAllActivity(!showAllActivity)}
          >
            {showAllActivity ? 'Show Less' : 'Show All'}
            <ChevronRight className={`h-4 w-4 ml-1 transition-transform ${showAllActivity ? 'rotate-90' : ''}`} />
          </Button>
        </div>
        
        <div className="space-y-3">
          {recentActivity
            .slice(0, showAllActivity ? recentActivity.length : 3)
            .map((activity) => {
              const ActivityIcon = getActivityIcon(activity.category)
              return (
                <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <ActivityIcon className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.description}</p>
                    <p className="text-xs text-gray-500">{formatRelativeTime(activity.timestamp)}</p>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs capitalize ${
                    activity.type === 'created' ? 'bg-green-100 text-green-800' :
                    activity.type === 'updated' ? 'bg-blue-100 text-blue-800' :
                    activity.type === 'accessed' ? 'bg-purple-100 text-purple-800' :
                    activity.type === 'backed_up' ? 'bg-orange-100 text-orange-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {activity.type.replace('_', ' ')}
                  </div>
                </div>
              )
            })}
        </div>
        
        {recentActivity.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Activity className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>No recent activity</p>
            <p className="text-sm">Start by creating your first document or adding contacts</p>
          </div>
        )}
      </div>

      {/* Security Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Shield className="h-5 w-5 mr-2 text-green-600" />
            Security Status
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Encryption</span>
              <span className="flex items-center text-green-600">
                <Lock className="h-4 w-4 mr-1" />
                Active
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Backup Status</span>
              <span className="flex items-center text-green-600">
                <CheckCircle className="h-4 w-4 mr-1" />
                Up to date
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Emergency Access</span>
              <span className="flex items-center text-blue-600">
                <AlertTriangle className="h-4 w-4 mr-1" />
                Configured
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Dead Man's Switch</span>
              <span className="flex items-center text-green-600">
                <Clock className="h-4 w-4 mr-1" />
                Active
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Trigger Conditions</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('triggers')}
                className="flex items-center text-blue-600 -mr-2"
              >
                <Zap className="h-4 w-4 mr-1" />
                Configure
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Compliance Status</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('compliance')}
                className="flex items-center text-blue-600 -mr-2"
              >
                <FileCheck className="h-4 w-4 mr-1" />
                View Report
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
            Usage Statistics
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Total Storage Used</span>
              <span className="font-medium">2.4 GB</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Files Created</span>
              <span className="font-medium">{filesCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Last Login</span>
              <span className="font-medium">Today</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Account Age</span>
              <span className="font-medium">7 days</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}