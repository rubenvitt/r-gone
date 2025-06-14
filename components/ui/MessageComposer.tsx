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
  MoreVertical,
  Eye
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import RichTextEditor from '@/components/ui/RichTextEditor'
import RecipientManager from '@/components/ui/RecipientManager'
import MessagePreview from '@/components/ui/MessagePreview'
import AudioRecorder from '@/components/ui/AudioRecorder'
import AudioPlayer from '@/components/ui/AudioPlayer'
import VideoRecorder from '@/components/ui/VideoRecorder'
import VideoPlayer from '@/components/ui/VideoPlayer'
import { audioStorageService } from '@/services/audio-storage-service'
import { videoStorageService } from '@/services/video-storage-service'
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
  templateMessage?: Partial<PersonalMessage>
  library: MessagesLibrary
  beneficiaries?: any[]
  contacts?: any[]
  onSave: (message: Partial<PersonalMessage>) => void
  onCancel: () => void
}

export default function MessageComposer({
  message,
  templateMessage,
  library,
  beneficiaries = [],
  contacts = [],
  onSave,
  onCancel
}: MessageComposerProps) {
  // Use template if provided, otherwise use message or defaults
  const initialMessage = templateMessage || message
  
  // Basic fields
  const [title, setTitle] = useState(initialMessage?.title || '')
  const [type, setType] = useState<MessageType>(initialMessage?.type || 'personal')
  const [format, setFormat] = useState<MessageFormat>(initialMessage?.format || 'text')
  const [category, setCategory] = useState<MessageCategory>(initialMessage?.category || library.settings.defaultCategory)
  
  // Content
  const [textContent, setTextContent] = useState(initialMessage?.content?.text || '')
  const [plainTextContent, setPlainTextContent] = useState(initialMessage?.content?.plainText || '')
  
  // Recipients
  const [recipients, setRecipients] = useState<MessageRecipient[]>(initialMessage?.recipients || [])
  const [showRecipientForm, setShowRecipientForm] = useState(false)
  
  // Metadata
  const [importance, setImportance] = useState<MessageMetadata['importance']>(initialMessage?.metadata?.importance || 'medium')
  const [sensitivity, setSensitivity] = useState<MessageMetadata['sensitivity']>(initialMessage?.metadata?.sensitivity || 'private')
  const [tone, setTone] = useState<MessageTone>(initialMessage?.metadata?.tone || 'neutral')
  const [language, setLanguage] = useState(initialMessage?.locale || library.settings.defaultLanguage)
  const [keywords, setKeywords] = useState<string[]>(initialMessage?.metadata?.keywords || [])
  
  // Scheduling
  const [enableScheduling, setEnableScheduling] = useState(!!initialMessage?.scheduling)
  const [schedulingType, setSchedulingType] = useState<SchedulingType>(initialMessage?.scheduling?.type || 'immediate')
  const [deliverAt, setDeliverAt] = useState(initialMessage?.scheduling?.deliverAt || '')
  const [delayHours, setDelayHours] = useState(initialMessage?.scheduling?.delayHours || 24)
  
  // UI state
  const [errors, setErrors] = useState<string[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [newKeyword, setNewKeyword] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  
  // Audio state
  const [audioUrl, setAudioUrl] = useState('')
  const [audioId, setAudioId] = useState(initialMessage?.content?.audioId || '')

  // Video state
  const [videoUrl, setVideoUrl] = useState('')
  const [videoId, setVideoId] = useState(initialMessage?.content?.videoId || '')

  // Handle audio recording complete
  const handleAudioRecordingComplete = useCallback(async (audioBlob: Blob, audioUrl: string) => {
    try {
      // Save audio to storage
      const id = await audioStorageService.saveAudio(audioBlob, {
        filename: `message-audio-${Date.now()}.webm`
      })
      
      setAudioId(id)
      setAudioUrl(audioUrl)
    } catch (error) {
      console.error('Failed to save audio:', error)
      setErrors(['Failed to save audio recording. Please try again.'])
    }
  }, [])

  // Handle video recording complete
  const handleVideoRecordingComplete = useCallback(async (videoBlob: Blob, videoUrl: string) => {
    try {
      // Save video to storage
      const id = await videoStorageService.saveVideo(videoBlob, {
        filename: `message-video-${Date.now()}.webm`
      })
      
      setVideoId(id)
      setVideoUrl(videoUrl)
    } catch (error) {
      console.error('Failed to save video:', error)
      setErrors(['Failed to save video recording. Please try again.'])
    }
  }, [])

  // Load audio if editing and has audioId
  useEffect(() => {
    const loadAudio = async () => {
      if (audioId && !audioUrl) {
        try {
          const audioItem = await audioStorageService.getAudio(audioId)
          if (audioItem) {
            setAudioUrl(audioItem.dataUrl)
          }
        } catch (error) {
          console.error('Failed to load audio:', error)
        }
      }
    }
    loadAudio()
  }, [audioId, audioUrl])

  // Load video if editing and has videoId
  useEffect(() => {
    const loadVideo = async () => {
      if (videoId && !videoUrl) {
        try {
          const videoItem = await videoStorageService.getVideo(videoId)
          if (videoItem) {
            setVideoUrl(videoItem.dataUrl)
          }
        } catch (error) {
          console.error('Failed to load video:', error)
        }
      }
    }
    loadVideo()
  }, [videoId, videoUrl])

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
    
    if (format === 'audio' && !audioId) {
      newErrors.push('Audio recording is required')
    }
    
    if (format === 'video' && !videoId) {
      newErrors.push('Video recording is required')
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
  }, [title, format, textContent, audioId, videoId, recipients, enableScheduling, schedulingType, deliverAt])

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
        plainText: plainTextContent || textContent.replace(/<[^>]*>/g, ''),
        ...(format === 'audio' && audioId ? { audioId } : {}),
        ...(format === 'video' && videoId ? { videoId } : {})
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
          
          {templateMessage && initialMessage?.metadata?.templateName && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <p className="text-sm text-blue-800">
                  Using template: <strong>{initialMessage.metadata.templateName}</strong>
                </p>
              </div>
            </div>
          )}
          
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Audio Message *
                </label>
                {!audioUrl ? (
                  <AudioRecorder
                    onRecordingComplete={handleAudioRecordingComplete}
                    maxDuration={600} // 10 minutes
                    showVisualizer={true}
                  />
                ) : (
                  <div className="space-y-4">
                    <AudioPlayer
                      src={audioUrl}
                      title="Your Audio Message"
                      showDownload={true}
                      showVolumeControl={true}
                    />
                    <div className="flex justify-center">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setAudioUrl('')
                          setAudioId('')
                        }}
                        className="gap-2"
                      >
                        <Mic className="h-4 w-4" />
                        Record New Audio
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {format === 'video' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Video Message *
                </label>
                {!videoUrl ? (
                  <VideoRecorder
                    onRecordingComplete={handleVideoRecordingComplete}
                    maxDuration={600} // 10 minutes
                    showPreview={true}
                  />
                ) : (
                  <div className="space-y-4">
                    <VideoPlayer
                      src={videoUrl}
                      title="Your Video Message"
                      showDownload={true}
                      showVolumeControl={true}
                      className="aspect-video"
                    />
                    <div className="flex justify-center">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setVideoUrl('')
                          setVideoId('')
                        }}
                        className="gap-2"
                      >
                        <Video className="h-4 w-4" />
                        Record New Video
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Recipients */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipients *
              </label>
              <RecipientManager
                recipients={recipients}
                beneficiaries={beneficiaries}
                contacts={contacts}
                onRecipientsChange={setRecipients}
                mode="inline"
              />
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
                onClick={() => {
                  if (validateForm()) {
                    setShowPreview(true)
                  }
                }}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
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
      
      {/* Message Preview Modal */}
      {showPreview && (
        <MessagePreview
          message={{
            type,
            format,
            category,
            title: title.trim(),
            content: {
              text: textContent,
              plainText: plainTextContent || textContent.replace(/<[^>]*>/g, ''),
              ...(format === 'audio' && audioId ? { audioId } : {}),
              ...(format === 'video' && videoId ? { videoId } : {})
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
            scheduling: enableScheduling ? {
              type: schedulingType,
              deliverAt: schedulingType === 'scheduled' ? deliverAt : undefined,
              delayHours: schedulingType === 'delayed' ? delayHours : undefined
            } : undefined,
            locale: language
          }}
          library={library}
          onClose={() => setShowPreview(false)}
          onSend={() => {
            handleSave()
            setShowPreview(false)
            // TODO: Also schedule the message
          }}
        />
      )}
    </div>
  )
}