import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getEntry } from '../api/client'
import { PageLoader } from '../components/Loader'
import { useAuth } from '../context/AuthContext'

const moodColors = {
  happy: 'bg-amber-100 text-amber-800',
  sad: 'bg-slate-200 text-slate-700',
  anxious: 'bg-rose-100 text-rose-800',
  calm: 'bg-sky-100 text-sky-800',
  angry: 'bg-red-100 text-red-800',
  confused: 'bg-violet-100 text-violet-800',
  grateful: 'bg-emerald-100 text-emerald-800',
  excited: 'bg-orange-100 text-orange-800',
}

export default function Entry() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { pin } = useAuth()
  const [entry, setEntry] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!pin) {
      setError('PIN required to view entry.')
      setLoading(false)
      return
    }
    getEntry(id, pin)
      .then(setEntry)
      .catch((err) => setError(err.message || 'Failed to load'))
      .finally(() => setLoading(false))
  }, [id, pin])

  if (loading) return <PageLoader label="Opening your entry…" size="md" />
  if (error || !entry) {
    return (
      <div>
        <p className="text-red-600">{error || 'Entry not found'}</p>
        <button onClick={() => navigate('/home')} className="mt-4 text-terracotta hover:underline">
          Back to home
        </button>
      </div>
    )
  }

  const date = new Date(entry.created_at).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  const moodClass = moodColors[entry.mood] || 'bg-warm text-muted'

  return (
    <div className="page-enter-active max-w-2xl w-full min-w-0">
      <div className="flex items-center justify-between gap-4 mb-6">
        <button type="button" onClick={() => navigate(-1)} className="text-muted hover:text-ink text-sm font-medium py-1 -ml-1">
          ← Back
        </button>
        <span className="text-muted text-sm">{date}</span>
      </div>
      <div className={`inline-block text-sm font-medium px-3 py-1.5 rounded-full ${moodClass} mb-4`}>
        {entry.mood} · {entry.mood_score}/10
      </div>
      <div className="space-y-6">
        <div>
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Your entry</h2>
          <p className="text-ink whitespace-pre-wrap font-serif leading-relaxed text-base">{entry.transcript}</p>
        </div>
        {entry.one_line_summary && (
          <p className="text-muted italic border-l-2 border-terracotta/40 pl-4 py-0.5 text-sm sm:text-base">
            {entry.one_line_summary}
          </p>
        )}
        {entry.reflection && (
          <div className="p-5 rounded-xl bg-sage/10 border border-sage/20">
            <h3 className="text-sm font-semibold text-sageDark mb-2">Companion reflection</h3>
            <p className="text-ink leading-relaxed text-sm sm:text-base">{entry.reflection}</p>
          </div>
        )}
        {entry.key_thoughts?.length > 0 && (
          <ul className="space-y-2">
            <p className="text-sm font-semibold text-muted mb-1">Key thoughts</p>
            {entry.key_thoughts.map((t, i) => (
              <li key={i} className="text-ink text-sm sm:text-base pl-4 border-l-2 border-warm">{t}</li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted pt-2">
          Weekly ideas from your journal entries update when you save new ones —{' '}
          <Link to="/suggestions" className="text-terracotta hover:underline font-medium">
            Suggestions
          </Link>
        </p>
      </div>
    </div>
  )
}
