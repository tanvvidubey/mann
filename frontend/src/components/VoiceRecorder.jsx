import { useRef, useState, useCallback, useEffect } from 'react'

export default function VoiceRecorder({ onRecordingComplete, disabled }) {
  const [isRecording, setIsRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const waveformRef = useRef(null)
  const timerRef = useRef(null)

  const startTimer = useCallback(() => {
    const start = Date.now()
    timerRef.current = setInterval(() => {
      setDuration(Math.floor((Date.now() - start) / 1000))
    }, 1000)
  }, [])

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // Live waveform placeholder: animated bars while recording (real waveform needs playback)
  useEffect(() => {
    if (!waveformRef.current) return
    waveformRef.current.innerHTML = ''
    if (!isRecording) return
    const container = waveformRef.current
    for (let i = 0; i < 40; i++) {
      const bar = document.createElement('div')
      bar.className = 'inline-block w-1 rounded-full bg-terracotta/60 mx-0.5 animate-pulse'
      bar.style.height = `${20 + Math.random() * 40}px`
      bar.style.animationDelay = `${i * 0.05}s`
      container.appendChild(bar)
    }
  }, [isRecording])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        onRecordingComplete(blob, duration)
      }
      recorder.start(100)
      mediaRecorderRef.current = recorder
      setIsRecording(true)
      setDuration(0)
      startTimer()
    } catch (err) {
      console.error(err)
      alert('Microphone access is needed to record.')
    }
  }, [onRecordingComplete, duration, startTimer])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
    }
    stopTimer()
    setIsRecording(false)
  }, [stopTimer])

  return (
    <div className="rounded-2xl bg-white border border-warm/60 p-6">
      {isRecording ? (
        <>
          <div ref={waveformRef} className="w-full h-[60px] mb-4" />
          <div className="flex items-center justify-between">
            <span className="text-muted text-sm">
              Recording… {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
            </span>
            <button
              type="button"
              onClick={stopRecording}
              className="px-6 py-2.5 rounded-xl bg-rose-100 text-rose-800 font-medium hover:bg-rose-200 transition-colors"
            >
              Stop
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={startRecording}
          disabled={disabled}
          className="w-full py-4 rounded-xl bg-sage/20 text-sage font-medium hover:bg-sage/30 transition-colors disabled:opacity-50"
        >
          Start recording
        </button>
      )}
    </div>
  )
}
