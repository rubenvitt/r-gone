'use client'

import { useState, useCallback } from 'react'
import {
  Play,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Calendar,
  User,
  FileText,
  Activity,
  Zap,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  ConditionalRule,
  MessagesLibrary,
  MessageConditionType
} from '@/types/data'
import {
  RuleEvaluationContext,
  RuleEvaluationResult,
  ruleEvaluationService
} from '@/services/rule-evaluation-service'
import { cn } from '@/lib/utils'

interface ConditionalRuleTesterProps {
  rule: ConditionalRule
  library: MessagesLibrary
  onClose: () => void
}

export default function ConditionalRuleTester({
  rule,
  library,
  onClose
}: ConditionalRuleTesterProps) {
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [evaluationResult, setEvaluationResult] = useState<RuleEvaluationResult | null>(null)
  const [expandedConditions, setExpandedConditions] = useState<Set<string>>(new Set())
  
  // Test context state
  const [testContext, setTestContext] = useState<Partial<RuleEvaluationContext>>({
    lastLoginDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    currentDate: new Date(),
    triggeredEvents: new Set<string>(),
    accessedDocuments: new Set<string>(),
    readMessages: new Set<string>(),
    deliveredMessages: new Set<string>(),
    activeDeadManSwitches: new Set<string>(),
    grantedEmergencyAccess: new Set<string>(),
    completedVerifications: new Set<string>(),
    accessedVaultItems: new Set<string>(),
    beneficiaryAccess: new Map<string, Date>()
  })

  // Condition type icons
  const conditionTypeIcons: Record<MessageConditionType, any> = {
    userInactivity: Clock,
    dateReached: Calendar,
    messageRead: CheckCircle,
    messageDelivered: CheckCircle,
    beneficiaryAccessed: User,
    documentAccessed: FileText,
    eventTriggered: Zap,
    deadManSwitch: Activity,
    emergencyAccess: AlertCircle,
    verificationComplete: CheckCircle,
    passwordVaultAccessed: FileText,
    customCondition: Zap
  }

  // Run evaluation
  const runEvaluation = useCallback(async () => {
    setIsEvaluating(true)
    setEvaluationResult(null)
    
    try {
      const context = ruleEvaluationService.buildEvaluationContext(
        'test-user',
        library,
        testContext
      )
      
      const result = await ruleEvaluationService.evaluateRule(rule, context)
      setEvaluationResult(result)
      
      // Expand all conditions to show results
      setExpandedConditions(new Set(rule.conditions.map(c => c.id)))
    } catch (error) {
      console.error('Evaluation failed:', error)
    } finally {
      setIsEvaluating(false)
    }
  }, [rule, library, testContext])

  // Toggle condition expansion
  const toggleCondition = useCallback((conditionId: string) => {
    setExpandedConditions(prev => {
      const next = new Set(prev)
      if (next.has(conditionId)) {
        next.delete(conditionId)
      } else {
        next.add(conditionId)
      }
      return next
    })
  }, [])

  // Update test context
  const updateTestContext = useCallback((updates: Partial<RuleEvaluationContext>) => {
    setTestContext(prev => ({
      ...prev,
      ...updates
    }))
  }, [])

  // Add/remove items from sets in context
  const toggleSetItem = useCallback((
    setName: keyof RuleEvaluationContext,
    item: string
  ) => {
    setTestContext(prev => {
      const currentSet = prev[setName] as Set<string> | undefined
      const newSet = new Set(currentSet || [])
      
      if (newSet.has(item)) {
        newSet.delete(item)
      } else {
        newSet.add(item)
      }
      
      return {
        ...prev,
        [setName]: newSet
      }
    })
  }, [])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Test Conditional Rule</h2>
              <p className="text-sm text-gray-600 mt-1">
                Configure test conditions and evaluate rule: <strong>{rule.name}</strong>
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Test Context Configuration */}
            <div className="space-y-4">
              <h3 className="font-medium">Test Context</h3>
              
              {/* User Activity */}
              <Card className="p-4">
                <h4 className="text-sm font-medium mb-3">User Activity</h4>
                <div className="space-y-2">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Last Login Date
                    </label>
                    <input
                      type="datetime-local"
                      value={testContext.lastLoginDate ? 
                        new Date(testContext.lastLoginDate.getTime() - testContext.lastLoginDate.getTimezoneOffset() * 60000)
                          .toISOString().slice(0, -1) : ''
                      }
                      onChange={(e) => updateTestContext({ 
                        lastLoginDate: e.target.value ? new Date(e.target.value) : undefined 
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Current Date (for testing)
                    </label>
                    <input
                      type="datetime-local"
                      value={testContext.currentDate ? 
                        new Date(testContext.currentDate.getTime() - testContext.currentDate.getTimezoneOffset() * 60000)
                          .toISOString().slice(0, -1) : ''
                      }
                      onChange={(e) => updateTestContext({ 
                        currentDate: e.target.value ? new Date(e.target.value) : new Date() 
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
              </Card>

              {/* Messages */}
              <Card className="p-4">
                <h4 className="text-sm font-medium mb-3">Messages</h4>
                <div className="space-y-2">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Read Messages
                    </label>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {library.messages.map(msg => (
                        <label key={msg.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={testContext.readMessages?.has(msg.id) || false}
                            onChange={() => toggleSetItem('readMessages', msg.id)}
                            className="rounded border-gray-300 text-blue-600"
                          />
                          <span className="text-sm">{msg.title}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Delivered Messages
                    </label>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {library.messages.map(msg => (
                        <label key={msg.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={testContext.deliveredMessages?.has(msg.id) || false}
                            onChange={() => toggleSetItem('deliveredMessages', msg.id)}
                            className="rounded border-gray-300 text-blue-600"
                          />
                          <span className="text-sm">{msg.title}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Events */}
              <Card className="p-4">
                <h4 className="text-sm font-medium mb-3">Events & Triggers</h4>
                <div className="space-y-2">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Triggered Events
                    </label>
                    <input
                      type="text"
                      placeholder="Enter event name and press Enter"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          const input = e.currentTarget
                          if (input.value.trim()) {
                            toggleSetItem('triggeredEvents', input.value.trim())
                            input.value = ''
                          }
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <div className="mt-2 flex flex-wrap gap-1">
                      {Array.from(testContext.triggeredEvents || []).map(event => (
                        <span
                          key={event}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                        >
                          {event}
                          <button
                            onClick={() => toggleSetItem('triggeredEvents', event)}
                            className="ml-1 text-blue-600 hover:text-blue-800"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Evaluation Results */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Evaluation Results</h3>
                <Button
                  onClick={runEvaluation}
                  disabled={isEvaluating}
                  size="sm"
                  className="gap-2"
                >
                  {isEvaluating ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  Run Test
                </Button>
              </div>

              {evaluationResult ? (
                <Card className="p-4">
                  {/* Overall Result */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-medium">Rule Match:</span>
                    <div className={cn(
                      "flex items-center space-x-2 px-3 py-1 rounded-full",
                      evaluationResult.matched
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    )}>
                      {evaluationResult.matched ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      <span className="text-sm font-medium">
                        {evaluationResult.matched ? 'Matched' : 'Not Matched'}
                      </span>
                    </div>
                  </div>

                  {/* Individual Conditions */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Conditions:</h4>
                    {rule.conditions.map((condition, index) => {
                      const result = evaluationResult.conditions.find(
                        c => c.conditionId === condition.id
                      )
                      const Icon = conditionTypeIcons[condition.type]
                      const isExpanded = expandedConditions.has(condition.id)

                      return (
                        <div key={condition.id} className="border rounded-lg">
                          <div
                            className="p-3 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                            onClick={() => toggleCondition(condition.id)}
                          >
                            <div className="flex items-center space-x-3">
                              <button className="p-0">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </button>
                              <Icon className="h-4 w-4 text-gray-500" />
                              <span className="text-sm">
                                {index > 0 && (
                                  <span className="font-medium mr-2">
                                    {condition.operator}
                                  </span>
                                )}
                                Condition {index + 1}
                              </span>
                            </div>
                            {result && (
                              <div className={cn(
                                "flex items-center space-x-1 px-2 py-1 rounded-full text-xs",
                                result.matched
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              )}>
                                {result.matched ? (
                                  <CheckCircle className="h-3 w-3" />
                                ) : (
                                  <XCircle className="h-3 w-3" />
                                )}
                                <span>{result.matched ? 'True' : 'False'}</span>
                              </div>
                            )}
                          </div>
                          {isExpanded && result && (
                            <div className="px-3 pb-3 text-sm text-gray-600">
                              <p className="font-medium text-gray-700 mb-1">
                                {getConditionDescription(condition)}
                              </p>
                              {result.reason && (
                                <p className="text-xs">{result.reason}</p>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Actions to Execute */}
                  {evaluationResult.matched && evaluationResult.actions.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="text-sm font-medium mb-2">
                        Actions to Execute:
                      </h4>
                      <div className="space-y-1">
                        {evaluationResult.actions.map((action, index) => (
                          <div
                            key={action.id}
                            className="flex items-center space-x-2 text-sm text-gray-600"
                          >
                            <span className="text-gray-400">{index + 1}.</span>
                            <span>{getActionDescription(action)}</span>
                            {action.delay && (
                              <span className="text-xs text-gray-500">
                                (after {action.delay} min)
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              ) : (
                <Card className="p-8 text-center text-gray-500">
                  <AlertCircle className="h-12 w-12 mx-auto mb-3" />
                  <p>Configure test conditions and click "Run Test" to evaluate the rule</p>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper functions
import { MessageCondition, ConditionalAction } from '@/types/data'

function getConditionDescription(condition: MessageCondition): string {
  switch (condition.type) {
    case 'userInactivity':
      return `User has been inactive for ${condition.parameters.inactivityDays} days`
    case 'dateReached':
      return `Current date has reached ${condition.parameters.targetDate ? 
        new Date(condition.parameters.targetDate).toLocaleString() : 'not set'}`
    case 'messageRead':
      return `Message has been read`
    case 'messageDelivered':
      return `Message has been delivered`
    case 'beneficiaryAccessed':
      return `Beneficiary has accessed the system`
    case 'documentAccessed':
      return `Document has been accessed`
    case 'eventTriggered':
      return `Event "${condition.parameters.eventName}" has been triggered`
    case 'deadManSwitch':
      return `Dead man's switch is active`
    case 'emergencyAccess':
      return `Emergency access has been granted`
    case 'verificationComplete':
      return `Verification has been completed`
    case 'passwordVaultAccessed':
      return `Password vault has been accessed`
    case 'customCondition':
      return `Custom condition`
    default:
      return 'Unknown condition'
  }
}

function getActionDescription(action: ConditionalAction): string {
  switch (action.type) {
    case 'sendMessage':
      return `Send message to ${action.parameters.recipientIds?.length || 0} recipients`
    case 'scheduleMessage':
      return `Schedule message for ${action.parameters.scheduledTime || 'later'}`
    case 'cancelMessage':
      return `Cancel scheduled message`
    case 'notifyUser':
      return `Notify user: "${action.parameters.notificationTitle}"`
    case 'notifyBeneficiary':
      return `Notify beneficiary: "${action.parameters.notificationTitle}"`
    case 'grantAccess':
      return `Grant access to ${action.parameters.resourceType}`
    case 'revokeAccess':
      return `Revoke access to ${action.parameters.resourceType}`
    case 'triggerEvent':
      return `Trigger event: "${action.parameters.eventName}"`
    case 'executeWebhook':
      return `Execute webhook to ${action.parameters.webhookUrl}`
    case 'logEvent':
      return `Log ${action.parameters.logLevel}: "${action.parameters.logMessage}"`
    default:
      return 'Unknown action'
  }
}