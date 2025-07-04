import { useEffect, useRef } from 'react'

interface AudioVisualizerProps {
  isRecording: boolean
}

export function AudioVisualizer({ isRecording }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const analyserRef = useRef<AnalyserNode | null>(null)

  useEffect(() => {
    if (!isRecording || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = canvas.offsetWidth * window.devicePixelRatio
    canvas.height = canvas.offsetHeight * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    // Create audio context and analyser
    const audioContext = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)()
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.8
    analyserRef.current = analyser

    // Try to get microphone stream
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        const source = audioContext.createMediaStreamSource(stream)
        source.connect(analyser)
      })
      .catch(console.error)

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw)

      analyser.getByteFrequencyData(dataArray)

      // Clear canvas with dark background
      ctx.fillStyle = 'rgb(17, 24, 39)' // gray-900
      ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight)

      // Draw bars
      const barWidth = (canvas.offsetWidth / bufferLength) * 2.5
      let barHeight
      let x = 0

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.offsetHeight * 0.8

        // Gradient color based on height - red theme
        const intensity = dataArray[i] / 255
        const red = 220 + intensity * 35
        const green = 38 + intensity * 20
        const blue = 38
        ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`

        ctx.fillRect(x, canvas.offsetHeight - barHeight, barWidth, barHeight)

        x += barWidth + 1
      }
    }

    draw()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (audioContext.state !== 'closed') {
        audioContext.close()
      }
    }
  }, [isRecording])

  if (!isRecording) return null

  return (
    <div className="w-full max-w-xl mx-auto">
      <canvas
        ref={canvasRef}
        className="w-full h-24 rounded-lg bg-gray-900 shadow-inner"
        style={{ imageRendering: 'crisp-edges' }}
      />
    </div>
  )
}
