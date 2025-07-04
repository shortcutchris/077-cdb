import { useState, useRef, useCallback } from 'react'

export type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped'

interface UseAudioRecorderReturn {
  recordingState: RecordingState
  startRecording: () => Promise<void>
  stopRecording: () => void
  pauseRecording: () => void
  resumeRecording: () => void
  resetRecording: () => void
  audioBlob: Blob | null
  audioUrl: string | null
  recordingTime: number
  error: string | null
  isRecording: boolean
}

const MAX_RECORDING_TIME = 120 // 2 minutes in seconds

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState !== 'idle') {
      mediaRecorderRef.current.stop()
      setRecordingState('stopped')
      stopTimer()
    }
  }, [recordingState, stopTimer])

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now() - recordingTime * 1000
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
      setRecordingTime(elapsed)

      // Auto-stop at 2 minutes
      if (elapsed >= MAX_RECORDING_TIME) {
        stopRecording()
      }
    }, 100)
  }, [recordingTime, stopRecording])

  const startRecording = useCallback(async () => {
    try {
      setError(null)

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000, // Optimal for Whisper
        },
      })

      // Create MediaRecorder with WebM format
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000, // 128kbps
      })

      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        setAudioBlob(blob)
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)

        // Stop all tracks to release microphone
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(1000) // Collect data every second
      setRecordingState('recording')
      startTimer()
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError(
            'Microphone permission denied. Please allow access to record.'
          )
        } else if (err.name === 'NotFoundError') {
          setError('No microphone found. Please connect a microphone.')
        } else {
          setError(`Recording error: ${err.message}`)
        }
      } else {
        setError('An unknown error occurred while starting recording.')
      }
      setRecordingState('idle')
    }
  }, [startTimer])

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.pause()
      setRecordingState('paused')
      stopTimer()
    }
  }, [recordingState, stopTimer])

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState === 'paused') {
      mediaRecorderRef.current.resume()
      setRecordingState('recording')
      startTimer()
    }
  }, [recordingState, startTimer])

  const resetRecording = useCallback(() => {
    // Clean up the current recording
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
    setAudioBlob(null)
    setAudioUrl(null)
    setRecordingTime(0)
    setRecordingState('idle')
    setError(null)
    chunksRef.current = []
  }, [audioUrl])

  // Cleanup on unmount
  useCallback(() => {
    return () => {
      stopTimer()
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [audioUrl, stopTimer])

  return {
    recordingState,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    audioBlob,
    audioUrl,
    recordingTime,
    error,
    isRecording: recordingState === 'recording',
  }
}
