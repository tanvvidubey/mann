import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { saveEntry } from '../api/client'
import { StreamingLoader } from '../components/Loader'
import { useAuth } from '../context/AuthContext'

export default function Write() {
  const [text, setText] = useState('')
  const [step, setStep] = useState('write') // write | streaming
  const [error, setError] = useState('')
  const [streamedText, setStreamedText] = useState('')
  const { pin } = useAuth()
  const navigate = useNavigate()

  const handleSave = async (e) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    setError('')
    setStep('streaming')
    setStreamedText('')
    try {
      const entry = await saveEntry(trimmed, pin, null, 'text', {
        onChunk: (chunk) => setStreamedText((prev) => prev + chunk),
      })
      if (entry?.id) navigate(`/entry/${entry.id}`)
      else navigate('/home')
    } catch (err) {
      setError(err.message || 'Save failed')
      setStep('write')
    }
  }

  if (step === 'streaming') {
    return (
      <StreamingLoader showCursor>
        {streamedText || ''}
      </StreamingLoader>
    )
  }

  return (
    <div className="page-enter-active max-w-2xl min-w-0 w-full">
      <h1 className="text-xl sm:text-2xl font-serif font-semibold text-ink mb-1">Write your entry</h1>
      <p className="text-muted text-sm sm:text-base mb-1">One entry at a time. Submit when you’re ready.</p>
      <p className="text-muted text-sm mb-6">Our companion will respond to this entry only. Mention “my profile” in your text if you want that context included.</p>
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>
      )}
      <form onSubmit={handleSave}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full min-h-[200px] sm:h-64 px-4 py-3 rounded-xl border border-warm bg-white text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-terracotta/40 resize-y text-base"
          placeholder="What’s on your mind?"
        />
        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={!text.trim()}
            className="w-full sm:w-auto min-w-[140px] px-6 py-3 min-h-[44px] rounded-xl bg-terracotta text-white font-medium hover:bg-terracottaDark disabled:opacity-60"
          >
            Submit entry
          </button>
        </div>
      </form>
    </div>
  )
}
