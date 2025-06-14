'use client'

import { useState, useEffect } from 'react'
import {
  X,
  Eye,
  Download,
  Printer,
  Share2,
  Smartphone,
  Monitor,
  Tablet,
  Mail,
  MessageSquare,
  Heart,
  DollarSign,
  Stethoscope,
  Scale,
  Church,
  Lock,
  Phone,
  Brain,
  Smile,
  Star,
  Archive,
  Briefcase,
  Palette,
  Sparkles,
  MoreVertical,
  Calendar,
  Clock,
  Users,
  FileText,
  Mic,
  Video
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import AudioPlayer from '@/components/ui/AudioPlayer'
import VideoPlayer from '@/components/ui/VideoPlayer'
import { audioStorageService } from '@/services/audio-storage-service'
import { videoStorageService } from '@/services/video-storage-service'
import {
  PersonalMessage,
  MessagesLibrary,
  MessageType,
  MessageFormat
} from '@/types/data'

interface MessagePreviewProps {
  message: Partial<PersonalMessage>
  library: MessagesLibrary
  onClose: () => void
  onSend?: () => void
}

type DeviceView = 'desktop' | 'tablet' | 'mobile'

export default function MessagePreview({
  message,
  library,
  onClose,
  onSend
}: MessagePreviewProps) {
  const [deviceView, setDeviceView] = useState<DeviceView>('desktop')
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)

  // Load audio if message has audioId
  useEffect(() => {
    const loadAudio = async () => {
      if (message.content?.audioId) {
        try {
          const audioItem = await audioStorageService.getAudio(message.content.audioId)
          if (audioItem) {
            setAudioUrl(audioItem.dataUrl)
          }
        } catch (error) {
          console.error('Failed to load audio:', error)
        }
      }
    }
    loadAudio()
  }, [message.content?.audioId])

  // Load video if message has videoId
  useEffect(() => {
    const loadVideo = async () => {
      if (message.content?.videoId) {
        try {
          const videoItem = await videoStorageService.getVideo(message.content.videoId)
          if (videoItem) {
            setVideoUrl(videoItem.dataUrl)
          }
        } catch (error) {
          console.error('Failed to load video:', error)
        }
      }
    }
    loadVideo()
  }, [message.content?.videoId])

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

  const TypeIcon = message.type ? getMessageTypeIcon(message.type) : MessageSquare
  const FormatIcon = message.format ? getFormatIcon(message.format) : MessageSquare

  // Device frame dimensions
  const deviceDimensions = {
    desktop: 'w-full max-w-4xl h-[600px]',
    tablet: 'w-[768px] h-[1024px] max-w-full',
    mobile: 'w-[375px] h-[667px]'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Eye className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold">Message Preview</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Device selector */}
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">Preview as:</span>
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setDeviceView('desktop')}
                className={`p-2 rounded ${
                  deviceView === 'desktop'
                    ? 'bg-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Monitor className="h-5 w-5" />
              </button>
              <button
                onClick={() => setDeviceView('tablet')}
                className={`p-2 rounded ${
                  deviceView === 'tablet'
                    ? 'bg-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Tablet className="h-5 w-5" />
              </button>
              <button
                onClick={() => setDeviceView('mobile')}
                className={`p-2 rounded ${
                  deviceView === 'mobile'
                    ? 'bg-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Smartphone className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Preview Area */}
        <div className="p-6 bg-gray-100 flex justify-center overflow-y-auto" style={{ maxHeight: 'calc(95vh - 220px)' }}>
          <div className={`bg-white shadow-lg rounded-lg overflow-hidden ${deviceDimensions[deviceView]}`}>
            {/* Email/Message Header */}
            <div className="bg-gray-50 p-4 border-b">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <TypeIcon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      If I'm Gone - Important Message
                    </h3>
                    <p className="text-sm text-gray-500">
                      From: Your Name via If I'm Gone
                    </p>
                  </div>
                </div>
                <FormatIcon className="h-5 w-5 text-gray-400" />
              </div>
              {message.recipients && message.recipients.length > 0 && (
                <div className="text-sm text-gray-600">
                  To: {message.recipients.map(r => r.name).join(', ')}
                </div>
              )}
            </div>

            {/* Message Content */}
            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(100% - 180px)' }}>
              {/* Title */}
              <h1 className="text-2xl font-bold mb-4">{message.title || 'Untitled Message'}</h1>

              {/* Metadata badges */}
              <div className="flex flex-wrap gap-2 mb-6">
                {message.type && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                    <TypeIcon className="h-4 w-4 mr-1" />
                    {message.type}
                  </span>
                )}
                {message.metadata?.importance && message.metadata.importance !== 'medium' && (
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                    message.metadata.importance === 'critical'
                      ? 'bg-red-100 text-red-800'
                      : message.metadata.importance === 'high'
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {message.metadata.importance} importance
                  </span>
                )}
                {message.scheduling && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
                    <Clock className="h-4 w-4 mr-1" />
                    {message.scheduling.type}
                  </span>
                )}
              </div>

              {/* Content based on format */}
              {message.format === 'text' && message.content?.text && (
                <div
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: message.content.text }}
                />
              )}

              {message.format === 'audio' && (
                <div className="space-y-4">
                  {audioUrl ? (
                    <AudioPlayer
                      src={audioUrl}
                      title="Audio Message"
                      showDownload={true}
                      showVolumeControl={true}
                      className="shadow-sm"
                    />
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-6 text-center">
                      <Mic className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg font-medium mb-2">Audio Message</p>
                      {message.content?.audioId ? (
                        <p className="text-sm text-gray-600">Loading audio...</p>
                      ) : (
                        <p className="text-sm text-gray-600">No audio content available</p>
                      )}
                    </div>
                  )}
                  {message.content?.audioTranscript && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm font-medium mb-2">Transcript:</p>
                      <p className="text-sm text-gray-700">{message.content.audioTranscript}</p>
                    </div>
                  )}
                </div>
              )}

              {message.format === 'video' && (
                <div className="space-y-4">
                  {videoUrl ? (
                    <VideoPlayer
                      src={videoUrl}
                      title="Video Message"
                      showDownload={true}
                      showVolumeControl={true}
                      className="aspect-video"
                      poster={message.content?.videoPoster}
                    />
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-6 text-center">
                      <Video className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg font-medium mb-2">Video Message</p>
                      {message.content?.videoId ? (
                        <p className="text-sm text-gray-600">Loading video...</p>
                      ) : (
                        <p className="text-sm text-gray-600">No video content available</p>
                      )}
                    </div>
                  )}
                  {message.content?.videoTranscript && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm font-medium mb-2">Transcript:</p>
                      <p className="text-sm text-gray-700">{message.content.videoTranscript}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Attachments */}
              {message.attachments && message.attachments.length > 0 && (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="font-medium mb-3">Attachments ({message.attachments.length})</h3>
                  <div className="space-y-2">
                    {message.attachments.map(attachment => (
                      <div
                        key={attachment.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
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

              {/* Footer info */}
              {message.metadata && (
                <div className="mt-8 pt-6 border-t text-sm text-gray-500">
                  <p>This message was created on {new Date().toLocaleDateString()}</p>
                  {message.metadata.keywords && message.metadata.keywords.length > 0 && (
                    <div className="mt-2">
                      Keywords: {message.metadata.keywords.join(', ')}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions Footer */}
            <div className="p-4 bg-gray-50 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Users className="h-4 w-4" />
                  <span>{message.recipients?.length || 0} recipients</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm">
                    <Printer className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-between">
            <Button variant="outline" onClick={onClose}>
              Close Preview
            </Button>
            {onSend && (
              <Button onClick={onSend}>
                <Mail className="h-4 w-4 mr-2" />
                Send Message
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}