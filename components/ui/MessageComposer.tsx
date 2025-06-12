'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  X,
  Save,
  Send,
  FileText,
  Mic,
  Video,
  Calendar,
  Clock,
  Users,
  Plus,
  Trash2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Globe,
  Shield,
  Heart,
  DollarSign,
  Stethoscope,
  Scale,
  Church,
  Lock,
  Phone,
  Brain,
  MessageSquare,
  Smile,
  Star,
  Archive,
  Briefcase,
  Palette,
  Sparkles,
  MoreVertical
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import RichTextEditor from '@/components/ui/RichTextEditor'
import {
  PersonalMessage,
  MessagesLibrary,
  MessageType,
  MessageFormat,
  MessageCategory,
  MessageContent,
  MessageRecipient,
  MessageMetadata,
  MessageScheduling,
  RecipientType,
  DeliveryMethod,
  MessagePermissions,
  MessageTone,
  SchedulingType
} from '@/types/data'
import { messagesLibraryService } from '@/services/messages-library-service'

interface MessageComposerProps {
  message?: PersonalMessage
  library: MessagesLibrary
  beneficiaries?: any[]
  contacts?: any[]
  onSave: (message: Partial<PersonalMessage>) => void
  onCancel: () => void
}

export default function MessageComposer({
  message,
  library,
  beneficiaries = [],
  contacts = [],
  onSave,
  onCancel
}: MessageComposerProps) {
  // Basic fields
  const [title, setTitle] = useState(message?.title || '')
  const [type, setType] = useState<MessageType>(message?.type || 'personal')
  const [format, setFormat] = useState<MessageFormat>(message?.format || 'text')
  const [category, setCategory] = useState<MessageCategory>(message?.category || library.settings.defaultCategory)
  
  // Content
  const [textContent, setTextContent] = useState(message?.content.text || '')
  const [plainTextContent, setPlainTextContent] = useState(message?.content.plainText || '')
  
  // Recipients
  const [recipients, setRecipients] = useState<MessageRecipient[]>(message?.recipients || [])
  const [showRecipientForm, setShowRecipientForm] = useState(false)
  
  // Metadata
  const [importance, setImportance] = useState<MessageMetadata['importance']>(message?.metadata.importance || 'medium')
  const [sensitivity, setSensitivity] = useState<MessageMetadata['sensitivity']>(message?.metadata.sensitivity || 'private')
  const [tone, setTone] = useState<MessageTone>(message?.metadata.tone || 'neutral')
  const [language, setLanguage] = useState(message?.locale || library.settings.defaultLanguage)
  const [keywords, setKeywords] = useState<string[]>(message?.metadata.keywords || [])
  
  // Scheduling
  const [enableScheduling, setEnableScheduling] = useState(!!message?.scheduling)
  const [schedulingType, setSchedulingType] = useState<SchedulingType>(message?.scheduling?.type || 'immediate')
  const [deliverAt, setDeliverAt] = useState(message?.scheduling?.deliverAt || '')
  const [delayHours, setDelayHours] = useState(message?.scheduling?.delayHours || 24)
  
  // UI state
  const [errors, setErrors] = useState<string[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [newKeyword, setNewKeyword] = useState('')

  // Message type icons
  const messageTypeIcons: Record<MessageType, any> = {
    personal: Heart,
    instruction: FileText,
    financial: DollarSign,
    medical: Stethoscope,
    legal: Scale,
    funeral: Church,
    password: Lock,
    emergency: Phone,
    farewell: MessageSquare,
    memory: Brain,
    advice: MessageSquare,
    confession: Lock,
    gratitude: Smile,
    apology: Heart,
    wish: Star,
    legacy: Archive,
    business: Briefcase,
    creative: Palette,
    spiritual: Sparkles,
    custom: MoreVertical
  }

  // Add recipient
  const addRecipient = useCallback(() => {
    const newRecipient: MessageRecipient = {
      id: crypto.randomUUID(),
      type: 'email',
      identifier: '',
      name: '',
      priority: recipients.length + 1,
      deliveryMethod: ['system'],
      permissions: {
        canView: true,
        canDownload: true,
        canForward: false,
        canReply: true,
        canPrint: true
      }
    }
    setRecipients([...recipients, newRecipient])
    setShowRecipientForm(true)
  }, [recipients])

  // Update recipient
  const updateRecipient = useCallback((index: number, updates: Partial<MessageRecipient>) => {
    const updatedRecipients = [...recipients]
    updatedRecipients[index] = { ...updatedRecipients[index], ...updates }
    setRecipients(updatedRecipients)
  }, [recipients])

  // Remove recipient
  const removeRecipient = useCallback((index: number) => {
    setRecipients(recipients.filter((_, i) => i !== index))
  }, [recipients])

  // Add keyword
  const addKeyword = useCallback(() => {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
      setKeywords([...keywords, newKeyword.trim()])
      setNewKeyword('')
    }
  }, [keywords, newKeyword])

  // Remove keyword
  const removeKeyword = useCallback((keyword: string) => {
    setKeywords(keywords.filter(k => k !== keyword))
  }, [keywords])

  // Validate form
  const validateForm = useCallback(() => {
    const newErrors: string[] = []

    if (!title.trim()) {
      newErrors.push('Title is required')
    }
    
    if (format === 'text' && !textContent.trim()) {
      newErrors.push('Message content is required')
    }
    
    if (recipients.length === 0) {
      newErrors.push('At least one recipient is required')
    } else {
      recipients.forEach((recipient, index) => {
        if (!recipient.name.trim()) {
          newErrors.push(`Recipient ${index + 1}: Name is required`)
        }
        if (!recipient.identifier.trim()) {
          newErrors.push(`Recipient ${index + 1}: Email/ID is required`)
        }
      })
    }
    
    if (enableScheduling && schedulingType === 'scheduled' && !deliverAt) {
      newErrors.push('Delivery date is required for scheduled messages')
    }

    setErrors(newErrors)
    return newErrors.length === 0
  }, [title, format, textContent, recipients, enableScheduling, schedulingType, deliverAt])

  // Handle save
  const handleSave = useCallback(() => {
    if (!validateForm()) {
      return
    }

    const messageData: Partial<PersonalMessage> = {
      type,
      format,
      category,
      title: title.trim(),
      content: {
        text: textContent,
        plainText: plainTextContent || textContent.replace(/<[^>]*>/g, '')
      },
      recipients,
      metadata: {
        importance,
        sensitivity,
        language,
        keywords,
        tone,
        readTime: Math.ceil(textContent.replace(/<[^>]*>/g, '').split(/\s+/).length / 200)
      },
      locale: language
    }

    if (enableScheduling) {
      messageData.scheduling = {
        type: schedulingType,
        deliverAt: schedulingType === 'scheduled' ? deliverAt : undefined,
        delayHours: schedulingType === 'delayed' ? delayHours : undefined
      }
    }

    onSave(messageData)
  }, [
    type, format, category, title, textContent, plainTextContent,
    recipients, importance, sensitivity, language, keywords, tone,
    enableScheduling, schedulingType, deliverAt, delayHours,
    validateForm, onSave
  ])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {message ? 'Edit Message' : 'Compose New Message'}
            </h2>
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          {errors.length > 0 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
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
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter a meaningful title for your message"
              />
            </div>

            {/* Type and Format */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as MessageType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries({
                    personal: 'Personal',
                    instruction: 'Instructions',
                    financial: 'Financial',
                    medical: 'Medical',
                    legal: 'Legal',
                    funeral: 'Funeral',
                    farewell: 'Farewell',
                    memory: 'Memory',
                    advice: 'Advice',
                    gratitude: 'Gratitude',
                    apology: 'Apology',
                    wish: 'Wishes',
                    legacy: 'Legacy',
                    business: 'Business',
                    creative: 'Creative',
                    spiritual: 'Spiritual',
                    custom: 'Other'
                  }).map(([value, label]) => {
                    const Icon = messageTypeIcons[value as MessageType]
                    return (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    )
                  })}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Format
                </label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as MessageFormat)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="text">Text</option>
                  <option value="audio" disabled={!library.settings.enableAudioMessages}>
                    Audio {!library.settings.enableAudioMessages && '(Disabled)'}
                  </option>
                  <option value="video" disabled={!library.settings.enableVideoMessages}>
                    Video {!library.settings.enableVideoMessages && '(Disabled)'}
                  </option>
                  <option value="mixed" disabled>Mixed (Coming Soon)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as MessageCategory)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="immediate">Immediate</option>
                  <option value="timed">Timed</option>
                  <option value="conditional">Conditional</option>
                  <option value="milestone">Milestone</option>
                  <option value="recurring">Recurring</option>
                  <option value="manual">Manual</option>
                </select>
              </div>
            </div>

            {/* Message Content */}
            {format === 'text' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message Content *
                </label>
                <RichTextEditor
                  value={textContent}
                  onChange={setTextContent}
                  placeholder="Write your message here..."
                  className="min-h-[300px]"
                />
              </div>
            )}

            {format === 'audio' && (
              <div className="p-8 bg-gray-50 rounded-lg text-center">
                <Mic className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">Audio recording coming soon</p>
              </div>
            )}

            {format === 'video' && (
              <div className="p-8 bg-gray-50 rounded-lg text-center">
                <Video className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">Video recording coming soon</p>
              </div>
            )}

            {/* Recipients */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  Recipients *
                </label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addRecipient}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Recipient
                </Button>
              </div>

              {recipients.length === 0 ? (
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600">No recipients added yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recipients.map((recipient, index) => (
                    <div key={recipient.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-medium">Recipient {index + 1}</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRecipient(index)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Name
                          </label>
                          <input
                            type="text"
                            value={recipient.name}
                            onChange={(e) => updateRecipient(index, { name: e.target.value })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Recipient name"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Email/ID
                          </label>
                          <input
                            type="text"
                            value={recipient.identifier}
                            onChange={(e) => updateRecipient(index, { identifier: e.target.value })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Email or identifier"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Type
                          </label>
                          <select
                            value={recipient.type}
                            onChange={(e) => updateRecipient(index, { type: e.target.value as RecipientType })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="email">Email</option>
                            <option value="beneficiary">Beneficiary</option>
                            <option value="contact">Contact</option>
                            <option value="executor">Executor</option>
                            <option value="lawyer">Lawyer</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Relationship
                          </label>
                          <input
                            type="text"
                            value={recipient.relationship || ''}
                            onChange={(e) => updateRecipient(index, { relationship: e.target.value })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="e.g., Spouse, Child, Friend"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Scheduling */}
            {library.settings.enableScheduling && (
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <input
                    type="checkbox"
                    id="enableScheduling"
                    checked={enableScheduling}
                    onChange={(e) => setEnableScheduling(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="enableScheduling" className="text-sm font-medium text-gray-700">
                    Enable Scheduling
                  </label>
                </div>

                {enableScheduling && (
                  <div className="space-y-3 pl-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Scheduling Type
                      </label>
                      <select
                        value={schedulingType}
                        onChange={(e) => setSchedulingType(e.target.value as SchedulingType)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="immediate">Immediate</option>
                        <option value="scheduled">Scheduled Date/Time</option>
                        <option value="delayed">Delayed</option>
                        <option value="conditional">Conditional</option>
                      </select>
                    </div>

                    {schedulingType === 'scheduled' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Delivery Date & Time
                        </label>
                        <input
                          type="datetime-local"
                          value={deliverAt}
                          onChange={(e) => setDeliverAt(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}

                    {schedulingType === 'delayed' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Delay (hours after trigger)
                        </label>
                        <input
                          type="number"
                          value={delayHours}
                          onChange={(e) => setDelayHours(Number(e.target.value))}
                          min="1"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Advanced Settings */}
            <div>
              <Button
                variant="ghost"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center space-x-2"
              >
                {showAdvanced ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                <span>Advanced Settings</span>
              </Button>

              {showAdvanced && (
                <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Importance
                      </label>
                      <select
                        value={importance}
                        onChange={(e) => setImportance(e.target.value as MessageMetadata['importance'])}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sensitivity
                      </label>
                      <select
                        value={sensitivity}
                        onChange={(e) => setSensitivity(e.target.value as MessageMetadata['sensitivity'])}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="public">Public</option>
                        <option value="private">Private</option>
                        <option value="confidential">Confidential</option>
                        <option value="secret">Secret</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tone
                      </label>
                      <select
                        value={tone}
                        onChange={(e) => setTone(e.target.value as MessageTone)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="formal">Formal</option>
                        <option value="informal">Informal</option>
                        <option value="emotional">Emotional</option>
                        <option value="professional">Professional</option>
                        <option value="humorous">Humorous</option>
                        <option value="serious">Serious</option>
                        <option value="loving">Loving</option>
                        <option value="neutral">Neutral</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Language
                    </label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {library.settings.supportedLanguages.map(lang => (
                        <option key={lang} value={lang}>
                          {new Intl.DisplayNames(['en'], { type: 'language' }).of(lang)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Keywords
                    </label>
                    <div className="flex items-center space-x-2 mb-2">
                      <input
                        type="text"
                        value={newKeyword}
                        onChange={(e) => setNewKeyword(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Add keyword..."
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addKeyword}
                      >
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {keywords.map(keyword => (
                        <span
                          key={keyword}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                        >
                          {keyword}
                          <button
                            onClick={() => removeKeyword(keyword)}
                            className="ml-2 text-blue-600 hover:text-blue-800"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-between">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={handleSave}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
              <Button
                onClick={() => {
                  if (validateForm()) {
                    handleSave()
                    // TODO: Also schedule the message
                  }
                }}
              >
                <Send className="h-4 w-4 mr-2" />
                Save & Schedule
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}