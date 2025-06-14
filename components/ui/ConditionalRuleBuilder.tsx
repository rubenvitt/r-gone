'use client'

import { useState, useCallback } from 'react'
import {
  Plus,
  Minus,
  ChevronDown,
  ChevronUp,
  Settings,
  Trash2,
  Copy,
  AlertCircle,
  Check,
  X,
  Zap,
  Clock,
  Calendar,
  Mail,
  User,
  FileText,
  Key,
  Activity,
  Bell
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  ConditionalRule,
  MessageCondition,
  MessageConditionType,
  MessageConditionParameters,
  ConditionalAction,
  ConditionalActionType,
  ConditionalActionParameters
} from '@/types/data'
import { cn } from '@/lib/utils'

interface ConditionalRuleBuilderProps {
  rule?: ConditionalRule
  onSave: (rule: Partial<ConditionalRule>) => void
  onCancel: () => void
  availableMessages?: Array<{ id: string; title: string }>
  availableBeneficiaries?: Array<{ id: string; name: string }>
  availableDocuments?: Array<{ id: string; name: string }>
}

export default function ConditionalRuleBuilder({
  rule,
  onSave,
  onCancel,
  availableMessages = [],
  availableBeneficiaries = [],
  availableDocuments = []
}: ConditionalRuleBuilderProps) {
  const [name, setName] = useState(rule?.name || '')
  const [description, setDescription] = useState(rule?.description || '')
  const [enabled, setEnabled] = useState(rule?.enabled ?? true)
  const [priority, setPriority] = useState(rule?.priority || 1)
  const [conditions, setConditions] = useState<MessageCondition[]>(
    rule?.conditions || []
  )
  const [actions, setActions] = useState<ConditionalAction[]>(
    rule?.actions || []
  )
  const [errors, setErrors] = useState<string[]>([])
  const [expandedConditions, setExpandedConditions] = useState<Set<string>>(new Set())
  const [expandedActions, setExpandedActions] = useState<Set<string>>(new Set())

  // Condition type icons
  const conditionTypeIcons: Record<MessageConditionType, any> = {
    userInactivity: Clock,
    dateReached: Calendar,
    messageRead: Mail,
    messageDelivered: Check,
    beneficiaryAccessed: User,
    documentAccessed: FileText,
    eventTriggered: Zap,
    deadManSwitch: Activity,
    emergencyAccess: AlertCircle,
    verificationComplete: Check,
    passwordVaultAccessed: Key,
    customCondition: Settings
  }

  // Action type icons
  const actionTypeIcons: Record<ConditionalActionType, any> = {
    sendMessage: Mail,
    scheduleMessage: Calendar,
    cancelMessage: X,
    notifyUser: Bell,
    notifyBeneficiary: User,
    grantAccess: Check,
    revokeAccess: X,
    triggerEvent: Zap,
    executeWebhook: Activity,
    logEvent: FileText
  }

  // Add new condition
  const addCondition = useCallback(() => {
    const newCondition: MessageCondition = {
      id: crypto.randomUUID(),
      type: 'userInactivity',
      operator: 'AND',
      parameters: { inactivityDays: 30 }
    }
    setConditions([...conditions, newCondition])
    setExpandedConditions(prev => new Set(prev).add(newCondition.id))
  }, [conditions])

  // Update condition
  const updateCondition = useCallback((id: string, updates: Partial<MessageCondition>) => {
    setConditions(conditions.map(c => 
      c.id === id ? { ...c, ...updates } : c
    ))
  }, [conditions])

  // Remove condition
  const removeCondition = useCallback((id: string) => {
    setConditions(conditions.filter(c => c.id !== id))
    setExpandedConditions(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [conditions])

  // Add new action
  const addAction = useCallback(() => {
    const newAction: ConditionalAction = {
      id: crypto.randomUUID(),
      type: 'sendMessage',
      parameters: {}
    }
    setActions([...actions, newAction])
    setExpandedActions(prev => new Set(prev).add(newAction.id))
  }, [actions])

  // Update action
  const updateAction = useCallback((id: string, updates: Partial<ConditionalAction>) => {
    setActions(actions.map(a => 
      a.id === id ? { ...a, ...updates } : a
    ))
  }, [actions])

  // Remove action
  const removeAction = useCallback((id: string) => {
    setActions(actions.filter(a => a.id !== id))
    setExpandedActions(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [actions])

  // Toggle expanded state
  const toggleConditionExpanded = useCallback((id: string) => {
    setExpandedConditions(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const toggleActionExpanded = useCallback((id: string) => {
    setExpandedActions(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  // Validate rule
  const validateRule = useCallback(() => {
    const newErrors: string[] = []

    if (!name.trim()) {
      newErrors.push('Rule name is required')
    }

    if (conditions.length === 0) {
      newErrors.push('At least one condition is required')
    }

    if (actions.length === 0) {
      newErrors.push('At least one action is required')
    }

    // Validate conditions
    conditions.forEach((condition, index) => {
      switch (condition.type) {
        case 'userInactivity':
          if (!condition.parameters.inactivityDays || condition.parameters.inactivityDays < 1) {
            newErrors.push(`Condition ${index + 1}: Inactivity days must be at least 1`)
          }
          break
        case 'dateReached':
          if (!condition.parameters.targetDate) {
            newErrors.push(`Condition ${index + 1}: Target date is required`)
          }
          break
        case 'messageRead':
        case 'messageDelivered':
          if (!condition.parameters.messageId && (!condition.parameters.messageIds || condition.parameters.messageIds.length === 0)) {
            newErrors.push(`Condition ${index + 1}: At least one message must be selected`)
          }
          break
      }
    })

    // Validate actions
    actions.forEach((action, index) => {
      switch (action.type) {
        case 'sendMessage':
        case 'scheduleMessage':
          if (!action.parameters.messageId) {
            newErrors.push(`Action ${index + 1}: Message must be selected`)
          }
          if (!action.parameters.recipientIds || action.parameters.recipientIds.length === 0) {
            newErrors.push(`Action ${index + 1}: At least one recipient is required`)
          }
          break
        case 'notifyUser':
        case 'notifyBeneficiary':
          if (!action.parameters.notificationTitle) {
            newErrors.push(`Action ${index + 1}: Notification title is required`)
          }
          if (!action.parameters.notificationBody) {
            newErrors.push(`Action ${index + 1}: Notification body is required`)
          }
          break
      }
    })

    setErrors(newErrors)
    return newErrors.length === 0
  }, [name, conditions, actions])

  // Handle save
  const handleSave = useCallback(() => {
    if (!validateRule()) {
      return
    }

    const ruleData: Partial<ConditionalRule> = {
      name: name.trim(),
      description: description.trim(),
      enabled,
      priority,
      conditions,
      actions,
      metadata: {}
    }

    onSave(ruleData)
  }, [name, description, enabled, priority, conditions, actions, validateRule, onSave])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold">
          {rule ? 'Edit Conditional Rule' : 'Create Conditional Rule'}
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Define conditions and actions for automated message delivery
        </p>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              {errors.map((error, index) => (
                <p key={index} className="text-sm text-red-600">{error}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Basic Info */}
      <Card className="p-6">
        <h4 className="font-medium mb-4">Rule Information</h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rule Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 30-Day Inactivity Alert"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder="Describe what this rule does..."
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Enabled</span>
              </label>

              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Priority:</label>
                <input
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                  min="1"
                  max="100"
                  className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-500">(lower = higher priority)</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Conditions */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium">Conditions (IF)</h4>
          <Button
            variant="outline"
            size="sm"
            onClick={addCondition}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Condition
          </Button>
        </div>

        {conditions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>No conditions defined</p>
            <p className="text-sm">Add at least one condition to trigger this rule</p>
          </div>
        ) : (
          <div className="space-y-3">
            {conditions.map((condition, index) => (
              <ConditionEditor
                key={condition.id}
                condition={condition}
                index={index}
                isExpanded={expandedConditions.has(condition.id)}
                availableMessages={availableMessages}
                availableBeneficiaries={availableBeneficiaries}
                availableDocuments={availableDocuments}
                onToggleExpanded={() => toggleConditionExpanded(condition.id)}
                onChange={(updates) => updateCondition(condition.id, updates)}
                onRemove={() => removeCondition(condition.id)}
                showOperator={index > 0}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Actions */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium">Actions (THEN)</h4>
          <Button
            variant="outline"
            size="sm"
            onClick={addAction}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Action
          </Button>
        </div>

        {actions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Zap className="h-8 w-8 mx-auto mb-2" />
            <p>No actions defined</p>
            <p className="text-sm">Add at least one action to execute when conditions are met</p>
          </div>
        ) : (
          <div className="space-y-3">
            {actions.map((action, index) => (
              <ActionEditor
                key={action.id}
                action={action}
                index={index}
                isExpanded={expandedActions.has(action.id)}
                availableMessages={availableMessages}
                availableBeneficiaries={availableBeneficiaries}
                onChange={(updates) => updateAction(action.id, updates)}
                onRemove={() => removeAction(action.id)}
                onToggleExpanded={() => toggleActionExpanded(action.id)}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Actions */}
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          {rule ? 'Update Rule' : 'Create Rule'}
        </Button>
      </div>
    </div>
  )
}

// Condition Editor Component
function ConditionEditor({
  condition,
  index,
  isExpanded,
  availableMessages,
  availableBeneficiaries,
  availableDocuments,
  onToggleExpanded,
  onChange,
  onRemove,
  showOperator
}: {
  condition: MessageCondition
  index: number
  isExpanded: boolean
  availableMessages: Array<{ id: string; title: string }>
  availableBeneficiaries: Array<{ id: string; name: string }>
  availableDocuments: Array<{ id: string; name: string }>
  onToggleExpanded: () => void
  onChange: (updates: Partial<MessageCondition>) => void
  onRemove: () => void
  showOperator: boolean
}) {
  const conditionTypeIcons: Record<MessageConditionType, any> = {
    userInactivity: Clock,
    dateReached: Calendar,
    messageRead: Mail,
    messageDelivered: Check,
    beneficiaryAccessed: User,
    documentAccessed: FileText,
    eventTriggered: Zap,
    deadManSwitch: Activity,
    emergencyAccess: AlertCircle,
    verificationComplete: Check,
    passwordVaultAccessed: Key,
    customCondition: Settings
  }

  const Icon = conditionTypeIcons[condition.type]

  return (
    <div className="border rounded-lg">
      <div
        className="p-3 flex items-center justify-between cursor-pointer hover:bg-gray-50"
        onClick={onToggleExpanded}
      >
        <div className="flex items-center space-x-3">
          {showOperator && (
            <select
              value={condition.operator}
              onChange={(e) => onChange({ operator: e.target.value as 'AND' | 'OR' | 'NOT' })}
              onClick={(e) => e.stopPropagation()}
              className="px-2 py-1 text-sm border border-gray-300 rounded"
            >
              <option value="AND">AND</option>
              <option value="OR">OR</option>
              <option value="NOT">NOT</option>
            </select>
          )}
          <Icon className="h-4 w-4 text-gray-500" />
          <span className="font-medium">Condition {index + 1}:</span>
          <span className="text-gray-600">{getConditionSummary(condition)}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 border-t bg-gray-50 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Condition Type
            </label>
            <select
              value={condition.type}
              onChange={(e) => {
                const newType = e.target.value as MessageConditionType
                const newParams = getDefaultParameters(newType)
                onChange({ type: newType, parameters: newParams })
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="userInactivity">User Inactivity</option>
              <option value="dateReached">Date Reached</option>
              <option value="messageRead">Message Read</option>
              <option value="messageDelivered">Message Delivered</option>
              <option value="beneficiaryAccessed">Beneficiary Accessed</option>
              <option value="documentAccessed">Document Accessed</option>
              <option value="eventTriggered">Event Triggered</option>
              <option value="deadManSwitch">Dead Man's Switch</option>
              <option value="emergencyAccess">Emergency Access</option>
              <option value="verificationComplete">Verification Complete</option>
              <option value="passwordVaultAccessed">Password Vault Accessed</option>
              <option value="customCondition">Custom Condition</option>
            </select>
          </div>

          {/* Condition-specific parameters */}
          {renderConditionParameters(condition, availableMessages, availableBeneficiaries, availableDocuments, onChange)}
        </div>
      )}
    </div>
  )
}

// Action Editor Component
function ActionEditor({
  action,
  index,
  isExpanded,
  availableMessages,
  availableBeneficiaries,
  onToggleExpanded,
  onChange,
  onRemove
}: {
  action: ConditionalAction
  index: number
  isExpanded: boolean
  availableMessages: Array<{ id: string; title: string }>
  availableBeneficiaries: Array<{ id: string; name: string }>
  onToggleExpanded: () => void
  onChange: (updates: Partial<ConditionalAction>) => void
  onRemove: () => void
}) {
  const actionTypeIcons: Record<ConditionalActionType, any> = {
    sendMessage: Mail,
    scheduleMessage: Calendar,
    cancelMessage: X,
    notifyUser: Bell,
    notifyBeneficiary: User,
    grantAccess: Check,
    revokeAccess: X,
    triggerEvent: Zap,
    executeWebhook: Activity,
    logEvent: FileText
  }

  const Icon = actionTypeIcons[action.type]

  return (
    <div className="border rounded-lg">
      <div
        className="p-3 flex items-center justify-between cursor-pointer hover:bg-gray-50"
        onClick={onToggleExpanded}
      >
        <div className="flex items-center space-x-3">
          <Icon className="h-4 w-4 text-gray-500" />
          <span className="font-medium">Action {index + 1}:</span>
          <span className="text-gray-600">{getActionSummary(action)}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 border-t bg-gray-50 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Action Type
            </label>
            <select
              value={action.type}
              onChange={(e) => {
                const newType = e.target.value as ConditionalActionType
                const newParams = getDefaultActionParameters(newType)
                onChange({ type: newType, parameters: newParams })
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="sendMessage">Send Message</option>
              <option value="scheduleMessage">Schedule Message</option>
              <option value="cancelMessage">Cancel Message</option>
              <option value="notifyUser">Notify User</option>
              <option value="notifyBeneficiary">Notify Beneficiary</option>
              <option value="grantAccess">Grant Access</option>
              <option value="revokeAccess">Revoke Access</option>
              <option value="triggerEvent">Trigger Event</option>
              <option value="executeWebhook">Execute Webhook</option>
              <option value="logEvent">Log Event</option>
            </select>
          </div>

          {/* Action-specific parameters */}
          {renderActionParameters(action, availableMessages, availableBeneficiaries, onChange)}

          {/* Delay */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Delay (optional)
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={action.delay || 0}
                onChange={(e) => onChange({ delay: Number(e.target.value) })}
                min="0"
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">minutes</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper functions
function getConditionSummary(condition: MessageCondition): string {
  switch (condition.type) {
    case 'userInactivity':
      return `User inactive for ${condition.parameters.inactivityDays} days`
    case 'dateReached':
      return `Date reaches ${condition.parameters.targetDate ? new Date(condition.parameters.targetDate).toLocaleDateString() : 'not set'}`
    case 'messageRead':
      return `Message "${condition.parameters.messageId || 'not selected'}" is read`
    case 'messageDelivered':
      return `Message "${condition.parameters.messageId || 'not selected'}" is delivered`
    case 'beneficiaryAccessed':
      return `Beneficiary accesses the system`
    case 'documentAccessed':
      return `Document is accessed`
    case 'eventTriggered':
      return `Event "${condition.parameters.eventName || 'not set'}" is triggered`
    case 'deadManSwitch':
      return `Dead man's switch is activated`
    case 'emergencyAccess':
      return `Emergency access is granted`
    case 'verificationComplete':
      return `Verification is completed`
    case 'passwordVaultAccessed':
      return `Password vault is accessed`
    case 'customCondition':
      return `Custom condition`
    default:
      return 'Unknown condition'
  }
}

function getActionSummary(action: ConditionalAction): string {
  switch (action.type) {
    case 'sendMessage':
      return `Send message to recipients`
    case 'scheduleMessage':
      return `Schedule message for delivery`
    case 'cancelMessage':
      return `Cancel scheduled message`
    case 'notifyUser':
      return `Send notification to user`
    case 'notifyBeneficiary':
      return `Send notification to beneficiary`
    case 'grantAccess':
      return `Grant access to resource`
    case 'revokeAccess':
      return `Revoke access to resource`
    case 'triggerEvent':
      return `Trigger event "${action.parameters.eventName || 'not set'}"`
    case 'executeWebhook':
      return `Execute webhook`
    case 'logEvent':
      return `Log event`
    default:
      return 'Unknown action'
  }
}

function getDefaultParameters(type: MessageConditionType): MessageConditionParameters {
  switch (type) {
    case 'userInactivity':
      return { inactivityDays: 30 }
    case 'dateReached':
      return { targetDate: '', timezone: 'UTC' }
    case 'messageRead':
    case 'messageDelivered':
      return { messageId: '' }
    case 'beneficiaryAccessed':
      return { beneficiaryId: '' }
    case 'documentAccessed':
      return { documentId: '' }
    case 'eventTriggered':
      return { eventName: '' }
    case 'deadManSwitch':
      return { switchId: '' }
    case 'emergencyAccess':
      return { tokenId: '' }
    case 'verificationComplete':
      return { verificationType: '', verificationLevel: '' }
    case 'passwordVaultAccessed':
      return { vaultItemId: '', accessType: 'view' }
    case 'customCondition':
      return { customLogic: '', customParameters: {} }
    default:
      return {}
  }
}

function getDefaultActionParameters(type: ConditionalActionType): ConditionalActionParameters {
  switch (type) {
    case 'sendMessage':
    case 'scheduleMessage':
      return { messageId: '', recipientIds: [], deliveryMethod: 'system' }
    case 'cancelMessage':
      return { messageInstanceId: '' }
    case 'notifyUser':
    case 'notifyBeneficiary':
      return { 
        notificationTitle: '', 
        notificationBody: '', 
        notificationChannels: ['email'] 
      }
    case 'grantAccess':
    case 'revokeAccess':
      return { 
        resourceId: '', 
        resourceType: '', 
        permissionLevel: '' 
      }
    case 'triggerEvent':
      return { eventName: '', eventPayload: {} }
    case 'executeWebhook':
      return { 
        webhookUrl: '', 
        webhookMethod: 'POST', 
        webhookHeaders: {}, 
        webhookBody: {} 
      }
    case 'logEvent':
      return { 
        logLevel: 'info', 
        logMessage: '', 
        logData: {} 
      }
    default:
      return {}
  }
}

function renderConditionParameters(
  condition: MessageCondition,
  availableMessages: Array<{ id: string; title: string }>,
  availableBeneficiaries: Array<{ id: string; name: string }>,
  availableDocuments: Array<{ id: string; name: string }>,
  onChange: (updates: Partial<MessageCondition>) => void
) {
  const updateParameters = (paramUpdates: Partial<MessageConditionParameters>) => {
    onChange({
      parameters: { ...condition.parameters, ...paramUpdates }
    })
  }

  switch (condition.type) {
    case 'userInactivity':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Inactivity Days
          </label>
          <input
            type="number"
            value={condition.parameters.inactivityDays || 30}
            onChange={(e) => updateParameters({ inactivityDays: Number(e.target.value) })}
            min="1"
            className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )

    case 'dateReached':
      return (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Date
            </label>
            <input
              type="datetime-local"
              value={condition.parameters.targetDate || ''}
              onChange={(e) => updateParameters({ targetDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Timezone
            </label>
            <select
              value={condition.parameters.timezone || 'UTC'}
              onChange={(e) => updateParameters({ timezone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="Europe/London">London</option>
              <option value="Europe/Paris">Paris</option>
              <option value="Asia/Tokyo">Tokyo</option>
            </select>
          </div>
        </>
      )

    case 'messageRead':
    case 'messageDelivered':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Message
          </label>
          <select
            value={condition.parameters.messageId || ''}
            onChange={(e) => updateParameters({ messageId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a message...</option>
            {availableMessages.map(msg => (
              <option key={msg.id} value={msg.id}>{msg.title}</option>
            ))}
          </select>
        </div>
      )

    case 'beneficiaryAccessed':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Beneficiary (optional)
          </label>
          <select
            value={condition.parameters.beneficiaryId || ''}
            onChange={(e) => updateParameters({ beneficiaryId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Any beneficiary</option>
            {availableBeneficiaries.map(ben => (
              <option key={ben.id} value={ben.id}>{ben.name}</option>
            ))}
          </select>
        </div>
      )

    case 'documentAccessed':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Document
          </label>
          <select
            value={condition.parameters.documentId || ''}
            onChange={(e) => updateParameters({ documentId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a document...</option>
            {availableDocuments.map(doc => (
              <option key={doc.id} value={doc.id}>{doc.name}</option>
            ))}
          </select>
        </div>
      )

    case 'eventTriggered':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Event Name
          </label>
          <input
            type="text"
            value={condition.parameters.eventName || ''}
            onChange={(e) => updateParameters({ eventName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., user.birthday"
          />
        </div>
      )

    default:
      return (
        <div className="text-sm text-gray-500">
          No additional parameters needed
        </div>
      )
  }
}

function renderActionParameters(
  action: ConditionalAction,
  availableMessages: Array<{ id: string; title: string }>,
  availableBeneficiaries: Array<{ id: string; name: string }>,
  onChange: (updates: Partial<ConditionalAction>) => void
) {
  const updateParameters = (paramUpdates: Partial<ConditionalActionParameters>) => {
    onChange({
      parameters: { ...action.parameters, ...paramUpdates }
    })
  }

  switch (action.type) {
    case 'sendMessage':
    case 'scheduleMessage':
      return (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message to Send
            </label>
            <select
              value={action.parameters.messageId || ''}
              onChange={(e) => updateParameters({ messageId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a message...</option>
              {availableMessages.map(msg => (
                <option key={msg.id} value={msg.id}>{msg.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recipients
            </label>
            <div className="space-y-2">
              {availableBeneficiaries.map(ben => (
                <label key={ben.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={action.parameters.recipientIds?.includes(ben.id) || false}
                    onChange={(e) => {
                      const current = action.parameters.recipientIds || []
                      if (e.target.checked) {
                        updateParameters({ recipientIds: [...current, ben.id] })
                      } else {
                        updateParameters({ recipientIds: current.filter(id => id !== ben.id) })
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">{ben.name}</span>
                </label>
              ))}
            </div>
          </div>
          {action.type === 'scheduleMessage' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Schedule Time
              </label>
              <input
                type="datetime-local"
                value={action.parameters.scheduledTime || ''}
                onChange={(e) => updateParameters({ scheduledTime: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </>
      )

    case 'notifyUser':
    case 'notifyBeneficiary':
      return (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notification Title
            </label>
            <input
              type="text"
              value={action.parameters.notificationTitle || ''}
              onChange={(e) => updateParameters({ notificationTitle: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter notification title..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notification Body
            </label>
            <textarea
              value={action.parameters.notificationBody || ''}
              onChange={(e) => updateParameters({ notificationBody: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Enter notification message..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notification Channels
            </label>
            <div className="space-y-2">
              {['email', 'sms', 'push'].map(channel => (
                <label key={channel} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={action.parameters.notificationChannels?.includes(channel as any) || false}
                    onChange={(e) => {
                      const current = action.parameters.notificationChannels || []
                      if (e.target.checked) {
                        updateParameters({ notificationChannels: [...current, channel as any] })
                      } else {
                        updateParameters({ notificationChannels: current.filter(ch => ch !== channel) })
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm capitalize">{channel}</span>
                </label>
              ))}
            </div>
          </div>
        </>
      )

    case 'triggerEvent':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Event Name
          </label>
          <input
            type="text"
            value={action.parameters.eventName || ''}
            onChange={(e) => updateParameters({ eventName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., message.cascade"
          />
        </div>
      )

    case 'logEvent':
      return (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Log Level
            </label>
            <select
              value={action.parameters.logLevel || 'info'}
              onChange={(e) => updateParameters({ logLevel: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Log Message
            </label>
            <input
              type="text"
              value={action.parameters.logMessage || ''}
              onChange={(e) => updateParameters({ logMessage: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter log message..."
            />
          </div>
        </>
      )

    default:
      return (
        <div className="text-sm text-gray-500">
          Configuration for this action type coming soon
        </div>
      )
  }
}