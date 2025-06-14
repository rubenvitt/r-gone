'use client'

import { useState, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Plus,
  Search,
  Filter,
  Mail,
  MessageSquare,
  Calendar,
  Clock,
  Users,
  FileText,
  Mic,
  Video,
  Send,
  Edit,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  AlertCircle,
  Archive,
  Star,
  Heart,
  DollarSign,
  Stethoscope,
  Scale,
  Church,
  Lock,
  Phone,
  Smile,
  Brain,
  Briefcase,
  Palette,
  Sparkles,
  MoreVertical,
  Zap,
  Settings,
  PlayCircle,
  PauseCircle,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  PersonalMessage,
  MessagesLibrary as MessagesLibraryType,
  MessageType,
  MessageFormat,
  MessageCategory,
  MessageStatus,
  MessageRecipient,
  ConditionalRule
} from '@/types/data'
import { messagesLibraryService } from '@/services/messages-library-service'
import MessageComposer from './MessageComposer'
import MessageDetailView from './MessageDetailView'
import MessageTemplateSelector from './MessageTemplateSelector'
import ConditionalRuleBuilder from './ConditionalRuleBuilder'
import ConditionalRuleTester from './ConditionalRuleTester'

interface MessagesLibraryProps {
  library: MessagesLibraryType
  onLibraryChange: (library: MessagesLibraryType) => void
  beneficiaries?: any[] // From beneficiary management
  contacts?: any[] // From contact directory
  className?: string
}

type ViewMode = 'grid' | 'list'
type FilterView = 'all' | 'drafts' | 'scheduled' | 'delivered' | 'templates' | 'rules'

export default function MessagesLibrary({
  library,
  onLibraryChange,
  beneficiaries = [],
  contacts = [],
  className = ''
}: MessagesLibraryProps) {
  const { t } = useTranslation('common')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterView, setFilterView] = useState<FilterView>('all')
  const [selectedType, setSelectedType] = useState<MessageType | 'all'>('all')
  const [selectedFormat, setSelectedFormat] = useState<MessageFormat | 'all'>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [showComposer, setShowComposer] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [editingMessage, setEditingMessage] = useState<string | null>(null)
  const [viewingMessage, setViewingMessage] = useState<string | null>(null)
  const [templateMessage, setTemplateMessage] = useState<Partial<PersonalMessage> | null>(null)
  const [showRuleBuilder, setShowRuleBuilder] = useState(false)
  const [editingRule, setEditingRule] = useState<string | null>(null)
  const [testingRule, setTestingRule] = useState<string | null>(null)

  // Get message type icon
  const getMessageTypeIcon = useCallback((type: MessageType) => {
    const iconMap: Record<MessageType, any> = {
      personal: Heart,
      instruction: FileText,
      financial: DollarSign,
      medical: Stethoscope,
      legal: Scale,
      funeral: Church,
      password: Lock,
      emergency: Phone,
      farewell: Mail,
      memory: Brain,
      advice: MessageSquare,
      confession: EyeOff,
      gratitude: Smile,
      apology: Heart,
      wish: Star,
      legacy: Archive,
      business: Briefcase,
      creative: Palette,
      spiritual: Sparkles,
      custom: MoreVertical
    }
    return iconMap[type] || MessageSquare
  }, [])

  // Get format icon
  const getFormatIcon = useCallback((format: MessageFormat) => {
    switch (format) {
      case 'audio': return Mic
      case 'video': return Video
      case 'mixed': return FileText
      default: return MessageSquare
    }
  }, [])

  // Get status color
  const getStatusColor = useCallback((status: MessageStatus) => {
    switch (status) {
      case 'draft': return 'text-gray-600 bg-gray-50'
      case 'scheduled': return 'text-blue-600 bg-blue-50'
      case 'pending': return 'text-yellow-600 bg-yellow-50'
      case 'sending': return 'text-orange-600 bg-orange-50'
      case 'delivered': return 'text-green-600 bg-green-50'
      case 'viewed': return 'text-purple-600 bg-purple-50'
      case 'failed': return 'text-red-600 bg-red-50'
      case 'expired': return 'text-gray-600 bg-gray-50'
      case 'cancelled': return 'text-gray-600 bg-gray-50'
    }
  }, [])

  // Filter messages
  const filteredMessages = useMemo(() => {
    let messages = library.messages

    // Apply filter view
    switch (filterView) {
      case 'drafts':
        messages = messages.filter(m => m.status === 'draft')
        break
      case 'scheduled':
        messages = messages.filter(m => ['scheduled', 'pending'].includes(m.status))
        break
      case 'delivered':
        messages = messages.filter(m => ['delivered', 'viewed'].includes(m.status))
        break
      case 'templates':
        return [] // Templates are shown separately
    }

    // Apply type filter
    if (selectedType !== 'all') {
      messages = messages.filter(m => m.type === selectedType)
    }

    // Apply format filter
    if (selectedFormat !== 'all') {
      messages = messages.filter(m => m.format === selectedFormat)
    }

    // Apply search
    if (searchTerm) {
      messages = messagesLibraryService.searchMessages(library, searchTerm)
    }

    // Sort by date
    return messages.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  }, [library, filterView, selectedType, selectedFormat, searchTerm])

  // Handle delete message
  const handleDeleteMessage = useCallback((messageId: string) => {
    const message = library.messages.find(m => m.id === messageId)
    if (message && confirm(`Are you sure you want to delete "${message.title}"?`)) {
      const updatedLibrary = messagesLibraryService.deleteMessage(library, messageId)
      onLibraryChange(updatedLibrary)
      setViewingMessage(null)
      setEditingMessage(null)
    }
  }, [library, onLibraryChange])

  // Handle schedule message
  const handleScheduleMessage = useCallback((messageId: string) => {
    try {
      const updatedLibrary = messagesLibraryService.scheduleMessage(library, messageId)
      onLibraryChange(updatedLibrary)
    } catch (error) {
      console.error('Failed to schedule message:', error)
    }
  }, [library, onLibraryChange])

  // Handle cancel message
  const handleCancelMessage = useCallback((messageId: string) => {
    try {
      const updatedLibrary = messagesLibraryService.cancelMessage(library, messageId)
      onLibraryChange(updatedLibrary)
    } catch (error) {
      console.error('Failed to cancel message:', error)
    }
  }, [library, onLibraryChange])

  // Handle duplicate message
  const handleDuplicateMessage = useCallback((messageId: string) => {
    const message = library.messages.find(m => m.id === messageId)
    if (message) {
      const newMessage = {
        ...message,
        id: crypto.randomUUID(),
        title: `${message.title} (Copy)`,
        status: 'draft' as MessageStatus,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1
      }
      const updatedLibrary = {
        ...library,
        messages: [...library.messages, newMessage]
      }
      onLibraryChange(messagesLibraryService.updateStatistics(updatedLibrary))
    }
  }, [library, onLibraryChange])

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Mail className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold">{t('messages.title')}</h2>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTemplates(true)}
            >
              <FileText className="h-4 w-4 mr-2" />
              {t('messages.templates')}
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowComposer(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('messages.newMessage')}
            </Button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {library.statistics.totalMessages}
            </div>
            <div className="text-sm text-blue-800">{t('messages.totalMessages')}</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {library.statistics.deliveredMessages}
            </div>
            <div className="text-sm text-green-800">{t('messages.delivered')}</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">
              {library.statistics.messagesByStatus.scheduled || 0}
            </div>
            <div className="text-sm text-yellow-800">{t('messages.scheduled')}</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {library.statistics.totalRecipients}
            </div>
            <div className="text-sm text-purple-800">{t('messages.recipients')}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('messages.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex bg-gray-100 p-1 rounded-lg">
            {(['all', 'drafts', 'scheduled', 'delivered', 'templates', 'rules'] as FilterView[]).map(view => (
              <Button
                key={view}
                variant={filterView === view ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilterView(view)}
                className="capitalize"
              >
                {t(`messages.${view}`)}
              </Button>
            ))}
          </div>
        </div>

        {/* Additional filters */}
        <div className="flex flex-wrap gap-2 mt-4">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as MessageType | 'all')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{t('messages.allTypes')}</option>
            {(['personal', 'instruction', 'financial', 'medical', 'legal', 'farewell', 'memory', 'advice', 'gratitude'] as MessageType[]).map(type => (
              <option key={type} value={type}>{t(`messages.messageTypes.${type}`)}</option>
            ))}
          </select>

          <select
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value as MessageFormat | 'all')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{t('messages.allFormats')}</option>
            <option value="text">{t('messages.formats.text')}</option>
            <option value="audio">{t('messages.formats.audio')}</option>
            <option value="video">{t('messages.formats.video')}</option>
            <option value="mixed">{t('messages.formats.mixed')}</option>
          </select>
        </div>
      </div>

      {/* Messages Grid/List */}
      <div className="bg-white rounded-lg shadow-sm border min-h-[400px]">
        {filterView === 'rules' ? (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Conditional Rules</h3>
              <Button
                onClick={() => setShowRuleBuilder(true)}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Rule
              </Button>
            </div>
            {library.conditionalRules && library.conditionalRules.length > 0 ? (
              <div className="space-y-4">
                {library.conditionalRules.map(rule => (
                  <div
                    key={rule.id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Zap className="h-5 w-5 text-purple-600" />
                          <h4 className="font-medium">{rule.name}</h4>
                          {rule.enabled ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                              <PlayCircle className="h-3 w-3 mr-1" />
                              {t('messages.active')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                              <PauseCircle className="h-3 w-3 mr-1" />
                              {t('messages.inactive')}
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            Priority {rule.priority}
                          </span>
                        </div>
                        {rule.description && (
                          <p className="text-sm text-gray-600 mb-2">{rule.description}</p>
                        )}
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>{rule.conditions.length} {rule.conditions.length === 1 ? t('messages.condition') : t('messages.conditions')}</span>
                          <span>•</span>
                          <span>{rule.actions.length} {rule.actions.length === 1 ? t('messages.action') : t('messages.actions')}</span>
                          {rule.metadata?.lastTriggered && (
                            <>
                              <span>•</span>
                              <span>{t('messages.lastTriggered')}: {new Date(rule.metadata.lastTriggered).toLocaleDateString()}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setTestingRule(rule.id)}
                        >
                          <PlayCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const updatedLibrary = messagesLibraryService.updateConditionalRule(
                              library,
                              rule.id,
                              { enabled: !rule.enabled }
                            )
                            onLibraryChange(updatedLibrary)
                          }}
                        >
                          {rule.enabled ? (
                            <PauseCircle className="h-4 w-4" />
                          ) : (
                            <PlayCircle className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingRule(rule.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete the rule "${rule.name}"?`)) {
                              const updatedLibrary = messagesLibraryService.deleteConditionalRule(library, rule.id)
                              onLibraryChange(updatedLibrary)
                            }
                          }}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Zap className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">{t('messages.rules.noRules')}</p>
                <p>{t('messages.createRulesDescription')}</p>
                <Button
                  onClick={() => setShowRuleBuilder(true)}
                  className="mt-4"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('messages.createYourFirstRule')}
                </Button>
              </div>
            )}
          </div>
        ) : filterView === 'templates' ? (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">{t('messages.messageTemplates')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {library.templates.map(template => (
                <div
                  key={template.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    setShowTemplates(true)
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium">{template.name}</h4>
                    {template.rating && (
                      <div className="flex items-center text-sm text-yellow-600">
                        <Star className="h-4 w-4 fill-current" />
                        <span className="ml-1">{template.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">{t('messages.used')} {template.usage} {t('messages.times')}</span>
                    <span className={`px-2 py-1 rounded-full ${
                      template.isSystem ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {template.category}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Mail className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">{t('messages.noMessagesFound')}</p>
            <p>
              {searchTerm || selectedType !== 'all' || selectedFormat !== 'all'
                ? t('messages.tryAdjustingSearch')
                : t('messages.createFirstMessage')
              }
            </p>
            {!searchTerm && selectedType === 'all' && selectedFormat === 'all' && (
              <Button
                onClick={() => setShowComposer(true)}
                className="mt-4"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('messages.createYourFirstMessage')}
              </Button>
            )}
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMessages.map((message) => (
              <MessageCard
                key={message.id}
                message={message}
                onView={() => setViewingMessage(message.id)}
                onEdit={() => setEditingMessage(message.id)}
                onDelete={() => handleDeleteMessage(message.id)}
                onSchedule={() => handleScheduleMessage(message.id)}
                onCancel={() => handleCancelMessage(message.id)}
                onDuplicate={() => handleDuplicateMessage(message.id)}
                getMessageTypeIcon={getMessageTypeIcon}
                getFormatIcon={getFormatIcon}
                getStatusColor={getStatusColor}
              />
            ))}
          </div>
        )}
      </div>

      {/* Message Composer Modal */}
      {(showComposer || editingMessage) && (
        <MessageComposer
          message={editingMessage ? library.messages.find(m => m.id === editingMessage) : undefined}
          templateMessage={templateMessage || undefined}
          library={library}
          beneficiaries={beneficiaries}
          contacts={contacts}
          onSave={(messageData) => {
            if (editingMessage) {
              const updatedLibrary = messagesLibraryService.updateMessage(library, editingMessage, messageData)
              onLibraryChange(updatedLibrary)
            } else {
              const updatedLibrary = messagesLibraryService.createMessage(library, messageData as any)
              onLibraryChange(updatedLibrary)
            }
            setShowComposer(false)
            setEditingMessage(null)
            setTemplateMessage(null)
          }}
          onCancel={() => {
            setShowComposer(false)
            setEditingMessage(null)
            setTemplateMessage(null)
          }}
        />
      )}

      {/* Message Detail View Modal */}
      {viewingMessage && (
        <MessageDetailView
          message={library.messages.find(m => m.id === viewingMessage)!}
          library={library}
          onClose={() => setViewingMessage(null)}
          onEdit={() => {
            setEditingMessage(viewingMessage)
            setViewingMessage(null)
          }}
          onDelete={() => {
            handleDeleteMessage(viewingMessage)
            setViewingMessage(null)
          }}
        />
      )}

      {/* Template Selector Modal */}
      {showTemplates && (
        <MessageTemplateSelector
          library={library}
          onSelectTemplate={(template) => {
            // Create message from template
            const msgFromTemplate: Partial<PersonalMessage> = {
              type: template.content.type!,
              format: template.content.format!,
              category: template.content.category || 'immediate',
              title: template.content.title || template.name,
              content: template.content.content,
              metadata: {
                ...template.content.metadata,
                isTemplate: true,
                templateId: template.id,
                templateName: template.name
              } as any,
              scheduling: template.content.scheduling,
              attachments: template.content.attachments || [],
              locale: template.locale || library.settings.defaultLanguage
            }
            
            setTemplateMessage(msgFromTemplate)
            setShowTemplates(false)
            setEditingMessage(null)
            setShowComposer(true)
          }}
          onClose={() => setShowTemplates(false)}
        />
      )}

      {/* Conditional Rule Builder Modal */}
      {(showRuleBuilder || editingRule) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  {editingRule ? 'Edit Conditional Rule' : 'Create Conditional Rule'}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowRuleBuilder(false)
                    setEditingRule(null)
                  }}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <ConditionalRuleBuilder
                rule={editingRule ? library.conditionalRules?.find(r => r.id === editingRule) : undefined}
                availableMessages={library.messages.map(m => ({ id: m.id, title: m.title }))}
                availableBeneficiaries={beneficiaries}
                availableDocuments={[]} // TODO: Add document management
                onSave={(ruleData) => {
                  if (editingRule) {
                    const updatedLibrary = messagesLibraryService.updateConditionalRule(
                      library,
                      editingRule,
                      ruleData
                    )
                    onLibraryChange(updatedLibrary)
                  } else {
                    const updatedLibrary = messagesLibraryService.createConditionalRule(
                      library,
                      ruleData as ConditionalRule
                    )
                    onLibraryChange(updatedLibrary)
                  }
                  setShowRuleBuilder(false)
                  setEditingRule(null)
                }}
                onCancel={() => {
                  setShowRuleBuilder(false)
                  setEditingRule(null)
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Conditional Rule Tester Modal */}
      {testingRule && (
        <ConditionalRuleTester
          rule={library.conditionalRules?.find(r => r.id === testingRule)!}
          library={library}
          onClose={() => setTestingRule(null)}
        />
      )}
    </div>
  )
}

// Message Card Component
interface MessageCardProps {
  message: PersonalMessage
  onView: () => void
  onEdit: () => void
  onDelete: () => void
  onSchedule: () => void
  onCancel: () => void
  onDuplicate: () => void
  getMessageTypeIcon: (type: MessageType) => any
  getFormatIcon: (format: MessageFormat) => any
  getStatusColor: (status: MessageStatus) => string
}

function MessageCard({
  message,
  onView,
  onEdit,
  onDelete,
  onSchedule,
  onCancel,
  onDuplicate,
  getMessageTypeIcon,
  getFormatIcon,
  getStatusColor
}: MessageCardProps) {
  const TypeIcon = getMessageTypeIcon(message.type)
  const FormatIcon = getFormatIcon(message.format)

  return (
    <div
      className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onView}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
            <TypeIcon className="h-5 w-5 text-gray-600" />
          </div>
          <div>
            <h3 className="font-medium text-sm truncate" title={message.title}>
              {message.title}
            </h3>
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <FormatIcon className="h-3 w-3" />
              <span>{message.format}</span>
              <span>•</span>
              <span>{new Date(message.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-end space-y-1">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(message.status)}`}>
            {message.status}
          </span>
          {message.metadata.importance === 'critical' && (
            <AlertCircle className="h-4 w-4 text-red-500" />
          )}
        </div>
      </div>

      {/* Recipients */}
      <div className="mb-3">
        <div className="flex items-center space-x-1 text-xs text-gray-500">
          <Users className="h-3 w-3" />
          <span>
            {message.recipients.length} recipient{message.recipients.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Scheduling info */}
      {message.scheduling && (
        <div className="mb-3 text-xs text-gray-500">
          {message.scheduling.type === 'scheduled' && message.scheduling.deliverAt && (
            <div className="flex items-center space-x-1">
              <Calendar className="h-3 w-3" />
              <span>Scheduled for {new Date(message.scheduling.deliverAt).toLocaleString()}</span>
            </div>
          )}
          {message.scheduling.type === 'delayed' && (
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>Delayed by {message.scheduling.delayHours} hours</span>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between items-center pt-3 border-t" onClick={e => e.stopPropagation()}>
        <div className="flex space-x-1">
          {message.status === 'draft' && (
            <Button variant="ghost" size="sm" onClick={onSchedule}>
              <Send className="h-3 w-3" />
            </Button>
          )}
          {['scheduled', 'pending'].includes(message.status) && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <XCircle className="h-3 w-3" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onDuplicate}>
            <Copy className="h-3 w-3" />
          </Button>
        </div>
        
        <div className="flex space-x-1">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Edit className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-600">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  )
}