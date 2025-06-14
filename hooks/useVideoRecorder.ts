'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

export interface VideoRecorderState {
  isRecording: boolean
  isPaused: boolean
  recordingTime: number
  videoBlob: Blob | null
  videoUrl: string | null
  error: string | null
  stream: MediaStream | null
}

export interface UseVideoRecorderReturn extends VideoRecorderState {
  startRecording: () => Promise<void>
  stopRecording: () => void
  pauseRecording: () => void
  resumeRecording: () => void
  resetRecording: () => void
  toggleCamera: () => Promise<void>
  isSupported: boolean
  hasPermission: boolean
  isFrontCamera: boolean
}

export function useVideoRecorder(): UseVideoRecorderReturn {
  const [state, setState] = useState<VideoRecorderState>({
    isRecording: false,
    isPaused: false,
    recordingTime: 0,
    videoBlob: null,
    videoUrl: null,
    error: null,
    stream: null
  })

  const [hasPermission, setHasPermission] = useState(false)
  const [isFrontCamera, setIsFrontCamera] = useState(true)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  // Check if MediaRecorder is supported
  const isSupported = typeof window !== 'undefined' && 
    'MediaRecorder' in window && 
    'mediaDevices' in navigator &&
    'getUserMedia' in navigator.mediaDevices

  // Clean up video URL when component unmounts or new recording starts
  useEffect(() => {
    return () => {
      if (state.videoUrl) {
        URL.revokeObjectURL(state.videoUrl)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [state.videoUrl])

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setState(prev => ({ ...prev, error: 'Video recording is not supported in this browser' }))
      return
    }

    try {
      // Reset state
      setState(prev => ({
        ...prev,
        error: null,
        isRecording: true,
        isPaused: false,
        recordingTime: 0,
        videoBlob: null,
        videoUrl: prev.videoUrl ? URL.revokeObjectURL(prev.videoUrl) || null : null
      }))

      // Request camera and microphone access
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        },
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: isFrontCamera ? 'user' : 'environment'
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      setState(prev => ({ ...prev, stream }))
      setHasPermission(true)

      // Create MediaRecorder with options
      const options: MediaRecorderOptions = {
        mimeType: 'video/webm;codecs=vp9,opus'
      }

      // Check if the mimeType is supported
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        // Fallback to other formats
        const fallbackTypes = [
          'video/webm;codecs=vp8,opus',
          'video/webm',
          'video/mp4'
        ]
        
        const supportedType = fallbackTypes.find(type => MediaRecorder.isTypeSupported(type))
        if (supportedType) {
          options.mimeType = supportedType
        } else {
          delete options.mimeType // Let browser choose
        }
      }

      const mediaRecorder = new MediaRecorder(stream, options)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      // Handle data available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      // Handle recording stop
      mediaRecorder.onstop = () => {
        const videoBlob = new Blob(chunksRef.current, { 
          type: mediaRecorder.mimeType || 'video/webm' 
        })
        const videoUrl = URL.createObjectURL(videoBlob)
        
        setState(prev => ({
          ...prev,
          isRecording: false,
          isPaused: false,
          videoBlob,
          videoUrl
        }))

        // Clean up
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        }
      }

      // Handle errors
      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event)
        setState(prev => ({
          ...prev,
          error: 'Recording failed. Please try again.',
          isRecording: false,
          isPaused: false
        }))
      }

      // Start recording
      mediaRecorder.start(100) // Collect data every 100ms
      startTimeRef.current = Date.now()

      // Start timer
      timerRef.current = setInterval(() => {
        setState(prev => ({
          ...prev,
          recordingTime: Math.floor((Date.now() - startTimeRef.current) / 1000)
        }))
      }, 1000)

    } catch (error) {
      console.error('Error starting recording:', error)
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to start recording',
        isRecording: false
      }))
      setHasPermission(false)
    }
  }, [isSupported, isFrontCamera])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop()
      
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [state.isRecording])

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && 
        state.isRecording && 
        !state.isPaused && 
        mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause()
      setState(prev => ({ ...prev, isPaused: true }))
      
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [state.isRecording, state.isPaused])

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && 
        state.isRecording && 
        state.isPaused && 
        mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume()
      setState(prev => ({ ...prev, isPaused: false }))
      
      // Resume timer
      const pausedTime = state.recordingTime * 1000
      startTimeRef.current = Date.now() - pausedTime
      
      timerRef.current = setInterval(() => {
        setState(prev => ({
          ...prev,
          recordingTime: Math.floor((Date.now() - startTimeRef.current) / 1000)
        }))
      }, 1000)
    }
  }, [state.isRecording, state.isPaused, state.recordingTime])

  const resetRecording = useCallback(() => {
    // Stop any ongoing recording
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop()
    }

    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    // Clean up stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    // Revoke video URL
    if (state.videoUrl) {
      URL.revokeObjectURL(state.videoUrl)
    }

    // Reset state
    setState({
      isRecording: false,
      isPaused: false,
      recordingTime: 0,
      videoBlob: null,
      videoUrl: null,
      error: null,
      stream: null
    })

    chunksRef.current = []
    mediaRecorderRef.current = null
  }, [state.isRecording, state.videoUrl])

  const toggleCamera = useCallback(async () => {
    setIsFrontCamera(prev => !prev)
    
    // If recording, we need to restart with new camera
    if (state.isRecording) {
      stopRecording()
      // Small delay to ensure cleanup
      setTimeout(() => {
        startRecording()
      }, 100)
    }
  }, [state.isRecording, stopRecording, startRecording])

  return {
    ...state,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    toggleCamera,
    isSupported,
    hasPermission,
    isFrontCamera
  }
}