import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import VoiceRecorder from '../components/VoiceRecorder'
import { uploadAudio, saveEntry } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { CardLoader, StreamingLoader } from '../components/Loader'

export default function Record() {
  const [step, setStep] = useState('record') // record | review | streaming
  const [transcript, setTranscript] = useState('')
  const [audioBlob, setAudioBlob] = useState(null)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState('')
  const [streamedText, setStreamedText] = useState('')
  const { pin } = useAuth()
  const navigate = useNavigate()

  const handleRecordingComplete = async (blob, dur) => {
    setAudioBlob(blob)
    setDuration(dur)
    setStep('uploading')
    setError('')
    try {
      const data = await uploadAudio(blob)
      setTranscript(data.transcript || '')
      setStep('review')
    } catch (err) {
      setError(err.message || 'Transcription failed')
      setStep('record')
    }
  }

  const handleSave = async () => {
    if (!transcript.trim()) return
    setError('')
    setStep('streaming')
    setStreamedText('')
    try {
      const entry = await saveEntry(transcript.trim(), pin, duration, 'voice', {
        onChunk: (text) => setStreamedText((prev) => prev + text),
      })
      if (entry?.id) navigate(`/entry/${entry.id}`)
      else navigate('/home')
    } catch (err) {
      setError(err.message || 'Save failed')
      setStep('review')
    }
  }

  if (step === 'uploading') {
    return (
      <div className="page-enter-active flex justify-center py-8">
        <CardLoader label="Turning your voice into text… This can take a moment." />
      </div>
    )
  }

  if (step === 'streaming') {
    return (
      <StreamingLoader showCursor>
        {streamedText || ''}
      </StreamingLoader>
    )
  }

  if (step === 'review') {
    return (
      <div className="page-enter-active max-w-2xl min-w-0 w-full">
        <h1 className="text-xl sm:text-2xl font-serif font-semibold text-ink mb-1">Review your entry</h1>
        <p className="text-muted text-sm sm:text-base mb-1">One entry at a time. Edit below and submit when you’re ready.</p>
        <p className="text-muted text-sm mb-6">This entry will be encrypted and our companion will respond to this entry only.</p>
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>
        )}
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          className="w-full min-h-[180px] sm:h-48 px-4 py-3 rounded-xl border border-warm bg-white text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-terracotta/40 resize-y text-base"
          placeholder="Your transcript…"
        />
        <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          <button
            type="button"
            onClick={() => { setStep('record'); setTranscript(''); setError(''); }}
            className="w-full sm:w-auto px-5 py-3 min-h-[44px] rounded-xl border border-warm text-muted hover:bg-warm font-medium"
          >
            Record again
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="w-full sm:w-auto px-6 py-3 min-h-[44px] rounded-xl bg-terracotta text-white font-medium hover:bg-terracottaDark disabled:opacity-60"
          >
            Submit entry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page-enter-active min-w-0 w-full">
      <h1 className="text-xl sm:text-2xl font-serif font-semibold text-ink mb-1">Record your entry</h1>
      <p className="text-muted mb-6 text-sm sm:text-base">One entry at a time. Speak in Hindi, English, or Hinglish — you choose when to submit.</p>
      <VoiceRecorder onRecordingComplete={handleRecordingComplete} />
    </div>
  )
}
