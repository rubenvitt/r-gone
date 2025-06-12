'use client'

import { useState, useCallback, useMemo } from 'react'
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
  MoreVertical
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  PersonalMessage,
  MessagesLibrary as MessagesLibraryType,
  MessageType,
  MessageFormat,
  MessageCategory,
  MessageStatus,
  MessageRecipient
} from '@/types/data'
import { messagesLibraryService } from '@/services/messages-library-service'
import MessageComposer from './MessageComposer'
import MessageDetailView from './MessageDetailView'
import MessageTemplateSelector from './MessageTemplateSelector'

interface MessagesLibraryProps {
  library: MessagesLibraryType
  onLibraryChange: (library: MessagesLibraryType) => void
  beneficiaries?: any[] // From beneficiary management
  contacts?: any[] // From contact directory
  className?: string
}

type ViewMode = 'grid' | 'list'
type FilterView = 'all' | 'drafts' | 'scheduled' | 'delivered' | 'templates'

export default function MessagesLibrary({
  library,
  onLibraryChange,
  beneficiaries = [],
  contacts = [],
  className = ''
}: MessagesLibraryProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterView, setFilterView] = useState<FilterView>('all')
  const [selectedType, setSelectedType] = useState<MessageType | 'all'>('all')
  const [selectedFormat, setSelectedFormat] = useState<MessageFormat | 'all'>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [showComposer, setShowComposer] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [editingMessage, setEditingMessage] = useState<string | null>(null)
  const [viewingMessage, setViewingMessage] = useState<string | null>(null)

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
            <h2 className="text-xl font-semibold">Messages & Instructions</h2>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTemplates(true)}
            >
              <FileText className="h-4 w-4 mr-2" />
              Templates
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowComposer(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Message
            </Button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {library.statistics.totalMessages}
            </div>
            <div className="text-sm text-blue-800">Total Messages</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {library.statistics.deliveredMessages}
            </div>
            <div className="text-sm text-green-800">Delivered</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">
              {library.statistics.messagesByStatus.scheduled || 0}
            </div>
            <div className="text-sm text-yellow-800">Scheduled</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {library.statistics.totalRecipients}
            </div>
            <div className="text-sm text-purple-800">Recipients</div>
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
              placeholder="Search messages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex bg-gray-100 p-1 rounded-lg">
            {(['all', 'drafts', 'scheduled', 'delivered', 'templates'] as FilterView[]).map(view => (
              <Button
                key={view}
                variant={filterView === view ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilterView(view)}
                className="capitalize"
              >
                {view}
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
            <option value="all">All Types</option>
            {Object.entries({
              personal: 'Personal',
              instruction: 'Instructions',
              financial: 'Financial',
              medical: 'Medical',
              legal: 'Legal',
              farewell: 'Farewell',
              memory: 'Memories',
              advice: 'Advice',
              gratitude: 'Gratitude'
            }).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <select
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value as MessageFormat | 'all')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Formats</option>
            <option value="text">Text</option>
            <option value="audio">Audio</option>
            <option value="video">Video</option>
            <option value="mixed">Mixed</option>
          </select>
        </div>
      </div>

      {/* Messages Grid/List */}
      <div className="bg-white rounded-lg shadow-sm border min-h-[400px]">
        {filterView === 'templates' ? (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Message Templates</h3>
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
                    <span className="text-gray-500">Used {template.usage} times</span>
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
            <p className="text-lg font-medium mb-2">No messages found</p>
            <p>
              {searchTerm || selectedType !== 'all' || selectedFormat !== 'all'
                ? 'Try adjusting your search or filters.'
                : 'Create your first message to get started.'
              }
            </p>
            {!searchTerm && selectedType === 'all' && selectedFormat === 'all' && (
              <Button
                onClick={() => setShowComposer(true)}
                className="mt-4"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Message
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
          }}
          onCancel={() => {
            setShowComposer(false)
            setEditingMessage(null)
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
            // Handle template selection
            setShowTemplates(false)
            setShowComposer(true)
            // TODO: Populate composer with template
          }}
          onClose={() => setShowTemplates(false)}
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