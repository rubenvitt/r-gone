'use client'

import { useState } from 'react'
import {
  X,
  Edit,
  Trash2,
  Send,
  Copy,
  Clock,
  Calendar,
  Users,
  Globe,
  Shield,
  AlertCircle,
  CheckCircle,
  Eye,
  Download,
  Share2,
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
  Mic,
  Video,
  FileText
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  PersonalMessage,
  MessagesLibrary,
  MessageType,
  MessageFormat,
  MessageStatus,
  MessageRecipient,
  DeliveryMethod
} from '@/types/data'

interface MessageDetailViewProps {
  message: PersonalMessage
  library: MessagesLibrary
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

export default function MessageDetailView({
  message,
  library,
  onClose,
  onEdit,
  onDelete
}: MessageDetailViewProps) {
  const [activeTab, setActiveTab] = useState<'content' | 'recipients' | 'delivery' | 'metadata'>('content')

  // Get message type icon
  const getMessageTypeIcon = (type: MessageType) => {
    const iconMap: Record<MessageType, any> = {
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
    return iconMap[type] || MessageSquare
  }

  // Get format icon
  const getFormatIcon = (format: MessageFormat) => {
    switch (format) {
      case 'audio': return Mic
      case 'video': return Video
      case 'mixed': return FileText
      default: return MessageSquare
    }
  }

  // Get status color
  const getStatusColor = (status: MessageStatus) => {
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
  }

  // Get delivery method icon
  const getDeliveryMethodIcon = (method: DeliveryMethod) => {
    switch (method) {
      case 'system': return Globe
      case 'email': return MessageSquare
      case 'sms': return Phone
      case 'webhook': return Globe
      case 'print': return FileText
    }
  }

  const TypeIcon = getMessageTypeIcon(message.type)
  const FormatIcon = getFormatIcon(message.format)

  // Get delivery logs for this message
  const deliveryLogs = library.deliveryLogs.filter(log => log.messageId === message.id)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                <TypeIcon className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">{message.title}</h2>
                <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <FormatIcon className="h-4 w-4" />
                    <span>{message.format}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>Created {new Date(message.createdAt).toLocaleDateString()}</span>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(message.status)}`}>
                    {message.status}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={onDelete} className="text-red-600">
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-6 mt-6 border-b -mb-6">
            {(['content', 'recipients', 'delivery', 'metadata'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 px-1 capitalize ${
                  activeTab === tab
                    ? 'border-b-2 border-blue-500 text-blue-600 font-medium'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'content' && (
            <div className="space-y-6">
              {/* Message Content */}
              {message.format === 'text' && message.content.text && (
                <div>
                  <h3 className="font-medium mb-3">Message Content</h3>
                  <div
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: message.content.text }}
                  />
                </div>
              )}

              {message.format === 'audio' && (
                <div>
                  <h3 className="font-medium mb-3">Audio Message</h3>
                  {message.content.audioUrl ? (
                    <div className="space-y-4">
                      <audio controls className="w-full">
                        <source src={message.content.audioUrl} type={message.content.mimeType} />
                        Your browser does not support the audio element.
                      </audio>
                      {message.content.audioTranscript && (
                        <div>
                          <h4 className="font-medium text-sm mb-2">Transcript</h4>
                          <p className="text-gray-600">{message.content.audioTranscript}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500">No audio content available</p>
                  )}
                </div>
              )}

              {message.format === 'video' && (
                <div>
                  <h3 className="font-medium mb-3">Video Message</h3>
                  {message.content.videoUrl ? (
                    <div className="space-y-4">
                      <video controls className="w-full rounded-lg" poster={message.content.videoPoster}>
                        <source src={message.content.videoUrl} type={message.content.mimeType} />
                        Your browser does not support the video element.
                      </video>
                      {message.content.videoTranscript && (
                        <div>
                          <h4 className="font-medium text-sm mb-2">Transcript</h4>
                          <p className="text-gray-600">{message.content.videoTranscript}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500">No video content available</p>
                  )}
                </div>
              )}

              {/* Attachments */}
              {message.attachments && message.attachments.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3">Attachments</h3>
                  <div className="space-y-2">
                    {message.attachments.map(attachment => (
                      <div
                        key={attachment.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <FileText className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="font-medium text-sm">{attachment.name}</p>
                            <p className="text-xs text-gray-500">
                              {(attachment.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'recipients' && (
            <div className="space-y-6">
              <h3 className="font-medium">Recipients ({message.recipients.length})</h3>
              <div className="space-y-4">
                {message.recipients.map((recipient, index) => (
                  <div key={recipient.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{recipient.name}</h4>
                        <p className="text-sm text-gray-500">
                          {recipient.identifier} • {recipient.type}
                          {recipient.relationship && ` • ${recipient.relationship}`}
                        </p>
                      </div>
                      <span className="text-sm text-gray-500">
                        Priority {recipient.priority}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Delivery Methods</p>
                        <div className="flex flex-wrap gap-2">
                          {recipient.deliveryMethod.map(method => {
                            const Icon = getDeliveryMethodIcon(method)
                            return (
                              <span
                                key={method}
                                className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100"
                              >
                                <Icon className="h-3 w-3 mr-1" />
                                {method}
                              </span>
                            )
                          })}
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Permissions</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(recipient.permissions).map(([key, value]) => {
                            if (typeof value === 'boolean' && value) {
                              return (
                                <span
                                  key={key}
                                  className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-100 text-green-800"
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  {key.replace('can', 'Can ')}
                                </span>
                              )
                            }
                            return null
                          })}
                        </div>
                      </div>

                      {recipient.acknowledgmentRequired && (
                        <div className="flex items-center space-x-2 text-sm text-yellow-600">
                          <AlertCircle className="h-4 w-4" />
                          <span>Acknowledgment required</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'delivery' && (
            <div className="space-y-6">
              {/* Scheduling */}
              {message.scheduling && (
                <div>
                  <h3 className="font-medium mb-3">Scheduling</h3>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Type</p>
                        <p className="font-medium capitalize">{message.scheduling.type}</p>
                      </div>
                      {message.scheduling.deliverAt && (
                        <div>
                          <p className="text-sm text-gray-500">Deliver At</p>
                          <p className="font-medium">
                            {new Date(message.scheduling.deliverAt).toLocaleString()}
                          </p>
                        </div>
                      )}
                      {message.scheduling.delayHours && (
                        <div>
                          <p className="text-sm text-gray-500">Delay</p>
                          <p className="font-medium">{message.scheduling.delayHours} hours</p>
                        </div>
                      )}
                      {message.scheduling.timezone && (
                        <div>
                          <p className="text-sm text-gray-500">Timezone</p>
                          <p className="font-medium">{message.scheduling.timezone}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Delivery Logs */}
              <div>
                <h3 className="font-medium mb-3">Delivery History</h3>
                {deliveryLogs.length > 0 ? (
                  <div className="space-y-3">
                    {deliveryLogs.map(log => (
                      <div key={log.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium text-sm">
                              {message.recipients.find(r => r.id === log.recipientId)?.name || 'Unknown'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(log.attemptedAt).toLocaleString()}
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            log.status === 'delivered' || log.status === 'viewed'
                              ? 'bg-green-100 text-green-800'
                              : log.status === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {log.status}
                          </span>
                        </div>

                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>Method: {log.deliveryMethod}</span>
                          {log.retryCount > 0 && <span>Retries: {log.retryCount}</span>}
                          {log.viewedAt && (
                            <span>Viewed: {new Date(log.viewedAt).toLocaleString()}</span>
                          )}
                        </div>

                        {log.failureReason && (
                          <p className="mt-2 text-sm text-red-600">{log.failureReason}</p>
                        )}

                        {log.acknowledgment?.acknowledgedAt && (
                          <div className="mt-2 p-2 bg-green-50 rounded">
                            <p className="text-sm text-green-800">
                              Acknowledged by {log.acknowledgment.acknowledgedBy} on{' '}
                              {new Date(log.acknowledgment.acknowledgedAt).toLocaleString()}
                            </p>
                            {log.acknowledgment.acknowledgmentNote && (
                              <p className="text-xs text-green-700 mt-1">
                                Note: {log.acknowledgment.acknowledgmentNote}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No delivery attempts yet</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'metadata' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-sm text-gray-700 mb-2">Basic Information</h4>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-500">Type</p>
                      <p className="font-medium capitalize">{message.type}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Category</p>
                      <p className="font-medium capitalize">{message.category}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Format</p>
                      <p className="font-medium capitalize">{message.format}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Language</p>
                      <p className="font-medium">
                        {new Intl.DisplayNames(['en'], { type: 'language' }).of(message.locale || 'en')}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-sm text-gray-700 mb-2">Metadata</h4>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-500">Importance</p>
                      <p className="font-medium capitalize">{message.metadata.importance}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Sensitivity</p>
                      <p className="font-medium capitalize">{message.metadata.sensitivity}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Tone</p>
                      <p className="font-medium capitalize">{message.metadata.tone || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Read Time</p>
                      <p className="font-medium">{message.metadata.readTime || 0} minutes</p>
                    </div>
                  </div>
                </div>
              </div>

              {message.metadata.keywords && message.metadata.keywords.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-gray-700 mb-2">Keywords</h4>
                  <div className="flex flex-wrap gap-2">
                    {message.metadata.keywords.map(keyword => (
                      <span
                        key={keyword}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-medium text-sm text-gray-700 mb-2">Version History</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Current Version</span>
                    <span className="font-medium">v{message.version}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Created</span>
                    <span className="font-medium">
                      {new Date(message.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Last Updated</span>
                    <span className="font-medium">
                      {new Date(message.updatedAt).toLocaleString()}
                    </span>
                  </div>
                  {message.lastModifiedBy && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Modified By</span>
                      <span className="font-medium">{message.lastModifiedBy}</span>
                    </div>
                  )}
                </div>
              </div>

              {message.metadata.isTemplate && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-2 text-blue-800">
                    <FileText className="h-5 w-5" />
                    <p className="font-medium">Created from Template</p>
                  </div>
                  {message.metadata.templateId && (
                    <p className="text-sm text-blue-600 mt-1">
                      Template ID: {message.metadata.templateId}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-between">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <div className="flex space-x-2">
              {message.status === 'draft' && (
                <Button variant="outline">
                  <Send className="h-4 w-4 mr-2" />
                  Schedule
                </Button>
              )}
              <Button onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Message
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}