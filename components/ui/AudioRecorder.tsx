'use client'

import { useState, useEffect } from 'react'
import { Mic, MicOff, Pause, Play, Square, RotateCcw, Download, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'
import { cn } from '@/lib/utils'

interface AudioRecorderProps {
  onRecordingComplete?: (audioBlob: Blob, audioUrl: string) => void
  onRecordingStart?: () => void
  onRecordingStop?: () => void
  maxDuration?: number // in seconds
  className?: string
  showVisualizer?: boolean
}

export default function AudioRecorder({
  onRecordingComplete,
  onRecordingStart,
  onRecordingStop,
  maxDuration = 300, // 5 minutes default
  className,
  showVisualizer = true
}: AudioRecorderProps) {
  const {
    isRecording,
    isPaused,
    recordingTime,
    audioBlob,
    audioUrl,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    isSupported
  } = useAudioRecorder()

  const [isPlaying, setIsPlaying] = useState(false)
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null)
  const [visualizerData, setVisualizerData] = useState<number[]>(new Array(20).fill(0))

  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Handle audio element
  useEffect(() => {
    if (audioUrl) {
      const audio = new Audio(audioUrl)
      audio.addEventListener('ended', () => setIsPlaying(false))
      setAudioElement(audio)

      return () => {
        audio.pause()
        audio.removeEventListener('ended', () => setIsPlaying(false))
      }
    }
  }, [audioUrl])

  // Auto-stop at max duration
  useEffect(() => {
    if (isRecording && recordingTime >= maxDuration) {
      stopRecording()
    }
  }, [isRecording, recordingTime, maxDuration, stopRecording])

  // Visualizer animation (mock data for now)
  useEffect(() => {
    if (isRecording && !isPaused && showVisualizer) {
      const interval = setInterval(() => {
        setVisualizerData(prev => 
          prev.map(() => Math.random() * 100)
        )
      }, 100)

      return () => clearInterval(interval)
    } else if (!isRecording || isPaused) {
      setVisualizerData(new Array(20).fill(0))
    }
  }, [isRecording, isPaused, showVisualizer])

  // Handle recording complete
  useEffect(() => {
    if (audioBlob && audioUrl && !isRecording) {
      onRecordingComplete?.(audioBlob, audioUrl)
    }
  }, [audioBlob, audioUrl, isRecording, onRecordingComplete])

  // Handle recording state changes
  useEffect(() => {
    if (isRecording && !isPaused) {
      onRecordingStart?.()
    } else if (!isRecording && audioBlob) {
      onRecordingStop?.()
    }
  }, [isRecording, isPaused, audioBlob, onRecordingStart, onRecordingStop])

  const handleStartRecording = async () => {
    await startRecording()
  }

  const handlePlayPause = () => {
    if (!audioElement) return

    if (isPlaying) {
      audioElement.pause()
      setIsPlaying(false)
    } else {
      audioElement.play()
      setIsPlaying(true)
    }
  }

  const handleDownload = () => {
    if (!audioUrl) return

    const a = document.createElement('a')
    a.href = audioUrl
    a.download = `recording-${new Date().toISOString()}.webm`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  if (!isSupported) {
    return (
      <Card className={cn("p-4", className)}>
        <div className="text-center text-gray-500">
          <MicOff className="h-8 w-8 mx-auto mb-2" />
          <p>Audio recording is not supported in your browser.</p>
          <p className="text-sm mt-1">Please use a modern browser like Chrome, Firefox, or Edge.</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className={cn("p-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Audio Message</h3>
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

      {/* Visualizer */}
      {showVisualizer && isRecording && !isPaused && (
        <div className="mb-4 h-16 flex items-end justify-center gap-1">
          {visualizerData.map((value, index) => (
            <div
              key={index}
              className="w-1 bg-blue-500 transition-all duration-100 rounded-t"
              style={{ height: `${value}%` }}
            />
          ))}
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

      {/* Playback Progress */}
      {audioUrl && !isRecording && (
        <div className="mb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePlayPause}
              className="h-10 w-10 p-0"
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </Button>
            <div className="flex-1">
              <div className="h-1 bg-gray-200 rounded-full" />
            </div>
            <span className="text-sm text-gray-500">{formatTime(recordingTime)}</span>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-2">
        {!isRecording && !audioUrl && (
          <Button
            onClick={handleStartRecording}
            size="lg"
            className="gap-2"
          >
            <Mic className="h-5 w-5" />
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

        {audioUrl && !isRecording && (
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
      {!isRecording && !audioUrl && (
        <div className="mt-4 text-center text-sm text-gray-500">
          <p>Click "Start Recording" to begin recording your audio message.</p>
          <p>Maximum duration: {formatTime(maxDuration)}</p>
        </div>
      )}

      {/* Recording indicator */}
      {isRecording && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <div className={cn(
            "w-3 h-3 rounded-full",
            isPaused ? "bg-yellow-500" : "bg-red-500 animate-pulse"
          )} />
          <span className="text-sm text-gray-600">
            {isPaused ? 'Recording paused' : 'Recording in progress...'}
          </span>
        </div>
      )}
    </Card>
  )
}