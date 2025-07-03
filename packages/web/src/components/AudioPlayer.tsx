import { useState, useRef, useEffect } from 'react'
import { Play, Pause, RotateCcw } from 'lucide-react'

interface AudioPlayerProps {
  audioUrl: string
  duration?: number
}

export function AudioPlayer({
  audioUrl,
  duration: providedDuration,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [_isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    // Debug: Setting up audio with URL and provided duration

    // Use provided duration if available
    if (providedDuration && providedDuration > 0) {
      setDuration(providedDuration)
      setIsLoaded(true)
    }

    const setAudioData = () => {
      // Debug: Audio metadata loaded

      if (
        !isNaN(audio.duration) &&
        isFinite(audio.duration) &&
        audio.duration > 0
      ) {
        // Debug: Setting duration from audio
        setDuration(audio.duration)
        setIsLoaded(true)
      } else if (
        audio.duration === Infinity &&
        providedDuration &&
        providedDuration > 0
      ) {
        // Use provided duration for streaming audio
        // Debug: Using provided duration
        setDuration(providedDuration)
        setIsLoaded(true)
      }

      if (!isNaN(audio.currentTime)) {
        setCurrentTime(audio.currentTime)
      }
    }

    const setAudioTime = () => {
      if (!isNaN(audio.currentTime)) {
        setCurrentTime(audio.currentTime)
      }
    }

    const handleError = (_e: Event) => {
      // Debug: Audio error occurred
    }

    // Reset state
    setDuration(0)
    setCurrentTime(0)
    setIsLoaded(false)
    setIsPlaying(false)

    // Set source and load
    audio.src = audioUrl
    audio.load()

    // Event listeners
    const handleLoadStart = () => {
      // Debug: Audio loadstart
    }
    audio.addEventListener('loadstart', handleLoadStart)
    audio.addEventListener('loadedmetadata', setAudioData)
    audio.addEventListener('loadeddata', setAudioData)
    audio.addEventListener('canplay', setAudioData)
    audio.addEventListener('canplaythrough', setAudioData)
    audio.addEventListener('durationchange', setAudioData)
    audio.addEventListener('timeupdate', setAudioTime)
    const handleEnded = () => {
      setIsPlaying(false)
      // Update duration to actual duration when audio ends
      if (audio.currentTime > 0 && audio.duration === Infinity) {
        setDuration(Math.ceil(audio.currentTime))
      }
    }

    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)

    return () => {
      audio.removeEventListener('loadstart', handleLoadStart)
      audio.removeEventListener('loadedmetadata', setAudioData)
      audio.removeEventListener('loadeddata', setAudioData)
      audio.removeEventListener('canplay', setAudioData)
      audio.removeEventListener('canplaythrough', setAudioData)
      audio.removeEventListener('durationchange', setAudioData)
      audio.removeEventListener('timeupdate', setAudioTime)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
    }
  }, [audioUrl, providedDuration])

  const togglePlayPause = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current
    if (!audio) return

    const time = Number(e.target.value)
    audio.currentTime = time
    setCurrentTime(time)
  }

  const resetAudio = () => {
    const audio = audioRef.current
    if (!audio) return

    audio.currentTime = 0
    setCurrentTime(0)
    setIsPlaying(false)
  }

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00'

    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="w-full max-w-md mx-auto bg-gray-100 rounded-lg p-4 space-y-4">
      <audio ref={audioRef} preload="metadata" crossOrigin="anonymous" />

      <div className="flex items-center justify-center space-x-4">
        <button
          onClick={resetAudio}
          className="p-2 rounded-full hover:bg-gray-200 transition-colors"
        >
          <RotateCcw className="w-5 h-5 text-gray-700" />
        </button>

        <button
          onClick={togglePlayPause}
          className="p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
        >
          {isPlaying ? (
            <Pause className="w-6 h-6" />
          ) : (
            <Play className="w-6 h-6" />
          )}
        </button>
      </div>

      <div className="space-y-2">
        <input
          type="range"
          min={0}
          max={duration || 0}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer slider"
          style={{
            background:
              duration > 0
                ? `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${(currentTime / duration) * 100}%, #D1D5DB ${(currentTime / duration) * 100}%, #D1D5DB 100%)`
                : '#D1D5DB',
          }}
        />
        <div className="flex justify-between text-sm text-gray-600">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  )
}
