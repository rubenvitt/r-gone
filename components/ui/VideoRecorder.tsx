'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  Video, 
  VideoOff, 
  Pause, 
  Play, 
  Square, 
  RotateCcw, 
  Download, 
  Camera,
  CameraOff,
  Mic,
  MicOff,
  SwitchCamera
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useVideoRecorder } from '@/hooks/useVideoRecorder'
import { cn } from '@/lib/utils'

interface VideoRecorderProps {
  onRecordingComplete?: (videoBlob: Blob, videoUrl: string) => void
  onRecordingStart?: () => void
  onRecordingStop?: () => void
  maxDuration?: number // in seconds
  className?: string
  showPreview?: boolean
}

export default function VideoRecorder({
  onRecordingComplete,
  onRecordingStart,
  onRecordingStop,
  maxDuration = 600, // 10 minutes default
  className,
  showPreview = true
}: VideoRecorderProps) {
  const {
    isRecording,
    isPaused,
    recordingTime,
    videoBlob,
    videoUrl,
    error,
    stream,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    toggleCamera,
    isSupported,
    hasPermission,
    isFrontCamera
  } = useVideoRecorder()

  const videoPreviewRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)

  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Set up video preview stream
  useEffect(() => {
    if (videoPreviewRef.current && stream) {
      videoPreviewRef.current.srcObject = stream
    }
  }, [stream])

  // Auto-stop at max duration
  useEffect(() => {
    if (isRecording && recordingTime >= maxDuration) {
      stopRecording()
    }
  }, [isRecording, recordingTime, maxDuration, stopRecording])

  // Handle recording complete
  useEffect(() => {
    if (videoBlob && videoUrl && !isRecording) {
      onRecordingComplete?.(videoBlob, videoUrl)
    }
  }, [videoBlob, videoUrl, isRecording, onRecordingComplete])

  // Handle recording state changes
  useEffect(() => {
    if (isRecording && !isPaused) {
      onRecordingStart?.()
    } else if (!isRecording && videoBlob) {
      onRecordingStop?.()
    }
  }, [isRecording, isPaused, videoBlob, onRecordingStart, onRecordingStop])

  const handleStartRecording = async () => {
    await startRecording()
  }

  const handlePlayPause = () => {
    const video = videoPreviewRef.current
    if (!video || !videoUrl) return

    if (isPlaying) {
      video.pause()
      setIsPlaying(false)
    } else {
      video.play()
      setIsPlaying(true)
    }
  }

  const handleDownload = () => {
    if (!videoUrl) return

    const a = document.createElement('a')
    a.href = videoUrl
    a.download = `recording-${new Date().toISOString()}.webm`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
    // In a real implementation, you would mute/unmute the audio track
  }

  if (!isSupported) {
    return (
      <Card className={cn("p-4", className)}>
        <div className="text-center text-gray-500">
          <VideoOff className="h-8 w-8 mx-auto mb-2" />
          <p>Video recording is not supported in your browser.</p>
          <p className="text-sm mt-1">Please use a modern browser like Chrome, Firefox, or Edge.</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className={cn("p-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Video Message</h3>
        {recordingTime > 0 && (
          <div className="text-sm text-gray-500">
            {formatTime(recordingTime)} / {formatTime(maxDuration)}
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Video Preview/Playback */}
      {showPreview && (
        <div className="mb-4 relative bg-black rounded-lg overflow-hidden aspect-video">
          <video
            ref={videoPreviewRef}
            autoPlay={isRecording}
            playsInline
            muted={isRecording || isMuted}
            controls={!isRecording && videoUrl !== null}
            src={videoUrl || undefined}
            className="w-full h-full object-cover"
          />
          
          {/* Recording indicator */}
          {isRecording && (
            <div className="absolute top-4 left-4 flex items-center space-x-2">
              <div className={cn(
                "w-3 h-3 rounded-full",
                isPaused ? "bg-yellow-500" : "bg-red-500 animate-pulse"
              )} />
              <span className="text-white text-sm font-medium">
                {isPaused ? 'Paused' : 'Recording'}
              </span>
            </div>
          )}

          {/* Camera controls during recording */}
          {isRecording && (
            <div className="absolute top-4 right-4 flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleCamera}
                className="bg-black/50 hover:bg-black/70 text-white"
              >
                <SwitchCamera className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMute}
                className="bg-black/50 hover:bg-black/70 text-white"
              >
                {isMuted ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}

          {/* No video placeholder */}
          {!isRecording && !videoUrl && !stream && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Camera className="h-16 w-16 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-400">No video</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recording Progress */}
      {isRecording && (
        <div className="mb-4">
          <Progress 
            value={(recordingTime / maxDuration) * 100} 
            className="h-2"
          />
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-2">
        {!isRecording && !videoUrl && (
          <Button
            onClick={handleStartRecording}
            size="lg"
            className="gap-2"
          >
            <Video className="h-5 w-5" />
            Start Recording
          </Button>
        )}

        {isRecording && (
          <>
            {!isPaused ? (
              <Button
                onClick={pauseRecording}
                variant="outline"
                size="lg"
                className="gap-2"
              >
                <Pause className="h-5 w-5" />
                Pause
              </Button>
            ) : (
              <Button
                onClick={resumeRecording}
                variant="outline"
                size="lg"
                className="gap-2"
              >
                <Play className="h-5 w-5" />
                Resume
              </Button>
            )}
            <Button
              onClick={stopRecording}
              variant="destructive"
              size="lg"
              className="gap-2"
            >
              <Square className="h-5 w-5" />
              Stop
            </Button>
          </>
        )}

        {videoUrl && !isRecording && (
          <>
            <Button
              onClick={resetRecording}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Re-record
            </Button>
            <Button
              onClick={handleDownload}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
          </>
        )}
      </div>

      {/* Instructions */}
      {!isRecording && !videoUrl && (
        <div className="mt-4 text-center text-sm text-gray-500">
          <p>Click "Start Recording" to begin recording your video message.</p>
          <p>Maximum duration: {formatTime(maxDuration)}</p>
          {!hasPermission && (
            <p className="text-yellow-600 mt-2">
              Camera and microphone access will be requested.
            </p>
          )}
        </div>
      )}
    </Card>
  )
}